"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { BadgeCheck, Calendar, Edit2, KeyRound, PlugZap, Plus, RefreshCw, Scissors, ShieldCheck, ShoppingBag, Users, Wallet, XCircle } from "lucide-react";
import { RoleShell } from "@/components/role-shell";
import { BarberIcon } from "@/components/app-icons";
import { Button, Card, Empty, Input, Modal, PageHeader, Select, StatCard, Textarea } from "@/components/system-ui";
import { PasswordInput } from "@/components/password-input";
import { DAY_NAMES } from "@/lib/medical";
import { PhotoPicker } from "@/components/photo-picker";
import { fireSwal } from "@/lib/swal";
import { PaginationBar as AdminPaginationBar } from "@/components/admin/pagination-bar";
import { AppointmentsSection } from "@/components/admin/appointments-section";
import { DashboardSection } from "@/components/admin/dashboard-section";

type AnyRecord = Record<string, any>;

type PaginationState = {
  users: number;
  barbers: number;
  clients: number;
  services: number;
  schedules: number;
  bookings: number;
  payments: number;
  products: number;
  productOrders: number;
};

const PAGE_SIZE = 10;

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

function resolveName(value: any) {
  if (!value) return "—";
  if (typeof value === "string") return value;
  return value.name || value.email || value.title || "—";
}

function activeLabel(active: boolean) {
  return active ? "Ativo" : "Inativo";
}

function resolveClientName(item: AnyRecord) {
  return resolveName(item.clientId || item.patientId);
}

function resolveBarberName(item: AnyRecord) {
  return resolveName(item.barberId || item.doctorId);
}

function resolveServiceName(item: AnyRecord) {
  return resolveName(item.serviceId || item.specialtyId);
}

