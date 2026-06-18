import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { getSessionUser } from "@/lib/guards";
import Barber from "@/models/Doctor";
import Service from "@/models/Specialty";
import { getDailyAppointments } from "@/services/financeiro/getDailyAppointments";
import { getFinancialSummary } from "@/services/financeiro/getFinancialSummary";
import type { FinancialFilters } from "@/types/financeiro";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getDefaultDate() {
  return new Date().toISOString().split("T")[0];
}

export async function GET(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectMongo();
  const params = req.nextUrl.searchParams;
  const filters: FinancialFilters = {
    date: params.get("date") || getDefaultDate(),
    barberId: params.get("barberId") || "",
    serviceId: params.get("serviceId") || "",
    paymentStatus: params.get("paymentStatus") || "",
    appointmentStatus: params.get("appointmentStatus") || "",
  };

  const [appointments, barbers, services] = await Promise.all([
    getDailyAppointments(filters),
    Barber.find({ active: true }).select("_id name").sort({ name: 1 }).lean(),
    Service.find({ active: true }).select("_id name price").sort({ name: 1 }).lean(),
  ]);

  const summary = getFinancialSummary(appointments);

  return NextResponse.json({
    filters,
    summary,
    appointments,
    barbers: barbers.map((item) => ({ _id: String(item._id), name: item.name })),
    services: services.map((item) => ({ _id: String(item._id), name: item.name, price: Number(item.price || 0) })),
  });
}
