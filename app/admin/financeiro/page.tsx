"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Calendar, PlugZap, RefreshCw, Scissors, ShoppingBag, Users, Wallet } from "lucide-react";
import { RoleShell } from "@/components/role-shell";
import { BarberIcon } from "@/components/app-icons";
import { Button, Card, PageHeader } from "@/components/system-ui";
import { fireSwal } from "@/lib/swal";
import { FinancialSummaryCards } from "@/components/financeiro/FinancialSummaryCards";
import { FinancialFilters } from "@/components/financeiro/FinancialFilters";
import { DailyAppointmentsTable } from "@/components/financeiro/DailyAppointmentsTable";
import { PaymentDetailsModal } from "@/components/financeiro/PaymentDetailsModal";
import { ManualPaymentConfirmModal } from "@/components/financeiro/ManualPaymentConfirmModal";
import { ExportFinancialReportButton } from "@/components/financeiro/ExportFinancialReportButton";
import type { FinancialAppointment, FinancialData, FinancialFilters as FinancialFiltersType } from "@/types/financeiro";

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: Calendar },
  { id: "financeiro", label: "Financeiro", icon: Wallet },
  { id: "doctors", label: "Barbeiros", icon: Scissors },
  { id: "patients", label: "Clientes", icon: Users },
  { id: "specialties", label: "Serviços", icon: BadgeCheck },
  { id: "products", label: "Produtos", icon: ShoppingBag },
  { id: "integrations", label: "Integrações", icon: PlugZap },
  { id: "users", label: "Usuários", icon: Users },
  { id: "appointments", label: "Agendamentos", icon: Calendar },
];

function today() {
  return new Date().toISOString().split("T")[0];
}

export default function AdminFinanceiroPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<FinancialData | null>(null);
  const [filters, setFilters] = useState<FinancialFiltersType>({
    date: today(),
    barberId: "",
    serviceId: "",
    paymentStatus: "",
    appointmentStatus: "",
  });
  const [selectedPayment, setSelectedPayment] = useState<FinancialAppointment | null>(null);
  const [manualPaymentItem, setManualPaymentItem] = useState<FinancialAppointment | null>(null);

  async function loadData(nextFilters = filters) {
    setLoading(true);
    const params = new URLSearchParams();
    Object.entries(nextFilters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });

    const response = await fetch(`/api/financeiro?${params.toString()}`, { cache: "no-store" });
    if (response.status === 401) {
      router.replace("/login");
      return;
    }

    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      await fireSwal({
        icon: "error",
        title: "Erro",
        text: json.error || "Não foi possível carregar os dados financeiros.",
      });
      setLoading(false);
      return;
    }

    setData(json);
    setLoading(false);
  }

  useEffect(() => {
    loadData(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.date, filters.barberId, filters.serviceId, filters.paymentStatus, filters.appointmentStatus]);

  const exportHref = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    return `/api/financeiro/export?${params.toString()}`;
  }, [filters]);

  async function resendPix(item: FinancialAppointment) {
    const response = await fetch(`/api/financeiro/bookings/${item.id}/resend-pix`, { method: "POST" });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      await fireSwal({ icon: "error", title: "Erro", text: json.error || "Não foi possível reenviar o Pix." });
      return;
    }

    await fireSwal({ icon: "success", title: "Pix reenviado", text: "O novo QR Code foi gerado com sucesso." });
    await loadData();
  }

  async function confirmManual(method: "cash" | "external_pix" | "card") {
    if (!manualPaymentItem) return;
    const response = await fetch(`/api/financeiro/bookings/${manualPaymentItem.id}/manual-confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method }),
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      await fireSwal({ icon: "error", title: "Erro", text: json.error || "Não foi possível confirmar o pagamento." });
      return;
    }

    await fireSwal({ icon: "success", title: "Pagamento confirmado", text: "O agendamento foi marcado como pago." });
    setManualPaymentItem(null);
    await loadData();
  }

  return (
    <RoleShell
      userName="Administrador"
      roleLabel="Administrador"
      navItems={navItems}
      active="financeiro"
      onNavigate={(id) => {
        if (id === "financeiro") return;
        if (id === "dashboard") {
          router.push("/admin");
          return;
        }
        router.push(`/admin?section=${id}`);
      }}
      onLogout={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.replace("/login");
      }}
    >
      <div>
        <PageHeader
          title="Financeiro"
          sub="Acompanhe os agendamentos do dia, pagamentos e pendências"
          action={
            <div className="flex flex-wrap gap-2">
              <ExportFinancialReportButton href={exportHref} />
              <Button variant="secondary" onClick={() => loadData()}>
                <RefreshCw className="w-4 h-4" />
                Atualizar
              </Button>
            </div>
          }
        />

        <div className="space-y-6">
          <FinancialFilters
            value={filters}
            barbers={data?.barbers || []}
            services={data?.services || []}
            onChange={setFilters}
          />

          {loading ? (
            <Card className="p-8 text-sm text-slate-500">Carregando dados financeiros...</Card>
          ) : (
            <>
              <FinancialSummaryCards
                totalSoldToday={data?.summary.totalSoldToday || 0}
                totalReceivedToday={data?.summary.totalReceivedToday || 0}
                totalPending={data?.summary.totalPending || 0}
                paidCount={data?.summary.paidCount || 0}
                pendingCount={data?.summary.pendingCount || 0}
                cancelledCount={data?.summary.cancelledCount || 0}
              />

              <DailyAppointmentsTable
                items={data?.appointments || []}
                onViewDetails={(item) => setSelectedPayment(item)}
                onConfirmManual={(item) => setManualPaymentItem(item)}
                onResendPix={resendPix}
              />
            </>
          )}
        </div>

        <PaymentDetailsModal open={Boolean(selectedPayment)} item={selectedPayment} onClose={() => setSelectedPayment(null)} />
        <ManualPaymentConfirmModal
          open={Boolean(manualPaymentItem)}
          item={manualPaymentItem}
          onClose={() => setManualPaymentItem(null)}
          onConfirm={confirmManual}
        />
      </div>
    </RoleShell>
  );
}
