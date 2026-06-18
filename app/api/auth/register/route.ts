import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import User from "@/models/User";
import Client from "@/models/Patient";
import { hashPassword, signSessionToken, buildAuthCookie } from "@/lib/auth";
import { roleHome } from "@/lib/guards";
import { checkRateLimit, getRequestFingerprint } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function buildClientName(email: string) {
  const localPart = email.split("@")[0] || "Cliente";
  return localPart
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\p{L}/gu, (letter) => letter.toUpperCase());
}

export async function POST(req: NextRequest) {
  try {
    const rate = checkRateLimit("auth-register", getRequestFingerprint(req.headers), {
      limit: 5,
      windowMs: 60 * 60 * 1000,
    });
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Muitas tentativas de cadastro. Tente novamente mais tarde." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((rate.resetAt - Date.now()) / 1000)),
          },
        }
      );
    }

    await connectMongo();
    const existingUsers = await User.countDocuments();
    const body = await req.json().catch(() => null);

    if (!body) {
      return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
    }

    const email = String(body.email || "").toLowerCase().trim();
    const password = String(body.password || "");
    const phone = String(body.phone || "").trim();
    const name = String(body.name || "").trim() || buildClientName(email);

    if (existingUsers === 0) {
      if (body.role !== "ADMIN") {
        return NextResponse.json({ error: "O primeiro usuário deve ser administrador." }, { status: 400 });
      }

      if (!body.name || !body.email || !body.password) {
        return NextResponse.json({ error: "Nome, e-mail e senha são obrigatórios." }, { status: 400 });
      }

      const passwordHash = await hashPassword(password);
      const user = await User.create({
        name: String(body.name),
        email,
        passwordHash,
        role: "ADMIN",
      });

      const token = await signSessionToken({
        id: user._id.toString(),
        role: "ADMIN",
        name: user.name,
        email: user.email,
      });

      const response = NextResponse.json({ ok: true, redirectTo: roleHome("ADMIN") });
      response.cookies.set(buildAuthCookie(token));
      return response;
    }

    if (body.role !== "CLIENTE" && body.role !== "PACIENTE") {
      return NextResponse.json({ error: "Cadastro público disponível apenas para clientes." }, { status: 403 });
    }

    if (!body.email || !body.phone || !body.password) {
      return NextResponse.json({ error: "E-mail, telefone e senha são obrigatórios." }, { status: 400 });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ error: "E-mail já cadastrado." }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const client = await Client.create({
      name,
      email,
      phone,
      birthDate: body.birthDate || "",
      active: true,
    });

    const user = await User.create({
      name,
      email,
      passwordHash,
      role: "CLIENTE",
      clientId: client._id,
    });

    client.userId = user._id;
    await client.save();

    const token = await signSessionToken({
      id: user._id.toString(),
      role: "CLIENTE",
      name: user.name,
      email: user.email,
      clientId: client._id.toString(),
    });

    const response = NextResponse.json({ ok: true, redirectTo: roleHome("CLIENTE") });
    response.cookies.set(buildAuthCookie(token));
    return response;
  } catch (error) {
    console.error("Erro MongoDB register:", error);
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return NextResponse.json({ error: `Não foi possível conectar ao MongoDB. ${message}` }, { status: 503 });
  }
}
