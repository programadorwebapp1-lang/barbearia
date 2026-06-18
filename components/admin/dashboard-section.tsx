import { Calendar, RefreshCw, Scissors, ShoppingBag, Users } from "lucide-react";
import { Button, Card, Empty, StatCard } from "@/components/system-ui";
import { PaginationBar as AdminPaginationBar } from "@/components/admin/pagination-bar";
import { resolveBarberName, resolveClientName, resolveServiceName } from "@/components/admin/utils";

type AnyRecord = Record<string, any>;

export function DashboardSection({
  stats,
  appointments,
  bookingsPage,
  bookingsTotalPages,
  bookingsTotal,
  onRefresh,
  onPageChange,
}: {
  stats: { doctors: number; patients: number; specialties: number; appointments: number };
  appointments: AnyRecord[];
  bookingsPage: number;
  bookingsTotalPages: number;
  bookingsTotal: number;
  onRefresh: () => void;
  onPageChange: (delta: number) => void;
}) {
  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 rounded-[1.75rem] border border-amber-100 bg-white/85 p-4 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-100 bg-amber-50 shadow-sm">
            <Scissors className="h-7 w-7 text-amber-700" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">Carvalho Barbearia</p>
            <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
            <p className="text-sm text-slate-500">Visão geral da barbearia</p>
          </div>
        </div>
        <Button variant="secondary" onClick={onRefresh} className="sm:self-start">
          <RefreshCw className="w-4 h-4" />
          Atualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard label="Barbeiros ativos" value={stats.doctors} icon={Scissors} color="bg-orange-50 text-orange-600" />
        <StatCard label="Clientes ativos" value={stats.patients} icon={Users} color="bg-violet-50 text-violet-600" />
        <StatCard label="Serviços" value={stats.specialties} icon={ShoppingBag} color="bg-emerald-50 text-emerald-600" />
        <StatCard label="Agendamentos" value={stats.appointments} icon={Calendar} color="bg-amber-50 text-amber-600" />
      </div>

      <Card>
        <div className="px-5 py-4 border-b border-slate-50">
          <h2 className="font-semibold text-slate-800">Agendamentos registrados</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {["Data", "Hora", "Cliente", "Barbeiro", "Serviço", "Status"].map((item) => (
                  <th key={item} className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide px-4 py-3">
                    {item}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {appointments.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <Empty label="Nenhum agendamento registrado." />
                  </td>
                </tr>
              ) : (
                appointments.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 text-slate-600 text-xs">{item.date}</td>
                    <td className="px-4 py-3 font-mono text-xs font-medium text-slate-700">{item.time}</td>
                    <td className="px-4 py-3 text-slate-700">{resolveClientName(item)}</td>
                    <td className="px-4 py-3 text-slate-600">{resolveBarberName(item)}</td>
                    <td className="px-4 py-3 text-slate-500">{resolveServiceName(item)}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <AdminPaginationBar
        section="bookings"
        current={bookingsPage}
        totalPages={bookingsTotalPages}
        total={bookingsTotal}
        onChange={onPageChange}
      />
    </div>
  );
}
