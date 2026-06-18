import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { getSessionUser } from "@/lib/guards";
import Barber from "@/models/Doctor";
import Schedule from "@/models/Schedule";
import Booking from "@/models/Appointment";
import Service from "@/models/Specialty";
import { generateAvailableSlots, isPastDate } from "@/lib/medical";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectMongo();

  const serviceId = req.nextUrl.searchParams.get("serviceId") || req.nextUrl.searchParams.get("specialtyId") || "";
  const barberId = req.nextUrl.searchParams.get("barberId") || req.nextUrl.searchParams.get("doctorId") || "";
  const startDate = req.nextUrl.searchParams.get("startDate") || new Date().toISOString().split("T")[0];
  const days = Math.min(Number(req.nextUrl.searchParams.get("days") || 30), 90);
  const date = req.nextUrl.searchParams.get("date") || "";

  const services = serviceId
    ? await Service.find({ _id: serviceId, active: true }).select("name price durationMinutes active").lean()
    : [];
  const barbers = await Barber.find(serviceId ? { active: true, servicesIds: serviceId } : { active: true })
    .select("name email phone servicesIds photoUrl bio status active")
    .lean();

  const filteredBarbers = barberId ? barbers.filter((barber) => String(barber._id) === String(barberId)) : barbers;

  if (!barberId) {
    return NextResponse.json({ services, specialties: services, barbers: filteredBarbers, doctors: filteredBarbers });
  }

  const schedule = await Schedule.findOne({ barberId }).lean();
  if (!schedule) {
    return NextResponse.json({ services, specialties: services, barbers: filteredBarbers, doctors: filteredBarbers, schedule: null, availableDates: [], slots: [] });
  }

  const endWindow = new Date(`${startDate}T12:00:00`);
  endWindow.setDate(endWindow.getDate() + days);
  const endDate = endWindow.toISOString().split("T")[0];

  const rangeBookings = await Booking.find({
    barberId,
    status: { $ne: "CANCELADA" },
    date: { $gte: startDate, $lte: endDate },
  })
    .select("date time")
    .sort({ date: 1, time: 1 })
    .lean();

  const bookedByDate = new Map<string, string[]>();
  for (const item of rangeBookings) {
    const list = bookedByDate.get(item.date) || [];
    list.push(item.time);
    bookedByDate.set(item.date, list);
  }

  const availableDates: string[] = [];
  const start = new Date(`${startDate}T12:00:00`);

  for (let index = 0; index < days; index += 1) {
    const current = new Date(start);
    current.setDate(start.getDate() + index);
    const currentDate = current.toISOString().split("T")[0];
    if (isPastDate(currentDate)) continue;
    const slots = generateAvailableSlots(schedule, currentDate, bookedByDate.get(currentDate) || []);
    if (slots.length > 0) {
      availableDates.push(currentDate);
    }
  }

  const slots = date ? generateAvailableSlots(schedule, date, bookedByDate.get(date) || []) : [];

  return NextResponse.json({
    services,
    specialties: services,
    barbers: filteredBarbers,
    doctors: filteredBarbers,
    schedule,
    availableDates,
    slots,
  });
}
