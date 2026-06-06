import { Settings2 } from "lucide-react";

/** Inline notice rendered when a backend dependency isn't wired yet. */
export function SetupHint({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 rounded-xl border border-status-warning/30 bg-status-warning/10 px-4 py-3">
      <Settings2 className="mt-0.5 h-4 w-4 shrink-0 text-status-warning" />
      <div className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-text-primary">{title}</span>
        <span className="text-text-secondary">{children}</span>
      </div>
    </div>
  );
}
