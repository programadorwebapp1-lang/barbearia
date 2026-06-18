import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/guards";
import { exchangeMercadoPagoCode, saveMercadoPagoConnectionFromToken } from "@/lib/mercadopago-connection";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "") || "http://localhost:3000";
}

function redirectToAdmin(params: Record<string, string>) {
  const url = new URL("/admin", getAppUrl());
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  return NextResponse.redirect(url);
}

export async function GET(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const error = req.nextUrl.searchParams.get("error");
  const code = req.nextUrl.searchParams.get("code") || "";
  const state = req.nextUrl.searchParams.get("state") || "";
  const cookieState = req.cookies.get("mp_oauth_state")?.value || "";

  if (error) {
    return redirectToAdmin({ section: "integrations", mp: "error", message: error });
  }

  if (!code || !state || state !== cookieState) {
    return redirectToAdmin({ section: "integrations", mp: "error", message: "invalid_state" });
  }

  try {
    const tokenData = await exchangeMercadoPagoCode(code);
    const accountResponse = await fetch("https://api.mercadopago.com/users/me", {
      headers: {
        Authorization: `Bearer ${String(tokenData.access_token)}`,
      },
    });

    const account = await accountResponse.json().catch(() => null);
    if (!accountResponse.ok || !account) {
      throw new Error("Não foi possível validar a conta conectada.");
    }

    await saveMercadoPagoConnectionFromToken({
      accessToken: String(tokenData.access_token),
      refreshToken: String(tokenData.refresh_token || ""),
      expiresIn: Number(tokenData.expires_in || 0) || undefined,
      userId: tokenData.user_id,
      publicKey: tokenData.public_key,
      liveMode: tokenData.live_mode,
      accountEmail: String(account.email || ""),
      accountName: String(account.first_name || account.nickname || account.id || ""),
    });

    const response = redirectToAdmin({ section: "integrations", mp: "connected" });
    response.cookies.set("mp_oauth_state", "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });
    return response;
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "oauth_error";
    return redirectToAdmin({ section: "integrations", mp: "error", message });
  }
}
