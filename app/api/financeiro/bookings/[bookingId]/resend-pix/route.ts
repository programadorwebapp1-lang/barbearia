import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/guards";
import { resendPixPayment } from "@/services/financeiro/resendPixPayment";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest, context: { params: { bookingId: string } }) {
  const session = await getSessionUser(req);
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const result = await resendPixPayment({
      bookingId: context.params.bookingId,
      appUrl: process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "") || "http://localhost:3000",
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível reenviar o Pix." }, { status: 500 });
  }
}
