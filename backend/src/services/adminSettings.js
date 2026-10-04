const { getDb } = require("../db");

const SETTINGS_ID = "global";

// These match the app's actual hardcoded behavior before this settings layer existed —
// changing them here would silently change behavior for every install with no stored
// admin_settings doc yet, so they must stay in sync with what the code used to do.
const DEFAULTS = {
  aiGeneration: { retryLimit: 2, concurrency: 2 },
  emailSending: { emailsPerMinute: 0, concurrency: 2, retryLimit: 0 },
};

const LIMITS = {
  retryLimit: { min: 0, max: 10 },
  concurrency: { min: 1, max: 20 },
  emailsPerMinute: { min: 0, max: 10000 },
};

function collection() {
  return getDb().collection("admin_settings");
}

function isValidField(key, value) {
  return typeof value === "number" && Number.isInteger(value) && value >= LIMITS[key].min && value <= LIMITS[key].max;
}

// Same fail-open spirit as decryptSafe() in ai/config.js / mailer/config.js: a missing
// or corrupted field never breaks generation/sending, it just falls back to the default.
function normalize(doc) {
  const d = doc || {};
  const ai = d.aiGeneration || {};
  const mail = d.emailSending || {};
  return {
    aiGeneration: {
      retryLimit: isValidField("retryLimit", ai.retryLimit) ? ai.retryLimit : DEFAULTS.aiGeneration.retryLimit,
      concurrency: isValidField("concurrency", ai.concurrency) ? ai.concurrency : DEFAULTS.aiGeneration.concurrency,
    },
    emailSending: {
      emailsPerMinute: isValidField("emailsPerMinute", mail.emailsPerMinute)
        ? mail.emailsPerMinute
        : DEFAULTS.emailSending.emailsPerMinute,
      concurrency: isValidField("concurrency", mail.concurrency) ? mail.concurrency : DEFAULTS.emailSending.concurrency,
      retryLimit: isValidField("retryLimit", mail.retryLimit) ? mail.retryLimit : DEFAULTS.emailSending.retryLimit,
    },
  };
}

async function getSettings() {
  const doc = await collection().findOne({ id: SETTINGS_ID });
  return normalize(doc);
}

function validateField(key, value) {
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value) || !Number.isInteger(value)) {
    const err = new Error(`${key} must be a whole number`);
    err.status = 400;
    throw err;
  }
  const { min, max } = LIMITS[key];
  if (value < min || value > max) {
    const err = new Error(`${key} must be between ${min} and ${max}`);
    err.status = 400;
    throw err;
  }
  return value;
}

async function updateSettings(partial = {}) {
  const set = { updatedAt: new Date().toISOString() };

  if (partial.aiGeneration) {
    const retryLimit = validateField("retryLimit", partial.aiGeneration.retryLimit);
    const concurrency = validateField("concurrency", partial.aiGeneration.concurrency);
    if (retryLimit !== undefined) set["aiGeneration.retryLimit"] = retryLimit;
    if (concurrency !== undefined) set["aiGeneration.concurrency"] = concurrency;
  }
  if (partial.emailSending) {
    const emailsPerMinute = validateField("emailsPerMinute", partial.emailSending.emailsPerMinute);
    const concurrency = validateField("concurrency", partial.emailSending.concurrency);
    const retryLimit = validateField("retryLimit", partial.emailSending.retryLimit);
    if (emailsPerMinute !== undefined) set["emailSending.emailsPerMinute"] = emailsPerMinute;
    if (concurrency !== undefined) set["emailSending.concurrency"] = concurrency;
    if (retryLimit !== undefined) set["emailSending.retryLimit"] = retryLimit;
  }

  await collection().updateOne({ id: SETTINGS_ID }, { $set: set, $setOnInsert: { id: SETTINGS_ID } }, { upsert: true });
  return getSettings();
}

// Wipe any stored overrides, same shape as clearProviderCredentials() in ai/config.js —
// falls straight back to DEFAULTS via normalize()'s fail-open behavior.
async function resetSettings() {
  await collection().deleteOne({ id: SETTINGS_ID });
  return getSettings();
}

module.exports = { getSettings, updateSettings, resetSettings, DEFAULTS, LIMITS };
