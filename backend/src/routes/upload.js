const { Router } = require("express");
const { nanoid } = require("nanoid");
const { upload } = require("../middleware/upload");
const { parseSpreadsheet, guessEmailColumn } = require("../services/parser");
const { getDb } = require("../db");
const { asyncHandler } = require("../utils/asyncHandler");

const uploadRouter = Router();

uploadRouter.post(
  "/",
  upload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    let parsed;
    try {
      parsed = await parseSpreadsheet(req.file.buffer, req.file.originalname);
    } catch (err) {
      return res.status(400).json({ error: `Could not parse file: ${err.message}` });
    }

    if (parsed.rows.length === 0) {
      return res.status(400).json({ error: "File contains no data rows" });
    }

    const db = getDb();
    const batchId = nanoid();
    const now = new Date().toISOString();
    const emailCol = guessEmailColumn(parsed.columns);

    await db.collection("batches").insertOne({
      id: batchId,
      filename: req.file.originalname,
      columns: parsed.columns,
      rowCount: parsed.rows.length,
      createdAt: now,
    });

    const records = parsed.rows.map((row) => ({
      id: nanoid(),
      batchId,
      data: row,
      recipientEmail: emailCol ? row[emailCol] ?? "" : "",
      subject: null,
      body: null,
      status: "draft",
      error: null,
      editedManually: false,
      regenerateCount: 0,
      templateSnapshot: null,
      createdAt: now,
      updatedAt: now,
    }));
    await db.collection("records").insertMany(records);

    res.json({
      batchId,
      filename: req.file.originalname,
      columns: parsed.columns,
      rowCount: parsed.rows.length,
      guessedEmailColumn: emailCol,
      preview: parsed.rows.slice(0, 10),
    });
  })
);

module.exports = { uploadRouter };
