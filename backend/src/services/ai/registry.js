// Single source of truth for which AI providers exist, what credential fields each one
// needs, and suggested models. Add a new provider by adding one entry here + one provider
// class — the AI Providers UI renders whatever `fields` a provider declares (a simple
// API-key provider needs just one field; a hypothetical OAuth-style provider could declare
// clientId/clientSecret fields here with no UI changes required).
const PROVIDERS = [
  {
    id: "gemini",
    label: "Google Gemini",
    fields: [{ key: "apiKey", label: "API Key", type: "password", envVar: "GEMINI_API_KEY" }],
    envModelVar: "GEMINI_MODEL",
    defaultModel: "gemini-flash-latest",
    models: ["gemini-flash-latest", "gemini-pro-latest"],
    docsUrl: "https://aistudio.google.com/apikey",
  },
  {
    id: "grok",
    label: "xAI Grok",
    fields: [{ key: "apiKey", label: "API Key", type: "password", envVar: "GROK_API_KEY" }],
    envModelVar: "GROK_MODEL",
    defaultModel: "grok-2-latest",
    models: ["grok-2-latest"],
    docsUrl: "https://console.x.ai",
  },
  {
    id: "openai",
    label: "OpenAI",
    fields: [{ key: "apiKey", label: "API Key", type: "password", envVar: "OPENAI_API_KEY" }],
    envModelVar: "OPENAI_MODEL",
    defaultModel: "gpt-4o-mini",
    models: ["gpt-4o-mini", "gpt-4o"],
    docsUrl: "https://platform.openai.com/api-keys",
  },
  {
    id: "claude",
    label: "Anthropic Claude",
    fields: [{ key: "apiKey", label: "API Key", type: "password", envVar: "CLAUDE_API_KEY" }],
    envModelVar: "CLAUDE_MODEL",
    defaultModel: "claude-sonnet-5",
    models: ["claude-sonnet-5"],
    docsUrl: "https://console.anthropic.com/settings/keys",
  },
];

function getProviderDef(id) {
  return PROVIDERS.find((p) => p.id === id) || null;
}

module.exports = { PROVIDERS, getProviderDef };