export default function AdminPage() {
  const router = useRouter();
  const [active, setActive] = useState("dashboard");
  const [data, setData] = useState<AnyRecord | null>(null);
  const [pages, setPages] = useState<PaginationState>({
    users: 1,
    barbers: 1,
    clients: 1,
    services: 1,
    schedules: 1,
    bookings: 1,
    payments: 1,
    products: 1,
    productOrders: 1,
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [doctorModal, setDoctorModal] = useState<AnyRecord | null>(null);
  const [specialtyModal, setSpecialtyModal] = useState<AnyRecord | null>(null);
  const [productModal, setProductModal] = useState<AnyRecord | null>(null);
  const [passwordModal, setPasswordModal] = useState<AnyRecord | null>(null);
  const [integrationStatus, setIntegrationStatus] = useState<AnyRecord | null>(null);
  const [patientForm, setPatientForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    address: "",
    birthDate: "",
  });

  async function loadData(nextPages: PaginationState = pages) {
    setLoading(true);
    try {
      const params = new URLSearchParams({ paginate: "1" });
      Object.entries(nextPages).forEach(([key, value]) => {
        params.set(`${key}Page`, String(value));
        params.set(`${key}Limit`, String(PAGE_SIZE));
      });

      const response = await fetch(`/api/dashboard?${params.toString()}`, { cache: "no-store" });
      if (response.status === 401) {
        router.replace("/login");
        return;
      }
      const json = await response.json().catch(() => ({}));
      setData(json);
    } finally {
      setLoading(false);
    }
  }

  async function loadIntegrationStatus() {
    const response = await fetch("/api/integrations/mercadopago", { cache: "no-store" });
    if (!response.ok) return;
    const json = await response.json().catch(() => ({}));
    setIntegrationStatus(json);
  }

  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextSection = params.get("section") || params.get("tab");
    if (nextSection && navItems.some((item) => item.id === nextSection)) {
      setActive(nextSection);
    }
  }, []);

  useEffect(() => {
    if (active === "integrations") {
      loadIntegrationStatus();
    }
  }, [active]);

  async function request(path: string, options: RequestInit = {}) {
    setMessage("");
    const isFormData = options.body instanceof FormData;
    const response = await fetch(path, {
      headers: isFormData ? options.headers : { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options,
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(json.error || "Não foi possível concluir a ação.");
      await fireSwal({
        icon: "error",
        title: "Erro",
        text: json.error || "Não foi possível concluir a ação.",
      });
      return null;
    }
    setMessage("Alteração salva com sucesso.");
    await fireSwal({
      icon: "success",
      title: "Concluído",
      text: "Alteração salva com sucesso.",
    });
    await loadData();
    return json;
  }

  function changePage(section: keyof PaginationState, delta: number) {
    const totalPages = Number(data?.meta?.[section]?.totalPages || 1);
    setPages((current) => {
      const nextValue = Math.min(totalPages, Math.max(1, current[section] + delta));
      const nextPages = { ...current, [section]: nextValue };
      void loadData(nextPages);
      return nextPages;
    });
  }

  const stats = useMemo(() => {
    const doctors = data?.summaryCounts?.barbers ?? data?.counts?.barbers ?? (data?.doctors || []).filter((item: AnyRecord) => item.active).length;
    const patients = data?.summaryCounts?.clients ?? data?.counts?.clients ?? (data?.patients || []).filter((item: AnyRecord) => item.active).length;
    const specialties = data?.summaryCounts?.services ?? data?.counts?.services ?? (data?.specialties || []).filter((item: AnyRecord) => item.active).length;
    const appointments = data?.summaryCounts?.bookings ?? data?.counts?.bookings ?? (data?.appointments || []).length;
    return {
      doctors,
      patients,
      specialties,
      appointments,
    };
  }, [data]);

  function openDoctorModal(item: AnyRecord | null = null) {
    const nextServicesIds = Array.isArray(item?.servicesIds)
      ? item.servicesIds.map((serviceId: unknown) => String(serviceId))
      : item?.specialtyId
        ? [String(item.specialtyId?._id || item.specialtyId)]
        : allServiceIds;

    setDoctorModal(
      item
        ? { ...item, servicesIds: nextServicesIds }
        : {
            active: true,
            status: "ATIVO",
            startTime: "08:00",
            endTime: "18:00",
            slotDuration: 30,
            availableDays: [1, 2, 3, 4, 5],
            photoUrl: "",
            photoFile: null,
            removePhoto: false,
            bio: "",
            servicesIds: allServiceIds,
          }
    );
  }

  function toggleDoctorService(serviceId: string) {
    setDoctorModal((current) => {
      const selected = new Set((current?.servicesIds || []).map((item: unknown) => String(item)));
      if (selected.has(serviceId)) {
        selected.delete(serviceId);
      } else {
        selected.add(serviceId);
      }
      return { ...current, servicesIds: Array.from(selected) };
    });
  }

  function selectAllDoctorServices() {
    setDoctorModal((current) => ({ ...current, servicesIds: [...allServiceIds] }));
  }

  async function saveDoctor() {
    const selectedServicesIds = Array.isArray(doctorModal?.servicesIds) && doctorModal.servicesIds.length > 0
      ? doctorModal.servicesIds.map((item: unknown) => String(item))
      : [...allServiceIds];

    if (!doctorModal?.name || !doctorModal?.email || selectedServicesIds.length === 0) {
      setMessage("Preencha nome, e-mail e selecione os serviços.");
      return;
    }
    const payload = new FormData();
    payload.append("name", doctorModal.name);
    payload.append("email", doctorModal.email || "");
    payload.append("phone", doctorModal.phone || "");
    payload.append("servicesIds", JSON.stringify(selectedServicesIds));
    payload.append("specialtyId", selectedServicesIds[0] || "");
    payload.append("active", String(doctorModal.active));
    payload.append("status", doctorModal.active ? "ATIVO" : "INATIVO");
    payload.append("bio", doctorModal.bio || "");
    payload.append("availableDays", JSON.stringify(doctorModal.availableDays || []));
    payload.append("startTime", doctorModal.startTime || "08:00");
    payload.append("endTime", doctorModal.endTime || "18:00");
    payload.append("slotDuration", String(doctorModal.slotDuration || 30));
    payload.append(
      "schedule",
      JSON.stringify({
        availableDays: doctorModal.availableDays || [],
        startTime: doctorModal.startTime || "08:00",
        endTime: doctorModal.endTime || "18:00",
        slotDuration: doctorModal.slotDuration || 30,
      })
    );
    if (!doctorModal._id && doctorModal.password) {
      payload.append("password", doctorModal.password);
    }
    if (doctorModal.photoFile instanceof File) {
      payload.append("photo", doctorModal.photoFile);
    }
    if (doctorModal.removePhoto) {
      payload.append("removePhoto", "true");
    }
    if (doctorModal._id) {
      await request(`/api/doctors/${doctorModal._id}`, {
        method: "PUT",
        body: payload,
      });
    } else {
      await request("/api/doctors", {
        method: "POST",
        body: payload,
      });
    }
    setDoctorModal(null);
  }

  async function saveSpecialty() {
    if (!specialtyModal?.name) {
      setMessage("Informe o nome da especialidade.");
      return;
    }
    const payload = {
      name: specialtyModal.name,
      description: specialtyModal.description || "",
      price: Number(specialtyModal.price || 0),
      active: specialtyModal.active ?? true,
    };
    if (specialtyModal._id) {
      await request(`/api/specialties/${specialtyModal._id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    } else {
      await request("/api/specialties", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    }
    setSpecialtyModal(null);
  }

  async function saveProduct() {
    if (!productModal?.name || !productModal?.price && productModal?.price !== 0) {
      setMessage("Informe nome e preço do produto.");
      return;
    }

    const payload = new FormData();
    payload.append("name", productModal.name);
    payload.append("description", productModal.description || "");
    payload.append("price", String(productModal.price ?? 0));
    payload.append("stock", String(productModal.stock ?? 0));
    payload.append("category", productModal.category || "");
    payload.append("status", productModal.active === false || productModal.status === "inactive" ? "inactive" : "active");

    if (productModal.photoFile instanceof File) {
      payload.append("photo", productModal.photoFile);
    }
    if (productModal.removePhoto) {
      payload.append("removePhoto", "true");
    }

    if (productModal._id) {
      await request(`/api/products/${productModal._id}`, {
        method: "PUT",
        body: payload,
      });
    } else {
      await request("/api/products", {
        method: "POST",
        body: payload,
      });
    }
    setProductModal(null);
  }

  async function savePatient() {
    await request("/api/patients", {
      method: "POST",
      body: JSON.stringify(patientForm),
    });
    setPatientForm({ name: "", email: "", password: "", phone: "", address: "", birthDate: "" });
  }

  async function savePassword() {
    if (!passwordModal?.password || passwordModal.password.length < 6) {
      setMessage("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    await request(`/api/users/${passwordModal._id}/password`, {
      method: "PUT",
      body: JSON.stringify({ password: passwordModal.password }),
    });
    setPasswordModal(null);
  }

  async function testMercadoPagoConnection() {
    setMessage("");
    const response = await fetch("/api/integrations/mercadopago", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "test" }),
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(json.error || "Não foi possível testar a conexão.");
      await fireSwal({
        icon: "error",
        title: "Erro",
        text: json.error || "Não foi possível testar a conexão.",
      });
      return;
    }
    setIntegrationStatus(json);
    await fireSwal({
      icon: "success",
      title: "Conexão validada",
      text: "O Mercado Pago respondeu com sucesso.",
    });
  }

  function connectMercadoPago() {
    window.location.href = "/api/integrations/mercadopago/connect";
  }

  const doctors = data?.doctors || [];
  const specialties = data?.specialties || [];
  const products = data?.products || [];
  const patients = data?.patients || [];
  const appointments = data?.appointments || [];
  const users = data?.users || [];
  const allServiceIds = useMemo(
    () => specialties.map((item: AnyRecord) => item._id).filter(Boolean),
    [specialties]
  );

  return (
    <RoleShell
      userName={data?.user?.name || "Administrador"}
      roleLabel="Administrador"
      navItems={navItems}
      active={active}
      onNavigate={(id) => {
        if (id === "financeiro") {
          router.push("/admin/financeiro");
          return;
        }
        setActive(id);
      }}
      onLogout={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.replace("/login");
      }}
    >
      {loading ? null : (
        <>
          {message && <div className="mb-4 rounded-xl bg-sky-50 px-4 py-3 text-sm text-sky-700">{message}</div>}

          {active === "dashboard" && (
            <DashboardSection
              stats={stats}
              appointments={appointments}
              bookingsPage={pages.bookings}
              bookingsTotalPages={Number(data?.meta?.bookings?.totalPages || 1)}
              bookingsTotal={Number(data?.counts?.bookings || 0)}
              onRefresh={() => loadData()}
              onPageChange={(delta) => changePage("bookings", delta)}
            />
          )}

          {active === "doctors" && (
            <div>
              <PageHeader
                title="Barbeiros"
                sub="Cadastro, edição e inativação de barbeiros"
                action={<Button onClick={() => openDoctorModal()}><Plus className="w-4 h-4" />Novo barbeiro</Button>}
              />
              <Card>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100">
                        {["Foto", "Nome", "Telefone", "Serviços", "Contato", "Status", "Ações"].map((item) => (
                          <th key={item} className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide px-4 py-3">{item}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {doctors.length === 0 ? (
                        <tr><td colSpan={7}><Empty label="Nenhum barbeiro cadastrado." /></td></tr>
                      ) : doctors.map((item: AnyRecord) => (
                        <tr key={item._id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="h-10 w-10 overflow-hidden rounded-xl bg-slate-100 flex items-center justify-center">
                              {item.photoUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={item.photoUrl} alt={item.name} className="h-full w-full object-cover" />
                              ) : (
                                <span className="text-xs font-bold text-slate-500">{(item.name || "MD").split(" ").filter(Boolean).slice(0, 2).map((part: string) => part[0]?.toUpperCase() || "").join("") || "MD"}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-800">{item.name}</td>
                          <td className="px-4 py-3 text-slate-500 font-mono text-xs">{item.phone || "—"}</td>
                          <td className="px-4 py-3 text-slate-600">{Array.isArray(item.servicesIds) ? item.servicesIds.length : resolveName(item.specialtyId)}</td>
                          <td className="px-4 py-3 text-slate-600">{item.email || item.phone || "—"}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.active ? "bg-teal-50 text-teal-700" : "bg-slate-100 text-slate-500"}`}>
                              {activeLabel(item.active)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="sm" onClick={() => openDoctorModal(item)}><Edit2 className="w-3.5 h-3.5" /></Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={async () => {
                                  const result = await fireSwal({
                                    icon: "warning",
                                    title: "Inativar barbeiro?",
                                    text: "O barbeiro não será excluído se houver agendamentos vinculados, apenas ficará inativo.",
                                    showCancelButton: true,
                                    confirmButtonText: "Sim, inativar",
                                    cancelButtonText: "Cancelar",
                                  });
                                  if (result.isConfirmed) {
                                    await request(`/api/doctors/${item._id}`, { method: "DELETE" });
                                  }
                                }}
                              >
                                <XCircle className="w-3.5 h-3.5 text-red-500" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
              <AdminPaginationBar
                section="barbers"
                current={pages.barbers}
                totalPages={Number(data?.meta?.barbers?.totalPages || 1)}
                total={Number(data?.counts?.barbers || 0)}
                onChange={(delta) => changePage("barbers", delta)}
              />
            </div>
          )}

          {active === "specialties" && (
            <div>
              <PageHeader
                title="Serviços"
                sub="Cadastro, edição e inativação de serviços"
                action={<Button onClick={() => setSpecialtyModal({ active: true, price: 0 })}><Plus className="w-4 h-4" />Novo serviço</Button>}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {specialties.length === 0 ? (
                  <Card className="p-8"><Empty label="Nenhum serviço cadastrado." /></Card>
                ) : specialties.map((item: AnyRecord) => (
                  <Card key={item._id} className="p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-slate-800">{item.name}</h3>
                        <p className="text-sm text-slate-500 mt-1">{item.description || "Sem descrição"}</p>
                        <p className="text-sm font-semibold text-slate-900 mt-2">
                          {(Number(item.price) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </p>
                      </div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${item.active ? "bg-teal-50 text-teal-700" : "bg-slate-100 text-slate-500"}`}>
                        {activeLabel(item.active)}
                      </span>
                    </div>
                    <div className="flex gap-1 mt-4">
                      <Button variant="ghost" size="sm" onClick={() => setSpecialtyModal(item)}><Edit2 className="w-3.5 h-3.5" /></Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          const result = await fireSwal({
                            icon: "warning",
                            title: "Inativar serviço?",
                            text: "O serviço não será removido se já houver agendamentos vinculados.",
                            showCancelButton: true,
                            confirmButtonText: "Sim, inativar",
                            cancelButtonText: "Cancelar",
                          });
                          if (result.isConfirmed) {
                            await request(`/api/specialties/${item._id}`, { method: "DELETE" });
                          }
                        }}
                      >
                        <XCircle className="w-3.5 h-3.5 text-red-500" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
              <AdminPaginationBar
                section="services"
                current={pages.services}
                totalPages={Number(data?.meta?.services?.totalPages || 1)}
                total={Number(data?.counts?.services || 0)}
                onChange={(delta) => changePage("services", delta)}
              />
            </div>
          )}

          {active === "products" && (
            <div>
              <PageHeader
                title="Produtos"
                sub="Cadastro, edição e inativação de produtos com foto e estoque"
                action={<Button onClick={() => setProductModal({ active: true, status: "active", price: 0, stock: 0, photoUrl: "", photoFile: null, removePhoto: false })}><Plus className="w-4 h-4" />Novo produto</Button>}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {products.length === 0 ? (
                  <Card className="p-8"><Empty label="Nenhum produto cadastrado." /></Card>
                ) : products.map((item: AnyRecord) => (
                  <Card key={item._id} className="overflow-hidden">
                    <div className="aspect-[4/3] bg-slate-100">
                      {item.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.photoUrl} alt={item.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-400 flex items-center justify-center text-white">
                          <ShoppingBag className="w-10 h-10" />
                        </div>
                      )}
                    </div>
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold text-slate-800">{item.name}</h3>
                          <p className="text-sm text-slate-500 mt-1">{item.description || "Sem descrição"}</p>
                          <p className="text-sm font-semibold text-slate-900 mt-2">
                            {(Number(item.price) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                          </p>
                        </div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${Number(item.stock || 0) > 0 ? "bg-teal-50 text-teal-700" : "bg-slate-100 text-slate-500"}`}>
                          {Number(item.stock || 0)} un.
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.status === "active" ? "bg-teal-50 text-teal-700" : "bg-slate-100 text-slate-500"}`}>
                          {activeLabel(item.status !== "inactive")}
                        </span>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setProductModal({ ...item, active: item.status !== "inactive", photoFile: null, removePhoto: false })}><Edit2 className="w-3.5 h-3.5" /></Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              const result = await fireSwal({
                                icon: "warning",
                                title: "Inativar produto?",
                                text: "O produto ficará indisponível para novos pedidos.",
                                showCancelButton: true,
                                confirmButtonText: "Sim, inativar",
                                cancelButtonText: "Cancelar",
                              });
                              if (result.isConfirmed) {
                                await request(`/api/products/${item._id}`, { method: "DELETE" });
                              }
                            }}
                          >
                            <XCircle className="w-3.5 h-3.5 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
              <AdminPaginationBar
                section="products"
                current={pages.products}
                totalPages={Number(data?.meta?.products?.totalPages || 1)}
                total={Number(data?.counts?.products || 0)}
                onChange={(delta) => changePage("products", delta)}
              />
            </div>
          )}

          {active === "integrations" && (
            <div className="space-y-6">
              <PageHeader
                title="Integrações"
                sub="Conexão segura com Mercado Pago e configuração do webhook"
                action={<Button variant="secondary" onClick={loadIntegrationStatus}><RefreshCw className="w-4 h-4" />Atualizar</Button>}
              />

              <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6">
                <Card className="p-6 space-y-5">
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-orange-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      <Image src="/MP_RGB_HANDSHAKE_color_horizontal.svg" alt="Mercado Pago" width={100} height={110} className="h-8 w-8 object-contain" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-slate-900">Mercado Pago Pix</h2>
                      <p className="text-sm text-slate-500 mt-1">
                        A barbearia conecta a própria conta Mercado Pago.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-500">Conexão</span>
                      <span className="font-medium text-slate-900">{integrationStatus?.connected ? "Conectado" : "Desconectado"}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 items-center">
                    <Button onClick={connectMercadoPago}>
                      <PlugZap className="w-4 h-4" />
                      {integrationStatus?.connected ? "Reconectar Mercado Pago" : "Conectar Mercado Pago"}
                    </Button>
                    <Button variant="secondary" onClick={testMercadoPagoConnection}>
                      <ShieldCheck className="w-4 h-4" />
                      Testar conexão
                    </Button>
                  </div>
                </Card>

                <Card className="p-6 space-y-4">
                  <h3 className="font-semibold text-slate-900">Status da conexão</h3>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-500">Conta</span>
                      <span className="font-medium text-slate-900">
                        {integrationStatus?.connected ? "Conectada" : "Desconectada"}
                      </span>
                    </div>
                  </div>
                  <div className="rounded-2xl bg-orange-50 border border-orange-100 p-4 text-sm text-orange-900">
                    <p className="font-semibold mb-1">Como conectar</p>
                    <ol className="list-decimal pl-5 space-y-1">
                      <li>Clique em "Conectar Mercado Pago".</li>
                      <li>Faça login e autorize a conta da barbearia.</li>
                    </ol>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {active === "patients" && (
            <div>
              <PageHeader title="Clientes" sub="Cadastro de clientes com dados reais" />
              <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
                <Card className="p-5 space-y-4">
                  <h2 className="font-semibold text-slate-800">Novo cliente</h2>
                  {[
                    ["name", "Nome"],
                    ["email", "E-mail"],
                    ["password", "Senha"],
                    ["phone", "Telefone"],
                    ["address", "Endereço"],
                    ["birthDate", "Data de nascimento"],
                  ].map(([key, label]) => (
                    <label key={key} className="block">
                      <span className="text-sm font-medium text-slate-700">{label}</span>
                      <Input
                        value={(patientForm as AnyRecord)[key]}
                        onChange={(e) => setPatientForm((curr) => ({ ...curr, [key]: e.target.value }))}
                        type={key === "birthDate" ? "date" : key === "password" ? "password" : "text"}
                      />
                    </label>
                  ))}
                  <Button onClick={savePatient} className="w-full">Cadastrar cliente</Button>
                </Card>

                <Card>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100">
                          {["Nome", "Contato", "Nascimento", "Status"].map((item) => (
                            <th key={item} className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide px-4 py-3">{item}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {patients.length === 0 ? (
                          <tr><td colSpan={4}><Empty label="Nenhum cliente cadastrado." /></td></tr>
                        ) : patients.map((item: AnyRecord) => (
                          <tr key={item._id}>
                            <td className="px-4 py-3 font-medium text-slate-800">{item.name}</td>
                            <td className="px-4 py-3 text-slate-600">{item.email || item.phone}</td>
                            <td className="px-4 py-3 text-slate-600">{item.birthDate}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.active ? "bg-teal-50 text-teal-700" : "bg-slate-100 text-slate-500"}`}>
                                {activeLabel(item.active)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
              <AdminPaginationBar
                section="clients"
                current={pages.clients}
                totalPages={Number(data?.meta?.clients?.totalPages || 1)}
                total={Number(data?.counts?.clients || 0)}
                onChange={(delta) => changePage("clients", delta)}
              />
            </div>
          )}

          {active === "appointments" && (
            <AppointmentsSection
              appointments={appointments}
              page={pages.bookings}
              totalPages={Number(data?.meta?.bookings?.totalPages || 1)}
              total={Number(data?.counts?.bookings || 0)}
              onChangePage={(delta) => changePage("bookings", delta)}
              onStatusChange={(appointmentId, status) =>
                void request("/api/appointments", {
                  method: "PATCH",
                  body: JSON.stringify({ appointmentId, status }),
                })
              }
            />
          )}

          {active === "users" && (
            <div>
              <PageHeader title="Usuários" sub="Controle de acesso e status de conta" />
              <Card>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100">
                        {["Nome", "E-mail", "Perfil", "Status", "Ações"].map((item) => (
                          <th key={item} className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide px-4 py-3">{item}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {users.length === 0 ? (
                        <tr><td colSpan={5}><Empty label="Nenhum usuário encontrado." /></td></tr>
                      ) : users.map((item: AnyRecord) => (
                        <tr key={item._id}>
                          <td className="px-4 py-3 font-medium text-slate-800">{item.name}</td>
                          <td className="px-4 py-3 text-slate-600">{item.email}</td>
                          <td className="px-4 py-3 text-slate-500">{item.role}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.active ? "bg-teal-50 text-teal-700" : "bg-slate-100 text-slate-500"}`}>
                              {activeLabel(item.active)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="secondary"
                                size="sm"
                                disabled={item._id === data?.user?.id}
                                onClick={() => request("/api/users", {
                                  method: "PATCH",
                                  body: JSON.stringify({ userId: item._id, active: !item.active }),
                                })}
                              >
                                {item._id === data?.user?.id ? "Conta atual" : item.active ? "Inativar" : "Ativar"}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setPasswordModal({ ...item, password: "" })}
                              >
                                <KeyRound className="w-3.5 h-3.5" />
                                {item._id === data?.user?.id ? "Trocar minha senha" : "Trocar senha"}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
              <AdminPaginationBar
                section="users"
                current={pages.users}
                totalPages={Number(data?.meta?.users?.totalPages || 1)}
                total={Number(data?.counts?.users || 0)}
                onChange={(delta) => changePage("users", delta)}
              />
            </div>
          )}

          {doctorModal && (
              <Modal title={doctorModal._id ? "Editar Barbeiro" : "Novo Barbeiro"} onClose={() => setDoctorModal(null)} wide>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="md:col-span-2 block"><span className="text-sm font-medium text-slate-700">Nome</span><Input value={doctorModal.name || ""} onChange={(e) => setDoctorModal({ ...doctorModal, name: e.target.value })} /></label>
                <label className="block"><span className="text-sm font-medium text-slate-700">Telefone</span><Input value={doctorModal.phone || ""} onChange={(e) => setDoctorModal({ ...doctorModal, phone: e.target.value })} /></label>
                <label className="block"><span className="text-sm font-medium text-slate-700">E-mail</span><Input value={doctorModal.email || ""} onChange={(e) => setDoctorModal({ ...doctorModal, email: e.target.value })} /></label>
                {!doctorModal._id && (
                  <PasswordInput
                    label="Senha"
                    value={doctorModal.password || ""}
                    onChange={(value) => setDoctorModal({ ...doctorModal, password: value })}
                  />
                )}
                <div className="md:col-span-2 block">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-slate-700">Serviços</span>
                    <Button type="button" variant="secondary" size="sm" onClick={selectAllDoctorServices}>
                      Selecionar todos
                    </Button>
                  </div>
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {specialties.map((item: AnyRecord) => {
                      const selected = (doctorModal.servicesIds || []).map((serviceId: unknown) => String(serviceId)).includes(String(item._id));
                      return (
                        <button
                          key={item._id}
                          type="button"
                          onClick={() => toggleDoctorService(String(item._id))}
                          className={`rounded-xl border px-3 py-2 text-left text-sm transition-all ${
                            selected
                              ? "bg-sky-600 text-white border-sky-600"
                              : "bg-slate-50 text-slate-700 border-slate-200 hover:border-sky-200 hover:bg-sky-50"
                          }`}
                        >
                          <div className="font-medium">{item.name}</div>
                          <div className={`text-xs mt-1 ${selected ? "text-sky-50" : "text-slate-500"}`}>
                            {selected ? "Selecionado" : "Toque para selecionar"}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-xs text-slate-500">O barbeiro pode receber todos os serviços ou apenas os marcados acima.</p>
                </div>
                <label className="block"><span className="text-sm font-medium text-slate-700">Status</span><Select value={doctorModal.active ? "true" : "false"} onChange={(e) => setDoctorModal({ ...doctorModal, active: e.target.value === "true" })}>
                  <option value="true">Ativo</option>
                  <option value="false">Inativo</option>
                </Select></label>
                <div className="md:col-span-2">
                  <PhotoPicker
                    label="Foto do barbeiro"
                    name={doctorModal.name || ""}
                    currentUrl={doctorModal.photoUrl || ""}
                    onFileChange={(file) => setDoctorModal({ ...doctorModal, photoFile: file, removePhoto: false })}
                    onRemove={() => setDoctorModal({ ...doctorModal, photoFile: null, removePhoto: true })}
                    helperText="Envie JPG, PNG ou WEBP."
                  />
                </div>
                <label className="md:col-span-2 block">
                  <span className="text-sm font-medium text-slate-700">Biografia profissional</span>
                  <Textarea
                    rows={4}
                    value={doctorModal.bio || ""}
                    onChange={(e) => setDoctorModal({ ...doctorModal, bio: e.target.value })}
                    placeholder="Resumo da experiência, formação e áreas de atuação"
                  />
                </label>
                <div className="block md:col-span-2">
                  <span className="text-sm font-medium text-slate-700">Dias de atendimento</span>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {DAY_NAMES.map((label, index) => {
                      const selected = (doctorModal.availableDays || []).includes(index);
                      return (
                        <button
                          key={label}
                          type="button"
                          onClick={() =>
                            setDoctorModal({
                              ...doctorModal,
                              availableDays: selected
                                ? (doctorModal.availableDays || []).filter((item: number) => item !== index)
                                : [...(doctorModal.availableDays || []), index].sort(),
                            })
                          }
                          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                            selected ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-xs text-slate-500">Selecione os dias em que o barbeiro atende. O sistema salva isso como números de 0 a 6.</p>
                </div>
                <label className="block"><span className="text-sm font-medium text-slate-700">Início</span><Input type="time" value={doctorModal.startTime || "08:00"} onChange={(e) => setDoctorModal({ ...doctorModal, startTime: e.target.value })} /></label>
                <label className="block"><span className="text-sm font-medium text-slate-700">Fim</span><Input type="time" value={doctorModal.endTime || "18:00"} onChange={(e) => setDoctorModal({ ...doctorModal, endTime: e.target.value })} /></label>
                <label className="block"><span className="text-sm font-medium text-slate-700">Duração</span><Input type="number" value={doctorModal.slotDuration || 30} onChange={(e) => setDoctorModal({ ...doctorModal, slotDuration: Number(e.target.value) })} /></label>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <Button variant="secondary" onClick={() => setDoctorModal(null)}>Cancelar</Button>
                <Button onClick={saveDoctor}>Salvar</Button>
              </div>
            </Modal>
          )}

          {specialtyModal && (
            <Modal title={specialtyModal._id ? "Editar Serviço" : "Novo Serviço"} onClose={() => setSpecialtyModal(null)}>
              <div className="space-y-4">
                <label className="block"><span className="text-sm font-medium text-slate-700">Nome</span><Input value={specialtyModal.name || ""} onChange={(e) => setSpecialtyModal({ ...specialtyModal, name: e.target.value })} /></label>
                <label className="block"><span className="text-sm font-medium text-slate-700">Descrição</span><Textarea value={specialtyModal.description || ""} onChange={(e) => setSpecialtyModal({ ...specialtyModal, description: e.target.value })} /></label>
                <label className="block"><span className="text-sm font-medium text-slate-700">Preço</span><Input type="number" min="0" step="0.01" value={specialtyModal.price ?? 0} onChange={(e) => setSpecialtyModal({ ...specialtyModal, price: Number(e.target.value) })} /></label>
                <label className="block"><span className="text-sm font-medium text-slate-700">Status</span><Select value={specialtyModal.active ? "true" : "false"} onChange={(e) => setSpecialtyModal({ ...specialtyModal, active: e.target.value === "true" })}>
                  <option value="true">Ativa</option>
                  <option value="false">Inativa</option>
                </Select></label>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <Button variant="secondary" onClick={() => setSpecialtyModal(null)}>Cancelar</Button>
                <Button onClick={saveSpecialty}>Salvar</Button>
              </div>
            </Modal>
          )}

          {productModal && (
            <Modal title={productModal._id ? "Editar Produto" : "Novo Produto"} onClose={() => setProductModal(null)} wide>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="md:col-span-2 block">
                  <span className="text-sm font-medium text-slate-700">Nome</span>
                  <Input value={productModal.name || ""} onChange={(e) => setProductModal({ ...productModal, name: e.target.value })} />
                </label>
                <label className="md:col-span-2 block">
                  <span className="text-sm font-medium text-slate-700">Descrição</span>
                  <Textarea value={productModal.description || ""} onChange={(e) => setProductModal({ ...productModal, description: e.target.value })} />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Preço</span>
                  <Input type="number" min="0" step="0.01" value={productModal.price ?? 0} onChange={(e) => setProductModal({ ...productModal, price: Number(e.target.value) })} />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Estoque</span>
                  <Input type="number" min="0" step="1" value={productModal.stock ?? 0} onChange={(e) => setProductModal({ ...productModal, stock: Number(e.target.value) })} />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Categoria</span>
                  <Input value={productModal.category || ""} onChange={(e) => setProductModal({ ...productModal, category: e.target.value })} />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Status</span>
                  <Select value={productModal.active === false || productModal.status === "inactive" ? "inactive" : "active"} onChange={(e) => setProductModal({ ...productModal, status: e.target.value, active: e.target.value === "active" })}>
                    <option value="active">Ativo</option>
                    <option value="inactive">Inativo</option>
                  </Select>
                </label>
                <div className="md:col-span-2">
                  <PhotoPicker
                    label="Foto do produto"
                    name={productModal.name || ""}
                    currentUrl={productModal.photoUrl || ""}
                    onFileChange={(file) => setProductModal({ ...productModal, photoFile: file, removePhoto: false })}
                    onRemove={() => setProductModal({ ...productModal, photoFile: null, removePhoto: true })}
                    helperText="Envie JPG, PNG ou WEBP."
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <Button variant="secondary" onClick={() => setProductModal(null)}>Cancelar</Button>
                <Button onClick={saveProduct}>Salvar produto</Button>
              </div>
            </Modal>
          )}

          {passwordModal && (
            <Modal
              title={passwordModal._id === data?.user?.id ? "Trocar minha senha" : `Trocar senha de ${passwordModal.name}`}
              onClose={() => setPasswordModal(null)}
            >
              <div className="space-y-4">
                <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  {passwordModal.role === "ADMIN"
                    ? "A senha será atualizada para a sua própria conta de administrador."
                    : "A senha será atualizada para a conta do barbeiro selecionado."}
                </div>
                <PasswordInput
                  label="Nova senha"
                  value={passwordModal.password || ""}
                  onChange={(value) => setPasswordModal({ ...passwordModal, password: value })}
                  placeholder="Digite a nova senha"
                />
                <PasswordInput
                  label="Confirmar senha"
                  value={passwordModal.confirmPassword || ""}
                  onChange={(value) => setPasswordModal({ ...passwordModal, confirmPassword: value })}
                  placeholder="Repita a nova senha"
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <Button variant="secondary" onClick={() => setPasswordModal(null)}>Cancelar</Button>
                <Button
                  onClick={async () => {
                    if (passwordModal.password !== passwordModal.confirmPassword) {
                      setMessage("As senhas informadas não conferem.");
                      return;
                    }
                    await savePassword();
                  }}
                >
                  Salvar senha
                </Button>
              </div>
            </Modal>
          )}
        </>
      )}
    </RoleShell>
  );
}
