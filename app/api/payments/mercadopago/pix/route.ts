import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { getSessionUser } from "@/lib/guards";
import Booking from "@/models/Appointment";
import Service from "@/models/Specialty";
import Payment from "@/models/Payment";
import ProductOrder from "@/models/ProductOrder";
import Product from "@/models/Product";
import { createMercadoPagoPixPayment } from "@/lib/mercadopago";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session || session.role !== "CLIENTE") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectMongo();
  const body = await req.json().catch(() => null);
  const bookingId = String(body?.bookingId || "");
  const orderId = String(body?.orderId || "");
  const paymentType = bookingId ? "service_booking" : orderId ? "product_order" : "";

  if (!paymentType) {
    return NextResponse.json({ error: "Agendamento ou pedido é obrigatório." }, { status: 400 });
  }

  let amount = 0;
  let description = "";
  let externalReference = "";
  let metadata: Record<string, unknown> = {
    system: "barbearia",
    type: paymentType,
    clientId: session.clientId,
  };
  let booking: any = null;
  let order: any = null;
  let service: any = null;
  let product: any = null;
  let payerEmail = String(session.email || "");

  if (paymentType === "service_booking") {
    booking = await Booking.findById(bookingId).populate("clientId").populate("serviceId").lean();
    if (!booking || String(booking.clientId?._id || booking.clientId) !== session.clientId) {
      return NextResponse.json({ error: "Agendamento não encontrado." }, { status: 404 });
    }

    if (booking.status === "CANCELADA") {
      return NextResponse.json({ error: "Não é possível pagar um agendamento cancelado." }, { status: 409 });
    }

    service = await Service.findById(booking.serviceId?._id || booking.serviceId).lean();
    if (!service || !service.active) {
      return NextResponse.json({ error: "Serviço indisponível." }, { status: 409 });
    }

    amount = Number(service.price);
    description = `${service.name} - agendamento ${booking.date} ${booking.time}`;
    externalReference = `barbearia_service_booking_${booking._id}`;
    payerEmail = String(booking.clientId?.email || session.email || "");
    metadata = {
      ...metadata,
      bookingId: booking._id,
      orderId: null,
      clientId: booking.clientId?._id || booking.clientId,
      serviceId: service._id,
      productId: null,
    };
  } else {
    order = await ProductOrder.findById(orderId).populate("clientId").lean();
    if (!order || String(order.clientId?._id || order.clientId) !== session.clientId) {
      return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
    }
    if (["cancelled", "paid"].includes(String(order.status))) {
      return NextResponse.json({ error: "Não é possível pagar este pedido." }, { status: 409 });
    }

    const orderProductId = String(order.items?.[0]?.productId || "");
    product = await Product.findById(orderProductId).lean();
    if (!product || product.status !== "active") {
      return NextResponse.json({ error: "Produto indisponível." }, { status: 409 });
    }

    amount = Number(order.totalAmount);
    description = `Pedido de produto ${order._id}`;
    externalReference = `barbearia_product_order_${order._id}`;
    payerEmail = String(order.clientId?.email || session.email || "");
    metadata = {
      ...metadata,
      bookingId: null,
      orderId: order._id,
      clientId: order.clientId?._id || order.clientId,
      serviceId: null,
      productId: product._id,
    };
  }

  const notificationUrl = `${process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "") || ""}/api/webhooks/mercadopago`;

  try {
    const paymentResponse = await createMercadoPagoPixPayment({
      amount,
      description,
      payerEmail,
      externalReference,
      notificationUrl,
      metadata,
    });

    const paymentClientId = paymentType === "service_booking"
      ? booking.clientId?._id || booking.clientId
      : order.clientId?._id || order.clientId;
    const paymentBarbershopId = paymentType === "service_booking"
      ? booking.barbershopId || null
      : order.barbershopId || null;

    const payment = await Payment.create({
      type: paymentType,
      bookingId: booking?._id || null,
      orderId: order?._id || null,
      clientId: paymentClientId,
      barbershopId: paymentBarbershopId,
      serviceId: booking?.serviceId?._id || booking?.serviceId || null,
      productId: product?._id || null,
      amount,
      method: "pix",
      provider: "mercadopago",
      providerPaymentId: paymentResponse.id,
      status: paymentResponse.status === "approved" ? "approved" : "pending",
      qrCode: paymentResponse.qrCode || "",
      qrCodeBase64: paymentResponse.qrCodeBase64 || "",
      pixCopyPaste: paymentResponse.qrCode || "",
      metadata,
    });

    if (payment.type === "service_booking" && booking) {
      await Booking.findByIdAndUpdate(booking._id, {
        paymentStatus: "pending",
        paymentId: payment._id,
      });
    }

    if (payment.type === "product_order" && order) {
      await ProductOrder.findByIdAndUpdate(order._id, {
        paymentStatus: "pending",
        paymentId: payment._id,
      });
    }

    return NextResponse.json({
      paymentId: payment._id,
      providerPaymentId: payment.providerPaymentId,
      qrCode: payment.qrCode,
      qrCodeBase64: payment.qrCodeBase64,
      pixCopyPaste: payment.pixCopyPaste,
      status: payment.status,
      amount: payment.amount,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao gerar Pix." }, { status: 500 });
  }
}
