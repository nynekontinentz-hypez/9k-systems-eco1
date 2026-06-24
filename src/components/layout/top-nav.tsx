"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import {
  LayoutDashboard,
  Users,
  Clapperboard,
  CreditCard,
  Download,
  Home,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Persistent top navigation for the console. Present on every /app page (and
 * sub-page) so you can reach any section from anywhere, plus a link back to the
 * public site and the org/account controls.
 */
const NAV = [
  { href: "/app", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/app/clients", label: "Clients", icon: Users },
  { href: "/app/studio", label: "Studio", icon: Clapperboard },
  { href: "/app/billing", label: "Billing", icon: CreditCard },
  { href: "/app/downloads", label: "Downloads", icon: Download },
];

export function TopNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-border-subtle bg-neutral-bg1/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link href="/app" className="flex shrink-0 items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-sm font-bold text-white shadow-glow">
            9K
          </span>
          <span className="hidden text-sm font-semibold tracking-tight sm:inline">
            9K Systems
          </span>
        </Link>

        {/* Section links — always visible, horizontally scrollable on small screens. */}
        <nav className="flex flex-1 items-center gap-1 overflow-x-auto">
          {NAV.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-label={label}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-brand-subtle text-text-primary"
                    : "text-text-secondary hover:bg-white/5 hover:text-text-primary",
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm text-text-secondary transition-colors hover:bg-white/5 hover:text-text-primary"
            title="Public site"
          >
            <Home className="h-4 w-4" />
            <span className="hidden lg:inline">Site</span>
          </Link>
          <OrganizationSwitcher
            hidePersonal={false}
            afterCreateOrganizationUrl="/app/clients"
            afterSelectOrganizationUrl="/app"
            appearance={{
              elements: {
                organizationSwitcherTrigger:
                  "text-text-secondary hover:text-text-primary",
              },
            }}
          />
          <UserButton afterSignOutUrl="/" />
        </div>
      </div>
    </header>
  );
}
