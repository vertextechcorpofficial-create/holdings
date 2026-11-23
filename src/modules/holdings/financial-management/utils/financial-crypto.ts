import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const VERSION_PREFIX = "v1";
const IV_LENGTH_BYTES = 12;

function getEncryptionKey(): Buffer {
  const rawKey = process.env.FINANCIAL_HEALTH_ENCRYPTION_KEY?.trim();
  if (!rawKey) {
    throw new Error(
      "Missing FINANCIAL_HEALTH_ENCRYPTION_KEY environment variable. Add a 64-character hex key (32 bytes) to .env.local."
    );
  }

  // Support 64-char hex (32 bytes) or 44-char base64 (32 bytes)
  if (/^[0-9a-fA-F]{64}$/.test(rawKey)) {
    return Buffer.from(rawKey, "hex");
  }

  const base64Buf = Buffer.from(rawKey, "base64");
  if (base64Buf.length === 32) {
    return base64Buf;
  }

  throw new Error(
    "Invalid FINANCIAL_HEALTH_ENCRYPTION_KEY format. Expected a 32-byte key encoded as 64 hex characters (or 32-byte base64)."
  );
}

export interface EncryptedFinancialBlob {
  encrypted_payload: string;
  payload_hash: string;
}

/**
 * Encrypts sensitive financial fields using AES-256-GCM and computes a SHA-256
 * integrity hash of the canonical JSON payload.
 */
export function encryptFinancialPayload<T extends Record<string, unknown>>(
  payload: T
): EncryptedFinancialBlob {
  const key = getEncryptionKey();
  const plaintext = JSON.stringify(payload);
  const iv = crypto.randomBytes(IV_LENGTH_BYTES);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  const encrypted_payload = [
    VERSION_PREFIX,
    iv.toString("base64"),
    authTag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":");

  const payload_hash = crypto
    .createHash("sha256")
    .update(plaintext, "utf8")
    .digest("hex");

  return { encrypted_payload, payload_hash };
}

/**
 * Decrypts an AES-256-GCM payload and optionally verifies its SHA-256 hash.
 */
export function decryptFinancialPayload<T extends Record<string, unknown>>(
  encryptedPayload: string,
  expectedHash?: string | null
): T {
  const key = getEncryptionKey();
  const parts = encryptedPayload.split(":");

  if (parts.length !== 4 || parts[0] !== VERSION_PREFIX) {
    throw new Error("Unsupported or corrupted encrypted financial payload format.");
  }

  const [, ivB64, authTagB64, ciphertextB64] = parts;
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const ciphertext = Buffer.from(ciphertextB64, "base64");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");

  if (expectedHash) {
    const actualHash = crypto
      .createHash("sha256")
      .update(decrypted, "utf8")
      .digest("hex");
    if (actualHash !== expectedHash) {
      throw new Error("Financial payload integrity check failed (hash mismatch).");
    }
  }

  return JSON.parse(decrypted) as T;
}
