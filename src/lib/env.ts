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
  studioAiProvider: (process.env.STUDIO_AI_PROVIDER ?? "gemini").toLowerCase(),
  studioAiKey: process.env.STUDIO_AI_API_KEY ?? "",
  studioAiModel: process.env.STUDIO_AI_MODEL ?? "",
} as const;

/** Throw a clear error at runtime if a required key is missing. */
export function requireEnv<K extends keyof typeof env>(key: K): string {
  const value = env[key];
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
export const isStudioAiConfigured = Boolean(env.studioAiKey);
