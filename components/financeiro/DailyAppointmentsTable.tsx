"use client";

import { Eye, HandCoins } from "lucide-react";
import { Button, Card, Empty } from "@/components/system-ui";
import { AppointmentStatusBadge } from "./AppointmentStatusBadge";
import { PaymentStatusBadge } from "./PaymentStatusBadge";
import { ResendPixButton } from "./ResendPixButton";
import type { FinancialAppointment } from "@/types/financeiro";

function money(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function DailyAppointmentsTable({
  items,
  onViewDetails,
  onConfirmManual,
  onResendPix,
}: {
  items: FinancialAppointment[];
  onViewDetails: (item: FinancialAppointment) => void;
  onConfirmManual: (item: FinancialAppointment) => void;
  onResendPix: (item: FinancialAppointment) => Promise<void>;
}) {
  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              {["Horário", "Cliente", "Barbeiro", "Serviço", "Valor", "Status do agendamento", "Status do pagamento", "Forma de pagamento", "Ações"].map((item) => (
                <th key={item} className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide px-4 py-3">
                  {item}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {items.length === 0 ? (
              <tr>
                <td colSpan={9}>
                  <Empty label="Nenhum agendamento encontrado para os filtros selecionados." />
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/40 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs font-medium text-slate-700">{item.time}</td>
                  <td className="px-4 py-3 text-slate-800 font-medium">{item.clientName}</td>
                  <td className="px-4 py-3 text-slate-600">{item.barberName}</td>
                  <td className="px-4 py-3 text-slate-500">{item.serviceName}</td>
                  <td className="px-4 py-3 text-slate-800 font-medium">{money(item.amount)}</td>
                  <td className="px-4 py-3"><AppointmentStatusBadge status={item.appointmentStatus} /></td>
                  <td className="px-4 py-3"><PaymentStatusBadge status={item.paymentStatus} /></td>
                  <td className="px-4 py-3 text-slate-600">{item.paymentMethod || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => onViewDetails(item)}>
                        <Eye className="w-3.5 h-3.5" />
                        Detalhes
                      </Button>
                      {item.paymentStatus === "pending" && item.paymentProvider === "mercadopago" && (
                        <ResendPixButton onClick={() => onResendPix(item)} />
                      )}
                      {item.paymentStatus !== "approved" && item.appointmentStatus !== "CANCELADA" && (
                        <Button variant="secondary" size="sm" onClick={() => onConfirmManual(item)}>
                          <HandCoins className="w-3.5 h-3.5" />
                          Confirmar manual
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
