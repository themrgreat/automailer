const { nanoid } = require("nanoid");
const { getDb } = require("../db");

async function addHistory(recordId, type, detail) {
  const db = getDb();
  await db.collection("history").insertOne({
    id: nanoid(),
    recordId,
    type,
    detail: detail ?? null,
    createdAt: new Date().toISOString(),
  });
}

module.exports = { addHistory };
