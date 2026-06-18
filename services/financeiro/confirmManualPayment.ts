import { connectMongo } from "@/lib/mongodb";
import Booking from "@/models/Appointment";
import Payment from "@/models/Payment";
import type { FinancialPaymentMethod } from "@/types/financeiro";

type ConfirmManualPaymentInput = {
  bookingId: string;
  method: FinancialPaymentMethod;
  adminId: string;
  adminName: string;
};

function getPaymentReference(bookingId: string) {
  return `manual_${bookingId}_${Date.now()}`;
}

export async function confirmManualPayment(input: ConfirmManualPaymentInput) {
  await connectMongo();

  const booking = await Booking.findById(input.bookingId).populate("clientId").populate("serviceId");
  if (!booking) {
    throw new Error("Agendamento não encontrado.");
  }
  if (booking.status === "CANCELADA") {
    throw new Error("Não é possível confirmar pagamento de um agendamento cancelado.");
  }

  const amount = Number((booking as any).serviceId?.price || 0);
  if (!amount) {
    throw new Error("Serviço sem valor definido.");
  }

  const paymentId = booking.paymentId ? String(booking.paymentId) : "";
  const payment = paymentId ? await Payment.findById(paymentId) : null;
  const now = new Date();

  const nextPayment = payment || new Payment();
  nextPayment.type = "service_booking";
  nextPayment.bookingId = booking._id;
  nextPayment.orderId = null;
  nextPayment.clientId = (booking as any).clientId?._id || booking.clientId;
  nextPayment.barbershopId = booking.barbershopId || null;
  nextPayment.serviceId = (booking as any).serviceId?._id || booking.serviceId;
  nextPayment.productId = null;
  nextPayment.amount = amount;
  nextPayment.method = input.method;
  nextPayment.provider = "manual";
  nextPayment.providerPaymentId = payment?.providerPaymentId || getPaymentReference(String(booking._id));
  nextPayment.status = "approved";
  nextPayment.qrCode = "";
  nextPayment.qrCodeBase64 = "";
  nextPayment.pixCopyPaste = "";
  nextPayment.metadata = { system: "barbearia", type: "service_booking", manual: true };
  nextPayment.paidAt = now;
  nextPayment.confirmedAt = now;
  nextPayment.confirmedBy = input.adminId;
  nextPayment.confirmedByName = input.adminName;
  await nextPayment.save();

  booking.paymentStatus = "paid";
  booking.paymentId = nextPayment._id;
  if (booking.status === "AGENDADA") {
    booking.status = "CONFIRMADA";
  }
  await booking.save();

  return { booking, payment: nextPayment.toObject() };
}
