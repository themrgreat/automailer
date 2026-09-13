const { buildPrompt, parseModelJson, httpError } = require("./types");

class GeminiProvider {
  constructor(apiKey, model) {
    this.apiKey = apiKey;
    this.model = model;
  }

  // Cheap connectivity/key check — lists models instead of generating content.
  static async testConnection(apiKey) {
    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models", {
      headers: { "X-goog-api-key": apiKey },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw httpError("Gemini", res.status, text, res.statusText);
    }
  }

  async generateEmail(input) {
    const { system, user } = buildPrompt(input);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-goog-api-key": this.apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: {
          temperature: 0.7,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw httpError("Gemini", res.status, text, res.statusText);
    }

    const json = await res.json();
    const content = json.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") ?? "";
    return parseModelJson(content);
  }
}

module.exports = { GeminiProvider };
