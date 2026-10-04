require("dotenv/config");
const express = require("express");
const cors = require("cors");
const { uploadRouter } = require("./routes/upload");
const { batchesRouter } = require("./routes/batches");
const { templatesRouter } = require("./routes/templates");
const { generateRouter } = require("./routes/generate");
const { recordsRouter } = require("./routes/records");
const { sendRouter } = require("./routes/send");
const { aiProvidersRouter } = require("./routes/aiProviders");
const { mailProvidersRouter } = require("./routes/mailProviders");
const { adminSettingsRouter } = require("./routes/adminSettings");
const { connectDB } = require("./db");

async function main() {
  await connectDB();

  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "5mb" }));

  app.get("/api/health", (_req, res) => res.json({ ok: true }));

  app.use("/api/upload", uploadRouter);
  app.use("/api/batches", batchesRouter);
  app.use("/api/templates", templatesRouter);
  app.use("/api/generate", generateRouter);
  app.use("/api/records", recordsRouter);
  app.use("/api/send", sendRouter);
  app.use("/api/ai-providers", aiProvidersRouter);
  app.use("/api/mail-providers", mailProvidersRouter);
  app.use("/api/admin-settings", adminSettingsRouter);

  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(err.status || 500).json({ error: err.message || "Internal server error" });
  });

  const PORT = Number(process.env.PORT) || 4000;
  app.listen(PORT, () => {
    console.log(`Backend listening on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
