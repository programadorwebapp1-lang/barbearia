import type { FinancialAppointment, FinancialSummary } from "@/types/financeiro";

function formatMoney(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function exportFinancialReport(appointments: FinancialAppointment[], summary: FinancialSummary) {
  const lines = [
    ["Resumo financeiro do dia"],
    [`Total vendido hoje;${formatMoney(summary.totalSoldToday)}`],
    [`Total recebido hoje;${formatMoney(summary.totalReceivedToday)}`],
    [`Total pendente;${formatMoney(summary.totalPending)}`],
    [`Agendamentos pagos;${summary.paidCount}`],
    [`Agendamentos pendentes;${summary.pendingCount}`],
    [`Agendamentos cancelados;${summary.cancelledCount}`],
    [""],
    ["Horário;Cliente;Barbeiro;Serviço;Valor;Status agendamento;Status pagamento;Forma de pagamento;Código pagamento"],
    ...appointments.map((item) => [
      item.time,
      item.clientName,
      item.barberName,
      item.serviceName,
      formatMoney(item.amount),
      item.appointmentStatus,
      item.paymentStatus,
      item.paymentMethod || "—",
      item.paymentCode || "—",
    ].join(";")),
  ];

  return lines.flat().join("\n");
}
