import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "./env";

/**
 * Server-only client for the external render worker. The Next app dispatches
 * jobs to the worker (authenticated with a shared secret) and verifies the
 * worker's signed callbacks. Never import in a client file.
 */

/** HMAC-SHA256 of a raw body with the shared secret, hex-encoded. */
export function signBody(rawBody: string): string {
  return createHmac("sha256", env.workerSecret).update(rawBody).digest("hex");
}

/** Constant-time verify of a worker callback signature (hex HMAC-SHA256). */
export function verifySignature(rawBody: string, signature: string | null): boolean {
  if (!signature || !env.workerSecret) return false;
  // Shape-gate first (no secret involved), so the comparison always operates on
  // two fixed 32-byte buffers and can't key its timing off the secret.
  if (!/^[0-9a-f]{64}$/i.test(signature)) return false;
  const expected = Buffer.from(signBody(rawBody), "hex");
  const given = Buffer.from(signature, "hex");
  if (given.length !== expected.length) return false;
  return timingSafeEqual(expected, given);
}

export type DispatchPayload = {
  jobId: string;
  kind: string;
  text: string;
  voice: string;
  supabaseUrl: string;
  bucket: string;
  uploadPath: string;
  uploadToken: string;
  callbackUrl: string;
};

/** Send a job to the worker. Throws on a non-2xx so the caller can fail the job. */
export async function dispatchJob(payload: DispatchPayload): Promise<void> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(`${env.workerUrl}/jobs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-worker-secret": env.workerSecret,
      },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Worker rejected job (${res.status}): ${detail.slice(0, 200)}`);
    }
  } finally {
    clearTimeout(timer);
  }
}
