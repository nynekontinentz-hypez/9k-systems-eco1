import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { isOperator } from "@/lib/env";
import { getAudit } from "@/lib/audits";
import { AuditWorkspace } from "@/components/audits/audit-workspace";

export const dynamic = "force-dynamic";

export default async function AuditDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();
  if (!userId || !isOperator(userId)) notFound();

  const { id } = await params;
  const audit = await getAudit(userId, id);
  if (!audit) notFound();

  return (
    <AuditWorkspace
      audit={{
        id: audit.id,
        client_name: audit.client_name,
        status: audit.status,
        notes: audit.notes,
        findings: audit.findings,
        report: audit.report,
      }}
    />
  );
}
