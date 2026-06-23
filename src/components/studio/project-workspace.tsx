"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Sparkles,
  Loader2,
  Save,
  Upload,
  Download,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SetupHint } from "@/components/setup-hint";
import { browserSupabase } from "@/lib/supabase-browser";
import { shortDate } from "@/lib/utils";

type Asset = {
  id: string;
  kind: string;
  name: string;
  size_bytes: number | null;
  created_at: string;
};

export type WorkspaceProject = {
  id: string;
  title: string;
  channel: string | null;
  status: string;
  idea: string | null;
  hook: string | null;
  titles: string[] | null;
  script: string | null;
};

const KINDS = ["voiceover", "thumbnail", "broll", "final", "other"];

const textareaCls =
  "w-full rounded-lg border border-border-default bg-neutral-bg3 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none";

function prettySize(bytes: number | null) {
  if (!bytes) return "";
  const units = ["B", "KB", "MB", "GB"];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

export function ProjectWorkspace({
  project,
  initialAssets,
  aiConfigured,
}: {
  project: WorkspaceProject;
  initialAssets: Asset[];
  aiConfigured: boolean;
}) {
  const [idea, setIdea] = useState(project.idea ?? "");
  const [hook, setHook] = useState(project.hook ?? "");
  const [titles, setTitles] = useState<string[]>(project.titles ?? []);
  const [script, setScript] = useState(project.script ?? "");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assets, setAssets] = useState<Asset[]>(initialAssets);
  const [uploadKind, setUploadKind] = useState("voiceover");
  const [uploading, setUploading] = useState(false);

  async function generate() {
    setGenerating(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/studio/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project.id, idea }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed.");
      setHook(data.draft.hook ?? "");
      setTitles(data.draft.titles ?? []);
      setScript(data.draft.script ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed.");
    } finally {
      setGenerating(false);
    }
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/studio/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: project.id, idea, hook, titles, script }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save.");
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const signRes = await fetch("/api/studio/asset/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          filename: file.name,
          kind: uploadKind,
        }),
      });
      const sign = await signRes.json();
      if (!signRes.ok) throw new Error(sign.error ?? "Upload couldn't start.");

      const sb = browserSupabase();
      if (!sb) throw new Error("Storage unavailable.");
      const { error: upErr } = await sb.storage
        .from(sign.bucket)
        .uploadToSignedUrl(sign.path, sign.token, file);
      if (upErr) throw new Error(upErr.message);

      const regRes = await fetch("/api/studio/asset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          kind: uploadKind,
          name: file.name,
          path: sign.path,
          size: file.size,
        }),
      });
      const reg = await regRes.json();
      if (!regRes.ok) throw new Error(reg.error ?? "Could not register file.");

      const listRes = await fetch(`/api/studio/asset?projectId=${project.id}`);
      const list = await listRes.json();
      setAssets(list.assets ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/app/studio"
        className="flex w-fit items-center gap-1 text-sm text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> Back to pipeline
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {project.title}
          </h1>
          {project.channel && (
            <span className="text-sm text-brand-light">{project.channel}</span>
          )}
        </div>
        <Badge tone="brand">{project.status}</Badge>
      </div>

      {error && (
        <div className="rounded-lg border border-status-error/30 bg-status-error/10 px-4 py-2 text-sm text-status-error">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Script side */}
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Generate</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {!aiConfigured && (
                <SetupHint title="AI generation isn't switched on yet">
                  Add <code>STUDIO_AI_API_KEY</code> (and optionally{" "}
                  <code>STUDIO_AI_PROVIDER</code>) in Vercel. A free Google
                  Gemini key works.
                </SetupHint>
              )}
              <textarea
                className={textareaCls}
                rows={2}
                placeholder="One-line idea or hook — e.g. 'Why the Roman concrete recipe was lost for 1,000 years'"
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
              />
              <Button
                onClick={generate}
                disabled={generating || !aiConfigured || idea.trim().length < 4}
                className="w-fit"
              >
                {generating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {generating ? "Writing…" : "Generate script"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Script</CardTitle>
              <Button size="sm" variant="outline" onClick={save} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : saved ? (
                  <Check className="h-4 w-4 text-status-success" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {saved ? "Saved" : "Save"}
              </Button>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Field label="Hook">
                <textarea
                  className={textareaCls}
                  rows={2}
                  value={hook}
                  onChange={(e) => setHook(e.target.value)}
                  placeholder="The first 5 seconds…"
                />
              </Field>

              <Field label="Title options">
                <div className="flex flex-col gap-2">
                  {(titles.length ? titles : [""]).map((t, i) => (
                    <Input
                      key={i}
                      value={t}
                      placeholder={`Title ${i + 1}`}
                      onChange={(e) => {
                        const next = [...titles];
                        next[i] = e.target.value;
                        setTitles(next);
                      }}
                    />
                  ))}
                </div>
              </Field>

              <Field label="Voiceover script">
                <textarea
                  className={textareaCls}
                  rows={18}
                  value={script}
                  onChange={(e) => setScript(e.target.value)}
                  placeholder="Your narration…"
                />
              </Field>
            </CardContent>
          </Card>
        </div>

        {/* Assets side */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Assets</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <select
                className="h-9 rounded-lg border border-border-default bg-neutral-bg3 px-2 text-sm text-text-primary"
                value={uploadKind}
                onChange={(e) => setUploadKind(e.target.value)}
              >
                {KINDS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border-default px-3 py-4 text-sm text-text-secondary hover:border-border-strong hover:text-text-primary">
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {uploading ? "Uploading…" : "Upload file"}
                <input
                  type="file"
                  className="hidden"
                  onChange={onPickFile}
                  disabled={uploading}
                />
              </label>
            </div>

            <div className="flex flex-col divide-y divide-border-subtle">
              {assets.length === 0 ? (
                <span className="py-3 text-xs text-text-muted">
                  No files yet.
                </span>
              ) : (
                assets.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between gap-2 py-2.5"
                  >
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-sm text-text-primary">
                        {a.name}
                      </span>
                      <span className="text-xs text-text-muted">
                        {a.kind} · {prettySize(a.size_bytes)} ·{" "}
                        {shortDate(a.created_at)}
                      </span>
                    </div>
                    <a
                      href={`/api/studio/asset/${a.id}`}
                      className="shrink-0 text-text-secondary hover:text-text-primary"
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium uppercase tracking-wide text-text-muted">
        {label}
      </span>
      {children}
    </div>
  );
}
