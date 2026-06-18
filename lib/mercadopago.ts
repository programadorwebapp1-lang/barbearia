import crypto from "node:crypto";
import { getStoredMercadoPagoAccessToken } from "./mercadopago-connection";

type MercadoPagoPixInput = {
  amount: number;
  description: string;
  payerEmail: string;
  externalReference: string;
  notificationUrl: string;
  metadata?: Record<string, unknown>;
};

type MercadoPagoPixResult = {
  id: string;
  status: string;
  qr_code?: string;
  qr_code_base64?: string;
  point_of_interaction?: {
    transaction_data?: {
      qr_code?: string;
      qr_code_base64?: string;
    };
  };
};

export async function createMercadoPagoPixPayment(input: MercadoPagoPixInput) {
  const accessToken = await getStoredMercadoPagoAccessToken();
  const idempotencyKey = crypto
    .createHash("sha256")
    .update(
      [
        input.externalReference,
        input.amount.toFixed(2),
        input.payerEmail,
        input.notificationUrl,
      ].join("|")
    )
    .digest("hex");

  const response = await fetch("https://api.mercadopago.com/v1/payments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({
      transaction_amount: input.amount,
      description: input.description,
      payment_method_id: "pix",
      payer: {
        email: input.payerEmail,
      },
      notification_url: input.notificationUrl,
      external_reference: input.externalReference,
      metadata: input.metadata,
      binary_mode: true,
    }),
  });

  const rawText = await response.text().catch(() => "");
  let data: MercadoPagoPixResult | null = null;
  try {
    data = rawText ? (JSON.parse(rawText) as MercadoPagoPixResult) : null;
  } catch {
    data = null;
  }
  if (!response.ok || !data?.id) {
    const message = rawText || "";
    throw new Error(message || "Não foi possível gerar o Pix no Mercado Pago.");
  }

  const qrCode = data.point_of_interaction?.transaction_data?.qr_code || data.qr_code || "";
  const qrCodeBase64 = data.point_of_interaction?.transaction_data?.qr_code_base64 || data.qr_code_base64 || "";

  return {
    id: String(data.id),
    status: data.status,
    qrCode,
    qrCodeBase64,
    raw: data,
  };
}

export async function getMercadoPagoPayment(paymentId: string) {
  const accessToken = await getStoredMercadoPagoAccessToken();
  const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const rawText = await response.text().catch(() => "");
  let data: Record<string, any> | null = null;
  try {
    data = rawText ? JSON.parse(rawText) : null;
  } catch {
    data = null;
  }
  if (!response.ok || !data) {
    throw new Error("Não foi possível consultar o pagamento no Mercado Pago.");
  }

  return data as Record<string, any>;
}

export async function getMercadoPagoAccount() {
  const accessToken = await getStoredMercadoPagoAccessToken();
  const response = await fetch("https://api.mercadopago.com/users/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const rawText = await response.text().catch(() => "");
  let data: Record<string, any> | null = null;
  try {
    data = rawText ? JSON.parse(rawText) : null;
  } catch {
    data = null;
  }

  if (!response.ok || !data) {
    throw new Error("Não foi possível validar a conta do Mercado Pago.");
  }

  return data;
}
