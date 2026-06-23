import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Anonymous browser client, used only to push bytes to a server-issued signed
 * upload URL. The anon key is public by design. Returns null if not configured.
 */
export function browserSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  return createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
