import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "./supabase";
import {
  env,
  isStudioAiConfigured,
  isStudioAiPremiumConfigured,
  isByokConfigured,
} from "./env";
import { hasAnyActiveEntitlement } from "./entitlements";
import { sealSecret, openSecret, keyLast4 } from "./crypto";
import { resolveModel, type AiConfig } from "./studio-ai";

/**
 * Server-only resolution of which AI config a tenant's generation should use:
 * a supplied tier (Fast/Premium) gated by entitlement + a monthly cap, or the
 * tenant's own BYOK key (encrypted at rest, never capped). Never import in a
 * client file.
 */

export const AI_PROVIDERS = ["gemini", "groq", "openai", "anthropic"] as const;
export type AiProvider = (typeof AI_PROVIDERS)[number];
export type AiMode = "supplied" | "byok";
export type ModelTier = "fast" | "premium";

export type AiSettingsRow = {
  id: string;
  clerk_org_id: string | null;
  created_by: string | null;
  mode: AiMode;
  model_tier: ModelTier;
  byok_provider: string | null;
  byok_model: string | null;
  byok_key_cipher: string | null;
  byok_key_iv: string | null;
  byok_key_tag: string | null;
  byok_key_last4: string | null;
};

export type Scope = { userId: string; orgId?: string | null };

/** Typed error so routes can map a cause to the right HTTP status + message. */
export class AiResolveError extends Error {
  constructor(
    readonly code:
      | "not_configured"
      | "byok_unconfigured"
      | "gate"
      | "cap",
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "AiResolveError";
  }
}

export function currentPeriod(d = new Date()): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function isUnlimited(userId: string): boolean {
  return env.studioAiUnlimitedUsers.includes(userId);
}

/** Apply tenant scope to a query: by org when present, else by org-less creator. */
function scoped<T>(q: T, s: Scope): T {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query = q as any;
  return s.orgId
    ? query.eq("clerk_org_id", s.orgId)
    : query.eq("created_by", s.userId).is("clerk_org_id", null);
}

function tenantColumns(s: Scope) {
  return s.orgId
    ? { clerk_org_id: s.orgId, created_by: s.userId }
    : { clerk_org_id: null as string | null, created_by: s.userId };
}

async function getSettingsRow(
  db: SupabaseClient,
  s: Scope,
): Promise<AiSettingsRow | null> {
  const { data, error } = await scoped(
    db.from("studio_ai_settings").select("*"),
    s,
  ).maybeSingle();
  // A real read error must fail closed, not silently default to supplied/fast
  // (which could mis-route a BYOK tenant or skip their key).
  if (error)
    throw new AiResolveError("not_configured", 503, "Couldn't read AI settings.");
  return (data as AiSettingsRow) ?? null;
}

function fastConfig(): AiConfig {
  return {
    provider: env.studioAiProvider,
    apiKey: env.studioAiKey,
    model: resolveModel(env.studioAiProvider, env.studioAiModel),
  };
}

function premiumConfig(): AiConfig {
  if (!isStudioAiPremiumConfigured) return fastConfig();
  const provider = env.studioAiPremiumProvider || env.studioAiProvider;
  return {
    provider,
    apiKey: env.studioAiPremiumKey,
    model: resolveModel(provider, env.studioAiPremiumModel),
  };
}

async function getUsage(db: SupabaseClient, s: Scope, period: string) {
  const { data, error } = await scoped(
    db
      .from("studio_ai_usage")
      .select("used")
      .eq("period", period),
    s,
  ).maybeSingle();
  // Fail closed: a read error must NOT read as "0 used" and open the cap.
  if (error)
    throw new AiResolveError("not_configured", 503, "Couldn't check AI usage.");
  return Number(data?.used ?? 0);
}

export type ResolvedAi = {
  config: AiConfig;
  /** True when this generation counts against the supplied-key monthly cap. */
  metered: boolean;
  period: string;
};

/**
 * Decide the config for a generation, enforcing gate + cap for supplied keys.
 * Throws AiResolveError on any disallowed path (fails closed).
 */
export async function resolveAiConfig(s: Scope): Promise<ResolvedAi> {
  const db = supabaseAdmin();
  if (!db)
    throw new AiResolveError("not_configured", 503, "Storage not configured.");

  const row = await getSettingsRow(db, s);
  const mode: AiMode = row?.mode ?? "supplied";
  const period = currentPeriod();

  if (mode === "byok") {
    if (!isByokConfigured)
      throw new AiResolveError(
        "byok_unconfigured",
        503,
        "Bring-your-own-key isn't enabled on this server.",
      );
    if (!row?.byok_key_cipher || !row.byok_key_iv || !row.byok_key_tag)
      throw new AiResolveError(
        "byok_unconfigured",
        422,
        "Add your provider API key in Studio AI settings first.",
      );
    const apiKey = openSecret({
      cipher: row.byok_key_cipher,
      iv: row.byok_key_iv,
      tag: row.byok_key_tag,
    });
    const provider = row.byok_provider || "openai";
    return {
      config: { provider, apiKey, model: resolveModel(provider, row.byok_model) },
      metered: false,
      period,
    };
  }

  // Supplied tier.
  if (!isStudioAiConfigured)
    throw new AiResolveError(
      "not_configured",
      503,
      "Studio AI isn't configured on this server yet.",
    );

  const tier: ModelTier = row?.model_tier ?? "fast";
  const config = tier === "premium" ? premiumConfig() : fastConfig();
  const unlimited = isUnlimited(s.userId);

  if (!unlimited) {
    const gateSkus =
      env.studioAiGateSkus.length > 0 ? env.studioAiGateSkus : undefined;
    const allowed = await hasAnyActiveEntitlement(
      { userId: s.userId, orgId: s.orgId },
      gateSkus,
    );
    if (!allowed)
      throw new AiResolveError(
        "gate",
        402,
        "AI script generation is part of a paid plan. Upgrade, or add your own API key (BYOK) to use it on your account.",
      );

    const used = await getUsage(db, s, period);
    if (used >= env.studioAiMonthlyCap)
      throw new AiResolveError(
        "cap",
        429,
        `You've used all ${env.studioAiMonthlyCap} included AI generations this month. Add your own API key (BYOK) for unlimited use.`,
      );
  }

  return { config, metered: !unlimited, period };
}

