import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";
import { env } from "./env";

/**
 * Server-only symmetric encryption for secrets at rest (BYOK provider keys).
 * AES-256-GCM with a per-record random IV and an auth tag. The master key comes
 * from STUDIO_AI_ENC_KEY (32 bytes as 64 hex chars or base64). Never import this
 * into a client component.
 */

export type SealedSecret = { cipher: string; iv: string; tag: string };

function masterKey(): Buffer {
  const raw = env.studioAiEncKey;
  if (!raw) throw new Error("STUDIO_AI_ENC_KEY is not set; BYOK is disabled.");
  // Accept 64 hex chars or base64; must decode to exactly 32 bytes.
  let key: Buffer;
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    key = Buffer.from(raw, "hex");
  } else {
    key = Buffer.from(raw, "base64");
  }
  if (key.length !== 32) {
    throw new Error(
      "STUDIO_AI_ENC_KEY must decode to 32 bytes (64 hex chars or base64).",
    );
  }
  return key;
}

/** Encrypt a plaintext secret. Returns base64 cipher/iv/tag for storage. */
export function sealSecret(plaintext: string): SealedSecret {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", masterKey(), iv);
  const enc = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  return {
    cipher: enc.toString("base64"),
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
  };
}

/** Decrypt a sealed secret. Throws if the auth tag fails (tampering/wrong key). */
export function openSecret(sealed: SealedSecret): string {
  const decipher = createDecipheriv(
    "aes-256-gcm",
    masterKey(),
    Buffer.from(sealed.iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(sealed.tag, "base64"));
  const dec = Buffer.concat([
    decipher.update(Buffer.from(sealed.cipher, "base64")),
    decipher.final(),
  ]);
  return dec.toString("utf8");
}

/** Last 4 visible chars of a key, for display (e.g. "••••a1b2"). */
export function keyLast4(key: string): string {
  return key.slice(-4);
}
