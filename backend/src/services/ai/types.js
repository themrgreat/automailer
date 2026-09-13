function buildPrompt(input) {
  const fields = Object.entries(input.recordData)
    .map(([k, v]) => `- ${k}: ${v || "(not provided)"}`)
    .join("\n");

  const system =
    "You are an expert email copywriter. You write short, personalized, human-sounding outreach emails. " +
    "You always respond with strict JSON of the shape {\"subject\": string, \"body\": string} and nothing else. " +
    "Do not wrap the JSON in markdown code fences.";

  let user = `Write a personalized email for the recipient described below.\n\n`;
  user += `Recipient / record data (dynamic fields imported from a spreadsheet):\n${fields}\n\n`;
  user += `Template name: ${input.templateName ?? "Custom"}\n`;
  user += `Reference subject line template (you may adapt it, replacing any {{Field}} placeholders with the real values above): ${input.subjectTemplate}\n`;
  user += `Reference body template (use it as inspiration/structure, replacing any {{Field}} placeholders with the real values above, and personalize freely):\n${input.bodyTemplate}\n\n`;
  if (input.tone) user += `Desired tone: ${input.tone}\n`;
  if (input.purpose) user += `Purpose of the email: ${input.purpose}\n`;
  if (input.instructions) user += `Additional instructions for the AI: ${input.instructions}\n`;

  if (input.additionalInstruction) {
    user += `\nThis is a REGENERATION request. Here is the previously generated email:\n`;
    user += `Subject: ${input.previousSubject ?? ""}\nBody: ${input.previousBody ?? ""}\n\n`;
    user += `Apply this additional instruction from the user and produce an improved version: ${input.additionalInstruction}\n`;
  }

  user += `\nRespond ONLY with JSON: {"subject": "...", "body": "..."}`;

  return { system, user };
}

function parseModelJson(text) {
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }
  try {
    const parsed = JSON.parse(cleaned);
    return { subject: String(parsed.subject ?? ""), body: String(parsed.body ?? "") };
  } catch {
    return { subject: "", body: text.trim() };
  }
}

// Builds an Error carrying the HTTP status and, when the provider tells us how long to
// wait (e.g. Gemini's RetryInfo.retryDelay), how many ms to back off before retrying.
function httpError(providerName, status, text, statusText) {
  const err = new Error(`${providerName} API error (${status}): ${text || statusText}`);
  err.status = status;
  err.retryAfterMs = parseRetryDelayMs(text);
  return err;
}

function parseRetryDelayMs(text) {
  try {
    const parsed = JSON.parse(text);
    const retryInfo = parsed?.error?.details?.find((d) => d["@type"]?.includes("RetryInfo"));
    const match = /^([\d.]+)s$/.exec(retryInfo?.retryDelay ?? "");
    return match ? Math.ceil(parseFloat(match[1]) * 1000) : null;
  } catch {
    return null;
  }
}

module.exports = { buildPrompt, parseModelJson, httpError };
