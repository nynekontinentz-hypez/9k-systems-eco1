"use client";

import { useState } from "react";
import Link from "next/link";
import { randomId } from "@/lib/utils";
import {
  ArrowLeft,
  Loader2,
  Save,
  Check,
  Plus,
  FileText,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

type Severity = "info" | "low" | "med" | "high";
type Finding = {
  id: string;
  area: string;
  item: string;
  severity: Severity;
  note: string;
  resolved: boolean;
};
type Audit = {
  id: string;
  client_name: string;
  status: string;
  notes: string | null;
  findings: Finding[];
  report: string | null;
};

const SEVERITIES: Severity[] = ["info", "low", "med", "high"];
const SEV_LABEL: Record<Severity, string> = {
  info: "Info",
  low: "Low",
  med: "Medium",
  high: "High",
};
const SEV_CLS: Record<Severity, string> = {
  info: "text-text-muted",
  low: "text-status-info",
  med: "text-status-warning",
  high: "text-status-error",
};
const STATUSES = ["scheduled", "in_progress", "delivered"];

const textareaCls =
  "w-full rounded-lg border border-border-default bg-neutral-bg3 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none";
const selectCls =
  "h-8 rounded-lg border border-border-default bg-neutral-bg3 px-2 text-xs text-text-primary focus:border-brand focus:outline-none";

export function AuditWorkspace({ audit }: { audit: Audit }) {
  const [clientName, setClientName] = useState(audit.client_name);
  const [status, setStatus] = useState(audit.status);
  const [notes, setNotes] = useState(audit.notes ?? "");
  const [findings, setFindings] = useState<Finding[]>(audit.findings ?? []);
  const [report, setReport] = useState<string | null>(audit.report);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const areas = Array.from(new Set(findings.map((f) => f.area)));

  function patchFinding(id: string, patch: Partial<Finding>) {
    setFindings((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }
  function addFinding(area: string) {
    setFindings((prev) => [
      ...prev,
      { id: randomId(), area, item: "", severity: "info", note: "", resolved: false },
    ]);
  }
  function removeFinding(id: string) {
    setFindings((prev) => prev.filter((f) => f.id !== id));
  }

  async function persist(extra: Record<string, unknown> = {}) {
    const res = await fetch(`/api/audits/${audit.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientName, status, notes, findings, report, ...extra }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Save failed.");
    return data.audit as Audit;
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await persist();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      const a = await persist({ regenerateReport: true });
      setReport(a.report ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't generate report.");
    } finally {
      setGenerating(false);
    }
  }

  function downloadReport() {
    if (!report) return;
    const blob = new Blob([report], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ai-readiness-audit-${clientName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/app/audits"
        className="flex w-fit items-center gap-1 text-sm text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> All audits
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Input
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
          className="max-w-sm text-lg font-semibold"
        />
        <div className="flex items-center gap-2">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-10 rounded-lg border border-border-default bg-neutral-bg3 px-3 text-sm text-text-primary focus:border-brand focus:outline-none"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ")}
              </option>
            ))}
          </select>
          <Button onClick={save} disabled={saving} size="sm" variant="outline">
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : saved ? (
              <Check className="h-4 w-4 text-status-success" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saved ? "Saved" : "Save"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-status-error/30 bg-status-error/10 px-4 py-2 text-sm text-status-error">
          {error}
        </div>
      )}

      <p className="text-xs text-text-muted">
        Check a box when a checkpoint passes. Raise severity above{" "}
        <span className="text-text-secondary">Info</span> to log a finding — its
        note goes into the client report.
      </p>

      {/* Findings checklist */}
      <div className="flex flex-col gap-5">
        {areas.map((area) => (
          <Card key={area}>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>{area}</CardTitle>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => addFinding(area)}
              >
                <Plus className="h-4 w-4" /> Add
              </Button>
            </CardHeader>
            <CardContent className="flex flex-col divide-y divide-border-subtle">
              {findings
                .filter((f) => f.area === area)
                .map((f) => (
                  <div key={f.id} className="flex flex-col gap-2 py-3">
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={f.resolved}
                        onChange={(e) =>
                          patchFinding(f.id, { resolved: e.target.checked })
                        }
                        className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-brand)]"
                      />
                      <input
                        value={f.item}
                        placeholder="Checkpoint…"
                        onChange={(e) => patchFinding(f.id, { item: e.target.value })}
                        className="flex-1 bg-transparent text-sm text-text-primary focus:outline-none"
                      />
                      <select
                        value={f.severity}
                        onChange={(e) =>
                          patchFinding(f.id, { severity: e.target.value as Severity })
                        }
                        className={`${selectCls} ${SEV_CLS[f.severity]}`}
                      >
                        {SEVERITIES.map((s) => (
                          <option key={s} value={s}>
                            {SEV_LABEL[s]}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => removeFinding(f.id)}
                        className="px-1 text-xs text-text-muted hover:text-status-error"
                        title="Remove"
                      >
                        ✕
                      </button>
                    </div>
                    {f.severity !== "info" && (
                      <input
                        value={f.note}
                        placeholder="Finding detail (goes in the report)…"
                        onChange={(e) => patchFinding(f.id, { note: e.target.value })}
                        className="ml-6 rounded-md border border-border-subtle bg-neutral-bg3 px-2 py-1 text-xs text-text-secondary focus:border-brand focus:outline-none"
                      />
                    )}
                  </div>
                ))}
            </CardContent>
          </Card>
        ))}

        <AddArea onAdd={(a) => addFinding(a)} />
      </div>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Internal notes</CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            className={textareaCls}
            rows={4}
            placeholder="Working notes (not shown to the client)…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </CardContent>
      </Card>

      {/* Report */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Client report</CardTitle>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={generate} disabled={generating}>
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              {report ? "Regenerate" : "Generate"}
            </Button>
            {report && (
              <Button size="sm" variant="outline" onClick={downloadReport}>
                <Download className="h-4 w-4" /> .md
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {report ? (
            <textarea
              className={`${textareaCls} font-mono`}
              rows={16}
              value={report}
              onChange={(e) => setReport(e.target.value)}
            />
          ) : (
            <p className="text-sm text-text-muted">
              Fill in findings, then generate a client-ready report from the
              checklist.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AddArea({ onAdd }: { onAdd: (area: string) => void }) {
  const [name, setName] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (name.trim()) {
          onAdd(name.trim());
          setName("");
        }
      }}
      className="flex gap-2"
    >
      <Input
        placeholder="Add an area (e.g. Network)…"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="sm:max-w-xs"
      />
      <Button type="submit" variant="outline" size="sm" disabled={!name.trim()}>
        <Plus className="h-4 w-4" /> Area
      </Button>
    </form>
  );
}
