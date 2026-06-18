import type { FinancialAppointment, FinancialSummary } from "@/types/financeiro";

export function getFinancialSummary(appointments: FinancialAppointment[]): FinancialSummary {
  const paid = appointments.filter((item) => item.paymentStatus === "approved" || item.paymentStatus === "paid");
  const pending = appointments.filter((item) => item.paymentStatus === "pending");
  const cancelled = appointments.filter((item) => item.appointmentStatus === "CANCELADA");

  return {
    totalSoldToday: appointments.reduce((sum, item) => (item.appointmentStatus === "CANCELADA" ? sum : sum + item.amount), 0),
    totalReceivedToday: paid.reduce((sum, item) => (item.appointmentStatus === "CANCELADA" ? sum : sum + item.amount), 0),
    totalPending: pending.reduce((sum, item) => sum + item.amount, 0),
    paidCount: paid.length,
    pendingCount: pending.length,
    cancelledCount: cancelled.length,
  };
}
