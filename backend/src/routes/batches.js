const { Router } = require("express");
const { getDb } = require("../db");
const { asyncHandler } = require("../utils/asyncHandler");

const batchesRouter = Router();

batchesRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const db = getDb();
    const batches = await db.collection("batches").find().sort({ createdAt: -1 }).toArray();
    res.json(batches);
  })
);

batchesRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const db = getDb();
    const batch = await db.collection("batches").findOne({ id: req.params.id });
    if (!batch) return res.status(404).json({ error: "Batch not found" });
    const records = await db.collection("records").find({ batchId: req.params.id }).sort({ createdAt: 1 }).toArray();
    res.json({ batch, records });
  })
);

// Set/change which column is used as the recipient email address for a batch
batchesRouter.post(
  "/:id/email-column",
  asyncHandler(async (req, res) => {
    const db = getDb();
    const { column } = req.body;
    const batch = await db.collection("batches").findOne({ id: req.params.id });
    if (!batch) return res.status(404).json({ error: "Batch not found" });
    if (!batch.columns.includes(column)) return res.status(400).json({ error: "Unknown column" });

    const records = await db.collection("records").find({ batchId: req.params.id }).toArray();
    const now = new Date().toISOString();
    await Promise.all(
      records.map((r) =>
        db
          .collection("records")
          .updateOne({ id: r.id }, { $set: { recipientEmail: r.data[column] ?? "", updatedAt: now } })
      )
    );
    res.json({ ok: true });
  })
);

batchesRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const db = getDb();
    const records = await db.collection("records").find({ batchId: req.params.id }).project({ id: 1 }).toArray();
    const recordIds = records.map((r) => r.id);
    await db.collection("history").deleteMany({ recordId: { $in: recordIds } });
    await db.collection("records").deleteMany({ batchId: req.params.id });
    await db.collection("batches").deleteOne({ id: req.params.id });
    res.json({ ok: true });
  })
);

module.exports = { batchesRouter };
