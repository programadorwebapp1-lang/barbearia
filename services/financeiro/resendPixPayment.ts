import { connectMongo } from "@/lib/mongodb";
import Booking from "@/models/Appointment";
import Payment from "@/models/Payment";
import Service from "@/models/Specialty";
import { createMercadoPagoPixPayment } from "@/lib/mercadopago";

type ResendPixPaymentInput = {
  bookingId: string;
  appUrl: string;
};

export async function resendPixPayment(input: ResendPixPaymentInput) {
  await connectMongo();

  const booking = await Booking.findById(input.bookingId).populate("clientId").populate("serviceId");
  if (!booking) {
    throw new Error("Agendamento não encontrado.");
  }
  if (booking.status === "CANCELADA") {
    throw new Error("Não é possível reenviar Pix para um agendamento cancelado.");
  }

  const service = await Service.findById((booking as any).serviceId?._id || booking.serviceId).lean();
  if (!service || !service.active) {
    throw new Error("Serviço indisponível.");
  }

  const amount = Number(service.price || 0);
  const payerEmail = String((booking as any).clientId?.email || "");
  const paymentResponse = await createMercadoPagoPixPayment({
    amount,
    description: `${service.name} - agendamento ${booking.date} ${booking.time}`,
    payerEmail,
    externalReference: `barbearia_service_booking_${booking._id}_${Date.now()}`,
    notificationUrl: `${input.appUrl.replace(/\/+$/, "")}/api/webhooks/mercadopago`,
    metadata: {
      system: "barbearia",
      type: "service_booking",
      bookingId: booking._id,
      clientId: booking.clientId,
      serviceId: booking.serviceId,
    },
  });

  const payment = booking.paymentId ? await Payment.findById(booking.paymentId) : null;
  const nextPayment = payment || new Payment();
  nextPayment.type = "service_booking";
  nextPayment.bookingId = booking._id;
  nextPayment.orderId = null;
  nextPayment.clientId = booking.clientId;
  nextPayment.barbershopId = booking.barbershopId || null;
  nextPayment.serviceId = booking.serviceId;
  nextPayment.productId = null;
  nextPayment.amount = amount;
  nextPayment.method = "pix";
  nextPayment.provider = "mercadopago";
  nextPayment.providerPaymentId = paymentResponse.id;
  nextPayment.status = "pending";
  nextPayment.qrCode = paymentResponse.qrCode || "";
  nextPayment.qrCodeBase64 = paymentResponse.qrCodeBase64 || "";
  nextPayment.pixCopyPaste = paymentResponse.qrCode || "";
  nextPayment.metadata = {
    system: "barbearia",
    type: "service_booking",
    bookingId: booking._id,
    clientId: booking.clientId,
    serviceId: booking.serviceId,
  };
  nextPayment.paidAt = null;
  await nextPayment.save();

  booking.paymentStatus = "pending";
  booking.paymentId = nextPayment._id;
  await booking.save();

  return { booking, payment: nextPayment.toObject() };
}
