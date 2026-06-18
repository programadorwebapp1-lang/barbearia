"use client";

import { Button, Modal } from "@/components/system-ui";

export function PaymentDetailsModal({
  open,
  item,
  onClose,
}: {
  open: boolean;
  item: any | null;
  onClose: () => void;
}) {
  if (!open || !item) return null;

  const rows = [
    ["Cliente", item.clientName],
    ["Serviço", item.serviceName],
    ["Valor", item.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })],
    ["Forma de pagamento", item.paymentMethod || "—"],
    ["Status", item.paymentStatus],
    ["Código Mercado Pago", item.paymentCode || "—"],
    ["Data/hora do pagamento", item.paymentAt ? new Date(item.paymentAt).toLocaleString("pt-BR") : "—"],
    ["Erro", item.paymentError || "—"],
  ];

  return (
    <Modal title="Detalhes do pagamento" onClose={onClose} wide>
      <div className="space-y-3 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 border-b border-slate-50 py-2">
            <span className="text-slate-500">{label}</span>
            <span className="text-slate-800 text-right">{value}</span>
          </div>
        ))}
      </div>
      <div className="flex justify-end mt-6">
        <Button variant="secondary" onClick={onClose}>
          Fechar
        </Button>
      </div>
    </Modal>
  );
}
