import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/guards";
import { buildMercadoPagoAuthorizationUrl } from "@/lib/mercadopago-connection";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const state = crypto.randomUUID();
  const redirect = NextResponse.redirect(buildMercadoPagoAuthorizationUrl(state));
  redirect.cookies.set("mp_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 10 * 60,
  });

  return redirect;
}
