/**
 * Single source of truth for what 9K Systems sells. Edit prices/names here.
 *
 * Three groups:
 *  - "platform" : MSP-platform subscriptions for OTHER one-person MSP owners
 *                 (these buyers get their own client console login).
 *  - "retainer" : retain the operator to run a business's IT (serviced by the
 *                 operator; no self-serve login required).
 *  - "audit"    : the one-time AI Readiness Audit.
 *
 * NOTE: the audit is $997 and live in outbound emails — do not change it
 * without updating those. Stripe Price ids below are LIVE-mode prices created
 * 2026-07-28; if a price changes, create a new Stripe Price and re-pin.
 */

export type BillingInterval = "one_time" | "month";
export type ProductGroup = "platform" | "retainer" | "audit";

export type Product = {
  sku: string;
  name: string;
  blurb: string;
  priceCents: number;
  interval: BillingInterval;
  group: ProductGroup;
  /** Short "what you get" lines shown on the pricing card. */
  features?: string[];
  /** Optional real Stripe Price id (price_...). Falls back to inline price_data. */
  stripePriceId?: string;
  /** What buying this unlocks in the portal (entitlement SKU == product sku). */
  unlocks: string;
  highlight?: boolean;
  /** Button label override. */
  cta?: string;
};

export const PRODUCTS: Product[] = [
  // ── AI Readiness Audit — one-time ($997, live in emails) ─────────────────
  {
    sku: "ai-rescue-audit",
    stripePriceId: "price_1Ty4RnLYpCU77YZrZcQvEsiP",
    name: "AI Readiness Audit",
    blurb:
      "A fixed-scope teardown of a business that moved on AI too fast: 43 checkpoints across 8 domains, one clear report on what's exposed, what's wasted, and what to fix first.",
    priceCents: 99700,
    interval: "one_time",
    group: "audit",
    unlocks: "ai-rescue-audit",
    cta: "Get the audit",
    features: [
      "43 checkpoints across 8 domains",
      "Shadow-AI + data-exposure findings",
      "Colorado SB 26-189 readiness check",
      "Prioritized fix-it plan (keep it, or I run it)",
    ],
  },

  // ── MSP platform — for other one-person MSP owners ───────────────────────
  {
    sku: "platform-solo",
    stripePriceId: "price_1Ty4RoLYpCU77YZrgOVxeSy9",
    name: "Platform · Solo",
    blurb:
      "Run your one-person MSP on the same control plane I use — client workspaces, billing, and deliverables behind one login.",
    priceCents: 14900,
    interval: "month",
    group: "platform",
    unlocks: "platform-solo",
    cta: "Start on Solo",
    features: [
      "Up to 10 client workspaces",
      "Stripe billing + entitlements built in",
      "Gated per-client deliverables",
      "Your own branded console",
    ],
  },
  {
    sku: "platform-pro",
    stripePriceId: "price_1Ty4RoLYpCU77YZrSoEtxxbK",
    name: "Platform · Pro",
    blurb:
      "Everything in Solo with room to scale — more clients, priority support, and early access to new modules.",
    priceCents: 34900,
    interval: "month",
    group: "platform",
    unlocks: "platform-pro",
    highlight: true,
    cta: "Start on Pro",
    features: [
      "Unlimited client workspaces",
      "Priority support",
      "Early access to new modules",
      "Higher usage limits",
    ],
  },

  // ── Retain me — done-for-you IT (serviced by the operator) ───────────────
  {
    sku: "essential-care",
    stripePriceId: "price_1Ty4RpLYpCU77YZrhuOdlpJn",
    name: "Essential Care",
    blurb:
      "Patching, backups, monitoring, and a human who picks up. For SMBs that just need IT handled.",
    priceCents: 75000,
    interval: "month",
    group: "retainer",
    unlocks: "essential-care",
    cta: "Retain me",
    features: [
      "Patching + updates",
      "Backups + monitoring",
      "A human support line",
      "Monthly check-in",
    ],
  },
  {
    sku: "growth-ops",
    stripePriceId: "price_1Ty4RpLYpCU77YZrxAZnCiLf",
    name: "Growth Ops",
    blurb:
      "Everything in Essential Care plus roadmap work, automation builds, and priority response. For teams that are scaling.",
    priceCents: 120000,
    interval: "month",
    group: "retainer",
    unlocks: "growth-ops",
    highlight: true,
    cta: "Retain me",
    features: [
      "Everything in Essential Care",
      "Roadmap + automation builds",
      "Priority response",
      "Quarterly strategy review",
    ],
  },
  {
    sku: "total-ops",
    stripePriceId: "price_1Ty4RpLYpCU77YZrhNCl0xkw",
    name: "Total Ops",
    blurb:
      "Fractional IT leadership — strategy, security, and hands-on execution across your whole stack.",
    priceCents: 180000,
    interval: "month",
    group: "retainer",
    unlocks: "total-ops",
    cta: "Retain me",
    features: [
      "Everything in Growth Ops",
      "Security + compliance posture",
      "Fractional-CTO strategy",
      "Direct line, fastest response",
    ],
  },
];

export function getProduct(sku: string): Product | undefined {
  return PRODUCTS.find((p) => p.sku === sku);
}

/** Products in a given group, in catalog order. */
export function productsByGroup(group: ProductGroup): Product[] {
  return PRODUCTS.filter((p) => p.group === group);
}

export const AI_RESCUE_AUDIT_SKU = "ai-rescue-audit";
