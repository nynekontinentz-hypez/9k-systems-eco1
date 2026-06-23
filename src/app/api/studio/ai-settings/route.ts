import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  getSettingsSummary,
  updateSettings,
  AiResolveError,
  type SettingsPatch,
} from "@/lib/studio-ai-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { userId, orgId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in." }, { status: 401 });
  const summary = await getSettingsSummary({ userId, orgId });
  return NextResponse.json(summary);
}

export async function PUT(req: Request) {
  const { userId, orgId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in." }, { status: 401 });

  let body: SettingsPatch;
  try {
    body = (await req.json()) as SettingsPatch;
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  try {
    const summary = await updateSettings({ userId, orgId }, body);
    return NextResponse.json(summary);
  } catch (e) {
    if (e instanceof AiResolveError)
      return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Could not save settings." }, { status: 500 });
  }
}
