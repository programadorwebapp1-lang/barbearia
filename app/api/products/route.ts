import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { getSessionUser } from "@/lib/guards";
import Product from "@/models/Product";
import { deleteImageFromCloudinary, uploadImageToCloudinary, validateImageFile } from "@/lib/cloudinary";
import { getCatalogCache, invalidateCatalogCache, setCatalogCache } from "@/lib/catalog-cache";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PRODUCT_IMAGE_FOLDER = "barbearia/produtos";

function parsePage(value: string | null, fallback = 1) {
  const page = Number(value || fallback);
  return Number.isFinite(page) && page > 0 ? Math.floor(page) : fallback;
}

function parseLimit(value: string | null, fallback = 12) {
  const limit = Number(value || fallback);
  return Number.isFinite(limit) && limit > 0 ? Math.min(Math.floor(limit), 48) : fallback;
}

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

export async function GET(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectMongo();
  const page = parsePage(req.nextUrl.searchParams.get("page"));
  const limit = parseLimit(req.nextUrl.searchParams.get("limit"));
  const skip = (page - 1) * limit;
  const cacheKey = session.role === "ADMIN" ? "products:admin:list" : "products:client:list";
  const cached = getCatalogCache<{ products: any[] }>(cacheKey);
  if (cached) {
    const products = session.role === "ADMIN" ? cached.products : cached.products.filter((item: any) => item.status === "active");
    const total = products.length;
    return NextResponse.json({
      products: products.slice(skip, skip + limit),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  }

  const products = session.role === "ADMIN"
    ? await Product.find().select("name description photoUrl price stock category status createdAt").sort({ name: 1 }).lean()
    : await Product.find({ status: "active" }).select("name description photoUrl price stock category status createdAt").sort({ name: 1 }).lean();
  setCatalogCache(cacheKey, { products }, 60_000);
  return NextResponse.json({
    products: products.slice(skip, skip + limit),
    meta: {
      page,
      limit,
      total: products.length,
      totalPages: Math.max(1, Math.ceil(products.length / limit)),
    },
  });
}

export async function POST(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectMongo();
  const body = await readPayload(req);
  if (!body) return NextResponse.json({ error: "Payload inválido." }, { status: 400 });

  const name = String(getBodyValue(body, "name") || "").trim();
  const description = String(getBodyValue(body, "description") || "");
  const price = Number(getBodyValue(body, "price") || 0);
  const stock = Math.max(0, Math.floor(Number(getBodyValue(body, "stock") || 0)));
  const category = String(getBodyValue(body, "category") || "");
  const status = String(getBodyValue(body, "status") || "active");

  if (!name || Number.isNaN(price)) {
    return NextResponse.json({ error: "Nome e preço são obrigatórios." }, { status: 400 });
  }

  let photoUrl = "";
  try {
    photoUrl = await resolvePhoto(body);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível processar a foto." }, { status: 400 });
  }

  const product = await Product.create({
    name,
    description,
    photoUrl,
    price: Math.max(0, price),
    stock,
    category,
    status: status === "inactive" ? "inactive" : "active",
  });

  invalidateCatalogCache();
  return NextResponse.json({ product }, { status: 201 });
}
