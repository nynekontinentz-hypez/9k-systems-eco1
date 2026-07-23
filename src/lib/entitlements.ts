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

  // Scope to a SINGLE tenant — the active org, or (no org) the user — never a
  // union across tenants (per CLAUDE.md), which would leak paid access across
  // client contexts. Failing this scope = no access.
  if (!orgId && !userId) return false;
  let query = db
    .from("entitlements")
    .select("id, expires_at")
    .eq("sku", sku)
    .eq("status", "active")
    .limit(50);
  query = orgId
    ? query.eq("clerk_org_id", orgId)
    : query.eq("clerk_user_id", userId as string).is("clerk_org_id", null);

  const { data, error } = await query;
  if (error || !data) return false;

  const now = Date.now();
  return data.some(
    (row) => !row.expires_at || new Date(row.expires_at).getTime() > now,
  );
}

/**
 * True when the tenant holds ANY active, unexpired entitlement (optionally
 * restricted to a set of SKUs). Used to gate supplied-key Studio AI behind a
 * paid plan. Fails closed.
 */
export async function hasAnyActiveEntitlement(
  scope: { userId?: string | null; orgId?: string | null },
  skus?: string[],
): Promise<boolean> {
  const db = supabaseAdmin();
  if (!db) return false;

  // Scope to a SINGLE tenant — the active org, or (no org) the user — never a
  // union across tenants (per CLAUDE.md). Failing this scope = no access.
  if (!scope.orgId && !scope.userId) return false;
  let query = db
    .from("entitlements")
    .select("id, sku, expires_at")
    .eq("status", "active")
    .limit(100);
  query = scope.orgId
    ? query.eq("clerk_org_id", scope.orgId)
    : query.eq("clerk_user_id", scope.userId as string);
  if (skus && skus.length > 0) query = query.in("sku", skus);

  const { data, error } = await query;
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

  // Grant to EXACTLY ONE tenant: the active org if present, otherwise the user.
  // Storing both subjects on one row is what let entitlements match across
  // tenant contexts — mirror the single-tenant read scoping.
  const orgScoped = Boolean(params.orgId);

  await db.from("entitlements").insert({
    clerk_user_id: orgScoped ? null : params.userId ?? null,
    clerk_org_id: orgScoped ? params.orgId : null,
    sku: params.sku,
    status: "active",
    source: params.source ?? "stripe",
    stripe_ref: params.stripeRef ?? null,
    expires_at: params.expiresAt ?? null,
  });
}
