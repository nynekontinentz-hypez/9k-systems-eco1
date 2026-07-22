import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { isOperator } from "@/lib/env";
import { listAudits, createAudit } from "@/lib/audits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in." }, { status: 401 });
  if (!isOperator(userId))
    return NextResponse.json({ error: "Not available." }, { status: 403 });
  const audits = await listAudits(userId);
  return NextResponse.json({ audits });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in." }, { status: 401 });
  if (!isOperator(userId))
    return NextResponse.json({ error: "Not available." }, { status: 403 });

  let clientName: unknown;
  let purchaseRef: unknown;
  try {
    ({ clientName, purchaseRef } = await req.json());
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  if (typeof clientName !== "string" || clientName.trim().length < 2)
    return NextResponse.json({ error: "Client name required." }, { status: 422 });

  const audit = await createAudit(userId, {
    clientName: clientName.trim(),
    purchaseRef: typeof purchaseRef === "string" ? purchaseRef : null,
  });
  if (!audit)
    return NextResponse.json({ error: "Storage not configured." }, { status: 503 });
  return NextResponse.json({ audit });
}
