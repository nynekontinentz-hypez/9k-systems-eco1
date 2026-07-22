"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import {
  LayoutDashboard,
  Users,
  ClipboardCheck,
  CreditCard,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/app", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/app/clients", label: "Clients", icon: Users },
  { href: "/app/audits", label: "Audits", icon: ClipboardCheck },
  { href: "/app/billing", label: "Billing", icon: CreditCard },
  { href: "/app/downloads", label: "Downloads", icon: Download },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="glass-panel flex h-dvh w-64 flex-col gap-2 p-4">
      <Link href="/app" className="mb-4 flex items-center gap-2 px-2">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-sm font-bold text-white shadow-glow">
          9K
        </span>
        <span className="text-sm font-semibold tracking-tight">
          9K Systems
        </span>
      </Link>

      <nav className="flex flex-1 flex-col gap-1">
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = exact
            ? pathname === href
            : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-brand-subtle text-text-primary"
                  : "text-text-secondary hover:bg-white/5 hover:text-text-primary",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-3 border-t border-border-subtle pt-3">
        <OrganizationSwitcher
          hidePersonal={false}
          afterCreateOrganizationUrl="/app/clients"
          afterSelectOrganizationUrl="/app"
          appearance={{ elements: { rootBox: "w-full", organizationSwitcherTrigger: "w-full justify-between text-text-secondary" } }}
        />
        <div className="flex items-center gap-2 px-1">
          <UserButton afterSignOutUrl="/" />
          <span className="text-xs text-text-muted">Operator</span>
        </div>
      </div>
    </aside>
  );
}
