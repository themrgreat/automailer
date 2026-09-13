const { getDb } = require("../../db");
const { PROVIDERS, getProviderDef } = require("./registry");
const { encrypt, decrypt, hasEncryptionKey } = require("../../utils/crypto");
const { GrokProvider } = require("./grok");
const { GeminiProvider } = require("./gemini");
const { OpenAIProvider } = require("./openai");
const { ClaudeProvider } = require("./claude");

const PROVIDER_CLASSES = {
  grok: GrokProvider,
  gemini: GeminiProvider,
  openai: OpenAIProvider,
  claude: ClaudeProvider,
};

function collection() {
  return getDb().collection("ai_provider_configs");
}

function notFound(providerId) {
  const err = new Error(`Unknown AI provider "${providerId}"`);
  err.status = 404;
  return err;
}

// Never let a bad/rotated encryption key take down the whole app — treat it as
// "no stored value" so config falls back to env vars, same as before this feature existed.
function decryptSafe(payload) {
  try {
    return decrypt(payload);
  } catch (err) {
    console.error("Failed to decrypt a stored AI provider credential:", err.message);
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
      return { key: field.key, label: field.label, type: field.type, hasValue: Boolean(value), preview: maskValue(value), source };
    });
    const hasCredentials = fields.every((f) => f.hasValue);

    return {
      id: def.id,
      label: def.label,
      fields,
      models: def.models,
      docsUrl: def.docsUrl,
      enabled: doc?.enabled ?? true,
      isDefault: Boolean(doc?.isDefault),
      hasCredentials,
      model: doc?.model || process.env[def.envModelVar] || def.defaultModel,
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

// Which provider id should actually be used to generate emails right now.
// Prefers a DB-marked default (if enabled and it resolves to real credentials), otherwise
// falls back to AI_PROVIDER from .env — today's exact behavior.
async function getActiveProviderId() {
  const doc = await collection().findOne({ isDefault: true });
  if (doc && getProviderDef(doc.providerId) && (doc.enabled ?? true)) {
    const values = await resolveProviderCredentials(doc.providerId);
    if (values.apiKey) return doc.providerId;
  }
  return (process.env.AI_PROVIDER || "gemini").toLowerCase();
}

// { <fieldKey>: value, model } for a given provider id — DB override first, env var fallback.
async function resolveProviderCredentials(providerId) {
  const def = getProviderDef(providerId);
  if (!def) throw notFound(providerId);

  const doc = await collection().findOne({ providerId });
  const values = {};
  for (const field of def.fields) {
    values[field.key] = resolveField(def, field, doc).value;
  }
  values.model = doc?.model || process.env[def.envModelVar] || def.defaultModel;

  return values;
}

async function saveProviderConfig(providerId, { fields, model, enabled } = {}) {
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
  if (model !== undefined) set.model = model || null;
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
  if (!values.apiKey) {
    const err = new Error(`${def.label} has no credentials configured yet — add them before setting it as default`);
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

// Lightweight key/connectivity check (models-list endpoint, no generation cost).
// fieldOverrides lets the UI test not-yet-saved credentials before committing to them.
async function testProviderConnection(providerId, fieldOverrides) {
  const def = getProviderDef(providerId);
  if (!def) throw notFound(providerId);

  let apiKey = fieldOverrides?.apiKey;
  if (!apiKey) {
    const values = await resolveProviderCredentials(providerId);
    apiKey = values.apiKey;
  }
  if (!apiKey) {
    const err = new Error(`No API key configured for ${def.label} yet`);
    err.status = 400;
    throw err;
  }

  const now = new Date().toISOString();
  const setOnInsert = { providerId, enabled: true, isDefault: false };

  try {
    await PROVIDER_CLASSES[providerId].testConnection(apiKey);
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
