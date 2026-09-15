const { Router } = require("express");
const { getDb } = require("../db");
const { generateEmail } = require("../services/ai");
const { addHistory } = require("../services/history");
const { asyncHandler } = require("../utils/asyncHandler");

const recordsRouter = Router();

recordsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const db = getDb();
    const record = await db.collection("records").findOne({ id: req.params.id });
    if (!record) return res.status(404).json({ error: "Record not found" });
    res.json(record);
  })
);

recordsRouter.get(
  "/:id/history",
  asyncHandler(async (req, res) => {
    const db = getDb();
    const history = await db.collection("history").find({ recordId: req.params.id }).sort({ createdAt: 1 }).toArray();
    res.json(history);
  })
);

// Manual edit
recordsRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const db = getDb();
    const record = await db.collection("records").findOne({ id: req.params.id });
    if (!record) return res.status(404).json({ error: "Record not found" });

    const { subject, body, recipientEmail } = req.body;
    await db.collection("records").updateOne(
      { id: req.params.id },
      {
        $set: {
          subject: subject ?? record.subject,
          body: body ?? record.body,
          recipientEmail: recipientEmail ?? record.recipientEmail,
          editedManually: true,
          status: "reviewed",
          error: null,
          updatedAt: new Date().toISOString(),
        },
      }
    );

    await addHistory(req.params.id, "manual_edit", "Email manually edited by user");
    res.json(await db.collection("records").findOne({ id: req.params.id }));
  })
);

recordsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const db = getDb();
    await db.collection("history").deleteMany({ recordId: req.params.id });
    await db.collection("records").deleteOne({ id: req.params.id });
    res.json({ ok: true });
  })
);

// Re-prompt / regenerate a single email, optionally with an additional instruction
recordsRouter.post(
  "/:id/regenerate",
  asyncHandler(async (req, res) => {
    const db = getDb();
    const record = await db.collection("records").findOne({ id: req.params.id });
    if (!record) return res.status(404).json({ error: "Record not found" });

    const { additionalInstruction } = req.body;
    const template = record.templateSnapshot;
    if (!template) {
      return res.status(400).json({ error: "This record has no prior generation to base a re-prompt on. Generate it first." });
    }

    try {
      await db.collection("records").updateOne(
        { id: req.params.id },
        { $set: { status: "generating", error: null, updatedAt: new Date().toISOString() } }
      );

      const result = await generateEmail({
        templateName: template.name,
        subjectTemplate: template.subject,
        bodyTemplate: template.body,
        tone: template.tone,
        purpose: template.purpose,
        instructions: template.instructions,
        recordData: record.data,
        additionalInstruction: additionalInstruction || "Improve this email.",
        previousSubject: record.subject,
        previousBody: record.body,
      });

      await db.collection("records").updateOne(
        { id: req.params.id },
        {
          $set: {
            subject: result.subject,
            body: result.body,
            status: "ai_generated",
            error: null,
            editedManually: false,
            updatedAt: new Date().toISOString(),
          },
          $inc: { regenerateCount: 1 },
        }
      );

      await addHistory(req.params.id, "regenerate", additionalInstruction || "Regenerated without additional instruction");
      res.json(await db.collection("records").findOne({ id: req.params.id }));
    } catch (err) {
      await db.collection("records").updateOne(
        { id: req.params.id },
        { $set: { status: "failed", error: err.message || "AI regeneration failed", updatedAt: new Date().toISOString() } }
      );
      await addHistory(req.params.id, "regenerate", `Failed: ${err.message}`);
      res.status(500).json({ error: err.message || "AI regeneration failed" });
    }
  })
);

module.exports = { recordsRouter };
