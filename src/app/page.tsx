import Link from "next/link";
import { ArrowRight, ShieldCheck, Zap, Check, Wrench, Server } from "lucide-react";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { WaitlistForm } from "@/components/marketing/waitlist-form";
import { BuyButton } from "@/components/marketing/buy-button";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { productsByGroup, type Product } from "@/lib/catalog";
import { formatUSD, cn } from "@/lib/utils";

// Swap this for your preferred one-liner any time — it's a single field.
const HERO_HEADLINE = "Moved fast on AI? One operator to audit it, fix it, and run it.";

export default function Landing() {
  const audit = productsByGroup("audit")[0];
  const platform = productsByGroup("platform");
  const retainers = productsByGroup("retainer");

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
            <Zap className="h-3 w-3" /> AI-Rescue · Managed IT · MSP platform
          </Badge>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-text-primary sm:text-6xl">
            {HERO_HEADLINE}
          </h1>
          <p className="max-w-2xl text-lg text-text-secondary">
            Start with a fixed-scope <span className="text-text-primary">AI-Rescue Audit</span>,
            retain me to run your IT month to month, or run your own one-person
            MSP on the same platform I use. One operator, accountable end to end.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <a href="#audit" className={buttonVariants({ variant: "brand", size: "lg" })}>
              Get the AI-Rescue Audit — {audit ? formatUSD(audit.priceCents) : "$997"}
              <ArrowRight className="h-4 w-4" />
            </a>
            <a href="#services" className={buttonVariants({ variant: "outline", size: "lg" })}>
              Hire me to run your IT
            </a>
          </div>
        </div>
      </section>

      {/* AI-Rescue Audit — the sharp entry point */}
      {audit && (
        <section id="audit" className="mx-auto w-full max-w-6xl scroll-mt-20 px-6 py-16">
          <div className="grid items-center gap-8 rounded-2xl border border-brand/40 bg-neutral-bg2 p-8 shadow-glow lg:grid-cols-[1.2fr_1fr]">
            <div className="flex flex-col gap-4">
              <span className="flex items-center gap-2 text-sm font-medium text-brand-light">
                <ShieldCheck className="h-4 w-4" /> AI-Rescue Audit
              </span>
              <h2 className="text-3xl font-semibold tracking-tight">
                Moved fast on AI? Let&apos;s make sure it didn&apos;t break
                anything.
              </h2>
              <p className="text-text-secondary">{audit.blurb}</p>
              <ul className="flex flex-col gap-2">
                {audit.features?.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-text-secondary">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-light" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col items-start gap-4 rounded-xl border border-border-subtle bg-neutral-bg1 p-6">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-semibold">
                  {formatUSD(audit.priceCents)}
                </span>
                <span className="text-sm text-text-muted">one-time</span>
              </div>
              <p className="text-sm text-text-secondary">
                Fixed scope, fixed price. You get the findings and the plan —
                keep it or have me execute it.
              </p>
              <BuyButton sku={audit.sku} size="lg" className="w-full">
                {audit.cta ?? "Get the audit"}
              </BuyButton>
            </div>
          </div>
        </section>
      )}

      {/* Retain me — done-for-you IT (broad audience, so it leads) */}
      <section id="services" className="mx-auto w-full max-w-6xl scroll-mt-20 px-6 py-16">
        <SectionHead
          icon={<Wrench className="h-5 w-5 text-brand-light" />}
          eyebrow="For your business"
          title="Hand your IT to me."
          body="Patching, backups, monitoring, security, and roadmap work — run by one accountable operator instead of a faceless helpdesk. Flat monthly pricing."
        />
        <div className="grid gap-5 md:grid-cols-3">
          {retainers.map((p) => (
            <PricingCard key={p.sku} product={p} />
          ))}
        </div>
      </section>

      {/* MSP platform — for other one-person MSPs (niche, so it follows) */}
      <section id="platform" className="mx-auto w-full max-w-6xl scroll-mt-20 px-6 py-16">
        <SectionHead
          icon={<Server className="h-5 w-5 text-brand-light" />}
          eyebrow="For one-person MSPs"
          title="Or run your own MSP on my platform."
          body="Client workspaces, Stripe billing, entitlements, and gated deliverables — the same platform I use, ready for your own clients behind your own login."
        />
        <div className="mx-auto grid max-w-3xl gap-5 sm:grid-cols-2">
          {platform.map((p) => (
            <PricingCard key={p.sku} product={p} />
          ))}
        </div>
      </section>

      {/* Waitlist */}
      <section className="mx-auto w-full max-w-6xl px-6 py-16">
        <div className="flex flex-col items-center gap-5 rounded-2xl border border-border-subtle bg-neutral-bg2 px-6 py-12 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">
            Not ready yet? Hold a seat.
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

function SectionHead({
  icon,
  eyebrow,
  title,
  body,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <div className="mb-10 flex flex-col items-center gap-3 text-center">
      <span className="flex items-center gap-2 text-sm font-medium text-brand-light">
        {icon}
        {eyebrow}
      </span>
      <h2 className="text-3xl font-semibold tracking-tight">{title}</h2>
      <p className="max-w-2xl text-text-secondary">{body}</p>
    </div>
  );
}

function PricingCard({ product: p }: { product: Product }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-xl border bg-neutral-bg2 p-6",
        p.highlight ? "border-brand/40 shadow-glow" : "border-border-subtle",
      )}
    >
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-text-primary">{p.name}</span>
          {p.highlight && <Badge tone="brand">Popular</Badge>}
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-semibold">{formatUSD(p.priceCents)}</span>
          <span className="text-xs text-text-muted">
            {p.interval === "month" ? "/mo" : "one-time"}
          </span>
        </div>
      </div>
      <p className="text-sm text-text-secondary">{p.blurb}</p>
      {p.features && (
        <ul className="flex flex-1 flex-col gap-2">
          {p.features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm text-text-secondary">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-light" />
              {f}
            </li>
          ))}
        </ul>
      )}
      <BuyButton sku={p.sku} variant={p.highlight ? "brand" : "outline"}>
        {p.cta ?? (p.interval === "month" ? "Start" : "Buy")}
      </BuyButton>
    </div>
  );
}
