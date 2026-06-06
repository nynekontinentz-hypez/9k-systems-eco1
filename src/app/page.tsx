import Link from "next/link";
import { ArrowRight, ShieldCheck, Clapperboard, Lock, Zap } from "lucide-react";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { WaitlistForm } from "@/components/marketing/waitlist-form";
import { BuyButton } from "@/components/marketing/buy-button";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PRODUCTS } from "@/lib/catalog";
import { formatUSD, cn } from "@/lib/utils";

export default function Landing() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[-10rem] h-[28rem] w-[48rem] -translate-x-1/2 rounded-full bg-brand/20 blur-[120px]"
        />
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 px-6 py-28 text-center">
          <Badge tone="brand">
            <Zap className="h-3 w-3" /> One operator. Every client. One console.
          </Badge>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-text-primary sm:text-6xl">
            The control plane for a{" "}
            <span className="text-brand-light">one-person MSP</span>.
          </h1>
          <p className="max-w-2xl text-lg text-text-secondary">
            Onboard SMB clients, bill them, and hand off deliverables behind a
            login — then switch tabs and run your faceless video studio from the
            same place. No duct-taped stack. No second login.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/sign-up" className={buttonVariants({ variant: "brand", size: "lg" })}>
              Stand up your console <ArrowRight className="h-4 w-4" />
            </Link>
            <a href="#pricing" className={buttonVariants({ variant: "outline", size: "lg" })}>
              See what it costs
            </a>
          </div>
        </div>
      </section>

      {/* Platform pillars */}
      <section id="platform" className="mx-auto w-full max-w-6xl px-6 py-16">
        <div className="grid gap-6 md:grid-cols-2">
          <Pillar
            icon={<ShieldCheck className="h-5 w-5 text-brand-light" />}
            title="Client side"
            points={[
              "Every SMB client is its own workspace — data, billing, and files stay walled off from each other.",
              "Take payment up front with Stripe: one-time audits or monthly retainers, your call.",
              "Deliverables sit behind the login. The client downloads only what they've paid for.",
            ]}
          />
          <Pillar
            id="studio"
            icon={<Clapperboard className="h-5 w-5 text-brand-light" />}
            title="Studio side"
            points={[
              "A pipeline board for faceless YouTube: idea → script → assets → render → published.",
              "Keep every channel's work in one lane instead of scattered across docs and drives.",
              "Wire in generation and publishing tools as you grow — the rail is already here.",
            ]}
          />
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto w-full max-w-6xl px-6 py-16">
        <div className="mb-10 flex flex-col gap-2 text-center">
          <h2 className="text-3xl font-semibold tracking-tight">
            Straight pricing. Buy now, get a login.
          </h2>
          <p className="text-text-secondary">
            Checkout runs on Stripe. After payment you land in your console with
            access already unlocked.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {PRODUCTS.map((p) => (
            <div
              key={p.sku}
              className={cn(
                "flex flex-col gap-4 rounded-xl border bg-neutral-bg2 p-5",
                p.highlight
                  ? "border-brand/40 shadow-glow"
                  : "border-border-subtle",
              )}
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-text-primary">
                    {p.name}
                  </span>
                  {p.highlight && <Badge tone="brand">Popular</Badge>}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-semibold">
                    {formatUSD(p.priceCents)}
                  </span>
                  <span className="text-xs text-text-muted">
                    {p.interval === "month" ? "/mo" : "one-time"}
                  </span>
                </div>
              </div>
              <p className="flex-1 text-sm text-text-secondary">{p.blurb}</p>
              <BuyButton sku={p.sku} variant={p.highlight ? "brand" : "outline"}>
                {p.interval === "month" ? "Start retainer" : "Buy"}
              </BuyButton>
            </div>
          ))}
        </div>
      </section>

      {/* Waitlist */}
      <section className="mx-auto w-full max-w-6xl px-6 py-16">
        <div className="flex flex-col items-center gap-5 rounded-2xl border border-border-subtle bg-neutral-bg2 px-6 py-12 text-center">
          <Lock className="h-6 w-6 text-brand-light" />
          <h2 className="text-2xl font-semibold tracking-tight">
            Not ready to buy? Hold a seat.
          </h2>
          <p className="max-w-xl text-text-secondary">
            I take on a limited number of clients at a time. Drop your email and
            I&apos;ll reach out personally before the next slot opens.
          </p>
          <WaitlistForm />
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function Pillar({
  id,
  icon,
  title,
  points,
}: {
  id?: string;
  icon: React.ReactNode;
  title: string;
  points: string[];
}) {
  return (
    <div
      id={id}
      className="flex flex-col gap-4 rounded-xl border border-border-subtle bg-neutral-bg2 p-6"
    >
      <div className="flex items-center gap-2">
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-brand-subtle">
          {icon}
        </span>
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      <ul className="flex flex-col gap-3">
        {points.map((point) => (
          <li key={point} className="flex gap-2 text-sm text-text-secondary">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
            {point}
          </li>
        ))}
      </ul>
    </div>
  );
}
