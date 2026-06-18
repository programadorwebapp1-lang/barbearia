import type { FinancialAppointmentStatus } from "@/types/financeiro";

const styles: Record<FinancialAppointmentStatus, string> = {
  AGENDADA: "bg-sky-50 text-sky-700 border-sky-100",
  CONFIRMADA: "bg-emerald-50 text-emerald-700 border-emerald-100",
  EM_ATENDIMENTO: "bg-orange-50 text-orange-700 border-orange-100",
  FINALIZADA: "bg-violet-50 text-violet-700 border-violet-100",
  CANCELADA: "bg-slate-100 text-slate-600 border-slate-200",
  NAO_COMPARECEU: "bg-red-50 text-red-700 border-red-100",
};

const labels: Record<FinancialAppointmentStatus, string> = {
  AGENDADA: "Agendado",
  CONFIRMADA: "Confirmado",
  EM_ATENDIMENTO: "Em atendimento",
  FINALIZADA: "Concluído",
  CANCELADA: "Cancelado",
  NAO_COMPARECEU: "Não compareceu",
};

export function AppointmentStatusBadge({ status }: { status: FinancialAppointmentStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${styles[status] || styles.AGENDADA}`}>
      {labels[status] || "Agendado"}
    </span>
  );
}
