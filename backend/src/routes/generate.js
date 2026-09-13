const { Router } = require("express");
const { getDb } = require("../db");
const { generateEmail } = require("../services/ai");
const { addHistory } = require("../services/history");
const { runWithConcurrency } = require("../utils/concurrency");
const { asyncHandler } = require("../utils/asyncHandler");

const generateRouter = Router();

const CONCURRENCY = 2;

function fillTemplateVars(text, data) {
  return text.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_match, key) => data[key] ?? "");
}

async function resolveTemplate(body) {
  const db = getDb();
  if (body.templateId) {
    const t = await db.collection("templates").findOne({ id: body.templateId });
    if (!t) throw new Error("Template not found");
    return {
      templateId: t.id,
      name: t.name,
      subject: t.subject,
      body: t.body,
      tone: t.tone,
      purpose: t.purpose,
      instructions: t.instructions,
    };
  }
  if (body.customTemplate) {
    const c = body.customTemplate;
    if (!c.subject || !c.body) throw new Error("customTemplate requires subject and body");
    return {
      templateId: null,
      name: c.name ?? "Custom",
      subject: c.subject,
      body: c.body,
      tone: c.tone ?? null,
      purpose: c.purpose ?? null,
      instructions: c.instructions ?? null,
    };
  }
  throw new Error("Provide either templateId or customTemplate");
}

async function generateForRecord(recordId, template) {
  const db = getDb();
  const record = await db.collection("records").findOne({ id: recordId });
  if (!record) return;
  const data = record.data;

  await db.collection("records").updateOne(
    { id: recordId },
    { $set: { status: "generating", error: null, updatedAt: new Date().toISOString() } }
  );

  try {
    const result = await generateEmail({
      templateName: template.name,
      subjectTemplate: fillTemplateVars(template.subject, data),
      bodyTemplate: fillTemplateVars(template.body, data),
      tone: template.tone,
      purpose: template.purpose,
      instructions: template.instructions,
      recordData: data,
    });

    await db.collection("records").updateOne(
      { id: recordId },
      {
        $set: {
          subject: result.subject,
          body: result.body,
          status: "ai_generated",
          error: null,
          templateSnapshot: template,
          editedManually: false,
          updatedAt: new Date().toISOString(),
        },
      }
    );
    await addHistory(recordId, "generate", `Generated with template "${template.name ?? "Custom"}"`);
  } catch (err) {
    await db.collection("records").updateOne(
      { id: recordId },
      {
        $set: {
          status: "failed",
          error: err.message || "AI generation failed",
          templateSnapshot: template,
          updatedAt: new Date().toISOString(),
        },
      }
    );
    await addHistory(recordId, "generate", `Failed: ${err.message}`);
  }
}

generateRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const db = getDb();
    const { batchId, recordIds } = req.body;
    if (!batchId) return res.status(400).json({ error: "batchId is required" });

    let template;
    try {
      template = await resolveTemplate(req.body);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }

    let targetIds;
    if (recordIds === "all") {
      const rows = await db.collection("records").find({ batchId }).project({ id: 1 }).toArray();
      targetIds = rows.map((r) => r.id);
    } else if (Array.isArray(recordIds) && recordIds.length > 0) {
      targetIds = recordIds;
    } else {
      return res.status(400).json({ error: "recordIds must be 'all' or a non-empty array" });
    }

    res.json({ started: true, count: targetIds.length });

    runWithConcurrency(targetIds, CONCURRENCY, (id) => generateForRecord(id, template)).catch((err) => {
      console.error("Bulk generation error:", err);
    });
  })
);

generateRouter.get(
  "/:batchId/status",
  asyncHandler(async (req, res) => {
    const db = getDb();
    const rows = await db
      .collection("records")
      .aggregate([{ $match: { batchId: req.params.batchId } }, { $group: { _id: "$status", count: { $sum: 1 } } }])
      .toArray();
    const counts = {};
    for (const r of rows) counts[r._id] = r.count;
    res.json({ counts });
  })
);

module.exports = { generateRouter };
