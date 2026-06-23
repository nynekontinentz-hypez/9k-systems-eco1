"use client";

import { useEffect, useState } from "react";
import { Sparkles, ChevronDown, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Summary = {
  mode: "supplied" | "byok";
  modelTier: "fast" | "premium";
  byok: { provider: string | null; model: string | null; last4: string | null };
  suppliedAvailable: boolean;
  premiumAvailable: boolean;
  byokAvailable: boolean;
  usage: { used: number; cap: number; unlimited: boolean };
};

const PROVIDERS = ["gemini", "groq", "openai", "anthropic"] as const;

export function StudioAiSettings() {
  const [open, setOpen] = useState(false);
  const [s, setS] = useState<Summary | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Draft state for editable fields.
  const [mode, setMode] = useState<"supplied" | "byok">("supplied");
  const [tier, setTier] = useState<"fast" | "premium">("fast");
  const [provider, setProvider] = useState("openai");
  const [model, setModel] = useState("");
  const [apiKey, setApiKey] = useState("");

  function hydrate(data: Summary) {
    setS(data);
    setMode(data.mode);
    setTier(data.modelTier);
    setProvider(data.byok.provider ?? "openai");
    setModel(data.byok.model ?? "");
    setApiKey("");
  }

  useEffect(() => {
    let alive = true;
    fetch("/api/studio/ai-settings")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: Summary) => alive && hydrate(data))
      .catch(() => alive && setError("Couldn't load AI settings."));
    return () => {
      alive = false;
    };
  }, []);

  async function save(patch: Record<string, unknown>) {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/studio/ai-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't save.");
      } else {
        hydrate(data as Summary);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    } catch {
      setError("Couldn't save.");
    } finally {
      setSaving(false);
    }
  }

  function onSave() {
    const patch: Record<string, unknown> = { mode, modelTier: tier };
    if (mode === "byok") {
      patch.byokProvider = provider;
      patch.byokModel = model.trim() || null;
      if (apiKey.trim()) patch.byokKey = apiKey.trim();
    }
    save(patch);
  }

  if (!s) {
    return (
      <div className="rounded-xl border border-border-subtle bg-neutral-bg2 p-4 text-sm text-text-muted">
        {error ?? "Loading AI settings…"}
      </div>
    );
  }

  const usageLabel = s.usage.unlimited
    ? "Unlimited"
    : `${s.usage.used} / ${s.usage.cap} this month`;

  return (
    <div className="rounded-xl border border-border-subtle bg-neutral-bg2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-text-primary">
          <Sparkles className="h-4 w-4 text-brand-light" />
          AI script generator
          <span className="ml-1 rounded-md bg-neutral-bg4 px-2 py-0.5 text-xs text-text-secondary">
            {s.mode === "byok" ? "Your key" : `Supplied · ${s.modelTier}`}
          </span>
        </span>
        <span className="flex items-center gap-3">
          <span className="text-xs text-text-muted">{usageLabel}</span>
          <ChevronDown
            className={`h-4 w-4 text-text-muted transition-transform ${open ? "rotate-180" : ""}`}
          />
        </span>
      </button>

      {open && (
        <div className="flex flex-col gap-4 border-t border-border-subtle p-4">
          {/* Mode */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-text-muted">
              Key source
            </span>
            <div className="flex gap-2">
              <ModeChip
                active={mode === "supplied"}
                disabled={!s.suppliedAvailable}
                onClick={() => setMode("supplied")}
                label="Supplied"
                hint="Use our key"
              />
              <ModeChip
                active={mode === "byok"}
                disabled={!s.byokAvailable}
                onClick={() => setMode("byok")}
                label="Bring your own"
                hint={s.byokAvailable ? "Your key, no limits" : "Not enabled"}
              />
            </div>
          </div>

          {mode === "supplied" ? (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-text-muted">
                Model tier
              </span>
              <div className="flex gap-2">
                <ModeChip
                  active={tier === "fast"}
                  onClick={() => setTier("fast")}
                  label="Fast"
                  hint="Quick & free-tier"
                />
                <ModeChip
                  active={tier === "premium"}
                  onClick={() => setTier("premium")}
                  label="Premium"
                  hint={s.premiumAvailable ? "Higher quality" : "Falls back to Fast"}
                />
              </div>
              <p className="text-xs text-text-muted">
                {s.usage.unlimited
                  ? "Your account has unlimited generations."
                  : `${s.usage.cap - s.usage.used} of ${s.usage.cap} generations left this month. Bring your own key for unlimited use.`}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium uppercase tracking-wide text-text-muted">
                  Provider
                </span>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="h-10 w-full rounded-lg border border-border-default bg-neutral-bg3 px-3 text-sm text-text-primary focus:border-brand focus:outline-none"
                >
                  {PROVIDERS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium uppercase tracking-wide text-text-muted">
                  Model <span className="normal-case text-text-muted">(optional)</span>
                </span>
                <Input
                  placeholder="provider default"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium uppercase tracking-wide text-text-muted">
                  API key
                </span>
                <Input
                  type="password"
                  autoComplete="off"
                  placeholder={
                    s.byok.last4 ? `•••• ${s.byok.last4} (saved)` : "Paste your provider API key"
                  }
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                <p className="text-xs text-text-muted">
                  Stored encrypted. We never show it again or send it to your browser.
                  {s.byok.last4 && (
                    <>
                      {" "}
                      <button
                        onClick={() => save({ removeKey: true, mode: "supplied" })}
                        className="text-status-error hover:underline"
                      >
                        Remove saved key
                      </button>
                    </>
                  )}
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <Button onClick={onSave} disabled={saving} size="sm">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
            {saved && (
              <span className="flex items-center gap-1 text-xs text-status-success">
                <Check className="h-3 w-3" /> Saved
              </span>
            )}
            {error && <span className="text-xs text-status-error">{error}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

function ModeChip({
  active,
  disabled,
  onClick,
  label,
  hint,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  label: string;
  hint: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-1 flex-col items-start rounded-lg border px-3 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? "border-brand bg-brand/10"
          : "border-border-default bg-neutral-bg3 hover:border-border-strong"
      }`}
    >
      <span className="text-sm text-text-primary">{label}</span>
      <span className="text-xs text-text-muted">{hint}</span>
    </button>
  );
}
