import { Banknote, CalendarCheck2, CircleDollarSign, Clock3, Hourglass, XCircle } from "lucide-react";
import { StatCard } from "@/components/system-ui";

export function FinancialSummaryCards({
  totalSoldToday,
  totalReceivedToday,
  totalPending,
  paidCount,
  pendingCount,
  cancelledCount,
}: {
  totalSoldToday: number;
  totalReceivedToday: number;
  totalPending: number;
  paidCount: number;
  pendingCount: number;
  cancelledCount: number;
}) {
  const money = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      <StatCard label="Total vendido hoje" value={money(totalSoldToday)} icon={CircleDollarSign} color="bg-orange-50 text-orange-600" />
      <StatCard label="Total recebido hoje" value={money(totalReceivedToday)} icon={Banknote} color="bg-emerald-50 text-emerald-600" />
      <StatCard label="Total pendente" value={money(totalPending)} icon={Hourglass} color="bg-amber-50 text-amber-600" />
      <StatCard label="Agendamentos pagos" value={paidCount} icon={CalendarCheck2} color="bg-violet-50 text-violet-600" />
      <StatCard label="Agendamentos pendentes" value={pendingCount} icon={Clock3} color="bg-sky-50 text-sky-600" />
      <StatCard label="Agendamentos cancelados" value={cancelledCount} icon={XCircle} color="bg-slate-100 text-slate-600" />
    </div>
  );
}
