import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { getSessionUser } from "@/lib/guards";
import Barber from "@/models/Doctor";
import Schedule from "@/models/Schedule";
import Booking from "@/models/Appointment";
import User from "@/models/User";
import { deleteImageFromCloudinary, uploadImageToCloudinary, validateImageFile } from "@/lib/cloudinary";
import { invalidateCatalogCache } from "@/lib/catalog-cache";

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

export async function PUT(req: NextRequest, context: { params: { id: string } }) {
  const session = await getSessionUser(req);
  const { id } = context.params;

  if (!session || (session.role !== "ADMIN" && !(session.role === "BARBEIRO" && session.barberId === id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await readPayload(req);
  if (!body) return NextResponse.json({ error: "Payload inválido." }, { status: 400 });

  await connectMongo();
  const barberBeforeUpdate = await Barber.findById(id).lean();
  if (!barberBeforeUpdate) {
    return NextResponse.json({ error: "Barbeiro não encontrado." }, { status: 404 });
  }

  const updatePayload: Record<string, unknown> = {};
  const hasField = (key: string) => {
    if (body instanceof FormData) return body.has(key);
    return Object.prototype.hasOwnProperty.call(body, key);
  };

  if (hasField("name")) updatePayload.name = String(getBodyValue(body, "name") || "").trim();
  if (hasField("phone")) updatePayload.phone = String(getBodyValue(body, "phone") || "").trim();
  if (hasField("bio")) updatePayload.bio = String(getBodyValue(body, "bio") || "");
  if (hasField("servicesIds")) {
    try {
      updatePayload.servicesIds = JSON.parse(String(getBodyValue(body, "servicesIds") || "[]"));
    } catch {
      updatePayload.servicesIds = [];
    }
  }
  if (session.role === "ADMIN") {
    if (hasField("email")) updatePayload.email = String(getBodyValue(body, "email") || "").trim().toLowerCase();
    if (hasField("active")) {
      const active = String(getBodyValue(body, "active") ?? "true") !== "false";
      updatePayload.active = active;
      updatePayload.status = active ? "ATIVO" : "INATIVO";
    }
    if (hasField("status")) {
      const status = String(getBodyValue(body, "status") || "ATIVO");
      updatePayload.status = status;
      updatePayload.active = status === "ATIVO";
    }
  }

  try {
    const nextPhotoUrl = await resolvePhoto(body, String(barberBeforeUpdate.photoUrl || ""));
    updatePayload.photoUrl = nextPhotoUrl;
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível processar a foto." }, { status: 400 });
  }

  const barber = await Barber.findByIdAndUpdate(id, updatePayload, { new: true });
  if (!barber) return NextResponse.json({ error: "Barbeiro não encontrado." }, { status: 404 });

  if (barber.userId) {
    await User.findByIdAndUpdate(barber.userId, {
      name: barber.name,
      email: barber.email,
    });
  }

  const schedulePayloadRaw = getBodyValue(body, "schedule");
  if (schedulePayloadRaw) {
    const schedule =
      typeof schedulePayloadRaw === "string"
        ? (() => {
            try {
              return JSON.parse(schedulePayloadRaw);
            } catch {
              return null;
            }
          })()
        : schedulePayloadRaw;

    if (schedule) {
      await Schedule.findOneAndUpdate({ barberId: barber._id }, { barberId: barber._id, ...schedule }, { upsert: true, new: true });
    }
  }

  invalidateCatalogCache();
  return NextResponse.json({ barber, doctor: barber });
}

export async function DELETE(req: NextRequest, context: { params: { id: string } }) {
  const session = await getSessionUser(req);
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = context.params;
  await connectMongo();
  const hasBookings = await Booking.exists({ barberId: id });
  const barber = await Barber.findByIdAndUpdate(id, { active: false, status: "INATIVO" }, { new: true });
  if (!barber) return NextResponse.json({ error: "Barbeiro não encontrado." }, { status: 404 });

  invalidateCatalogCache();
  return NextResponse.json({
    ok: true,
    softDeleted: true,
    linkedAppointments: Boolean(hasBookings),
    barber,
    doctor: barber,
  });
}
