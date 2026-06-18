import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { getSessionUser } from "@/lib/guards";
import Booking from "@/models/Appointment";
import Barber from "@/models/Doctor";
import Client from "@/models/Patient";
import Service from "@/models/Specialty";
import Schedule from "@/models/Schedule";
import Barbershop from "@/models/Barbershop";
import { generateAvailableSlots, isPastDate } from "@/lib/medical";
import { checkRateLimit, getRequestFingerprint } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function parsePage(value: string | null, fallback = 1) {
  const page = Number(value || fallback);
  return Number.isFinite(page) && page > 0 ? Math.floor(page) : fallback;
}

function parseLimit(value: string | null, fallback = 10) {
  const limit = Number(value || fallback);
  return Number.isFinite(limit) && limit > 0 ? Math.min(Math.floor(limit), 100) : fallback;
}

async function canBook(barberId: string, date: string, time: string, excludeBookingId?: string) {
  if (isPastDate(date)) return { ok: false, message: "Não é permitido agendar em datas passadas." };

  const barber = await Barber.findById(barberId).lean();
  if (!barber || !barber.active || barber.status === "INATIVO") {
    return { ok: false, message: "Barbeiro indisponível." };
  }

  const schedule = await Schedule.findOne({ barberId }).lean();
  if (!schedule) return { ok: false, message: "Agenda não configurada." };

  const availableSlots = generateAvailableSlots(schedule, date, []);
  if (!availableSlots.includes(time)) {
    return { ok: false, message: "Horário fora da agenda do barbeiro." };
  }

  const conflictFilter: Record<string, unknown> = {
    barberId,
    date,
    time,
    status: { $ne: "CANCELADA" },
  };

  if (excludeBookingId) {
    conflictFilter._id = { $ne: excludeBookingId };
  }

  const conflict = await Booking.exists(conflictFilter);
  if (conflict) return { ok: false, message: "Já existe um agendamento nesse horário." };

  return { ok: true, barber, schedule };
}

