import Stripe from "stripe";
import { env, isStripeConfigured } from "./env";

let stripeSingleton: Stripe | null = null;

/** Lazily build the Stripe client. Returns null until a key is set. */
export function stripe(): Stripe | null {
  if (!isStripeConfigured) return null;
  if (stripeSingleton) return stripeSingleton;
  stripeSingleton = new Stripe(env.stripeSecret, {
    // Must match the installed stripe SDK's pinned API version literal.
    apiVersion: "2025-02-24.acacia",
    appInfo: { name: "9K Systems", version: "0.1.0" },
  });
  return stripeSingleton;
}

export function requireStripe(): Stripe {
  const client = stripe();
  if (!client) {
    throw new Error("Stripe is not configured. Set STRIPE_SECRET_KEY.");
  }
  return client;
}
