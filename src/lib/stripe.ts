import Stripe from "stripe";
import { env, isStripeConfigured } from "./env";

let stripeSingleton: Stripe | null = null;

/** Lazily build the Stripe client. Returns null until a key is set. */
export function stripe(): Stripe | null {
  if (!isStripeConfigured) return null;
  if (stripeSingleton) return stripeSingleton;
  stripeSingleton = new Stripe(env.stripeSecret, {
    // Matches the stripe@17 SDK's pinned version. Bump deliberately on upgrade.
    apiVersion: "2024-10-28.acacia",
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
