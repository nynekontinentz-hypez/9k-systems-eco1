import Link from "next/link";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import { buttonVariants } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border-subtle bg-neutral-bg1/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-sm font-bold text-white shadow-glow">
            9K
          </span>
          <span className="text-sm font-semibold tracking-tight">
            9K Systems
          </span>
        </Link>

        <nav className="flex items-center gap-4 overflow-x-auto text-sm text-text-secondary sm:gap-6">
          <a href="#audit" className="shrink-0 hover:text-text-primary">
            AI-Rescue Audit
          </a>
          <a href="#platform" className="shrink-0 hover:text-text-primary">
            Platform
          </a>
          <a href="#services" className="shrink-0 hover:text-text-primary">
            Retain me
          </a>
        </nav>

        <div className="flex items-center gap-2">
          <SignedOut>
            <Link href="/sign-in" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              Sign in
            </Link>
            <Link href="/sign-up" className={buttonVariants({ variant: "brand", size: "sm" })}>
              Start
            </Link>
          </SignedOut>
          <SignedIn>
            <Link href="/app" className={buttonVariants({ variant: "brand", size: "sm" })}>
              Open console
            </Link>
          </SignedIn>
        </div>
      </div>
    </header>
  );
}
