import crypto from "node:crypto";
import { connectMongo } from "./mongodb";
import IntegrationSetting from "@/models/IntegrationSetting";

const KEY = "mercadopago";

function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "") || "http://localhost:3000";
}

function getRedirectUri() {
  return process.env.MERCADO_PAGO_REDIRECT_URI?.trim() || `${getAppUrl()}/api/integrations/mercadopago/callback`;
}

function getClientId() {
  const value = process.env.MERCADO_PAGO_CLIENT_ID?.trim();
  if (!value) throw new Error("MERCADO_PAGO_CLIENT_ID não configurado.");
  return value;
}

function getClientSecret() {
  const value = process.env.MERCADO_PAGO_CLIENT_SECRET?.trim();
  if (!value) throw new Error("MERCADO_PAGO_CLIENT_SECRET não configurado.");
  return value;
}

function getCipherKey() {
  const secret = process.env.MERCADO_PAGO_TOKEN_ENCRYPTION_KEY?.trim() || process.env.JWT_SECRET?.trim();
  if (!secret) throw new Error("Chave de criptografia não configurada.");
  return crypto.createHash("sha256").update(secret).digest();
}

function encryptValue(value: string) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", getCipherKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `enc:${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
}

function decryptValue(value: string) {
  if (!value) return "";
  if (!value.startsWith("enc:")) return value;

  const [, ivBase64, tagBase64, payloadBase64] = value.split(":");
  if (!ivBase64 || !tagBase64 || !payloadBase64) return "";

  const decipher = crypto.createDecipheriv("aes-256-gcm", getCipherKey(), Buffer.from(ivBase64, "base64"));
  decipher.setAuthTag(Buffer.from(tagBase64, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payloadBase64, "base64")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

async function getSetting() {
  await connectMongo();
  let setting = await IntegrationSetting.findOne({ key: KEY });
  if (!setting) {
    setting = await IntegrationSetting.create({ key: KEY, enabled: true, mercadopagoConnectionState: "disconnected" });
  }
  return setting;
}

async function saveSettingConnection(data: {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  userId?: string | number;
  publicKey?: string;
  liveMode?: boolean;
  accountEmail?: string;
  accountName?: string;
}) {
  const setting = await getSetting();
  setting.mercadopagoAccessTokenEncrypted = encryptValue(data.accessToken);
  setting.mercadopagoRefreshTokenEncrypted = data.refreshToken ? encryptValue(data.refreshToken) : "";
  setting.mercadopagoTokenExpiresAt = data.expiresIn ? new Date(Date.now() + data.expiresIn * 1000) : null;
  setting.mercadopagoUserId = String(data.userId || "");
  setting.mercadopagoPublicKey = String(data.publicKey || "");
  setting.mercadopagoLiveMode = Boolean(data.liveMode);
  setting.mercadopagoConnectedAt = new Date();
  setting.mercadopagoConnectionState = "connected";
  setting.accountEmail = String(data.accountEmail || "");
  setting.accountName = String(data.accountName || "");
  setting.lastError = "";
  await setting.save();
  return setting;
}

async function refreshStoredToken(setting: any) {
  const refreshToken = decryptValue(String(setting.mercadopagoRefreshTokenEncrypted || ""));
  if (!refreshToken) {
    throw new Error("A conexão com o Mercado Pago precisa ser refeita.");
  }

  const response = await fetch("https://api.mercadopago.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: getClientId(),
      client_secret: getClientSecret(),
      refresh_token: refreshToken,
    }),
  });

  const rawText = await response.text().catch(() => "");
  let data: Record<string, any> | null = null;
  try {
    data = rawText ? JSON.parse(rawText) : null;
  } catch {
    data = null;
  }

  if (!response.ok || !data?.access_token) {
    throw new Error(rawText || "Não foi possível atualizar o token do Mercado Pago.");
  }

  await saveSettingConnection({
    accessToken: String(data.access_token),
    refreshToken: String(data.refresh_token || refreshToken),
    expiresIn: Number(data.expires_in || 0) || undefined,
    userId: data.user_id,
    publicKey: data.public_key,
    liveMode: data.live_mode,
    accountEmail: String(setting.accountEmail || ""),
    accountName: String(setting.accountName || ""),
  });

  return String(data.access_token);
}

export function buildMercadoPagoAuthorizationUrl(state: string) {
  const params = new URLSearchParams({
    client_id: getClientId(),
    response_type: "code",
    platform_id: "mp",
    state,
    redirect_uri: getRedirectUri(),
  });

  return `https://auth.mercadopago.com/authorization?${params.toString()}`;
}

export async function exchangeMercadoPagoCode(code: string) {
  const response = await fetch("https://api.mercadopago.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: getClientId(),
      client_secret: getClientSecret(),
      code,
      redirect_uri: getRedirectUri(),
    }),
  });

  const rawText = await response.text().catch(() => "");
  let data: Record<string, any> | null = null;
  try {
    data = rawText ? JSON.parse(rawText) : null;
  } catch {
    data = null;
  }

  if (!response.ok || !data?.access_token) {
    throw new Error(rawText || "Não foi possível autorizar a conta do Mercado Pago.");
  }

  return data;
}

export async function getStoredMercadoPagoAccessToken() {
  await connectMongo();
  const setting = await IntegrationSetting.findOne({ key: KEY }).lean();

  if (setting?.mercadopagoAccessTokenEncrypted) {
    const accessToken = decryptValue(String(setting.mercadopagoAccessTokenEncrypted));
    const expiresAt = setting.mercadopagoTokenExpiresAt ? new Date(setting.mercadopagoTokenExpiresAt).getTime() : 0;
    if (accessToken && (!expiresAt || expiresAt - Date.now() > 60_000)) {
      return accessToken;
    }

    if (accessToken) {
      return await refreshStoredToken(setting);
    }
  }

  throw new Error("Nenhuma conta Mercado Pago conectada. O administrador precisa autorizar a integração.");
}

export async function getMercadoPagoConnectionStatus() {
  await connectMongo();
  const setting = await IntegrationSetting.findOne({ key: KEY }).lean();
  return {
    connected: Boolean(setting?.mercadopagoAccessTokenEncrypted),
    connectedAt: setting?.mercadopagoConnectedAt || null,
    accountEmail: setting?.accountEmail || "",
    accountName: setting?.accountName || "",
    connectionState: setting?.mercadopagoConnectionState || "disconnected",
    webhookSecretConfigured: Boolean(process.env.MERCADO_PAGO_WEBHOOK_SECRET?.trim()),
    oauthConfigured: Boolean(
      process.env.MERCADO_PAGO_CLIENT_ID?.trim() &&
      process.env.MERCADO_PAGO_CLIENT_SECRET?.trim()
    ),
    callbackUrl: getRedirectUri(),
  };
}

export async function saveMercadoPagoConnectionFromToken(data: {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  userId?: string | number;
  publicKey?: string;
  liveMode?: boolean;
  accountEmail?: string;
  accountName?: string;
}) {
  return saveSettingConnection(data);
}
