import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * DEPRECATED — webhook agora mora no serviço Bun em services/wa.
 * Aponte a Evolution para `https://<railway-host>/v1/evolution/webhook?secret=...`.
 * Mantemos este handler retornando 410 só pra Evolution não retentar para sempre
 * caso o painel não tenha sido atualizado ainda.
 */
export async function POST() {
  return NextResponse.json(
    { error: "gone", message: "webhook moved to services/wa" },
    { status: 410 }
  );
}

export async function GET() {
  return NextResponse.json(
    { error: "gone", message: "webhook moved to services/wa" },
    { status: 410 }
  );
}
