"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Loader2, ClipboardCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { shortDate } from "@/lib/utils";

type Row = {
  id: string;
  client_name: string;
  status: string;
  findingsCount: number;
  created_at: string;
};

const STATUS_TONE: Record<string, "neutral" | "warning" | "success"> = {
  scheduled: "neutral",
  in_progress: "warning",
  delivered: "success",
};

export function AuditTracker({ initial }: { initial: Row[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(initial);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/audits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientName: name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't create audit.");
      const a = data.audit;
      setName("");
      router.push(`/app/audits/${a.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't create audit.");
      setCreating(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <form
        onSubmit={create}
        className="flex flex-col gap-2 rounded-xl border border-border-subtle bg-neutral-bg2 p-4 sm:flex-row"
      >
        <Input
          placeholder="New audit — client or company name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Button type="submit" disabled={creating}>
          {creating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          New audit
        </Button>
      </form>
      {error && <p className="px-1 text-xs text-status-error">{error}</p>}

      <div className="flex flex-col divide-y divide-border-subtle rounded-xl border border-border-subtle bg-neutral-bg2">
        {rows.length === 0 ? (
          <div className="flex items-center gap-2 p-6 text-sm text-text-muted">
            <ClipboardCheck className="h-4 w-4" /> No audits yet. Start one above.
          </div>
        ) : (
          rows.map((a) => (
            <Link
              key={a.id}
              href={`/app/audits/${a.id}`}
              className="flex items-center justify-between gap-3 p-4 transition-colors hover:bg-neutral-bg3"
            >
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium text-text-primary">
                  {a.client_name}
                </span>
                <span className="text-xs text-text-muted">
                  {a.findingsCount} checkpoints · {shortDate(a.created_at)}
                </span>
              </div>
              <Badge tone={STATUS_TONE[a.status] ?? "neutral"}>
                {a.status.replace("_", " ")}
              </Badge>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
