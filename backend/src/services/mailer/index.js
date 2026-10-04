const { getActiveProviderId, resolveProviderCredentials, PROVIDER_CLASSES } = require("./config");
const { getProviderDef } = require("./registry");
const { getSettings } = require("../adminSettings");
const { waitForSendSlot } = require("../../utils/rateLimiter");

async function getProvider() {
  const providerId = await getActiveProviderId();
  const ProviderClass = PROVIDER_CLASSES[providerId];
  const def = getProviderDef(providerId);
  if (!ProviderClass || !def) {
    throw new Error(`Unknown MAIL_PROVIDER "${providerId}". Use "zoho" or "gmail".`);
  }

  const values = await resolveProviderCredentials(providerId);
  const missing = def.fields.filter((f) => f.required !== false && !values[f.key]);
  if (missing.length > 0) {
    throw new Error(
      `${def.label} is missing ${missing.map((f) => f.label).join(", ")} — add them in Mail Providers settings, or set them in the environment`
    );
  }

  return new ProviderClass(values);
}

const DEFAULT_RETRY_DELAY_MS = 3000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Rate limit and retry count are admin-configurable (Admin Panel); defaults (0/0,
// i.e. unlimited rate + no retry) match the app's original behavior, which had neither.
async function sendEmail(input) {
  const provider = await getProvider();
  const settings = await getSettings();
  const { emailsPerMinute, retryLimit } = settings.emailSending;

  for (let attempt = 0; ; attempt++) {
    await waitForSendSlot(emailsPerMinute);
    try {
      await provider.sendEmail(input);
      return;
    } catch (err) {
      if (attempt === retryLimit) throw err;
      await sleep(DEFAULT_RETRY_DELAY_MS * (attempt + 1));
    }
  }
}

module.exports = { sendEmail };
