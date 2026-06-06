import { cn } from "@/lib/utils";

type Tone = "neutral" | "brand" | "success" | "warning" | "error" | "info";

const tones: Record<Tone, string> = {
  neutral: "bg-neutral-bg4 text-text-secondary border-border-subtle",
  brand: "bg-brand-subtle text-brand-light border-brand/30",
  success: "bg-status-success/15 text-status-success border-status-success/30",
  warning: "bg-status-warning/15 text-status-warning border-status-warning/30",
  error: "bg-status-error/15 text-status-error border-status-error/30",
  info: "bg-status-info/15 text-status-info border-status-info/30",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
