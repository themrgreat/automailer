const { getActiveProviderId, resolveProviderCredentials, PROVIDER_CLASSES } = require("./config");
const { getSettings } = require("../adminSettings");

// Undocumented but previously-supported alternate names for AI_PROVIDER.
const PROVIDER_ALIASES = { chatgpt: "openai", anthropic: "claude" };

async function getProvider() {
  const rawId = await getActiveProviderId();
  const providerId = PROVIDER_ALIASES[rawId] || rawId;

  const ProviderClass = PROVIDER_CLASSES[providerId];
  if (!ProviderClass) {
    throw new Error(`Unknown AI provider "${providerId}". Use "grok", "gemini", "openai", or "claude".`);
  }

  const { apiKey, model } = await resolveProviderCredentials(providerId);
  if (!apiKey) {
    throw new Error(
      `No API key configured for "${providerId}" — add one in AI Providers settings, or set it in the environment`
    );
  }

  return new ProviderClass(apiKey, model);
}

const RETRYABLE_STATUSES = new Set([429, 503]);
const DEFAULT_RETRY_DELAY_MS = 5000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Rate limits (429) and "model overloaded" (503) are transient — retry with backoff
// before giving up, using the provider's suggested delay when it gives us one. The
// retry count is admin-configurable (Admin Panel); defaults match the app's original
// hardcoded MAX_RETRIES = 2.
async function generateEmail(input) {
  const provider = await getProvider();
  const settings = await getSettings();
  const maxRetries = settings.aiGeneration.retryLimit;

  for (let attempt = 0; ; attempt++) {
    try {
      const result = await provider.generateEmail(input);
      if (!result.subject && !result.body) {
        throw new Error("AI provider returned an empty response");
      }
      return result;
    } catch (err) {
      if (!RETRYABLE_STATUSES.has(err.status) || attempt === maxRetries) throw err;
      await sleep(err.retryAfterMs ?? DEFAULT_RETRY_DELAY_MS * (attempt + 1));
    }
  }
}

module.exports = { generateEmail };
