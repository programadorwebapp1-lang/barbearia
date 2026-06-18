import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { getSessionUser } from "@/lib/guards";
import Barber from "@/models/Doctor";
import Schedule from "@/models/Schedule";
import User from "@/models/User";
import { hashPassword } from "@/lib/auth";
import { deleteImageFromCloudinary, uploadImageToCloudinary, validateImageFile } from "@/lib/cloudinary";
import { purgeLegacyDoctorPhotoUrls } from "@/lib/doctor-media";
import { getCatalogCache, invalidateCatalogCache, setCatalogCache } from "@/lib/catalog-cache";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BARBER_IMAGE_FOLDER = "barbearia/barbeiros";

function getBodyValue(body: FormData | Record<string, unknown> | null, key: string) {
  if (!body) return undefined;
  if (body instanceof FormData) return body.get(key);
  return body[key];
}

async function readPayload(req: NextRequest) {
  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("multipart/form-data")) return req.formData();
  return req.json().catch(() => null);
}

async function resolvePhoto(body: FormData | Record<string, unknown> | null, previousPhotoUrl = "") {
  const removePhoto = String(getBodyValue(body, "removePhoto") || "").toLowerCase() === "true";
  const photoEntry = getBodyValue(body, "photo");

  if (removePhoto) {
    if (previousPhotoUrl) await deleteImageFromCloudinary(previousPhotoUrl);
    return "";
  }

  if (photoEntry instanceof File && photoEntry.size > 0) {
    validateImageFile(photoEntry);
    const uploaded = await uploadImageToCloudinary(photoEntry, BARBER_IMAGE_FOLDER);
    if (previousPhotoUrl) await deleteImageFromCloudinary(previousPhotoUrl);
    return uploaded.secureUrl;
  }

  if (previousPhotoUrl.startsWith("data:")) return "";
  return previousPhotoUrl;
}

function parseNumberArray(value: string) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed.map((item) => Number(item)).filter((item) => !Number.isNaN(item)) : [];
  } catch {
    return [];
  }
}

function parseServicesIds(value: string) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectMongo();
  await purgeLegacyDoctorPhotoUrls();
  const cacheKey = "barbers:admin:list";
  const cached = getCatalogCache<{ barbers: any[] }>(cacheKey);
  if (cached) {
    return NextResponse.json({ barbers: cached.barbers, doctors: cached.barbers });
  }

  const barbers = await Barber.find().select("name email phone servicesIds photoUrl bio status active createdAt").sort({ name: 1 }).lean();
  setCatalogCache(cacheKey, { barbers }, 60_000);
  return NextResponse.json({ barbers, doctors: barbers });
}

export async function POST(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectMongo();
  const body = await readPayload(req);
  const name = String(getBodyValue(body, "name") || "").trim();
  const email = String(getBodyValue(body, "email") || "").trim().toLowerCase();
  const password = String(getBodyValue(body, "password") || "");
  const phone = String(getBodyValue(body, "phone") || "").trim();
  const bio = String(getBodyValue(body, "bio") || "");
  const active = String(getBodyValue(body, "active") ?? "true") !== "false";
  const servicesIdsRaw = String(getBodyValue(body, "servicesIds") || getBodyValue(body, "specialtyId") || "[]");
  const fallbackServiceId = String(getBodyValue(body, "specialtyId") || "").trim();
  const startTime = String(getBodyValue(body, "startTime") || "08:00");
  const endTime = String(getBodyValue(body, "endTime") || "18:00");
  const slotDuration = Number(getBodyValue(body, "slotDuration") || 30);
  const availableDays = parseNumberArray(String(getBodyValue(body, "availableDays") || "[]"));

  if (!name || !email) {
    return NextResponse.json({ error: "Nome e e-mail são obrigatórios." }, { status: 400 });
  }

  if (!password) {
    return NextResponse.json({ error: "Senha do barbeiro é obrigatória." }, { status: 400 });
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return NextResponse.json({ error: "E-mail já cadastrado." }, { status: 409 });
  }

  let photoUrl = "";
  try {
    photoUrl = await resolvePhoto(body);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível processar a foto." }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);

  try {
    const barber = await Barber.create({
      name,
      email,
      phone,
      servicesIds: parseServicesIds(servicesIdsRaw).length > 0 ? parseServicesIds(servicesIdsRaw) : fallbackServiceId ? [fallbackServiceId] : [],
      photoUrl,
      bio,
      status: active ? "ATIVO" : "INATIVO",
      active,
    });

    const user = await User.create({
      name,
      email,
      passwordHash,
      role: "BARBEIRO",
      barberId: barber._id,
    });

    barber.userId = user._id;
    barber.email = user.email;
    await barber.save();

    await Schedule.findOneAndUpdate(
      { barberId: barber._id },
      {
        barberId: barber._id,
        availableDays,
        startTime,
        endTime,
        slotDuration,
        blockedDates: [],
        blockedSlots: [],
      },
      { upsert: true, new: true }
    );

    invalidateCatalogCache();
    return NextResponse.json({ barber, doctor: barber, user }, { status: 201 });
  } catch (error) {
    if (photoUrl) await deleteImageFromCloudinary(photoUrl);
    const message = error instanceof Error ? error.message : "Não foi possível cadastrar o barbeiro.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
