"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";

/** Starts Stripe Checkout for a SKU and redirects to the hosted page. */
export function BuyButton({
  sku,
  children,
  variant = "brand",
  size = "md",
  className,
}: {
  sku: string;
  children: React.ReactNode;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function checkout() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sku }),
      });
      const data = (await res.json()) as {
        url?: string;
        error?: string;
        signInUrl?: string;
      };
      if (res.status === 401 && data.signInUrl) {
        window.location.href = data.signInUrl;
        return;
      }
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? "Checkout is unavailable right now.");
      }
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={checkout}
        disabled={loading}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </Button>
      {error && <span className="text-xs text-status-error">{error}</span>}
    </div>
  );
}
