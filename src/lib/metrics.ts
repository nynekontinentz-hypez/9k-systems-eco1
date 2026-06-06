import { supabaseAdmin } from "./supabase";

export type Overview = {
  configured: boolean;
  purchasesThisMonth: number;
  revenueThisMonthCents: number;
  studioInFlight: number;
  activeEntitlements: number;
};

const EMPTY: Overview = {
  configured: false,
  purchasesThisMonth: 0,
  revenueThisMonthCents: 0,
  studioInFlight: 0,
  activeEntitlements: 0,
};

/**
 * Best-effort dashboard counters, strictly scoped to one tenant.
 * With an active org: that org only. Without one: the operator's own personal
 * (org-less) rows only — never an unfiltered query, so nothing leaks across
 * tenants.
 */
export async function getOverview(
  orgId?: string | null,
  userId?: string | null,
): Promise<Overview> {
  const db = supabaseAdmin();
  if (!db) return EMPTY;
  if (!orgId && !userId) return { ...EMPTY, configured: true };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scope = <T extends { eq: any; is: any }>(q: T): T =>
    orgId
      ? q.eq("clerk_org_id", orgId)
      : q.eq("clerk_user_id", userId).is("clerk_org_id", null);

  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);

  try {
    const [purchases, studio, entitlements] = await Promise.all([
      scope(
        db
          .from("purchases")
          .select("amount_cents")
          .gte("created_at", startOfMonth.toISOString()),
      ),
      scope(
        db
          .from("studio_projects")
          .select("id", { count: "exact", head: true })
          .not("status", "in", "(published,archived)"),
      ),
      scope(
        db
          .from("entitlements")
          .select("id", { count: "exact", head: true })
          .eq("status", "active"),
      ),
    ]);

    const rows = (purchases.data ?? []) as { amount_cents: number | null }[];
    return {
      configured: true,
      purchasesThisMonth: rows.length,
      revenueThisMonthCents: rows.reduce(
        (sum, r) => sum + (r.amount_cents ?? 0),
        0,
      ),
      studioInFlight: studio.count ?? 0,
      activeEntitlements: entitlements.count ?? 0,
    };
  } catch {
    return { ...EMPTY, configured: true };
  }
}
