import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { stripe } from "@/lib/stripe";
import { getProduct } from "@/lib/catalog";
import { env } from "@/lib/env";
import type Stripe from "stripe";

export async function POST(req: Request) {
  // Require sign-in so the purchase maps cleanly to a user/org entitlement.
  const { userId, orgId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: "Sign in to continue.", signInUrl: "/sign-in?redirect_url=/%23pricing" },
      { status: 401 },
    );
  }

  let sku: unknown;
  try {
    ({ sku } = await req.json());
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  const product = typeof sku === "string" ? getProduct(sku) : undefined;
  if (!product) {
    return NextResponse.json({ error: "Unknown product." }, { status: 404 });
  }

  const client = stripe();
  if (!client) {
    return NextResponse.json(
      { error: "Payments aren't live yet. Add STRIPE_SECRET_KEY." },
      { status: 503 },
    );
  }

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  const mode: Stripe.Checkout.SessionCreateParams.Mode =
    product.interval === "month" ? "subscription" : "payment";

  const lineItem: Stripe.Checkout.SessionCreateParams.LineItem =
    product.stripePriceId
      ? { price: product.stripePriceId, quantity: 1 }
      : {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: product.priceCents,
            product_data: { name: `9K Systems — ${product.name}` },
            ...(product.interval === "month"
              ? { recurring: { interval: "month" } }
              : {}),
          },
        };

  const metadata = {
    sku: product.sku,
    unlocks: product.unlocks,
    clerk_user_id: userId,
    clerk_org_id: orgId ?? "",
  };

  try {
    const session = await client.checkout.sessions.create({
      mode,
      line_items: [lineItem],
      customer_email: email,
      client_reference_id: userId,
      allow_promotion_codes: true,
      metadata,
      ...(mode === "subscription"
        ? { subscription_data: { metadata } }
        : { payment_intent_data: { metadata } }),
      success_url: `${env.appUrl}/app/billing?status=success&sku=${product.sku}`,
      cancel_url: `${env.appUrl}/#pricing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Checkout failed." },
      { status: 500 },
    );
  }
}
