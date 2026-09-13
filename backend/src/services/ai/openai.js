const { buildPrompt, parseModelJson, httpError } = require("./types");

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

class OpenAIProvider {
  constructor(apiKey, model) {
    this.apiKey = apiKey;
    this.model = model;
  }

  // Cheap connectivity/key check — lists models instead of generating content.
  static async testConnection(apiKey) {
    const res = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw httpError("OpenAI", res.status, text, res.statusText);
    }
  }

  async generateEmail(input) {
    const { system, user } = buildPrompt(input);

    const res = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw httpError("OpenAI", res.status, text, res.statusText);
    }

    const json = await res.json();
    const content = json.choices?.[0]?.message?.content ?? "";
    return parseModelJson(content);
  }
}

module.exports = { OpenAIProvider };
