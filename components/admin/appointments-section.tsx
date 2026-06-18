import { Card, Empty, PageHeader, Select } from "@/components/system-ui";
import { PaginationBar as AdminPaginationBar } from "@/components/admin/pagination-bar";
import { resolveBarberName, resolveClientName, resolveServiceName } from "@/components/admin/utils";

type AnyRecord = Record<string, any>;

export function AppointmentsSection({
  appointments,
  page,
  totalPages,
  total,
  onChangePage,
  onStatusChange,
}: {
  appointments: AnyRecord[];
  page: number;
  totalPages: number;
  total: number;
  onChangePage: (delta: number) => void;
  onStatusChange: (appointmentId: string, status: string) => void;
}) {
  return (
    <div>
      <PageHeader title="Agendamentos" sub="Status e histórico " />
      <Card>
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
                    <Empty label="Nenhum agendamento encontrado." />
                  </td>
                </tr>
              ) : (
                appointments.map((item) => (
                  <tr key={item._id}>
                    <td className="px-4 py-3 text-slate-600 text-xs">{item.date}</td>
                    <td className="px-4 py-3 font-mono text-xs font-medium text-slate-700">{item.time}</td>
                    <td className="px-4 py-3 text-slate-800 font-medium">{resolveClientName(item)}</td>
                    <td className="px-4 py-3 text-slate-600">{resolveBarberName(item)}</td>
                    <td className="px-4 py-3 text-slate-500">{resolveServiceName(item)}</td>
                    <td className="px-4 py-3">
                      <Select
                        value={item.status}
                        onChange={(e) => onStatusChange(item._id, e.target.value)}
                        className="max-w-44"
                      >
                        {["AGENDADA", "CONFIRMADA", "EM_ATENDIMENTO", "FINALIZADA", "CANCELADA"].map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </Select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <AdminPaginationBar section="bookings" current={page} totalPages={totalPages} total={total} onChange={onChangePage} />
    </div>
  );
}
