import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const KEY_LENGTH = 32;
const FORMAT_VERSION = "v1";
const SCRYPT_SALT = "cafs-google-refresh-token-v1";

function deriveEncryptionKey(): Buffer {
  const secret = process.env.TOKEN_ENCRYPTION_KEY?.trim();
  if (!secret) {
    throw new Error("TOKEN_ENCRYPTION_KEY is not configured");
  }

  try {
    const key = Buffer.from(secret, "base64");
    if (key.length === KEY_LENGTH) return key;
  } catch {
    // Fall through to scrypt when value is not 32-byte base64.
  }

  return scryptSync(secret, SCRYPT_SALT, KEY_LENGTH);
}

/**
 * Encrypts a Google OAuth refresh token for storage in `therapists.google_refresh_token_encrypted`.
 */
export function encryptGoogleRefreshToken(plaintext: string): string {
  if (!plaintext.trim()) {
    throw new Error("Cannot encrypt an empty refresh token");
  }

  const key = deriveEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    FORMAT_VERSION,
    iv.toString("base64url"),
    authTag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(":");
}

/**
 * Decrypts a value previously produced by `encryptGoogleRefreshToken`.
 */
export function decryptGoogleRefreshToken(encrypted: string): string {
  const parts = encrypted.split(":");
  if (parts.length !== 4 || parts[0] !== FORMAT_VERSION) {
    throw new Error("Invalid encrypted Google refresh token format");
  }

  const iv = Buffer.from(parts[1], "base64url");
  const authTag = Buffer.from(parts[2], "base64url");
  const ciphertext = Buffer.from(parts[3], "base64url");

  const key = deriveEncryptionKey();
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");
}
