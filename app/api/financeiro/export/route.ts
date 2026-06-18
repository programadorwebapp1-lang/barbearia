import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { getSessionUser } from "@/lib/guards";
import Barber from "@/models/Doctor";
import Service from "@/models/Specialty";
import { getDailyAppointments } from "@/services/financeiro/getDailyAppointments";
import { getFinancialSummary } from "@/services/financeiro/getFinancialSummary";
import { exportFinancialReport } from "@/services/financeiro/exportFinancialReport";
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

  const appointments = await getDailyAppointments(filters);
  const summary = getFinancialSummary(appointments);
  const report = exportFinancialReport(appointments, summary);
  const filename = `financeiro-${filters.date}.csv`;

  return new NextResponse(report, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
