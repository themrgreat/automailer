const { buildPrompt, parseModelJson, httpError } = require("./types");

const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

class ClaudeProvider {
  constructor(apiKey, model) {
    this.apiKey = apiKey;
    this.model = model;
  }

  // Cheap connectivity/key check — lists models instead of generating content.
  static async testConnection(apiKey) {
    const res = await fetch("https://api.anthropic.com/v1/models", {
      headers: { "x-api-key": apiKey, "anthropic-version": ANTHROPIC_VERSION },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw httpError("Claude", res.status, text, res.statusText);
    }
  }

  async generateEmail(input) {
    const { system, user } = buildPrompt(input);

    const res = await fetch(CLAUDE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 1024,
        temperature: 0.7,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw httpError("Claude", res.status, text, res.statusText);
    }

    const json = await res.json();
    const content = json.content?.map((c) => c.text ?? "").join("") ?? "";
    return parseModelJson(content);
  }
}

module.exports = { ClaudeProvider };
