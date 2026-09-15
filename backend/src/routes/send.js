const { Router } = require("express");
const { getDb } = require("../db");
const { sendEmail } = require("../services/mailer");
const { addHistory } = require("../services/history");
const { runWithConcurrency } = require("../utils/concurrency");
const { asyncHandler } = require("../utils/asyncHandler");

const sendRouter = Router();

const CONCURRENCY = 2;

async function sendForRecord(recordId) {
  const db = getDb();

  try {
    const record = await db.collection("records").findOne({ id: recordId });
    if (!record) return;

    if (!record.recipientEmail) {
      await db.collection("records").updateOne(
        { id: recordId },
        { $set: { status: "failed", error: "No recipient email address", updatedAt: new Date().toISOString() } }
      );
      await addHistory(recordId, "send_failed", "No recipient email address");
      return;
    }
    if (!record.subject || !record.body) {
      await db.collection("records").updateOne(
        { id: recordId },
        { $set: { status: "failed", error: "Email has no generated content", updatedAt: new Date().toISOString() } }
      );
      await addHistory(recordId, "send_failed", "Email has no generated content");
      return;
    }

    await db.collection("records").updateOne(
      { id: recordId },
      { $set: { status: "sending", error: null, updatedAt: new Date().toISOString() } }
    );

    await sendEmail({ to: record.recipientEmail, subject: record.subject, body: record.body });
    await db.collection("records").updateOne(
      { id: recordId },
      { $set: { status: "sent", error: null, updatedAt: new Date().toISOString() } }
    );
    await addHistory(recordId, "send", `Sent to ${record.recipientEmail}`);
  } catch (err) {
    await db.collection("records").updateOne(
      { id: recordId },
      { $set: { status: "failed", error: err.message || "Sending failed", updatedAt: new Date().toISOString() } }
    );
    await addHistory(recordId, "send_failed", err.message || "Sending failed");
  }
}

// Send one, selected, or all. Body: { batchId, recordIds: string[] | "all" }
sendRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const db = getDb();
    const { batchId, recordIds } = req.body;

    let targetIds;
    if (recordIds === "all") {
      if (typeof batchId !== "string" || !batchId) {
        return res.status(400).json({ error: "batchId is required when recordIds is 'all'" });
      }
      const rows = await db.collection("records").find({ batchId }).project({ id: 1 }).toArray();
      targetIds = rows.map((r) => r.id);
    } else if (Array.isArray(recordIds) && recordIds.length > 0 && recordIds.every((id) => typeof id === "string")) {
      targetIds = recordIds;
    } else {
      return res.status(400).json({ error: "recordIds must be 'all' or a non-empty array" });
    }

    res.json({ started: true, count: targetIds.length });

    runWithConcurrency(targetIds, CONCURRENCY, sendForRecord).catch((err) => {
      console.error("Bulk send error:", err);
    });
  })
);

// Send a single record synchronously (so the UI can show an immediate result)
sendRouter.post(
  "/:id",
  asyncHandler(async (req, res) => {
    const db = getDb();
    await sendForRecord(req.params.id);
    const row = await db.collection("records").findOne({ id: req.params.id });
    if (!row) return res.status(404).json({ error: "Record not found" });
    res.json({ status: row.status, error: row.error });
  })
);

module.exports = { sendRouter };
