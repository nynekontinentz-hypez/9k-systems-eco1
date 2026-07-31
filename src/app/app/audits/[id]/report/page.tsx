import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { isOperator } from "@/lib/env";
import { getAudit } from "@/lib/audits";
import { ReportPrintView } from "@/components/audits/report-print-view";

export const dynamic = "force-dynamic";

/**
 * Print-optimised, client-facing view of a generated audit report.
 * Operator-only (same gate as the workspace). Use the browser's
 * Print → Save as PDF to produce the branded deliverable.
 */
export default async function AuditReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();
  if (!userId || !isOperator(userId)) notFound();

  const { id } = await params;
  const audit = await getAudit(userId, id);
  if (!audit) notFound();

  const issues = (audit.findings ?? []).filter((f) => f.severity !== "info");
  const counts = {
    total: audit.findings?.length ?? 0,
    high: issues.filter((f) => f.severity === "high").length,
    med: issues.filter((f) => f.severity === "med").length,
    low: issues.filter((f) => f.severity === "low").length,
  };

  return (
    <ReportPrintView
      clientName={audit.client_name}
      report={audit.report ?? ""}
      counts={counts}
    />
  );
}
