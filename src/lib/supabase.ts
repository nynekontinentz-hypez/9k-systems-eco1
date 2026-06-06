import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env, isSupabaseConfigured } from "./env";

/**
 * Server-only admin client (service-role key). Never import this into a client
 * component. All data access is scoped in server code by Clerk user/org id.
 *
 * Returns null when Supabase isn't configured yet so pages can render a setup
 * hint instead of throwing.
 */
let adminSingleton: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (adminSingleton) return adminSingleton;
  adminSingleton = createClient(env.supabaseUrl, env.supabaseServiceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return adminSingleton;
}

/** Throwing variant for handlers that genuinely cannot proceed without the DB. */
export function requireSupabaseAdmin(): SupabaseClient {
  const client = supabaseAdmin();
  if (!client) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  return client;
}