export async function GET(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectMongo();
  const page = parsePage(req.nextUrl.searchParams.get("page"));
  const limit = parseLimit(req.nextUrl.searchParams.get("limit"));
  const skip = (page - 1) * limit;

  const baseQuery =
    session.role === "ADMIN"
      ? {}
      : session.role === "BARBEIRO"
        ? { barberId: session.barberId }
        : { clientId: session.clientId };

  const total = await Booking.countDocuments(baseQuery);

  if (session.role === "ADMIN") {
    const bookings = await Booking.find(baseQuery)
      .sort({ date: -1, time: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select("barberId clientId serviceId barbershopId date time status paymentStatus paymentId notes rescheduledFrom reminderSentAt reminderLastError reminderPayloadSent createdAt")
      .populate("barberId", "name email phone photoUrl servicesIds status active")
      .populate("clientId", "name email phone active")
      .populate("serviceId", "name price durationMinutes active")
      .populate("paymentId", "status method provider providerPaymentId qrCode qrCodeBase64 pixCopyPaste paidAt confirmedAt")
      .lean();
    return NextResponse.json({ bookings, appointments: bookings, meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } });
  }

  if (session.role === "BARBEIRO") {
    const bookings = await Booking.find(baseQuery)
      .sort({ date: -1, time: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select("barberId clientId serviceId barbershopId date time status paymentStatus paymentId notes rescheduledFrom reminderSentAt reminderLastError reminderPayloadSent createdAt")
      .populate("barberId", "name email phone photoUrl servicesIds status active")
      .populate("clientId", "name email phone active")
      .populate("serviceId", "name price durationMinutes active")
      .populate("paymentId", "status method provider providerPaymentId qrCode qrCodeBase64 pixCopyPaste paidAt confirmedAt")
      .lean();
    return NextResponse.json({ bookings, appointments: bookings, meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } });
  }

  const bookings = await Booking.find(baseQuery)
    .sort({ date: -1, time: -1, createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .select("barberId clientId serviceId barbershopId date time status paymentStatus paymentId notes rescheduledFrom reminderSentAt reminderLastError reminderPayloadSent createdAt")
    .populate("barberId", "name email phone photoUrl servicesIds status active")
    .populate("clientId", "name email phone active")
    .populate("serviceId", "name price durationMinutes active")
    .populate("paymentId", "status method provider providerPaymentId qrCode qrCodeBase64 pixCopyPaste paidAt confirmedAt")
    .lean();
  return NextResponse.json({ bookings, appointments: bookings, meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } });
}

export async function POST(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session || session.role !== "CLIENTE") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rate = checkRateLimit("appointment-create", `${session.id}:${getRequestFingerprint(req.headers)}`, {
    limit: 12,
    windowMs: 60 * 60 * 1000,
  });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Muitos agendamentos em pouco tempo. Aguarde alguns minutos e tente novamente." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((rate.resetAt - Date.now()) / 1000)),
        },
      }
    );
  }

  await connectMongo();
  const body = await req.json().catch(() => null);
  const barberId = String(body?.barberId || body?.doctorId || "");
  const serviceId = String(body?.serviceId || body?.specialtyId || "");
  if (!barberId || !serviceId || !body?.date || !body?.time) {
    return NextResponse.json({ error: "Barbeiro, serviço, data e horário são obrigatórios." }, { status: 400 });
  }

  const client = await Client.findById(session.clientId).lean();
  if (!client) return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });
  const barbershop = await Barbershop.findOne({ active: true }).lean();

  const service = await Service.findById(serviceId).lean();
  if (!service || !service.active) {
    return NextResponse.json({ error: "Serviço indisponível." }, { status: 409 });
  }

  const barber = await Barber.findById(barberId).lean();
  if (!barber || !barber.active) {
    return NextResponse.json({ error: "Barbeiro indisponível." }, { status: 409 });
  }

  if (Array.isArray(barber.servicesIds) && barber.servicesIds.length > 0) {
    const offersService = barber.servicesIds.some((item: unknown) => String(item) === String(serviceId));
    if (!offersService) {
      return NextResponse.json({ error: "O barbeiro selecionado não realiza esse serviço." }, { status: 409 });
    }
  }

  const validation = await canBook(barberId, String(body.date), String(body.time));
  if (!validation.ok) {
    return NextResponse.json({ error: validation.message }, { status: 409 });
  }

  let booking;
  try {
    booking = await Booking.create({
      barberId,
      clientId: client._id,
      serviceId,
      barbershopId: barbershop?._id || null,
      date: body.date,
      time: body.time,
      status: "AGENDADA",
      paymentStatus: "pending",
      notes: body.notes || "",
    });
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as { code?: number }).code === 11000) {
      return NextResponse.json({ error: "Já existe um agendamento nesse horário." }, { status: 409 });
    }
    throw error;
  }

  return NextResponse.json({ booking, appointment: booking }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session || session.role !== "CLIENTE") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rate = checkRateLimit("appointment-reschedule", `${session.id}:${getRequestFingerprint(req.headers)}`, {
    limit: 15,
    windowMs: 60 * 60 * 1000,
  });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Muitos reagendamentos em pouco tempo. Tente novamente mais tarde." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((rate.resetAt - Date.now()) / 1000)),
        },
      }
    );
  }

  await connectMongo();
  const body = await req.json().catch(() => null);
  const bookingId = String(body?.bookingId || body?.appointmentId || "");
  if (!bookingId || !body?.date || !body?.time) {
    return NextResponse.json({ error: "Agendamento, data e horário são obrigatórios." }, { status: 400 });
  }

  const current = await Booking.findById(bookingId);
  if (!current || String(current.clientId) !== session.clientId) {
    return NextResponse.json({ error: "Agendamento não encontrado." }, { status: 404 });
  }

  const previous = {
    appointmentId: current._id,
    date: current.date,
    time: current.time,
  };

  const validation = await canBook(String(current.barberId), String(body.date), String(body.time), String(current._id));
  if (!validation.ok) {
    return NextResponse.json({ error: validation.message }, { status: 409 });
  }

  current.date = body.date;
  current.time = body.time;
  current.rescheduledFrom = previous as never;
  current.reminderSentAt = null;
  current.reminderLastError = null;
  current.reminderPayloadSent = false;
  try {
    await current.save();
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as { code?: number }).code === 11000) {
      return NextResponse.json({ error: "Já existe um agendamento nesse horário." }, { status: 409 });
    }
    throw error;
  }

  return NextResponse.json({ booking: current, appointment: current });
}

export async function PATCH(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rate = checkRateLimit("appointment-status", `${session.id}:${getRequestFingerprint(req.headers)}`, {
    limit: 30,
    windowMs: 60 * 60 * 1000,
  });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Muitas alterações de status. Tente novamente mais tarde." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((rate.resetAt - Date.now()) / 1000)),
        },
      }
    );
  }

  await connectMongo();
  const body = await req.json().catch(() => null);
  const bookingId = String(body?.bookingId || body?.appointmentId || "");
  if (!bookingId || !body?.status) {
    return NextResponse.json({ error: "Agendamento e status são obrigatórios." }, { status: 400 });
  }

  const booking = await Booking.findById(bookingId);
  if (!booking) return NextResponse.json({ error: "Agendamento não encontrado." }, { status: 404 });

  if (session.role === "BARBEIRO" && String(booking.barberId) !== session.barberId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (session.role === "CLIENTE" && String(booking.clientId) !== session.clientId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  booking.status = body.status;
  if (typeof body.notes === "string") {
    booking.notes = body.notes;
  }
  if (body.status === "CANCELADA") {
    booking.paymentStatus = "cancelled";
  }
  await booking.save();
  return NextResponse.json({ booking, appointment: booking });
}
