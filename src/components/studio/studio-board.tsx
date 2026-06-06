"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, ArrowRight, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  STUDIO_STAGES,
  nextStage,
  type StudioStage,
} from "@/lib/studio";

export type StudioProject = {
  id: string;
  title: string;
  channel: string | null;
  status: StudioStage;
};

export function StudioBoard({ initial }: { initial: StudioProject[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [channel, setChannel] = useState("");
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (title.trim().length < 2) return;
    const res = await fetch("/api/studio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, channel }),
    });
    if (res.ok) {
      setTitle("");
      setChannel("");
      startTransition(() => router.refresh());
    }
  }

  async function advance(id: string, status: StudioStage) {
    setBusyId(id);
    const res = await fetch("/api/studio", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (res.ok) startTransition(() => router.refresh());
    setBusyId(null);
  }

  return (
    <div className="flex flex-col gap-5">
      <form
        onSubmit={create}
        className="flex flex-col gap-2 rounded-xl border border-border-subtle bg-neutral-bg2 p-4 sm:flex-row"
      >
        <Input
          placeholder="New video idea / hook…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <Input
          placeholder="Channel (optional)"
          value={channel}
          onChange={(e) => setChannel(e.target.value)}
          className="sm:max-w-48"
        />
        <Button type="submit" disabled={pending}>
          <Plus className="h-4 w-4" /> Add
        </Button>
      </form>

      <div className="grid gap-3 lg:grid-cols-5">
        {STUDIO_STAGES.map((stage) => {
          const items = initial.filter((p) => p.status === stage.key);
          return (
            <div key={stage.key} className="flex flex-col gap-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-sm font-medium text-text-primary">
                  {stage.label}
                </span>
                <span className="text-xs text-text-muted">{items.length}</span>
              </div>
              <span className="px-1 text-xs text-text-muted">{stage.hint}</span>

              <div className="flex min-h-24 flex-col gap-2 rounded-lg border border-border-subtle bg-neutral-bg1/40 p-2">
                {items.map((p) => {
                  const next = nextStage(p.status);
                  return (
                    <div
                      key={p.id}
                      className="flex flex-col gap-2 rounded-lg border border-border-subtle bg-neutral-bg3 p-3"
                    >
                      <span className="text-sm text-text-primary">
                        {p.title}
                      </span>
                      {p.channel && (
                        <span className="text-xs text-brand-light">
                          {p.channel}
                        </span>
                      )}
                      {next && (
                        <button
                          onClick={() => advance(p.id, next)}
                          disabled={busyId === p.id}
                          className="mt-1 inline-flex items-center gap-1 self-start text-xs text-text-secondary hover:text-text-primary"
                        >
                          {busyId === p.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <ArrowRight className="h-3 w-3" />
                          )}
                          Move to {next}
                        </button>
                      )}
                    </div>
                  );
                })}
                {items.length === 0 && (
                  <span className="px-1 py-2 text-xs text-text-muted">
                    Empty
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
