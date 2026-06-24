/**
 * Centralised env access. Reads are lazy and never throw at import time, so
 * `next build` succeeds with placeholder values. Call `requireEnv` inside a
 * request handler when you actually need a real key at runtime.
 *
 * Secret VALUES never live in this file. They come from the environment:
 * .env.local for local dev, Vercel Environment Variables in production.
 */

export const env = {
  clerkPublishable: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "",
  clerkSecret: process.env.CLERK_SECRET_KEY ?? "",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnon: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  supabaseServiceRole: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  stripeSecret: process.env.STRIPE_SECRET_KEY ?? "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  // Studio AI generator (provider-agnostic): gemini | groq | openai | anthropic
  // "Fast" tier = the default supplied key. "Premium" tier is optional; if its
  // key is unset, Premium transparently falls back to Fast.
  studioAiProvider: (process.env.STUDIO_AI_PROVIDER ?? "gemini").toLowerCase(),
  studioAiKey: process.env.STUDIO_AI_API_KEY ?? "",
  studioAiModel: process.env.STUDIO_AI_MODEL ?? "",
  studioAiPremiumProvider: (
    process.env.STUDIO_AI_PREMIUM_PROVIDER ?? ""
  ).toLowerCase(),
  studioAiPremiumKey: process.env.STUDIO_AI_PREMIUM_API_KEY ?? "",
  studioAiPremiumModel: process.env.STUDIO_AI_PREMIUM_MODEL ?? "",
  // Master key for encrypting BYOK provider keys at rest (AES-256-GCM).
  // 32 bytes, supplied as 64 hex chars or base64. BYOK is disabled if unset.
  studioAiEncKey: process.env.STUDIO_AI_ENC_KEY ?? "",
  // Monthly per-tenant cap on SUPPLIED-key generations. BYOK is never capped.
  studioAiMonthlyCap: Number(process.env.STUDIO_AI_MONTHLY_CAP ?? "30"),
  // Comma-separated entitlement SKUs that unlock supplied AI. Empty = any
  // active entitlement qualifies.
  studioAiGateSkus: (process.env.STUDIO_AI_GATE_SKUS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  // Comma-separated Clerk user ids that bypass the gate AND the cap (operators).
  studioAiUnlimitedUsers: (process.env.STUDIO_AI_UNLIMITED_USERS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  // External render worker (open-source TTS/video pipeline). The Next app
  // orchestrates; the worker does the heavy CPU work off-platform.
  workerUrl: (process.env.STUDIO_WORKER_URL ?? "").replace(/\/+$/, ""),
  workerSecret: process.env.STUDIO_WORKER_SECRET ?? "",
} as const;

/** Keys of `env` whose value is a plain string (the secrets/URLs). */
type StringEnvKey = {
  [K in keyof typeof env]: (typeof env)[K] extends string ? K : never;
}[keyof typeof env];

/** Throw a clear error at runtime if a required string key is missing. */
export function requireEnv<K extends StringEnvKey>(key: K): string {
  const value = env[key] as string;
  if (!value) {
    throw new Error(
      `Missing environment variable for "${String(key)}". Set it in .env.local (see .env.example).`,
    );
  }
  return value;
}

/** Whether the data layer is wired up — used to render setup hints instead of crashing. */
export const isSupabaseConfigured = Boolean(
  env.supabaseUrl && env.supabaseServiceRole,
);
export const isStripeConfigured = Boolean(env.stripeSecret);
/** Fast/supplied tier is the baseline — Studio AI is "on" when it exists. */
export const isStudioAiConfigured = Boolean(env.studioAiKey);
export const isStudioAiPremiumConfigured = Boolean(env.studioAiPremiumKey);
/** BYOK requires the encryption master key, or we'd be storing keys in plaintext. */
export const isByokConfigured = Boolean(env.studioAiEncKey);
/** The render worker is wired when we know its URL and share a secret with it. */
export const isWorkerConfigured = Boolean(env.workerUrl && env.workerSecret);
