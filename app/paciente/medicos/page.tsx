"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { BadgeCheck, Calendar, Scissors, ShoppingBag, Users } from "lucide-react";
import { RoleShell } from "@/components/role-shell";
import { BarberIcon } from "@/components/app-icons";
import { Button, Card, Empty, PageHeader, Select, Skeleton, StatCard } from "@/components/system-ui";

type AnyRecord = Record<string, any>;

const PAGE_SIZE = 9;

const navItems = [
  { id: "dashboard", label: "Início", icon: Calendar },
  { id: "book", label: "Agendar", icon: Scissors },
  { id: "products", label: "Produtos", icon: ShoppingBag },
  { id: "appointments", label: "Agendamentos", icon: Users },
  { id: "doctors", label: "Barbeiros", icon: BarberIcon },
];

function resolveName(value: any) {
  if (!value) return "—";
  if (typeof value === "string") return value;
  return value.name || value.title || "—";
}

function getInitials(name?: string) {
  if (!name) return "BP";
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("") || "BP"
  );
}

export default function PatientDoctorsPage() {
  const router = useRouter();
  const [data, setData] = useState<AnyRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [serviceFilter, setServiceFilter] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });

  async function loadData(nextPage = page, nextServiceFilter = serviceFilter) {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({
      page: String(nextPage),
      limit: String(PAGE_SIZE),
    });
    if (nextServiceFilter) params.set("serviceId", nextServiceFilter);
    const response = await fetch(`/api/patient/doctors?${params.toString()}`, { cache: "no-store" });
    if (response.status === 401) {
      router.replace("/login");
      return;
    }
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(json.error || "Erro ao carregar barbeiros.");
      setLoading(false);
      return;
    }
    setData(json);
    setMeta(json.meta || { page: nextPage, limit: PAGE_SIZE, total: 0, totalPages: 1 });
    setPage(nextPage);
    setLoading(false);
  }

  const services = data?.services || data?.specialties || [];
  const barbers = useMemo(
    () => (data?.barbers || data?.doctors || []).filter((item: AnyRecord) => item.active !== false && item.status !== "INATIVO"),
    [data]
  );

  useEffect(() => {
    loadData(1, serviceFilter);
  }, [serviceFilter]);

  return (
    <RoleShell
      userName={data?.user?.name || "Cliente"}
      roleLabel="Cliente"
      navItems={navItems}
      active="doctors"
      onNavigate={(id) => {
        if (id === "dashboard") router.push("/cliente");
        if (id === "book") router.push("/cliente?tab=book");
        if (id === "products") router.push("/cliente/produtos");
        if (id === "appointments") router.push("/cliente?tab=appointments");
        if (id === "doctors") router.push("/cliente/medicos");
      }}
      onLogout={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.replace("/login");
      }}
    >
      {loading ? (
        <div className="space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-3">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-4 w-72" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-5">
              <Skeleton className="h-10 w-10 mb-4" />
              <Skeleton className="h-8 w-20 mb-2" />
              <Skeleton className="h-4 w-32" />
            </Card>
            <Card className="p-5">
              <Skeleton className="h-10 w-10 mb-4" />
              <Skeleton className="h-8 w-20 mb-2" />
              <Skeleton className="h-4 w-32" />
            </Card>
            <Card className="p-5">
              <Skeleton className="h-10 w-10 mb-4" />
              <Skeleton className="h-8 w-20 mb-2" />
              <Skeleton className="h-4 w-32" />
            </Card>
          </div>
          <Card className="p-5">
            <Skeleton className="h-5 w-40 mb-4" />
            <Skeleton className="h-10 w-full max-w-sm" />
          </Card>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <Card key={index} className="p-5 flex flex-col gap-4">
                <div className="flex items-start gap-4">
                  <Skeleton className="h-16 w-16 rounded-2xl flex-shrink-0" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-5 w-36" />
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-10 w-full" />
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <PageHeader
            title="Nossos Barbeiros"
            sub="Escolha o profissional e agende seu serviço"
            action={<Button variant="secondary" onClick={() => router.push("/cliente")}>Voltar ao painel</Button>}
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <StatCard label="Barbeiros ativos" value={meta.total} icon={BarberIcon} color="bg-orange-50 text-orange-600" />
            <StatCard label="Serviços" value={services.length} icon={BadgeCheck} color="bg-violet-50 text-violet-600" />
            <StatCard label="Total listado" value={meta.total} icon={Users} color="bg-emerald-50 text-emerald-600" />
          </div>

          <Card className="p-5 mb-6">
            <label className="block max-w-sm">
              <span className="text-sm font-medium text-slate-700">Filtrar por serviço</span>
              <Select value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)}>
                <option value="">Todos os serviços</option>
                {services.map((item: AnyRecord) => (
                  <option key={item._id} value={item._id}>
                    {item.name}
                  </option>
                ))}
              </Select>
            </label>
          </Card>

          {error ? (
            <Card className="p-8">
              <Empty label={error} />
            </Card>
          ) : barbers.length === 0 ? (
            <Card className="p-8">
              <Empty
                label={
                  serviceFilter
                    ? "Nenhum barbeiro ativo encontrado para o filtro selecionado."
                    : "Nenhum barbeiro ativo cadastrado ainda."
                }
              />
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {barbers.map((barber: AnyRecord) => {
                const serviceId = String(barber.serviceId?._id || barber.serviceId || barber.specialtyId?._id || barber.specialtyId || "");
                const serviceName = resolveName(barber.serviceId || barber.specialtyId);
                const photoUrl = barber.photoUrl || "";

                return (
                  <Card key={barber._id} className="p-5 flex flex-col gap-4">
                    <div className="flex items-start gap-4">
                      <div className="h-16 w-16 overflow-hidden rounded-2xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                        {photoUrl ? (
                          <Image src={photoUrl} alt={barber.name} width={64} height={64} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white font-bold">
                            {getInitials(barber.name)}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-slate-900">{barber.name}</h3>
                        <p className="text-sm text-slate-500">{serviceName}</p>
                        {barber.phone && <p className="text-xs text-slate-400 mt-1">{barber.phone}</p>}
                      </div>
                    </div>

                    {barber.bio ? (
                      <p className="text-sm text-slate-600 leading-relaxed">{barber.bio}</p>
                    ) : (
                      <p className="text-sm text-slate-400 leading-relaxed">
                        Profissional disponível para atendimento.
                      </p>
                    )}

                    <div className="mt-auto pt-2">
                      <Button
                        className="w-full"
                        onClick={() =>
                          router.push(
                            `/cliente?tab=book&specialtyId=${encodeURIComponent(serviceId)}&doctorId=${encodeURIComponent(
                              barber._id
                            )}`
                          )
                        }
                      >
                        Agendar serviço
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-4 text-sm text-slate-500">
            <span>
              Página {meta.page} de {meta.totalPages} · {meta.total} barbeiros
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={meta.page <= 1 || loading}
                onClick={() => loadData(Math.max(1, meta.page - 1), serviceFilter)}
              >
                Anterior
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={meta.page >= meta.totalPages || loading}
                onClick={() => loadData(Math.min(meta.totalPages, meta.page + 1), serviceFilter)}
              >
                Próxima
              </Button>
            </div>
          </div>
        </div>
      )}
    </RoleShell>
  );
}
