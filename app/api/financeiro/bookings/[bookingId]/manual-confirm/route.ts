import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/guards";
import { confirmManualPayment } from "@/services/financeiro/confirmManualPayment";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest, context: { params: { bookingId: string } }) {
  const session = await getSessionUser(req);
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const method = String(body?.method || "cash");
  if (!["cash", "external_pix", "card"].includes(method)) {
    return NextResponse.json({ error: "Forma de pagamento inválida." }, { status: 400 });
  }

  try {
    const result = await confirmManualPayment({
      bookingId: context.params.bookingId,
      method: method as "cash" | "external_pix" | "card",
      adminId: session.id,
      adminName: session.name,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível confirmar o pagamento." }, { status: 500 });
  }
}
