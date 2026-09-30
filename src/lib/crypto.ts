import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * AES-256-GCM for secrets at rest (GitHub OAuth tokens).
 * Key: TOKEN_ENCRYPTION_KEY (32 bytes, base64 or hex), else derived from AUTH_SECRET.
 * Format: "enc:v1:<iv b64>:<tag b64>:<ciphertext b64>". Plain values (pre-encryption rows) pass through.
 */
const PREFIX = "enc:v1:";

function key(): Buffer {
  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  if (raw) {
    const buf = /^[0-9a-f]{64}$/i.test(raw) ? Buffer.from(raw, "hex") : Buffer.from(raw, "base64");
    if (buf.length !== 32) throw new Error("TOKEN_ENCRYPTION_KEY must be 32 bytes (64 hex chars or base64)");
    return buf;
  }
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("Set TOKEN_ENCRYPTION_KEY or AUTH_SECRET to encrypt tokens");
  return createHash("sha256").update(`ghost-pm-token-key:${secret}`).digest();
}

export function encryptSecret(plain: string | null | undefined): string | null {
  if (plain == null || plain === "") return plain ?? null;
  if (plain.startsWith(PREFIX)) return plain;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return `${PREFIX}${iv.toString("base64")}:${cipher.getAuthTag().toString("base64")}:${ct.toString("base64")}`;
}

export function decryptSecret(value: string | null | undefined): string | null {
  if (value == null) return null;
  if (!value.startsWith(PREFIX)) return value; // legacy plaintext
  const [iv, tag, ct] = value.slice(PREFIX.length).split(":");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(ct, "base64")), decipher.final()]).toString("utf8");
}
