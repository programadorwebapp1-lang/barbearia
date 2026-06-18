"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, CheckCircle, Clock, Copy, Plus, QrCode, RefreshCw, ShoppingBag, Star } from "lucide-react";
import { RoleShell } from "@/components/role-shell";
import { BarberIcon } from "@/components/app-icons";
import { Button, Card, Empty, Input, Modal, PageHeader, Select, Skeleton, StatCard } from "@/components/system-ui";
import { fireSwal } from "@/lib/swal";

type AnyRecord = Record<string, any>;

const APPOINTMENTS_PAGE_SIZE = 10;

const navItems = [
  { id: "dashboard", label: "Início", icon: Calendar },
  { id: "book", label: "Agendar", icon: Plus },
  { id: "products", label: "Produtos", icon: ShoppingBag },
  { id: "appointments", label: "Meus agendamentos", icon: Clock },
  { id: "doctors", label: "Nossos barbeiros", icon: BarberIcon },
];

function resolveName(value: any) {
  if (!value) return "—";
  if (typeof value === "string") return value;
  return value.name || value.email || "—";
}

function formatDateLabel(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

function canPatientReschedule(status?: string) {
  return status !== "FINALIZADA";
}

function canPatientCancel(status?: string) {
  return status === "AGENDADA" || status === "CONFIRMADA" || status === "EM_ATENDIMENTO";
}

export default function PatientPage() {
  const router = useRouter();
  const [active, setActive] = useState("dashboard");
  const [data, setData] = useState<AnyRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [appointmentsData, setAppointmentsData] = useState<AnyRecord[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);
  const [appointmentsPage, setAppointmentsPage] = useState(1);
  const [appointmentsMeta, setAppointmentsMeta] = useState({
    page: 1,
    limit: APPOINTMENTS_PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });

  const [specialtyId, setSpecialtyId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availability, setAvailability] = useState<{
    doctors: AnyRecord[];
    schedule: AnyRecord | null;
    availableDates: string[];
    slots: string[];
  }>({
    doctors: [],
    schedule: null,
    availableDates: [],
    slots: [],
  });

  const [rescheduleModal, setRescheduleModal] = useState<AnyRecord | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [rescheduleAvailabilityLoading, setRescheduleAvailabilityLoading] = useState(false);
  const [rescheduleAvailability, setRescheduleAvailability] = useState<{
    schedule: AnyRecord | null;
    slots: string[];
  }>({
    schedule: null,
    slots: [],
  });
  const [paymentBooking, setPaymentBooking] = useState<AnyRecord | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<AnyRecord | null>(null);
  const [paymentBusy, setPaymentBusy] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const response = await fetch("/api/dashboard", { cache: "no-store" });
      if (response.status === 401) {
        router.replace("/login");
        return;
      }
      const json = await response.json();
      setData(json);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function loadAppointments(page = appointmentsPage) {
    setAppointmentsLoading(true);
    try {
      const response = await fetch(`/api/appointments?page=${page}&limit=${APPOINTMENTS_PAGE_SIZE}`, {
        cache: "no-store",
      });
      if (response.status === 401) {
        router.replace("/login");
        return;
      }
      const json = await response.json();
      setAppointmentsData(json.appointments || json.bookings || []);
      setAppointmentsMeta(
        json.meta || {
          page,
          limit: APPOINTMENTS_PAGE_SIZE,
          total: 0,
          totalPages: 1,
        }
      );
      setAppointmentsPage(page);
    } finally {
      setAppointmentsLoading(false);
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextSpecialtyId = params.get("specialtyId") || "";
    const nextDoctorId = params.get("doctorId") || "";
    const nextTab = params.get("tab") || "";

    if (nextTab) {
      if (nextTab === "products") {
        router.push("/cliente/produtos");
        return;
      }
      setActive(nextTab);
    }

    if (nextSpecialtyId) {
      setSpecialtyId(nextSpecialtyId);
    }
    if (nextDoctorId) {
      setDoctorId(nextDoctorId);
    }
    if (nextTab === "book" || nextSpecialtyId || nextDoctorId) {
      setActive("book");
    }
  }, []);

  async function loadAvailability(currentSpecialtyId = specialtyId, currentDoctorId = doctorId, currentDate = date) {
    if (!currentSpecialtyId) {
      setAvailability({
        doctors: [],
        schedule: null,
        availableDates: [],
        slots: [],
      });
      return;
    }

    setAvailabilityLoading(true);
    try {
      const params = new URLSearchParams({
        specialtyId: currentSpecialtyId,
        startDate: new Date().toISOString().split("T")[0],
        days: "30",
      });

      if (currentDoctorId) params.set("doctorId", currentDoctorId);
      if (currentDate) params.set("date", currentDate);

      const response = await fetch(`/api/availability?${params.toString()}`, {
        cache: "no-store",
      });

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      const json = await response.json();
      setAvailability({
        doctors: json.doctors || [],
        schedule: json.schedule || null,
        availableDates: json.availableDates || [],
        slots: json.slots || [],
      });
    } finally {
      setAvailabilityLoading(false);
    }
  }

  async function loadRescheduleAvailability(currentDate = rescheduleDate) {
    if (!rescheduleModal) {
      setRescheduleAvailability({ schedule: null, slots: [] });
      return;
    }

    const specialtyValue = String(rescheduleModal.specialtyId?._id || rescheduleModal.specialtyId || "");
    const doctorValue = String(rescheduleModal.doctorId?._id || rescheduleModal.doctorId || "");

    if (!specialtyValue || !doctorValue || !currentDate) {
      setRescheduleAvailability({ schedule: null, slots: [] });
      return;
    }

    setRescheduleAvailabilityLoading(true);
    try {
      const params = new URLSearchParams({
        specialtyId: specialtyValue,
        doctorId: doctorValue,
        startDate: new Date().toISOString().split("T")[0],
        days: "30",
        date: currentDate,
      });

      const response = await fetch(`/api/availability?${params.toString()}`, {
        cache: "no-store",
      });

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      const json = await response.json();
      setRescheduleAvailability({
        schedule: json.schedule || null,
        slots: json.slots || [],
      });
    } finally {
      setRescheduleAvailabilityLoading(false);
    }
  }

  useEffect(() => {
    if (active !== "book") return;
    loadAvailability();
  }, [active]);

  useEffect(() => {
    if (active !== "book" || !specialtyId) return;
    loadAvailability(specialtyId, doctorId, date);
  }, [active, specialtyId, doctorId, date]);

  useEffect(() => {
    if (!rescheduleModal) return;
    loadRescheduleAvailability(rescheduleDate);
  }, [rescheduleModal, rescheduleDate]);

  async function request(path: string, options: RequestInit = {}) {
    setMessage("");
    const response = await fetch(path, {
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options,
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(json.error || "Nao foi possivel concluir a acao.");
      await fireSwal({
        icon: "error",
        title: "Erro",
        text: json.error || "Não foi possível concluir a ação.",
      });
      return null;
    }
    setMessage("Alteracao salva com sucesso.");
    await fireSwal({
      icon: "success",
      title: "Concluído",
      text: "Alteração salva com sucesso.",
    });
    await loadData();
    if (active === "appointments") {
      await loadAppointments(appointmentsPage);
    }
    return json;
  }

  const specialties = data?.specialties || [];
  const appointments = data?.appointments || [];
  const selectedSpecialty = specialties.find((item: AnyRecord) => item._id === specialtyId) || null;
  const selectedDoctors = specialtyId ? availability.doctors : [];
  const selectedDoctor = selectedDoctors.find((item: AnyRecord) => item._id === doctorId);
  const selectedSchedule = availability.schedule;

  const upcoming = appointments;
  const upcomingCount = Number(data?.summaryCounts?.upcomingBookings ?? appointments.length ?? 0);
  const pastCount = Number(data?.summaryCounts?.pastBookings ?? 0);

  useEffect(() => {
    if (active !== "appointments") return;
    loadAppointments(1);
  }, [active]);

  async function bookAppointment() {
    const result = await request("/api/appointments", {
      method: "POST",
      body: JSON.stringify({
        doctorId,
        specialtyId,
        date,
        time,
      }),
    });

    if (result) {
      setPaymentBooking(result.booking || result.appointment || null);
      setPaymentInfo(null);
      setSpecialtyId("");
      setDoctorId("");
      setDate("");
      setTime("");
      setAvailability({
        doctors: [],
        schedule: null,
        availableDates: [],
        slots: [],
      });

      const wantPix = await fireSwal({
        icon: "success",
        title: "Agendamento confirmado",
        text: "Você quer gerar o Pix agora para pagar esse agendamento?",
        showCancelButton: true,
        confirmButtonText: "Sim, pagar agora",
        cancelButtonText: "Depois",
      });

      if (wantPix.isConfirmed) {
        const bookingId = String((result.booking || result.appointment || {})._id || "");
        if (bookingId) {
          await generateAppointmentPix(bookingId);
        }
      }
    }
  }

  async function generateAppointmentPix(bookingId: string) {
    setPaymentBusy(true);
    try {
      const response = await fetch("/api/payments/mercadopago/pix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(json.error || "Não foi possível gerar o Pix.");
      }
      setPaymentInfo(json);
    } catch (error) {
      await fireSwal({
        icon: "error",
        title: "Erro",
        text: error instanceof Error ? error.message : "Não foi possível gerar o Pix.",
      });
    } finally {
      setPaymentBusy(false);
    }
  }

  async function copyPixCode() {
    if (!paymentInfo?.pixCopyPaste) return;
    await navigator.clipboard.writeText(paymentInfo.pixCopyPaste);
    await fireSwal({
      icon: "success",
      title: "Copiado",
      text: "Código Pix copiado para a área de transferência.",
    });
  }

  async function cancelAppointment(appointmentId: string) {
    const result = await fireSwal({
      icon: "warning",
      title: "Cancelar agendamento?",
      text: "Essa ação não pode ser desfeita.",
      showCancelButton: true,
      confirmButtonText: "Sim, cancelar",
      cancelButtonText: "Manter agendamento",
    });

    if (!result.isConfirmed) return;

    await request("/api/appointments", {
      method: "PATCH",
      body: JSON.stringify({ appointmentId, status: "CANCELADA" }),
    });
  }

  function openRescheduleModal(appointment: AnyRecord) {
    setRescheduleModal(appointment);
    setRescheduleDate(appointment.date);
    setRescheduleTime("");
    setRescheduleAvailability({
      schedule: null,
      slots: [],
    });
  }

  function closeRescheduleModal() {
    setRescheduleModal(null);
    setRescheduleDate("");
    setRescheduleTime("");
    setRescheduleAvailability({
      schedule: null,
      slots: [],
    });
    setRescheduleAvailabilityLoading(false);
  }

  async function rescheduleAppointment() {
    if (!rescheduleModal) return;
    await request("/api/appointments", {
      method: "PUT",
      body: JSON.stringify({
        appointmentId: rescheduleModal._id,
        date: rescheduleDate,
        time: rescheduleTime,
      }),
    });
    closeRescheduleModal();
  }

  return (
    <RoleShell
      userName={data?.user?.name || "Cliente"}
      roleLabel="Cliente"
      navItems={navItems}
      active={active}
      onNavigate={(id) => {
        if (id === "doctors") {
          router.push("/cliente/medicos");
          return;
        }
        if (id === "products") {
          router.push("/cliente/produtos");
          return;
        }
        setActive(id);
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
              <Skeleton className="h-7 w-56" />
              <Skeleton className="h-4 w-80" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-10 w-28" />
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
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
          <Card>
            <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between">
              <Skeleton className="h-5 w-44" />
              <Skeleton className="h-9 w-28" />
            </div>
            <div className="divide-y divide-slate-50">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="px-5 py-4 flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-36" />
                  </div>
                  <Skeleton className="h-10 w-24" />
                </div>
              ))}
            </div>
          </Card>
        </div>
      ) : (
        <>
          {message && <div className="mb-4 rounded-xl bg-sky-50 px-4 py-3 text-sm text-sky-700">{message}</div>}

          {active === "dashboard" && (
            <div>
              <PageHeader
                title={`Olá, ${String(data?.user?.name || "Cliente").split(" ")[0]}`}
                sub="Seus agendamentos e próximas ações"
                action={
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => router.push("/cliente/medicos")}>Nossos barbeiros</Button>
                    <Button variant="secondary" onClick={() => router.push("/cliente/produtos")}>Produtos</Button>
                    <Button variant="secondary" onClick={loadData}>
                      <RefreshCw className="w-4 h-4" />
                      Atualizar
                    </Button>
                  </div>
                }
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
                <StatCard label="Próximos agendamentos" value={upcomingCount} icon={Calendar} color="bg-orange-50 text-orange-600" />
                <StatCard label="Histórico" value={pastCount} icon={CheckCircle} color="bg-teal-50 text-teal-600" />
                <StatCard label="Serviços" value={specialties.length} icon={Star} color="bg-violet-50 text-violet-600" />
              </div>
              <Card>
                <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between">
                  <h2 className="font-semibold text-slate-800">Próximos agendamentos</h2>
                  <Button variant="secondary" size="sm" onClick={() => setActive("book")}>
                    <Plus className="w-3.5 h-3.5" />
                    Agendar
                  </Button>
                </div>
                <div className="divide-y divide-slate-50">
                  {upcoming.length === 0 ? (
                    <Empty label="Nenhum agendamento marcado." />
                  ) : (
                    upcoming.map((item: AnyRecord) => (
                      <div key={item._id} className="px-5 py-4 flex items-center gap-4">
                        <div className="w-12 h-12 bg-sky-50 rounded-xl flex flex-col items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-sky-700 leading-none">
                            {new Date(`${item.date}T12:00:00`).getDate()}
                          </span>
                          <span className="text-xs text-sky-500">
                            {new Date(`${item.date}T12:00:00`).toLocaleDateString("pt-BR", { month: "short" })}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-800">{resolveName(item.doctorId || item.barberId)}</p>
                          <p className="text-sm text-slate-500">
                            {resolveName(item.specialtyId || item.serviceId)} · {item.time}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>
          )}

          {active === "book" && (
            <div>
              <PageHeader title="Agendar serviço" sub="Escolha serviço, barbeiro, data e horário disponíveis" />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-6 space-y-4">
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Serviço</span>
                    <Select
                      value={specialtyId}
                      onChange={(e) => {
                        setSpecialtyId(e.target.value);
                        setDoctorId("");
                        setDate("");
                        setTime("");
                      }}
                    >
                      <option value="">Selecione</option>
                      {specialties.map((item: AnyRecord) => (
                        <option key={item._id} value={item._id}>
                          {item.name}
                        </option>
                      ))}
                    </Select>
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Barbeiro</span>
                    <Select
                      value={doctorId}
                      onChange={(e) => {
                        setDoctorId(e.target.value);
                        setDate("");
                        setTime("");
                      }}
                      disabled={!specialtyId || availabilityLoading}
                    >
                      <option value="">
                        {!specialtyId ? "Escolha o serviço primeiro" : availabilityLoading ? "Carregando barbeiros..." : "Selecione"}
                      </option>
                      {selectedDoctors.map((item: AnyRecord) => (
                        <option key={item._id} value={item._id}>
                          {item.name}
                        </option>
                      ))}
                    </Select>
                  </label>

                  {!specialtyId && (
                    <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      Selecione um serviço para carregar apenas os barbeiros vinculados.
                    </div>
                  )}

                  {specialtyId && !doctorId && (
                    <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      Agora escolha o barbeiro desejado para ver os dias e horários disponíveis.
                    </div>
                  )}

                  {doctorId && (
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between gap-3 mb-3">
                          <p className="text-sm font-semibold text-slate-700">Dias disponiveis</p>
                          {availabilityLoading && <span className="text-xs text-slate-500">Atualizando agenda...</span>}
                        </div>
                        {availability.availableDates.length === 0 ? (
                          <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
                            Nenhuma data disponível no período consultado.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {availability.availableDates.map((item) => (
                              <button
                                key={item}
                                type="button"
                                onClick={() => {
                                  setDate(item);
                                  setTime("");
                                }}
                                className={`rounded-xl border px-3 py-3 text-left text-sm transition-all ${date === item
                                  ? "bg-sky-600 text-white border-sky-600"
                                  : "bg-slate-50 text-slate-700 border-slate-200 hover:border-sky-200 hover:bg-sky-50"
                                  }`}
                              >
                                <div className="font-medium">{formatDateLabel(item)}</div>
                                <div className={`text-xs mt-1 ${date === item ? "text-sky-50" : "text-slate-500"}`}>
                                  Agenda liberada
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {date && selectedSchedule && (
                        <div>
                          <div className="flex items-center justify-between gap-3 mb-3">
                            <p className="text-sm font-semibold text-slate-700">Horarios disponiveis</p>
                            <span className="text-xs text-slate-500">{formatDateLabel(date)}</span>
                          </div>
                          {availability.slots.length === 0 ? (
                            <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
                              Nenhum horario livre nesta data.
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              {availability.slots.map((slot) => (
                                <button
                                  key={slot}
                                  type="button"
                                  onClick={() => setTime(slot)}
                                  className={`rounded-xl border px-3 py-2 text-sm font-mono transition-all ${time === slot
                                    ? "bg-sky-600 text-white border-sky-600"
                                    : "bg-slate-50 text-slate-700 border-slate-200 hover:border-sky-200 hover:bg-sky-50"
                                    }`}
                                >
                                  {slot}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <Button onClick={bookAppointment} disabled={!specialtyId || !doctorId || !date || !time} className="w-full">
                    Confirmar agendamento
                  </Button>
                </Card>

                <Card className="p-6">
                  <p className="text-sm font-semibold text-slate-700 mb-4">Prévia do agendamento</p>
                  {!selectedDoctor ? (
                    <Empty label="Selecione um barbeiro para ver a agenda disponível." />
                  ) : (
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between border-b border-slate-50 py-2">
                        <span className="text-slate-500">Barbeiro</span>
                        <span className="text-slate-800">{selectedDoctor.name}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-50 py-2">
                        <span className="text-slate-500">Serviço</span>
                        <span className="text-slate-800">{selectedSpecialty?.name || resolveName(selectedDoctor.specialtyId)}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-50 py-2">
                        <span className="text-slate-500">Preço</span>
                        <span className="text-slate-800">
                          {selectedSpecialty?.price !== undefined
                            ? Number(selectedSpecialty.price).toLocaleString("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              })
                            : "—"}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-slate-50 py-2">
                        <span className="text-slate-500">Dias</span>
                        <span className="text-slate-800">
                          {(selectedSchedule?.availableDays || []).map((day: number) => String(day)).join(", ") || "—"}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-slate-50 py-2">
                        <span className="text-slate-500">Horário</span>
                        <span className="text-slate-800">
                          {selectedSchedule?.startTime || "08:00"} - {selectedSchedule?.endTime || "18:00"}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-slate-50 py-2">
                        <span className="text-slate-500">Almoço</span>
                        <span className="text-slate-800">
                          {selectedSchedule?.lunchStart && selectedSchedule?.lunchEnd
                            ? `${selectedSchedule.lunchStart} - ${selectedSchedule.lunchEnd}`
                            : "—"}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-slate-50 py-2">
                        <span className="text-slate-500">Duração</span>
                        <span className="text-slate-800">{selectedSchedule?.slotDuration || 30} min</span>
                      </div>
                    </div>
                  )}
                </Card>
              </div>
            </div>
          )}

          {active === "appointments" && (
            <div>
              <PageHeader title="Meus agendamentos" sub="Histórico, reagendamento e cancelamento" />
              <div className="space-y-3">
                {appointmentsLoading ? (
                  <Card className="p-8 text-sm text-slate-500">Carregando agendamentos...</Card>
                ) : appointmentsData.length === 0 ? (
                  <Card className="p-8">
                    <Empty label="Nenhum agendamento encontrado." />
                  </Card>
                ) : (
                  appointmentsData.map((item: AnyRecord) => (
                    <Card key={item._id} className="p-5">
                      <div className="flex flex-wrap items-start gap-4">
                        <div className="w-12 h-12 bg-sky-50 rounded-xl flex flex-col items-center justify-center flex-shrink-0">
                          <span className="text-sm font-bold text-sky-700 leading-none">
                            {new Date(`${item.date}T12:00:00`).getDate()}
                          </span>
                          <span className="text-xs text-sky-500">
                            {new Date(`${item.date}T12:00:00`).toLocaleDateString("pt-BR", { month: "short" })}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h3 className="font-semibold text-slate-900">{resolveName(item.doctorId || item.barberId)}</h3>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                              {item.status}
                            </span>
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                item.paymentStatus === "paid" || item.paymentStatus === "approved"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : item.paymentStatus === "cancelled"
                                    ? "bg-slate-100 text-slate-500"
                                    : "bg-amber-50 text-amber-700"
                              }`}
                            >
                              {item.paymentStatus === "paid" || item.paymentStatus === "approved"
                                ? "Pago"
                                : item.paymentStatus === "cancelled"
                                  ? "Cancelado"
                                  : "Pendente"}
                            </span>
                          </div>
                          <p className="text-sm text-slate-500">
                            {resolveName(item.specialtyId || item.serviceId)} · {item.date} às {item.time}
                          </p>
                          <p className="text-sm text-slate-700 mt-1">
                            Valor:{" "}
                            <span className="font-semibold">
                              {Number(item.serviceId?.price || item.specialtyId?.price || 0).toLocaleString("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              })}
                            </span>
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2 flex-shrink-0">
                          {item.paymentStatus !== "paid" && item.paymentStatus !== "approved" && item.status !== "CANCELADA" && (
                            <Button
                              size="sm"
                              onClick={() => {
                                setPaymentBooking(item);
                                setPaymentInfo(item.paymentId && item.paymentId.qrCode ? item.paymentId : null);
                              }}
                            >
                              {item.paymentId && (item.paymentId.qrCode || item.paymentId.pixCopyPaste)
                                ? "Ver pagamento"
                                : "Pagar com Pix"}
                            </Button>
                          )}
                          {canPatientReschedule(item.status) && (
                            <Button variant="secondary" size="sm" onClick={() => openRescheduleModal(item)}>
                              Reagendar
                            </Button>
                          )}
                          {canPatientCancel(item.status) && (
                            <Button variant="danger" size="sm" onClick={() => cancelAppointment(item._id)}>
                              Cancelar
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
              <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-4 text-sm text-slate-500">
                <span>
                  Página {appointmentsMeta.page} de {appointmentsMeta.totalPages} · {appointmentsMeta.total} registros
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={appointmentsMeta.page <= 1 || appointmentsLoading}
                    onClick={() => loadAppointments(Math.max(1, appointmentsMeta.page - 1))}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={appointmentsMeta.page >= appointmentsMeta.totalPages || appointmentsLoading}
                    onClick={() => loadAppointments(Math.min(appointmentsMeta.totalPages, appointmentsMeta.page + 1))}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            </div>
          )}

          {paymentBooking && (
            <Modal
              title="Pagamento do agendamento"
              onClose={() => {
                setPaymentBooking(null);
                setPaymentInfo(null);
              }}
              wide
            >
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-2 text-sm">
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-500">Cliente</span>
                      <span className="text-slate-800">{resolveName(paymentBooking.clientId || data?.user)}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-500">Barbeiro</span>
                      <span className="text-slate-800">{resolveName(paymentBooking.barberId)}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-500">Serviço</span>
                      <span className="text-slate-800">{resolveName(paymentBooking.serviceId)}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-500">Valor</span>
                      <span className="text-slate-800 font-semibold">
                        {(Number(selectedSpecialty?.price || paymentBooking.serviceId?.price || 0)).toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 justify-end">
                    <Button variant="secondary" onClick={() => generateAppointmentPix(String(paymentBooking._id))} disabled={paymentBusy}>
                      {paymentBusy ? "Gerando Pix..." : "Gerar Pix agora"}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setPaymentBooking(null);
                        setPaymentInfo(null);
                      }}
                    >
                      Fechar
                    </Button>
                  </div>
                </div>

                <div className="rounded-2xl bg-orange-50 border border-orange-100 p-5">
                  <h4 className="font-semibold text-orange-900">Pix do agendamento</h4>
                  {paymentInfo ? (
                    <div className="mt-4 space-y-4 rounded-2xl bg-white/80 border border-orange-100 p-4">
                      <div className="flex items-center gap-2 text-orange-900 font-semibold">
                        <QrCode className="w-4 h-4" />
                        Pix gerado
                      </div>
                      {paymentInfo.qrCodeBase64 ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={`data:image/png;base64,${paymentInfo.qrCodeBase64}`} alt="QR Code Pix" className="w-full rounded-xl border border-orange-100 bg-white" />
                      ) : null}
                      {paymentInfo.qrCode ? <pre className="whitespace-pre-wrap break-words text-xs bg-white rounded-xl border border-orange-100 p-3">{paymentInfo.qrCode}</pre> : null}
                      <Button variant="secondary" className="w-full" onClick={copyPixCode}>
                        <Copy className="w-4 h-4" />
                        Copiar código Pix
                      </Button>
                      <p className="text-xs text-orange-800">
                        O pagamento será confirmado automaticamente quando o Mercado Pago aprovar o Pix.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-4 rounded-2xl bg-white/70 border border-orange-100 p-4 text-sm text-orange-900">
                      Clique em “Gerar Pix agora” para mostrar o QR Code deste agendamento.
                    </div>
                  )}
                </div>
              </div>
            </Modal>
          )}

          {rescheduleModal && (
            <Modal title="Reagendar agendamento" onClose={closeRescheduleModal}>
              <div className="space-y-4">
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Nova data</span>
                  <Input
                    type="date"
                    value={rescheduleDate}
                    onChange={(e) => {
                      setRescheduleDate(e.target.value);
                      setRescheduleTime("");
                    }}
                  />
                </label>

                <div>
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <span className="text-sm font-medium text-slate-700">Horarios disponiveis</span>
                    {rescheduleAvailabilityLoading && <span className="text-xs text-slate-500">Carregando horarios...</span>}
                  </div>

                  {!rescheduleDate ? (
                    <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
                      Escolha uma nova data para ver os horarios disponiveis.
                    </div>
                  ) : rescheduleAvailability.slots.length === 0 ? (
                    <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
                      Nenhum horario livre nesta data.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {rescheduleAvailability.slots.map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setRescheduleTime(slot)}
                          className={`rounded-xl border px-3 py-2 text-sm font-mono transition-all ${rescheduleTime === slot
                            ? "bg-sky-600 text-white border-sky-600"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:border-sky-200 hover:bg-sky-50"
                            }`}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <p className="text-xs text-slate-500">A validacao de disponibilidade sera feita no servidor antes de salvar.</p>
              </div>
              <div className="flex gap-3 justify-end mt-4">
                <Button variant="secondary" onClick={closeRescheduleModal}>
                  Cancelar
                </Button>
                <Button onClick={rescheduleAppointment} disabled={!rescheduleDate || !rescheduleTime}>
                  Salvar
                </Button>
              </div>
            </Modal>
          )}
        </>
      )}
    </RoleShell>
  );
}
