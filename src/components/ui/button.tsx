import { forwardRef } from "react";
import { cn } from "@/lib/utils";

type Variant = "brand" | "secondary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-colors focus-visible:outline-none disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap";

const variants: Record<Variant, string> = {
  brand: "bg-brand text-white hover:bg-brand-hover shadow-glow",
  secondary: "bg-neutral-bg4 text-text-primary hover:bg-neutral-bg5",
  outline:
    "border border-border-default text-text-primary hover:bg-white/5 hover:border-border-strong",
  ghost: "text-text-secondary hover:text-text-primary hover:bg-white/5",
  danger: "bg-status-error text-white hover:brightness-110",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

export function buttonVariants(opts?: { variant?: Variant; size?: Size }) {
  return cn(
    base,
    variants[opts?.variant ?? "brand"],
    sizes[opts?.size ?? "md"],
  );
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";
