import { auth } from "@clerk/nextjs/server";
import { Download, Lock, FileBox } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { SetupHint } from "@/components/setup-hint";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { supabaseAdmin } from "@/lib/supabase";
import { hasEntitlement } from "@/lib/entitlements";
import { shortDate, cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Asset = {
  id: string;
  name: string;
  description: string | null;
  required_sku: string | null;
  size_bytes: number | null;
  created_at: string;
};

function prettySize(bytes: number | null) {
  if (!bytes) return "";
  const units = ["B", "KB", "MB", "GB"];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

export default async function DownloadsPage() {
  const { userId, orgId } = await auth();
  const db = supabaseAdmin();

  if (!db) {
    return (
      <>
        <PageHeader
          title="Downloads"
          description="Deliverables for the active client, gated behind what they've paid for."
        />
        <SetupHint title="Connect Supabase Storage">
          Create a private <code>deliverables</code> bucket and add your
          Supabase keys. Upload files, register them in the <code>assets</code>{" "}
          table, and they show up here.
        </SetupHint>
      </>
    );
  }

  const { data } = await db
    .from("assets")
    .select("id, name, description, required_sku, size_bytes, created_at")
    .or(orgId ? `clerk_org_id.eq.${orgId},clerk_org_id.is.null` : `clerk_org_id.is.null`)
    .order("created_at", { ascending: false });

  const assets = (data as Asset[]) ?? [];

  // Resolve access per asset up front so the UI is honest about what's locked.
  const access = await Promise.all(
    assets.map(async (a) =>
      a.required_sku
        ? hasEntitlement({ userId, orgId, sku: a.required_sku })
        : true,
    ),
  );

  return (
    <>
      <PageHeader
        title="Downloads"
        description="Deliverables for the active client, gated behind what they've paid for."
      />

      {assets.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 px-6 py-14 text-center">
          <FileBox className="h-6 w-6 text-text-muted" />
          <span className="text-sm text-text-secondary">
            No deliverables yet for this client.
          </span>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {assets.map((a, i) => {
            const unlocked = access[i];
            return (
              <Card
                key={a.id}
                className="flex items-center justify-between gap-4 p-4"
              >
                <div className="flex min-w-0 flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium text-text-primary">
                      {a.name}
                    </span>
                    {a.required_sku && (
                      <Badge tone={unlocked ? "success" : "neutral"}>
                        {unlocked ? "Unlocked" : "Locked"}
                      </Badge>
                    )}
                  </div>
                  {a.description && (
                    <span className="truncate text-sm text-text-secondary">
                      {a.description}
                    </span>
                  )}
                  <span className="text-xs text-text-muted">
                    {prettySize(a.size_bytes)} · {shortDate(a.created_at)}
                  </span>
                </div>

                {unlocked ? (
                  <a
                    href={`/api/download?asset=${a.id}`}
                    className={buttonVariants({ variant: "brand", size: "sm" })}
                  >
                    <Download className="h-4 w-4" /> Download
                  </a>
                ) : (
                  <a
                    href="/app/billing"
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                      "shrink-0",
                    )}
                  >
                    <Lock className="h-4 w-4" /> Unlock
                  </a>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
