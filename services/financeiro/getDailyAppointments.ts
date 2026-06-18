import { connectMongo } from "@/lib/mongodb";
import Booking from "@/models/Appointment";
import "@/models/Patient";
import type { FinancialAppointment, FinancialFilters } from "@/types/financeiro";

type AnyRecord = Record<string, any>;

function asString(value: unknown) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return String(value);
}

function resolveName(value: AnyRecord | string | null | undefined) {
  if (!value) return "—";
  if (typeof value === "string") return value;
  return value.name || value.email || "—";
}

function resolvePaymentStatus(booking: AnyRecord) {
  const paymentStatus = String(booking.paymentStatus || booking.paymentId?.status || "pending");
  if (paymentStatus === "paid" || paymentStatus === "approved" || paymentStatus === "cancelled" || paymentStatus === "failed" || paymentStatus === "refunded") {
    return paymentStatus as FinancialAppointment["paymentStatus"];
  }
  if (paymentStatus === "rejected" || paymentStatus === "expired") {
    return paymentStatus as FinancialAppointment["paymentStatus"];
  }
  return "pending";
}

export async function getDailyAppointments(filters: FinancialFilters) {
  await connectMongo();

  const query: Record<string, unknown> = { date: filters.date };
  if (filters.barberId) query.barberId = filters.barberId;
  if (filters.serviceId) query.serviceId = filters.serviceId;
  if (filters.appointmentStatus) query.status = filters.appointmentStatus;
  if (filters.paymentStatus) query.paymentStatus = filters.paymentStatus;

  const bookings = await Booking.find(query)
    .populate("barberId")
    .populate("clientId")
    .populate("serviceId")
    .populate("paymentId")
    .lean();

  return bookings.map((booking: AnyRecord) => {
    const amount = Number(booking.serviceId?.price || 0);
    const payment = booking.paymentId || null;
    const paymentStatus = resolvePaymentStatus(booking);

    return {
      id: asString(booking._id),
      date: asString(booking.date),
      time: asString(booking.time),
      clientId: asString(booking.clientId?._id || booking.clientId),
      clientName: resolveName(booking.clientId),
      barberId: asString(booking.barberId?._id || booking.barberId),
      barberName: resolveName(booking.barberId),
      serviceId: asString(booking.serviceId?._id || booking.serviceId),
      serviceName: resolveName(booking.serviceId),
      amount,
      appointmentStatus: booking.status || "AGENDADA",
      paymentStatus,
      paymentMethod: payment?.method || "",
      paymentProvider: payment?.provider || "",
      paymentCode: payment?.providerPaymentId || "",
      paymentId: asString(payment?._id || booking.paymentId || ""),
      paymentAt: payment?.paidAt ? new Date(payment.paidAt).toISOString() : payment?.confirmedAt ? new Date(payment.confirmedAt).toISOString() : null,
      paymentError: payment?.metadata?.error || payment?.lastError || "",
      notes: booking.notes || "",
    } satisfies FinancialAppointment;
  });
}
