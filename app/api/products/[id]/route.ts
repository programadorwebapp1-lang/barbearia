import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { getSessionUser } from "@/lib/guards";
import Product from "@/models/Product";
import { deleteImageFromCloudinary, uploadImageToCloudinary, validateImageFile } from "@/lib/cloudinary";
import { invalidateCatalogCache } from "@/lib/catalog-cache";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PRODUCT_IMAGE_FOLDER = "barbearia/produtos";

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
    const uploaded = await uploadImageToCloudinary(photoEntry, PRODUCT_IMAGE_FOLDER);
    if (previousPhotoUrl) await deleteImageFromCloudinary(previousPhotoUrl);
    return uploaded.secureUrl;
  }

  return previousPhotoUrl;
}

export async function PUT(req: NextRequest, context: { params: { id: string } }) {
  const session = await getSessionUser(req);
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = context.params;
  const body = await readPayload(req);
  if (!body) return NextResponse.json({ error: "Payload inválido." }, { status: 400 });

  await connectMongo();
  const current = await Product.findById(id).lean();
  if (!current) return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });

  const updatePayload: Record<string, unknown> = {};
  const hasField = (key: string) => {
    if (body instanceof FormData) return body.has(key);
    return Object.prototype.hasOwnProperty.call(body, key);
  };

  if (hasField("name")) updatePayload.name = String(getBodyValue(body, "name") || "").trim();
  if (hasField("description")) updatePayload.description = String(getBodyValue(body, "description") || "");
  if (hasField("price")) updatePayload.price = Math.max(0, Number(getBodyValue(body, "price") || 0));
  if (hasField("stock")) updatePayload.stock = Math.max(0, Math.floor(Number(getBodyValue(body, "stock") || 0)));
  if (hasField("category")) updatePayload.category = String(getBodyValue(body, "category") || "");
  if (hasField("status")) updatePayload.status = String(getBodyValue(body, "status") || "active");

  try {
    updatePayload.photoUrl = await resolvePhoto(body, String(current.photoUrl || ""));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível processar a foto." }, { status: 400 });
  }

  const product = await Product.findByIdAndUpdate(id, updatePayload, { new: true });
  if (!product) return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });

  invalidateCatalogCache();
  return NextResponse.json({ product });
}

export async function DELETE(req: NextRequest, context: { params: { id: string } }) {
  const session = await getSessionUser(req);
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = context.params;
  await connectMongo();
  const product = await Product.findByIdAndUpdate(id, { status: "inactive" }, { new: true });
  if (!product) return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });

  invalidateCatalogCache();
  return NextResponse.json({ ok: true, product });
}
