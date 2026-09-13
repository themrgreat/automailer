const { getDb } = require("../../db");
const { PROVIDERS, getProviderDef } = require("./registry");
const { encrypt, decrypt, hasEncryptionKey } = require("../../utils/crypto");
const { ZohoMailProvider } = require("./zoho");
const { GmailProvider } = require("./gmail");

const PROVIDER_CLASSES = {
  zoho: ZohoMailProvider,
  gmail: GmailProvider,
};

function collection() {
  return getDb().collection("mail_provider_configs");
}

function notFound(providerId) {
  const err = new Error(`Unknown mail provider "${providerId}"`);
  err.status = 404;
  return err;
}

function requiredFields(def) {
  return def.fields.filter((f) => f.required !== false);
}

// Never let a bad/rotated encryption key take down the whole app — treat it as
// "no stored value" so config falls back to env vars, same as before this feature existed.
function decryptSafe(payload) {
  try {
    return decrypt(payload);
  } catch (err) {
    console.error("Failed to decrypt a stored mail provider credential:", err.message);
    return null;
  }
}

function maskValue(value) {
  if (!value) return null;
  if (value.length <= 8) return "•".repeat(value.length);
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

// Resolved value for one credential field — DB override first, env var fallback.
function resolveField(def, field, doc) {
  const dbValue = doc?.credentials?.[field.key] ? decryptSafe(doc.credentials[field.key]) : null;
  const envValue = field.envVar ? process.env[field.envVar] || null : null;
  const value = dbValue || envValue;
  return { value, source: dbValue ? "db" : envValue ? "env" : "none" };
}

async function getAllConfigDocs() {
  const docs = await collection().find().toArray();
  const map = {};
  for (const d of docs) map[d.providerId] = d;
  return map;
}

// UI-safe view of every provider — merges the registry, any DB overrides, and env
// fallbacks. Raw credential values are never included, only masked previews.
async function listProviders() {
  const docsMap = await getAllConfigDocs();
  return PROVIDERS.map((def) => {
    const doc = docsMap[def.id];
    const fields = def.fields.map((field) => {
      const { value, source } = resolveField(def, field, doc);
      return {
        key: field.key,
        label: field.label,
        type: field.type,
        required: field.required !== false,
        hasValue: Boolean(value),
        preview: maskValue(value),
        source,
      };
    });
    const hasCredentials = fields.filter((f) => f.required).every((f) => f.hasValue);

    return {
      id: def.id,
      label: def.label,
      fields,
      docsUrl: def.docsUrl,
      enabled: doc?.enabled ?? true,
      isDefault: Boolean(doc?.isDefault),
      hasCredentials,
      lastTestedAt: doc?.lastTestedAt ?? null,
      lastTestOk: doc?.lastTestOk ?? null,
      lastTestError: doc?.lastTestError ?? null,
    };
  });
}

async function getProviderView(providerId) {
  const all = await listProviders();
  return all.find((p) => p.id === providerId) || null;
}

// Which provider id should actually be used to send emails right now.
// Prefers a DB-marked default (if enabled and it resolves to real credentials), otherwise
// falls back to MAIL_PROVIDER from .env — today's exact behavior.
async function getActiveProviderId() {
  const doc = await collection().findOne({ isDefault: true });
  if (doc && getProviderDef(doc.providerId) && (doc.enabled ?? true)) {
    const def = getProviderDef(doc.providerId);
    const values = await resolveProviderCredentials(doc.providerId);
    if (requiredFields(def).every((f) => values[f.key])) return doc.providerId;
  }
  return (process.env.MAIL_PROVIDER || "zoho").toLowerCase();
}

// { <fieldKey>: value } for a given provider id — DB override first, env var fallback.
async function resolveProviderCredentials(providerId) {
  const def = getProviderDef(providerId);
  if (!def) throw notFound(providerId);

  const doc = await collection().findOne({ providerId });
  const values = {};
  for (const field of def.fields) {
    values[field.key] = resolveField(def, field, doc).value;
  }
  return values;
}

async function saveProviderConfig(providerId, { fields, enabled } = {}) {
  const def = getProviderDef(providerId);
  if (!def) throw notFound(providerId);

  const set = { updatedAt: new Date().toISOString() };
  const validKeys = new Set(def.fields.map((f) => f.key));

  if (fields) {
    for (const [key, value] of Object.entries(fields)) {
      if (!validKeys.has(key) || !value) continue;
      if (!hasEncryptionKey()) {
        const err = new Error("Set SETTINGS_ENCRYPTION_KEY in backend/.env before saving credentials");
        err.status = 400;
        throw err;
      }
      set[`credentials.${key}`] = encrypt(value);
    }
  }
  if (enabled !== undefined) set.enabled = Boolean(enabled);

  const setOnInsert = { providerId, isDefault: false };
  if (enabled === undefined) setOnInsert.enabled = true;

  await collection().updateOne({ providerId }, { $set: set, $setOnInsert: setOnInsert }, { upsert: true });
  return getProviderView(providerId);
}

async function clearProviderCredentials(providerId) {
  const def = getProviderDef(providerId);
  if (!def) throw notFound(providerId);

  await collection().updateOne(
    { providerId },
    { $unset: { credentials: "" }, $set: { updatedAt: new Date().toISOString() } }
  );
  return getProviderView(providerId);
}

async function setDefaultProvider(providerId) {
  const def = getProviderDef(providerId);
  if (!def) throw notFound(providerId);

  const values = await resolveProviderCredentials(providerId);
  const missing = requiredFields(def).filter((f) => !values[f.key]);
  if (missing.length > 0) {
    const err = new Error(
      `${def.label} is missing ${missing.map((f) => f.label).join(", ")} — add it before setting it as default`
    );
    err.status = 400;
    throw err;
  }

  const now = new Date().toISOString();
  await collection().updateMany({}, { $set: { isDefault: false, updatedAt: now } });
  await collection().updateOne(
    { providerId },
    { $set: { isDefault: true, updatedAt: now }, $setOnInsert: { providerId, enabled: true } },
    { upsert: true }
  );
  return listProviders();
}

// Opens a real connection with the resolved (or not-yet-saved override) credentials.
// fieldOverrides lets the UI test not-yet-saved credentials before committing to them.
async function testProviderConnection(providerId, fieldOverrides) {
  const def = getProviderDef(providerId);
  if (!def) throw notFound(providerId);

  const resolved = await resolveProviderCredentials(providerId);
  const values = { ...resolved, ...(fieldOverrides || {}) };

  const missing = requiredFields(def).filter((f) => !values[f.key]);
  if (missing.length > 0) {
    const err = new Error(`Missing ${missing.map((f) => f.label).join(", ")} for ${def.label}`);
    err.status = 400;
    throw err;
  }

  const now = new Date().toISOString();
  const setOnInsert = { providerId, enabled: true, isDefault: false };

  try {
    await PROVIDER_CLASSES[providerId].testConnection(values);
    await collection().updateOne(
      { providerId },
      { $set: { lastTestedAt: now, lastTestOk: true, lastTestError: null, updatedAt: now }, $setOnInsert: setOnInsert },
      { upsert: true }
    );
    return { ok: true };
  } catch (err) {
    const message = err.message || "Connection test failed";
    await collection().updateOne(
      { providerId },
      { $set: { lastTestedAt: now, lastTestOk: false, lastTestError: message, updatedAt: now }, $setOnInsert: setOnInsert },
      { upsert: true }
    );
    return { ok: false, error: message };
  }
}

module.exports = {
  PROVIDER_CLASSES,
  listProviders,
  getActiveProviderId,
  resolveProviderCredentials,
  saveProviderConfig,
  clearProviderCredentials,
  setDefaultProvider,
  testProviderConnection,
};
