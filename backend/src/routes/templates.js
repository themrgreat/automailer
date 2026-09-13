const { Router } = require("express");
const { nanoid } = require("nanoid");
const { getDb } = require("../db");
const { asyncHandler } = require("../utils/asyncHandler");

const templatesRouter = Router();

templatesRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const db = getDb();
    const templates = await db.collection("templates").find().sort({ createdAt: -1 }).toArray();
    res.json(templates);
  })
);

templatesRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const db = getDb();
    const { name, subject, body, tone, purpose, instructions } = req.body;
    if (!name || !subject || !body) {
      return res.status(400).json({ error: "name, subject, and body are required" });
    }
    const now = new Date().toISOString();
    const template = {
      id: nanoid(),
      name,
      subject,
      body,
      tone: tone ?? null,
      purpose: purpose ?? null,
      instructions: instructions ?? null,
      createdAt: now,
      updatedAt: now,
    };
    await db.collection("templates").insertOne(template);
    res.json(template);
  })
);

templatesRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const db = getDb();
    const existing = await db.collection("templates").findOne({ id: req.params.id });
    if (!existing) return res.status(404).json({ error: "Template not found" });
    const { name, subject, body, tone, purpose, instructions } = req.body;
    await db.collection("templates").updateOne(
      { id: req.params.id },
      {
        $set: {
          name: name ?? existing.name,
          subject: subject ?? existing.subject,
          body: body ?? existing.body,
          tone: tone ?? existing.tone,
          purpose: purpose ?? existing.purpose,
          instructions: instructions ?? existing.instructions,
          updatedAt: new Date().toISOString(),
        },
      }
    );
    res.json(await db.collection("templates").findOne({ id: req.params.id }));
  })
);

templatesRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const db = getDb();
    await db.collection("templates").deleteOne({ id: req.params.id });
    res.json({ ok: true });
  })
);

module.exports = { templatesRouter };
