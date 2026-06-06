import { supabaseAdmin } from "./supabase";

export type EntitlementScope = {
  userId?: string | null;
  orgId?: string | null;
  sku: string;
};

/**
 * True when the user (or their active org) holds an active, unexpired
 * entitlement for the given SKU. Fails closed: any error or unconfigured DB
 * returns false, so gated content stays locked rather than leaking.
 */
export async function hasEntitlement({
  userId,
  orgId,
  sku,
}: EntitlementScope): Promise<boolean> {
  const db = supabaseAdmin();
  if (!db) return false;

  const subjectFilters: string[] = [];
  if (orgId) subjectFilters.push(`clerk_org_id.eq.${orgId}`);
  if (userId) subjectFilters.push(`clerk_user_id.eq.${userId}`);
  if (subjectFilters.length === 0) return false;

  const { data, error } = await db
    .from("entitlements")
    .select("id, expires_at")
    .eq("sku", sku)
    .eq("status", "active")
    .or(subjectFilters.join(","))
    .limit(50);

  if (error || !data) return false;

  const now = Date.now();
  return data.some(
    (row) => !row.expires_at || new Date(row.expires_at).getTime() > now,
  );
}

/** Grant (or re-activate) an entitlement. Used by the Stripe webhook. */
export async function grantEntitlement(params: {
  userId?: string | null;
  orgId?: string | null;
  sku: string;
  source?: string;
  stripeRef?: string | null;
  expiresAt?: string | null;
}): Promise<void> {
  const db = supabaseAdmin();
  if (!db) throw new Error("Supabase not configured; cannot grant entitlement.");

  await db.from("entitlements").insert({
    clerk_user_id: params.userId ?? null,
    clerk_org_id: params.orgId ?? null,
    sku: params.sku,
    status: "active",
    source: params.source ?? "stripe",
    stripe_ref: params.stripeRef ?? null,
    expires_at: params.expiresAt ?? null,
  });
}
