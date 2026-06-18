import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import Payment from "@/models/Payment";
import Booking from "@/models/Appointment";
import ProductOrder from "@/models/ProductOrder";
import Product from "@/models/Product";
import { getMercadoPagoPayment } from "@/lib/mercadopago";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function webhookSecretValid(req: NextRequest) {
  const expected = process.env.MERCADO_PAGO_WEBHOOK_SECRET?.trim();
  if (!expected) return true;
  const received = req.headers.get("x-webhook-secret") || req.nextUrl.searchParams.get("secret") || "";
  return received === expected;
}

export async function POST(req: NextRequest) {
  if (!(await webhookSecretValid(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectMongo();
  const body = await req.json().catch(() => null);
  const paymentId = String(body?.data?.id || body?.id || req.nextUrl.searchParams.get("data.id") || "");

  if (!paymentId) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const remotePayment = await getMercadoPagoPayment(paymentId);
  const metadata = (remotePayment.metadata && typeof remotePayment.metadata === "object" ? remotePayment.metadata : {}) as Record<string, any>;

  if (metadata.system !== "barbearia") {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const paymentType = metadata.type === "product_order" ? "product_order" : metadata.type === "service_booking" ? "service_booking" : "";
  if (!paymentType) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const payment = await Payment.findOneAndUpdate(
    { providerPaymentId: String(remotePayment.id) },
    {
      status: String(remotePayment.status || "pending"),
      qrCode: remotePayment.point_of_interaction?.transaction_data?.qr_code || remotePayment.qr_code || "",
      qrCodeBase64: remotePayment.point_of_interaction?.transaction_data?.qr_code_base64 || remotePayment.qr_code_base64 || "",
      pixCopyPaste: remotePayment.point_of_interaction?.transaction_data?.qr_code || remotePayment.qr_code || "",
      paidAt: remotePayment.status === "approved" ? new Date() : null,
    },
    { new: true }
  );

  if (!payment) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  if (remotePayment.status === "approved") {
    if (paymentType === "service_booking" && payment.bookingId) {
      await Booking.findByIdAndUpdate(payment.bookingId, {
        paymentStatus: "paid",
        paymentId: payment._id,
        status: "CONFIRMADA",
      });
    }

    if (paymentType === "product_order" && payment.orderId) {
      const order = await ProductOrder.findById(payment.orderId).lean();
      if (order && String(order.paymentStatus) !== "paid") {
        for (const item of order.items || []) {
          const updated = await Product.updateOne(
            { _id: item.productId, stock: { $gte: item.quantity } },
            { $inc: { stock: -item.quantity } }
          );
          if (!updated.modifiedCount) {
            return NextResponse.json({ ok: true, skipped: true, reason: "insufficient_stock" });
          }
        }

        await ProductOrder.findByIdAndUpdate(payment.orderId, {
          paymentStatus: "paid",
          paymentId: payment._id,
          status: "paid",
        });
      }
    }
  }

  if (["rejected", "cancelled", "expired"].includes(String(remotePayment.status))) {
    if (paymentType === "service_booking" && payment.bookingId) {
      await Booking.findByIdAndUpdate(payment.bookingId, {
        paymentStatus: remotePayment.status === "rejected" ? "failed" : "cancelled",
        paymentId: payment._id,
        status: "CANCELADA",
      });
    }

    if (paymentType === "product_order" && payment.orderId) {
      await ProductOrder.findByIdAndUpdate(payment.orderId, {
        paymentStatus: remotePayment.status === "rejected" ? "failed" : "cancelled",
        paymentId: payment._id,
        status: "cancelled",
      });
    }
  }

  return NextResponse.json({ ok: true });
}
