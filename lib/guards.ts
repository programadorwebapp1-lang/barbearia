import { NextRequest } from "next/server";
import { connectMongo } from "./mongodb";
import { readSessionFromRequest } from "./session";
import type { SessionRole, SessionUser } from "./jwt";
import UserModel from "@/models/User";

export async function getSessionUser(req: NextRequest) {
  const session = await readSessionFromRequest(req);
  if (!session) return null;

  await connectMongo();
  const user = await UserModel.findById(session.id).lean();
  if (!user || !user.active) return null;

  return {
    ...session,
    role: user.role as SessionRole,
    name: user.name,
    email: user.email,
    barberId: user.barberId?.toString?.() ?? session.barberId ?? null,
    clientId: user.clientId?.toString?.() ?? session.clientId ?? null,
  } satisfies SessionUser;
}

export function roleHome(role: SessionRole) {
  return role === "ADMIN" ? "/admin" : role === "BARBEIRO" ? "/barbeiro" : "/cliente";
}
