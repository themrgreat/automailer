const crypto = require("crypto");

const ALGO = "aes-256-gcm";

function getKey() {
  const hex = process.env.SETTINGS_ENCRYPTION_KEY;
  if (!hex) return null;
  const key = Buffer.from(hex, "hex");
  if (key.length !== 32) {
    throw new Error("SETTINGS_ENCRYPTION_KEY must be a 32-byte hex string (64 hex characters)");
  }
  return key;
}

// Returns "iv:authTag:ciphertext" (all base64) or throws if SETTINGS_ENCRYPTION_KEY isn't set.
function encrypt(plainText) {
  const key = getKey();
  if (!key) throw new Error("SETTINGS_ENCRYPTION_KEY is not set in the environment");

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([cipher.update(String(plainText), "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [iv.toString("base64"), authTag.toString("base64"), ciphertext.toString("base64")].join(":");
}

function decrypt(payload) {
  const key = getKey();
  if (!key) throw new Error("SETTINGS_ENCRYPTION_KEY is not set in the environment");

  const [ivB64, authTagB64, ciphertextB64] = String(payload).split(":");
  if (!ivB64 || !authTagB64 || !ciphertextB64) throw new Error("Malformed encrypted payload");

  const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(authTagB64, "base64"));
  const plain = Buffer.concat([decipher.update(Buffer.from(ciphertextB64, "base64")), decipher.final()]);
  return plain.toString("utf8");
}

function hasEncryptionKey() {
  return Boolean(process.env.SETTINGS_ENCRYPTION_KEY);
}

module.exports = { encrypt, decrypt, hasEncryptionKey };
