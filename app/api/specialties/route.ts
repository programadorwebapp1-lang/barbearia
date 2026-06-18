import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { getSessionUser } from "@/lib/guards";
import Service from "@/models/Specialty";
import { getCatalogCache, invalidateCatalogCache, setCatalogCache } from "@/lib/catalog-cache";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await connectMongo();
  const cacheKey = "services:admin:list";
  const cached = getCatalogCache<{ services: any[] }>(cacheKey);
  if (cached) {
    return NextResponse.json({ services: cached.services, specialties: cached.services });
  }

  const services = await Service.find().select("name description price durationMinutes active createdAt").sort({ name: 1 }).lean();
  setCatalogCache(cacheKey, { services }, 60_000);
  return NextResponse.json({ services, specialties: services });
}

export async function POST(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectMongo();
  const body = await req.json().catch(() => null);
  if (!body?.name || body?.price === undefined) {
    return NextResponse.json({ error: "Nome e preço são obrigatórios." }, { status: 400 });
  }

  const service = await Service.create({
    name: body.name,
    description: body.description || "",
    price: Number(body.price),
    durationMinutes: Number(body.durationMinutes || 30),
    active: body.active ?? true,
  });

  invalidateCatalogCache();
  return NextResponse.json({ service, specialty: service }, { status: 201 });
}
