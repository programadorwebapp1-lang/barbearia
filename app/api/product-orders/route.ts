import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { getSessionUser } from "@/lib/guards";
import Client from "@/models/Patient";
import Product from "@/models/Product";
import ProductOrder from "@/models/ProductOrder";
import Barbershop from "@/models/Barbershop";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session || session.role !== "CLIENTE") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectMongo();
  const body = await req.json().catch(() => null);
  const productId = String(body?.productId || "");
  const quantity = Math.max(1, Math.floor(Number(body?.quantity || 1)));

  if (!productId) {
    return NextResponse.json({ error: "Produto é obrigatório." }, { status: 400 });
  }

  const client = await Client.findById(session.clientId).lean();
  if (!client) return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });
  const barbershop = await Barbershop.findOne({ active: true }).lean();

  const product = await Product.findById(productId).lean();
  if (!product || product.status !== "active") {
    return NextResponse.json({ error: "Produto indisponível." }, { status: 409 });
  }

  if (quantity > Number(product.stock || 0)) {
    return NextResponse.json({ error: "Quantidade maior que o estoque disponível." }, { status: 409 });
  }

  const item = {
    productId: product._id,
    name: product.name,
    quantity,
    unitPrice: Number(product.price),
    total: Number(product.price) * quantity,
  };

  const order = await ProductOrder.create({
    clientId: client._id,
    barbershopId: barbershop?._id || null,
    items: [item],
    totalAmount: item.total,
    paymentStatus: "pending",
    status: "pending",
  });

  return NextResponse.json({ order }, { status: 201 });
}
