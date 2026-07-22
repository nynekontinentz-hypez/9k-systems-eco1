import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "./supabase";
import { shortDate } from "./utils";

/**
 * Server-only data layer for the AI-Rescue Audit workspace. Operator-only:
 * every row is scoped to the operator's Clerk user id (created_by). Never
 * import in a client file.
 */

export type Severity = "info" | "low" | "med" | "high";
export type AuditStatus = "scheduled" | "in_progress" | "delivered";

export type Finding = {
  id: string;
  area: string;
  item: string;
  severity: Severity;
  note: string;
  resolved: boolean;
};

export type AuditRow = {
  id: string;
  created_by: string;
  client_name: string;
  status: AuditStatus;
  purchase_ref: string | null;
  findings: Finding[];
  report: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

/** Seed checklist so a new audit is useful immediately. */
const TEMPLATE: Array<{ area: string; items: string[] }> = [
  {
    area: "Security",
    items: [
      "MFA enforced on all admin accounts",
      "Backups exist and were tested in the last 90 days",
      "Endpoint protection deployed on every device",
      "Exposed secrets / API keys reviewed",
    ],
  },
  {
    area: "AI usage",
    items: [
      "Inventory of AI tools actually in use",
      "Data sent to AI vendors reviewed",
      "No PII or secrets leaking into prompts",
      "Access controls on shared AI accounts",
    ],
  },
  {
    area: "Stack",
    items: [
      "Documented systems + accounts inventory",
      "Licenses right-sized to real usage",
      "Shadow IT identified",
    ],
  },
  {
    area: "Spend",
    items: [
      "Recurring SaaS audited for waste",
      "Duplicate / overlapping tools consolidated",
    ],
  },
  {
    area: "Data",
    items: [
      "Data retention + deletion policy exists",
      "Least-privilege access review done",
    ],
  },
];

function seedFindings(): Finding[] {
  return TEMPLATE.flatMap((g) =>
    g.items.map((item) => ({
      id: randomUUID(),
      area: g.area,
      item,
      severity: "info" as Severity,
      note: "",
      resolved: false,
    })),
  );
}

export async function listAudits(userId: string): Promise<AuditRow[]> {
  const db = supabaseAdmin();
  if (!db) return [];
  const { data } = await db
    .from("audits")
    .select("*")
    .eq("created_by", userId)
    .order("created_at", { ascending: false });
  return (data as AuditRow[]) ?? [];
}

export async function getAudit(
  userId: string,
  id: string,
): Promise<AuditRow | null> {
  const db = supabaseAdmin();
  if (!db) return null;
  const { data } = await db
    .from("audits")
    .select("*")
    .eq("id", id)
    .eq("created_by", userId)
    .maybeSingle();
  return (data as AuditRow) ?? null;
}

export async function createAudit(
  userId: string,
  input: { clientName: string; purchaseRef?: string | null },
): Promise<AuditRow | null> {
  const db = supabaseAdmin();
  if (!db) return null;
  const { data } = await db
    .from("audits")
    .insert({
      created_by: userId,
      client_name: input.clientName.slice(0, 200),
      purchase_ref: input.purchaseRef ? input.purchaseRef.slice(0, 200) : null,
      status: "scheduled",
      findings: seedFindings(),
    })
    .select("*")
    .single();
  return (data as AuditRow) ?? null;
}

export type AuditPatch = {
  clientName?: string;
  status?: AuditStatus;
  purchaseRef?: string | null;
  notes?: string | null;
  findings?: Finding[];
  report?: string;
  regenerateReport?: boolean;
};

const STATUSES: AuditStatus[] = ["scheduled", "in_progress", "delivered"];

export async function updateAudit(
  userId: string,
  id: string,
  patch: AuditPatch,
): Promise<AuditRow | null> {
  const db = supabaseAdmin();
  if (!db) return null;

  const current = await getAudit(userId, id);
  if (!current) return null;

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof patch.clientName === "string")
    update.client_name = patch.clientName.slice(0, 200);
  if (patch.status && STATUSES.includes(patch.status)) update.status = patch.status;
  if (patch.purchaseRef !== undefined)
    update.purchase_ref =
      typeof patch.purchaseRef === "string" ? patch.purchaseRef.slice(0, 200) : null;
  if (typeof patch.notes === "string") update.notes = patch.notes.slice(0, 20000);
  if (typeof patch.report === "string") update.report = patch.report.slice(0, 100000);
  if (Array.isArray(patch.findings)) update.findings = sanitizeFindings(patch.findings);

  // Regenerate wins over a manually-supplied report string.
  if (patch.regenerateReport) {
    const findings = (update.findings as Finding[]) ?? current.findings;
    update.report = composeReport({ ...current, findings });
  }

  const { data } = await db
    .from("audits")
    .update(update)
    .eq("id", id)
    .eq("created_by", userId)
    .select("*")
    .single();
  return (data as AuditRow) ?? null;
}

const SEVERITIES: Severity[] = ["info", "low", "med", "high"];

function sanitizeFindings(items: Finding[]): Finding[] {
  return items.slice(0, 300).map((f) => ({
    id: typeof f.id === "string" && f.id ? f.id : randomUUID(),
    area: String(f.area ?? "General").slice(0, 80),
    item: String(f.item ?? "").slice(0, 300),
    severity: SEVERITIES.includes(f.severity) ? f.severity : "info",
    note: String(f.note ?? "").slice(0, 2000),
    resolved: Boolean(f.resolved),
  }));
}

/** Compose a client-facing markdown report from the audit's findings. */
export function composeReport(a: AuditRow): string {
  const issues = a.findings.filter((f) => f.severity !== "info");
  const bySeverity = (s: Severity) => issues.filter((f) => f.severity === s);
  const high = bySeverity("high");
  const med = bySeverity("med");
  const low = bySeverity("low");

  const areas = Array.from(new Set(a.findings.map((f) => f.area)));

  const lines: string[] = [];
  lines.push(`# AI-Rescue Audit — ${a.client_name}`);
  lines.push(`_Prepared by 9K Systems · ${shortDate(new Date().toISOString())}_`);
  lines.push("");
  lines.push("## Summary");
  lines.push(
    `We reviewed ${a.findings.length} checkpoints across ${areas.length} areas and flagged ` +
      `${issues.length} finding${issues.length === 1 ? "" : "s"}: ` +
      `${high.length} high, ${med.length} medium, ${low.length} low.`,
  );
  lines.push("");

  if (issues.length) {
    lines.push("## Findings");
    for (const sev of ["high", "med", "low"] as Severity[]) {
      const group = bySeverity(sev);
      if (!group.length) continue;
      const label = sev === "med" ? "Medium" : sev[0].toUpperCase() + sev.slice(1);
      lines.push(`### ${label} priority`);
      for (const f of group) {
        lines.push(`- **${f.area} — ${f.item}**${f.note ? `: ${f.note}` : ""}`);
      }
      lines.push("");
    }
  }

  lines.push("## Checklist reviewed");
  for (const area of areas) {
    lines.push(`**${area}**`);
    for (const f of a.findings.filter((x) => x.area === area)) {
      lines.push(`- [${f.resolved ? "x" : " "}] ${f.item}`);
    }
    lines.push("");
  }

  lines.push("## Recommended next steps");
  if (high.length || med.length) {
    for (const f of [...high, ...med]) {
      lines.push(`1. ${f.area}: ${f.item}${f.note ? ` — ${f.note}` : ""}`);
    }
  } else {
    lines.push("No high or medium priority issues — maintain current posture.");
  }

  return lines.join("\n");
}
