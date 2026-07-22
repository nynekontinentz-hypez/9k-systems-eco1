import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { ShoppingCart, CreditCard, KeyRound } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { SetupHint } from "@/components/setup-hint";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { getOverview } from "@/lib/metrics";
import { formatUSD } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function Overview() {
  const { orgId, userId } = await auth();
  const stats = await getOverview(orgId, userId);

  return (
    <>
      <PageHeader
        title="Overview"
        description="Where everything stands today — across clients and audits."
        actions={
          <Link href="/app/clients" className={buttonVariants({ size: "sm" })}>
            Add a client
          </Link>
        }
      />

      {!stats.configured && (
        <SetupHint title="Connect the data layer to see live numbers">
          Add your Supabase keys to <code>.env.local</code> and run the schema
          in <code>supabase/schema.sql</code>. Until then these read zero.
        </SetupHint>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          icon={<CreditCard className="h-4 w-4 text-brand-light" />}
          label="Revenue this month"
          value={formatUSD(stats.revenueThisMonthCents)}
          sub={`${stats.purchasesThisMonth} purchase${stats.purchasesThisMonth === 1 ? "" : "s"}`}
        />
        <Stat
          icon={<KeyRound className="h-4 w-4 text-brand-light" />}
          label="Active entitlements"
          value={String(stats.activeEntitlements)}
          sub="Paid access in force"
        />
        <Stat
          icon={<ShoppingCart className="h-4 w-4 text-brand-light" />}
          label="Purchases this month"
          value={String(stats.purchasesThisMonth)}
          sub="Across clients + audits"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <QuickLink
          href="/app/clients"
          title="Bring on a client"
          body="Spin up an isolated workspace for an MSP-platform client, invite their team, and start billing."
        />
        <QuickLink
          href="/app/audits"
          title="Run an AI-Rescue Audit"
          body="Track a purchased audit, capture findings, and generate the client report."
        />
      </div>
    </>
  );
}

function Stat({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <Card className="flex flex-col gap-2 p-5">
      <div className="flex items-center gap-2 text-sm text-text-secondary">
        {icon}
        {label}
      </div>
      <span className="text-2xl font-semibold text-text-primary">{value}</span>
      <span className="text-xs text-text-muted">{sub}</span>
    </Card>
  );
}

function QuickLink({
  href,
  title,
  body,
}: {
  href: string;
  title: string;
  body: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-1 rounded-xl border border-border-subtle bg-neutral-bg2 p-5 transition-colors hover:border-border-strong hover:bg-neutral-bg3"
    >
      <span className="font-medium text-text-primary">{title}</span>
      <span className="text-sm text-text-secondary">{body}</span>
    </Link>
  );
}
