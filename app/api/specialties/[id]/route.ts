import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { getSessionUser } from "@/lib/guards";
import Service from "@/models/Specialty";
import Booking from "@/models/Appointment";
import { invalidateCatalogCache } from "@/lib/catalog-cache";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PUT(req: NextRequest, context: { params: { id: string } }) {
  const session = await getSessionUser(req);
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = context.params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Payload inválido." }, { status: 400 });

  await connectMongo();
  const updatePayload = {
    ...body,
    price: body.price !== undefined ? Number(body.price) : undefined,
    durationMinutes: body.durationMinutes !== undefined ? Number(body.durationMinutes) : undefined,
  };
  const service = await Service.findByIdAndUpdate(id, updatePayload, { new: true });
  if (!service) return NextResponse.json({ error: "Serviço não encontrado." }, { status: 404 });

  invalidateCatalogCache();
  return NextResponse.json({ service, specialty: service });
}

export async function DELETE(req: NextRequest, context: { params: { id: string } }) {
  const session = await getSessionUser(req);
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = context.params;
  await connectMongo();
  const hasAppointments = await Booking.exists({ serviceId: id });
  const service = await Service.findByIdAndUpdate(id, { active: false }, { new: true });
  if (!service) return NextResponse.json({ error: "Serviço não encontrado." }, { status: 404 });

  invalidateCatalogCache();
  return NextResponse.json({
    ok: true,
    softDeleted: true,
    linkedAppointments: Boolean(hasAppointments),
    service,
    specialty: service,
  });
}
