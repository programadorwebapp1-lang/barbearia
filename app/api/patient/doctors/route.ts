import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { getSessionUser } from "@/lib/guards";
import Doctor from "@/models/Doctor";
import Specialty from "@/models/Specialty";
import { purgeLegacyDoctorPhotoUrls } from "@/lib/doctor-media";
import { getCatalogCache, setCatalogCache } from "@/lib/catalog-cache";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function parsePage(value: string | null, fallback = 1) {
  const page = Number(value || fallback);
  return Number.isFinite(page) && page > 0 ? Math.floor(page) : fallback;
}

function parseLimit(value: string | null, fallback = 12) {
  const limit = Number(value || fallback);
  return Number.isFinite(limit) && limit > 0 ? Math.min(Math.floor(limit), 48) : fallback;
}

export async function GET(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session || session.role !== "CLIENTE") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectMongo();
  await purgeLegacyDoctorPhotoUrls();

  const cacheKey = "catalog:patient:doctors";
  const cached = getCatalogCache<{ specialties: any[]; doctors: any[] }>(cacheKey);
  if (cached) {
    const page = parsePage(req.nextUrl.searchParams.get("page"));
    const limit = parseLimit(req.nextUrl.searchParams.get("limit"));
    const serviceId = String(req.nextUrl.searchParams.get("serviceId") || "");
    const filteredDoctors = serviceId
      ? cached.doctors.filter((item: any) => {
          const servicesIds = Array.isArray(item.servicesIds) ? item.servicesIds.map((value: unknown) => String(value)) : [];
          const specialtyValue = String(item.specialtyId?._id || item.specialtyId || "");
          return servicesIds.includes(serviceId) || specialtyValue === serviceId;
        })
      : cached.doctors;
    const total = filteredDoctors.length;
    const start = (page - 1) * limit;
    return NextResponse.json({
      user: session,
      specialties: cached.specialties,
      doctors: filteredDoctors.slice(start, start + limit),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  }

  const [specialties, doctors] = await Promise.all([
    Specialty.find({ active: true }).select("name price durationMinutes active").lean(),
    Doctor.find({ active: true, status: { $ne: "INATIVO" } })
      .select("name email phone servicesIds photoUrl bio status active")
      .lean(),
  ]);

  setCatalogCache(cacheKey, { specialties, doctors }, 60_000);

  const page = parsePage(req.nextUrl.searchParams.get("page"));
  const limit = parseLimit(req.nextUrl.searchParams.get("limit"));
  const serviceId = String(req.nextUrl.searchParams.get("serviceId") || "");
  const filteredDoctors = serviceId
    ? doctors.filter((item: any) => {
        const servicesIds = Array.isArray(item.servicesIds) ? item.servicesIds.map((value: unknown) => String(value)) : [];
        const specialtyValue = String(item.specialtyId?._id || item.specialtyId || "");
        return servicesIds.includes(serviceId) || specialtyValue === serviceId;
      })
    : doctors;
  const total = filteredDoctors.length;
  const start = (page - 1) * limit;

  return NextResponse.json({
    user: session,
    specialties,
    doctors: filteredDoctors.slice(start, start + limit),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  });
}
