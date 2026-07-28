import { auth } from "@clerk/nextjs/server";
import { PageHeader } from "@/components/layout/page-header";
import { SetupHint } from "@/components/setup-hint";
import { Card, CardContent } from "@/components/ui/card";
import { isOperator } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase";
import { listAudits } from "@/lib/audits";
import { AuditTracker } from "@/components/audits/audit-tracker";

export const dynamic = "force-dynamic";

export default async function AuditsPage() {
  const { userId } = await auth();
  if (!userId) return null;

  if (!isOperator(userId)) {
    return (
      <>
        <PageHeader title="Audits" description="AI Readiness audit workspace." />
        <Card>
          <CardContent className="py-8 text-sm text-text-secondary">
            This area is for the operator only.
          </CardContent>
        </Card>
      </>
    );
  }

  const db = supabaseAdmin();
  const audits = db ? await listAudits(userId) : [];

  return (
    <>
      <PageHeader
        title="Audits"
        description="Track AI Readiness audits, capture findings, and generate the client report."
      />
      {!db && (
        <SetupHint title="Connect Supabase to persist audits">
          Add your Supabase keys and run <code>supabase/audits_v1.sql</code>.
        </SetupHint>
      )}
      <AuditTracker
        initial={audits.map((a) => ({
          id: a.id,
          client_name: a.client_name,
          status: a.status,
          findingsCount: a.findings?.length ?? 0,
          created_at: a.created_at,
        }))}
      />
    </>
  );
}
