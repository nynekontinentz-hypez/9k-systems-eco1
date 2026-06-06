import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "h-10 w-full rounded-lg border border-border-default bg-neutral-bg3 px-3 text-sm text-text-primary",
      "placeholder:text-text-muted focus:border-brand focus:bg-neutral-bg4 focus:outline-none",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";
