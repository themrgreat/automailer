const { MongoClient } = require("mongodb");
const { nanoid } = require("nanoid");

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("MONGODB_URI is not set in the environment");

const client = new MongoClient(uri);
let db = null;

async function connectDB() {
  if (db) return db;
  await client.connect();
  db = process.env.MONGODB_DB_NAME ? client.db(process.env.MONGODB_DB_NAME) : client.db();

  await Promise.all([
    db.collection("batches").createIndex({ id: 1 }, { unique: true }),
    db.collection("records").createIndex({ id: 1 }, { unique: true }),
    db.collection("records").createIndex({ batchId: 1 }),
    db.collection("templates").createIndex({ id: 1 }, { unique: true }),
    db.collection("history").createIndex({ recordId: 1 }),
    db.collection("ai_provider_configs").createIndex({ providerId: 1 }, { unique: true }),
    db.collection("mail_provider_configs").createIndex({ providerId: 1 }, { unique: true }),
    db.collection("admin_settings").createIndex({ id: 1 }, { unique: true }),
  ]);

  await seedTemplates();
  return db;
}

function getDb() {
  if (!db) throw new Error("Database not connected yet");
  return db;
}

// Seed a couple of ready-made templates on first run
async function seedTemplates() {
  const templates = db.collection("templates");
  const count = await templates.countDocuments();
  if (count > 0) return;

  const now = new Date().toISOString();
  await templates.insertMany([
    {
      id: nanoid(),
      name: "Business Introduction",
      subject: "A potential opportunity for {{Company Name}}",
      body:
        "Hello {{Contact Name}},\n\nI came across {{Company Name}} and noticed that you operate in the {{Industry}} industry. " +
        "I wanted to reach out and share how our services could help {{Company Name}} grow.\n\n" +
        "Would you be open to a short conversation this week?\n\nBest regards",
      tone: "professional but friendly",
      purpose: "Introduce our services and start a conversation",
      instructions:
        "Mention the company name, briefly analyze what the company likely does based on its website/industry, and explain how our service could be useful to them. Keep it concise.",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: nanoid(),
      name: "Cold Sales Outreach",
      subject: "Quick idea for {{Company Name}}",
      body:
        "Hi {{Contact Name}},\n\nWe help companies like {{Company Name}} in {{Country}} improve their results. " +
        "I'd love to share a quick idea tailored to your business.\n\nOpen to a 15-minute call?\n\nThanks",
      tone: "concise and persuasive",
      purpose: "Generate interest for a sales call",
      instructions: "Keep it under 120 words, avoid sounding like a generic sales pitch, focus on the recipient's business context.",
      createdAt: now,
      updatedAt: now,
    },
  ]);
}

module.exports = { connectDB, getDb };
