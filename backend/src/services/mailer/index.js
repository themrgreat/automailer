const { getActiveProviderId, resolveProviderCredentials, PROVIDER_CLASSES } = require("./config");
const { getProviderDef } = require("./registry");

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

async function sendEmail(input) {
  const provider = await getProvider();
  await provider.sendEmail(input);
}

module.exports = { sendEmail };
