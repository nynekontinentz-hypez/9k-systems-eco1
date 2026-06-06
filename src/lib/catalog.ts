/**
 * Single source of truth for what 9K Systems sells. Edit prices/names here.
 *
 * Checkout works two ways: if `stripePriceId` is set (recommended for
 * production) it is used directly; otherwise Stripe Checkout is created from
 * inline `price_data` so you can take money before wiring a Price object.
 */

export type BillingInterval = "one_time" | "month";

export type Product = {
  sku: string;
  name: string;
  blurb: string;
  priceCents: number;
  interval: BillingInterval;
  /** Optional: a real Stripe Price id (price_...). Falls back to inline price_data. */
  stripePriceId?: string;
  /** What buying this unlocks in the portal (entitlement SKU == product sku). */
  unlocks: string;
  highlight?: boolean;
};

export const PRODUCTS: Product[] = [
  {
    sku: "founding-access",
    name: "Founding Access",
    blurb:
      "Lock in early-operator pricing and a direct line while the platform is small. One-time, never billed again.",
    priceCents: 9900,
    interval: "one_time",
    unlocks: "founding-access",
    highlight: true,
  },
  {
    sku: "stack-audit",
    name: "Stack Audit",
    blurb:
      "I tear down your current tooling, security gaps, and money leaks, then hand you a fix-it plan you can run with or without me.",
    priceCents: 120000,
    interval: "one_time",
    unlocks: "stack-audit",
  },
  {
    sku: "essential-care",
    name: "Essential Care",
    blurb:
      "Monthly retainer: patching, backups, monitoring, and a human who picks up. For SMBs that just need it handled.",
    priceCents: 75000,
    interval: "month",
    unlocks: "essential-care",
  },
  {
    sku: "growth-ops",
    name: "Growth Ops",
    blurb:
      "Everything in Essential Care plus roadmap work, automation builds, and priority response. For teams that are scaling.",
    priceCents: 180000,
    interval: "month",
    unlocks: "growth-ops",
    highlight: true,
  },
];

export function getProduct(sku: string): Product | undefined {
  return PRODUCTS.find((p) => p.sku === sku);
}
