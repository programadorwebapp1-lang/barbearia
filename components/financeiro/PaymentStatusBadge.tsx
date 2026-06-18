import type { FinancialPaymentStatus } from "@/types/financeiro";

const styles: Record<FinancialPaymentStatus, string> = {
  approved: "bg-emerald-50 text-emerald-700 border-emerald-100",
  paid: "bg-emerald-50 text-emerald-700 border-emerald-100",
  pending: "bg-amber-50 text-amber-700 border-amber-100",
  cancelled: "bg-slate-100 text-slate-600 border-slate-200",
  failed: "bg-red-50 text-red-700 border-red-100",
  refunded: "bg-violet-50 text-violet-700 border-violet-100",
  rejected: "bg-red-50 text-red-700 border-red-100",
  expired: "bg-slate-100 text-slate-600 border-slate-200",
};

const labels: Record<FinancialPaymentStatus, string> = {
  approved: "Pago",
  paid: "Pago",
  pending: "Pendente",
  cancelled: "Cancelado",
  failed: "Falhou",
  refunded: "Reembolsado",
  rejected: "Falhou",
  expired: "Cancelado",
};

export function PaymentStatusBadge({ status }: { status: FinancialPaymentStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${styles[status] || styles.pending}`}>
      {labels[status] || "Pendente"}
    </span>
  );
}
