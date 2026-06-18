"use client";

import { Card, Input, Select } from "@/components/system-ui";
import type { FinancialFilters } from "@/types/financeiro";

type Option = { _id: string; name: string; price?: number };

export function FinancialFilters({
  value,
  barbers,
  services,
  onChange,
}: {
  value: FinancialFilters;
  barbers: Option[];
  services: Option[];
  onChange: (next: FinancialFilters) => void;
}) {
  function update(key: keyof FinancialFilters, nextValue: string) {
    onChange({ ...value, [key]: nextValue });
  }

  return (
    <Card className="p-5">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Data</span>
          <Input type="date" value={value.date} onChange={(e) => update("date", e.target.value)} />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Barbeiro</span>
          <Select value={value.barberId} onChange={(e) => update("barberId", e.target.value)}>
            <option value="">Todos</option>
            {barbers.map((item) => (
              <option key={item._id} value={item._id}>
                {item.name}
              </option>
            ))}
          </Select>
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Serviço</span>
          <Select value={value.serviceId} onChange={(e) => update("serviceId", e.target.value)}>
            <option value="">Todos</option>
            {services.map((item) => (
              <option key={item._id} value={item._id}>
                {item.name}
              </option>
            ))}
          </Select>
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Pagamento</span>
          <Select value={value.paymentStatus} onChange={(e) => update("paymentStatus", e.target.value)}>
            <option value="">Todos</option>
            <option value="paid">Pago</option>
            <option value="pending">Pendente</option>
            <option value="failed">Falhou</option>
            <option value="cancelled">Cancelado</option>
            <option value="refunded">Reembolsado</option>
          </Select>
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Agendamento</span>
          <Select value={value.appointmentStatus} onChange={(e) => update("appointmentStatus", e.target.value)}>
            <option value="">Todos</option>
            <option value="AGENDADA">Agendado</option>
            <option value="CONFIRMADA">Confirmado</option>
            <option value="EM_ATENDIMENTO">Em atendimento</option>
            <option value="FINALIZADA">Concluído</option>
            <option value="CANCELADA">Cancelado</option>
            <option value="NAO_COMPARECEU">Não compareceu</option>
          </Select>
        </label>
      </div>
    </Card>
  );
}
