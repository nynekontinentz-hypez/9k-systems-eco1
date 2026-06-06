import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Best-effort per-IP throttle. In-memory, so it resets on cold start — good
// enough to blunt casual flooding on a solo deployment. Swap for Upstash/KV
// if this ever runs at scale across many instances.
const HITS = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;

function throttled(ip: string): boolean {
  const now = Date.now();
  const rec = HITS.get(ip);
  if (!rec || now > rec.resetAt) {
    HITS.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  rec.count += 1;
  return rec.count > MAX_PER_WINDOW;
}

export async function POST(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (throttled(ip)) {
    return NextResponse.json(
      { error: "Slow down a moment and try again." },
      { status: 429 },
    );
  }

  let email: unknown;
  try {
    ({ email } = await req.json());
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  if (typeof email !== "string" || !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "Enter a valid email." },
      { status: 422 },
    );
  }

  const db = supabaseAdmin();
  if (!db) {
    return NextResponse.json(
      { error: "Waitlist isn't live yet. Try again shortly." },
      { status: 503 },
    );
  }

  // Upsert on email so repeat submits don't error out.
  const { error } = await db
    .from("waitlist")
    .upsert(
      { email: email.toLowerCase().trim(), source: "landing" },
      { onConflict: "email", ignoreDuplicates: true },
    );

  if (error) {
    return NextResponse.json(
      { error: "Could not add you. Try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
