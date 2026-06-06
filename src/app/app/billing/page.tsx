import { auth } from "@clerk/nextjs/server";
import { Check } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { SetupHint } from "@/components/setup-hint";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BuyButton } from "@/components/marketing/buy-button";
import { PRODUCTS } from "@/lib/catalog";
import { supabaseAdmin } from "@/lib/supabase";
import { formatUSD, shortDate } from "@/lib/utils";
import { isStripeConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

type Purchase = {
  id: string;
  sku: string;
  amount_cents: number;
  status: string;
  created_at: string;
};

async function getPurchases(
  userId: string,
  orgId?: string | null,
): Promise<Purchase[]> {
  const db = supabaseAdmin();
  if (!db) return [];
  // Scope to the active client (org) only; otherwise the operator's own
  // org-less purchases. No cross-tenant union.
  let query = db
    .from("purchases")
    .select("id, sku, amount_cents, status, created_at");
  query = orgId
    ? query.eq("clerk_org_id", orgId)
    : query.eq("clerk_user_id", userId).is("clerk_org_id", null);
  const { data } = await query
    .order("created_at", { ascending: false })
    .limit(25);
  return (data as Purchase[]) ?? [];
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; sku?: string }>;
}) {
  const { userId, orgId } = await auth();
  const { status } = await searchParams;
  const purchases = userId ? await getPurchases(userId, orgId) : [];

  return (
    <>
      <PageHeader
        title="Billing"
        description="Buy access, run retainers, and see what's been paid — all on Stripe."
      />

      {status === "success" && (
        <div className="flex items-center gap-2 rounded-xl border border-status-success/30 bg-status-success/10 px-4 py-3 text-sm">
          <Check className="h-4 w-4 text-status-success" />
          Payment received. Access is unlocked.
        </div>
      )}

      {!isStripeConfigured && (
        <SetupHint title="Stripe isn't live yet">
          Add <code>STRIPE_SECRET_KEY</code> and set the webhook secret to take
          real payments. Buttons below will work the moment it&apos;s set.
        </SetupHint>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PRODUCTS.map((p) => (
          <Card key={p.sku} className="flex flex-col gap-3 p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{p.name}</span>
              {p.highlight && <Badge tone="brand">Popular</Badge>}
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-semibold">
                {formatUSD(p.priceCents)}
              </span>
              <span className="text-xs text-text-muted">
                {p.interval === "month" ? "/mo" : "one-time"}
              </span>
            </div>
            <p className="flex-1 text-xs text-text-secondary">{p.blurb}</p>
            <BuyButton sku={p.sku} size="sm" variant="outline">
              {p.interval === "month" ? "Start" : "Buy"}
            </BuyButton>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment history</CardTitle>
        </CardHeader>
        <CardContent>
          {purchases.length === 0 ? (
            <p className="text-sm text-text-muted">
              Nothing yet. Purchases show up here the second they clear.
            </p>
          ) : (
            <div className="flex flex-col divide-y divide-border-subtle">
              {purchases.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between py-3 text-sm"
                >
                  <div className="flex flex-col">
                    <span className="font-medium capitalize">
                      {p.sku.replace(/-/g, " ")}
                    </span>
                    <span className="text-xs text-text-muted">
                      {shortDate(p.created_at)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span>{formatUSD(p.amount_cents)}</span>
                    <Badge tone={p.status === "paid" ? "success" : "neutral"}>
                      {p.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
