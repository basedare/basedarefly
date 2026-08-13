import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export function assertVenueEventFeedCryptoConfigured() {
  const secret = process.env.VENUE_EVENT_FEED_SECRET?.trim();
  if (!secret || secret.length < 32) {
    throw new Error("VENUE_EVENT_FEED_SECRET must be at least 32 characters.");
  }
  return secret;
}

function feedKey() {
  const secret = assertVenueEventFeedCryptoConfigured();
  return createHash("sha256").update(secret).digest();
}

export function encryptVenueEventFeedToken(token: string) {
  const value = token.trim();
  if (value.length < 20) throw new Error("Instagram access token is invalid.");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", feedKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptVenueEventFeedToken(ciphertext: string) {
  const [version, encodedIv, encodedTag, encodedValue] = ciphertext.split(".");
  if (version !== "v1" || !encodedIv || !encodedTag || !encodedValue) {
    throw new Error("Stored Instagram token is invalid.");
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    feedKey(),
    Buffer.from(encodedIv, "base64url")
  );
  decipher.setAuthTag(Buffer.from(encodedTag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encodedValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
