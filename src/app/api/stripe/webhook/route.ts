import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { env } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase";
import { grantEntitlement } from "@/lib/entitlements";
import { getProduct } from "@/lib/catalog";

// Stripe needs the raw body for signature verification.
export const runtime = "nodejs";

type Meta = {
  sku?: string;
  unlocks?: string;
  clerk_user_id?: string;
  clerk_org_id?: string;
};

export async function POST(req: Request) {
  const client = stripe();
  if (!client || !env.stripeWebhookSecret) {
    return NextResponse.json(
      { error: "Webhook not configured." },
      { status: 503 },
    );
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const raw = await req.text();
    event = client.webhooks.constructEvent(
      raw,
      signature,
      env.stripeWebhookSecret,
    );
  } catch (e) {
    return NextResponse.json(
      { error: `Invalid signature: ${e instanceof Error ? e.message : ""}` },
      { status: 400 },
    );
  }

  const db = supabaseAdmin();

  // Idempotency: Stripe delivers at-least-once and retries on any non-2xx.
  // Record event.id first; a unique-violation means we've already handled it,
  // so we ack and stop rather than double-granting.
  if (db) {
    const { error: dupErr } = await db
      .from("processed_events")
      .insert({ id: event.id, type: event.type });
    if (dupErr) {
      return NextResponse.json({ received: true, deduped: true });
    }
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const meta = (session.metadata ?? {}) as Meta;
        // Only grant for SKUs we actually sell — never trust an arbitrary
        // metadata string, even though we set it ourselves.
        if (!meta.clerk_user_id || !meta.unlocks || !getProduct(meta.unlocks)) {
          break;
        }

        await grantEntitlement({
          userId: meta.clerk_user_id,
          orgId: meta.clerk_org_id || null,
          sku: meta.unlocks,
          source: "stripe",
          stripeRef: (session.subscription as string) ?? session.id,
        });

        if (db) {
          await db.from("purchases").insert({
            clerk_user_id: meta.clerk_user_id,
            clerk_org_id: meta.clerk_org_id || null,
            sku: meta.sku ?? meta.unlocks,
            amount_cents: session.amount_total ?? 0,
            currency: session.currency ?? "usd",
            stripe_session_id: session.id,
            status: "paid",
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        // Revoke by the subscription id we stored as stripe_ref — exact and
        // scope-safe, regardless of user/org overlap.
        if (db) {
          await db
            .from("entitlements")
            .update({ status: "revoked" })
            .eq("stripe_ref", sub.id)
            .eq("status", "active");
        }
        break;
      }

      default:
        break;
    }
  } catch (e) {
    // Roll back the idempotency marker so Stripe's retry actually reprocesses
    // this event instead of being deduped into a no-op.
    if (db) {
      await db.from("processed_events").delete().eq("id", event.id);
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Handler error." },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}