/**
 * Increment the supplied-key usage counter for the tenant + period.
 * Atomic via a Postgres upsert RPC so concurrent generations can't drop counts
 * or collide on the unique index.
 */
export async function recordUsage(s: Scope, period: string): Promise<void> {
  const db = supabaseAdmin();
  if (!db) return;
  await db.rpc("studio_ai_usage_increment", {
    p_org: s.orgId ?? null,
    p_user: s.userId,
    p_period: period,
  });
}

// ---------------------------------------------------------------------------
// Settings read/write for the /api/studio/ai-settings route.
// ---------------------------------------------------------------------------

export type AiSettingsSummary = {
  mode: AiMode;
  modelTier: ModelTier;
  byok: { provider: string | null; model: string | null; last4: string | null };
  suppliedAvailable: boolean;
  premiumAvailable: boolean;
  byokAvailable: boolean;
  usage: { used: number; cap: number; unlimited: boolean };
};

export async function getSettingsSummary(s: Scope): Promise<AiSettingsSummary> {
  const db = supabaseAdmin();
  const period = currentPeriod();
  const row = db ? await getSettingsRow(db, s) : null;
  const unlimited = isUnlimited(s.userId);
  // Usage here is for display only — tolerate a read hiccup as 0 rather than
  // failing the whole settings panel. (The cap enforcement path is strict.)
  let used = 0;
  if (db && !unlimited) {
    try {
      used = await getUsage(db, s, period);
    } catch {
      used = 0;
    }
  }
  return {
    mode: row?.mode ?? "supplied",
    modelTier: row?.model_tier ?? "fast",
    byok: {
      provider: row?.byok_provider ?? null,
      model: row?.byok_model ?? null,
      last4: row?.byok_key_last4 ?? null,
    },
    suppliedAvailable: isStudioAiConfigured,
    premiumAvailable: isStudioAiPremiumConfigured,
    byokAvailable: isByokConfigured,
    usage: { used, cap: env.studioAiMonthlyCap, unlimited },
  };
}

export type SettingsPatch = {
  mode?: AiMode;
  modelTier?: ModelTier;
  byokProvider?: string | null;
  byokModel?: string | null;
  byokKey?: string | null; // new plaintext key to seal; "" / null = leave as-is
  removeKey?: boolean;
};

/** Validate + persist a settings patch for the tenant. Returns the new summary. */
export async function updateSettings(
  s: Scope,
  patch: SettingsPatch,
): Promise<AiSettingsSummary> {
  const db = supabaseAdmin();
  if (!db)
    throw new AiResolveError("not_configured", 503, "Storage not configured.");

  const row = await getSettingsRow(db, s);

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (patch.mode) {
    if (patch.mode !== "supplied" && patch.mode !== "byok")
      throw new AiResolveError("byok_unconfigured", 400, "Invalid mode.");
    if (patch.mode === "byok" && !isByokConfigured)
      throw new AiResolveError(
        "byok_unconfigured",
        503,
        "Bring-your-own-key isn't enabled on this server.",
      );
    update.mode = patch.mode;
  }

  if (patch.modelTier) {
    if (patch.modelTier !== "fast" && patch.modelTier !== "premium")
      throw new AiResolveError("byok_unconfigured", 400, "Invalid model tier.");
    update.model_tier = patch.modelTier;
  }

  if (patch.byokProvider !== undefined) {
    if (
      patch.byokProvider !== null &&
      !AI_PROVIDERS.includes(patch.byokProvider as AiProvider)
    )
      throw new AiResolveError("byok_unconfigured", 400, "Unknown provider.");
    update.byok_provider = patch.byokProvider;
  }
  if (patch.byokModel !== undefined) update.byok_model = patch.byokModel;

  // Security: if the provider changes and no new key is supplied, drop the
  // stored key. Otherwise we'd send the saved key (issued for provider A) to
  // provider B's API endpoint — leaking the tenant's secret to a third party.
  const providerChanged =
    patch.byokProvider !== undefined &&
    patch.byokProvider !== (row?.byok_provider ?? null);
  if (providerChanged && !patch.byokKey && !patch.removeKey && row?.byok_key_cipher) {
    update.byok_key_cipher = null;
    update.byok_key_iv = null;
    update.byok_key_tag = null;
    update.byok_key_last4 = null;
  }

  if (patch.removeKey) {
    update.byok_key_cipher = null;
    update.byok_key_iv = null;
    update.byok_key_tag = null;
    update.byok_key_last4 = null;
  } else if (patch.byokKey) {
    if (!isByokConfigured)
      throw new AiResolveError(
        "byok_unconfigured",
        503,
        "Bring-your-own-key isn't enabled on this server.",
      );
    const sealed = sealSecret(patch.byokKey.trim());
    update.byok_key_cipher = sealed.cipher;
    update.byok_key_iv = sealed.iv;
    update.byok_key_tag = sealed.tag;
    update.byok_key_last4 = keyLast4(patch.byokKey.trim());
  }

  if (row) {
    await db.from("studio_ai_settings").update(update).eq("id", row.id);
  } else {
    await db
      .from("studio_ai_settings")
      .insert({ ...tenantColumns(s), ...update });
  }

  return getSettingsSummary(s);
}
