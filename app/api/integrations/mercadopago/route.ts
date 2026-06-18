import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/guards";
import IntegrationSetting from "@/models/IntegrationSetting";
import { getMercadoPagoAccount } from "@/lib/mercadopago";
import { getMercadoPagoConnectionStatus } from "@/lib/mercadopago-connection";
import { connectMongo } from "@/lib/mongodb";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const KEY = "mercadopago";

async function getOrCreateSetting() {
  let setting = await IntegrationSetting.findOne({ key: KEY });
  if (!setting) {
    setting = await IntegrationSetting.create({ key: KEY, enabled: true });
  }
  return setting;
}

export async function GET(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectMongo();
  const setting = await getOrCreateSetting();
  const connection = await getMercadoPagoConnectionStatus();

  return NextResponse.json({
    setting,
    configured: connection.oauthConfigured,
    connected: connection.connected,
    connectedAt: connection.connectedAt,
    accountEmail: connection.accountEmail,
    accountName: connection.accountName,
    connectionState: connection.connectionState,
    webhookSecretConfigured: connection.webhookSecretConfigured,
    appUrl: process.env.NEXT_PUBLIC_APP_URL?.trim() || "",
    callbackUrl: connection.callbackUrl,
    webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "") || ""}/api/webhooks/mercadopago`,
  });
}

export async function POST(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectMongo();
  const body = await req.json().catch(() => null);
  const action = String(body?.action || "save");
  const setting = await getOrCreateSetting();

  if (action === "test") {
    const account = await getMercadoPagoAccount();
    setting.accountEmail = String(account.email || "");
    setting.accountName = String(account.first_name || account.nickname || account.id || "");
    setting.lastTestStatus = "ok";
    setting.lastTestAt = new Date();
    setting.lastError = "";
    await setting.save();
    return NextResponse.json({
      ok: true,
      account: {
        email: setting.accountEmail,
        name: setting.accountName,
      },
      setting,
    });
  }

  return NextResponse.json({ ok: true, setting });
}
