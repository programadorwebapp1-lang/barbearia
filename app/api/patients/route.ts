import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { getSessionUser } from "@/lib/guards";
import Client from "@/models/Patient";
import User from "@/models/User";
import { hashPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await connectMongo();
  const clients = await Client.find().select("name email phone address birthDate active createdAt").sort({ name: 1 }).lean();
  return NextResponse.json({ clients, patients: clients });
}

export async function POST(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectMongo();
  const body = await req.json().catch(() => null);
  if (!body?.name || !body?.email) {
    return NextResponse.json({ error: "Nome e e-mail são obrigatórios." }, { status: 400 });
  }

  if (!body.password) {
    return NextResponse.json({ error: "Senha do paciente é obrigatória." }, { status: 400 });
  }

  const existingUser = await User.findOne({ email: String(body.email).toLowerCase() });
  if (existingUser) {
    return NextResponse.json({ error: "E-mail já cadastrado." }, { status: 409 });
  }

  const client = await Client.create({
    name: body.name,
    email: String(body.email).toLowerCase(),
    phone: body.phone || "",
    address: body.address || "",
    birthDate: body.birthDate || "",
    active: body.active ?? true,
  });

  const passwordHash = await hashPassword(String(body.password));
  const user = await User.create({
    name: body.name,
    email: String(body.email).toLowerCase(),
    passwordHash,
    role: "CLIENTE",
    clientId: client._id,
  });

  client.userId = user._id;
  client.email = user.email;
  await client.save();

  return NextResponse.json({ client, patient: client, user }, { status: 201 });
}
