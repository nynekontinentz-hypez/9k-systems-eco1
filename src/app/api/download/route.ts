import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { hasEntitlement } from "@/lib/entitlements";
import { env } from "@/lib/env";

const BUCKET = process.env.SUPABASE_DELIVERABLES_BUCKET ?? "deliverables";

export async function GET(req: Request) {
  const { userId, orgId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Sign in." }, { status: 401 });
  }

  const assetId = new URL(req.url).searchParams.get("asset");
  if (!assetId) {
    return NextResponse.json({ error: "Missing asset." }, { status: 400 });
  }

  const db = supabaseAdmin();
  if (!db) {
    return NextResponse.json({ error: "Storage not configured." }, { status: 503 });
  }

  const { data: asset } = await db
    .from("assets")
    .select("id, storage_path, required_sku, clerk_org_id")
    .eq("id", assetId)
    .single();

  if (!asset) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  // Org-scope: an org-bound asset is only reachable from that active org.
  if (asset.clerk_org_id && asset.clerk_org_id !== orgId) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  // Entitlement gate: assets with a required_sku need an active entitlement.
  if (asset.required_sku) {
    const ok = await hasEntitlement({
      userId,
      orgId,
      sku: asset.required_sku,
    });
    if (!ok) {
      return NextResponse.json(
        { error: "You don't have access to this file." },
        { status: 403 },
      );
    }
  }

  const { data: signed, error } = await db.storage
    .from(BUCKET)
    .createSignedUrl(asset.storage_path, 60, { download: true });

  if (error || !signed?.signedUrl) {
    return NextResponse.json(
      { error: "Could not generate a link." },
      { status: 500 },
    );
  }

  // Absolute URL guard for the redirect.
  const url = signed.signedUrl.startsWith("http")
    ? signed.signedUrl
    : `${env.supabaseUrl}${signed.signedUrl}`;

  return NextResponse.redirect(url, 302);
}
