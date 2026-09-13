// Single source of truth for which mail providers exist and what credential fields each one
// needs. Add a new provider by adding one entry here + one provider class — the Mail
// Providers UI renders whatever `fields` a provider declares.
const PROVIDERS = [
  {
    id: "zoho",
    label: "Zoho Mail",
    fields: [
      { key: "host", label: "SMTP Host", type: "text", required: false, envVar: "ZOHO_SMTP_HOST" },
      { key: "port", label: "SMTP Port", type: "text", required: false, envVar: "ZOHO_SMTP_PORT" },
      { key: "user", label: "Email Address", type: "text", envVar: "ZOHO_USER" },
      { key: "appPassword", label: "App Password", type: "password", envVar: "ZOHO_APP_PASSWORD" },
      { key: "fromName", label: "From Name", type: "text", required: false, envVar: "ZOHO_FROM_NAME" },
    ],
    docsUrl: "https://accounts.zoho.com/home#security/app-passwords",
  },
  {
    id: "gmail",
    label: "Gmail",
    fields: [
      { key: "clientId", label: "Client ID", type: "password", envVar: "GMAIL_CLIENT_ID" },
      { key: "clientSecret", label: "Client Secret", type: "password", envVar: "GMAIL_CLIENT_SECRET" },
      { key: "refreshToken", label: "Refresh Token", type: "password", envVar: "GMAIL_REFRESH_TOKEN" },
      { key: "user", label: "Gmail Address", type: "text", envVar: "GMAIL_USER" },
      { key: "fromName", label: "From Name", type: "text", required: false, envVar: "GMAIL_FROM_NAME" },
    ],
    docsUrl: "https://developers.google.com/oauthplayground",
  },
];

function getProviderDef(id) {
  return PROVIDERS.find((p) => p.id === id) || null;
}

module.exports = { PROVIDERS, getProviderDef };
