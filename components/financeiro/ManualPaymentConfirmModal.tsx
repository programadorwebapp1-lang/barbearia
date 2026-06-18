"use client";

import { useState } from "react";
import { Button, Modal, Select } from "@/components/system-ui";
import { fireSwal } from "@/lib/swal";

export function ManualPaymentConfirmModal({
  open,
  item,
  onClose,
  onConfirm,
}: {
  open: boolean;
  item: any | null;
  onClose: () => void;
  onConfirm: (method: "cash" | "external_pix" | "card") => Promise<void>;
}) {
  const [method, setMethod] = useState<"cash" | "external_pix" | "card">("cash");

  if (!open || !item) return null;

  return (
    <Modal title="Confirmar pagamento manual" onClose={onClose}>
      <div className="space-y-4">
        <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 text-sm text-slate-700">
          <p className="font-medium">{item.clientName}</p>
          <p className="mt-1">{item.serviceName}</p>
          <p className="mt-1">{item.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
        </div>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Forma de pagamento</span>
          <Select value={method} onChange={(e) => setMethod(e.target.value as "cash" | "external_pix" | "card")}>
            <option value="cash">Dinheiro</option>
            <option value="external_pix">Pix externo</option>
            <option value="card">Cartão na maquininha</option>
          </Select>
        </label>
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          onClick={async () => {
            const result = await fireSwal({
              icon: "question",
              title: "Confirmar pagamento?",
              text: "Essa ação marcará o agendamento como pago.",
              showCancelButton: true,
              confirmButtonText: "Sim, confirmar",
              cancelButtonText: "Cancelar",
            });
            if (!result.isConfirmed) return;
            await onConfirm(method);
          }}
        >
          Confirmar
        </Button>
      </div>
    </Modal>
  );
}
