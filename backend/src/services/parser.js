const ExcelJS = require("exceljs");
const { parse: parseCsv } = require("csv-parse/sync");

/**
 * Dynamically detects columns from any Excel/CSV file — no fixed schema.
 * Whatever headers are present in the first row become the available fields.
 */
async function parseSpreadsheet(buffer, filename) {
  const ext = filename.split(".").pop()?.toLowerCase();
  return ext === "csv" ? parseCsvBuffer(buffer) : parseExcelBuffer(buffer);
}

function parseCsvBuffer(buffer) {
  const records = parseCsv(buffer, {
    columns: (headerRow) => dedupeHeaders(headerRow.map((h) => h.trim())),
    skip_empty_lines: true,
    trim: true,
    bom: true,
  });

  const columnSet = new Set();
  for (const row of records) for (const key of Object.keys(row)) columnSet.add(key);
  const columns = Array.from(columnSet);

  const rows = records.map((row) => {
    const clean = {};
    for (const col of columns) clean[col] = (row[col] ?? "").toString().trim();
    return clean;
  });

  return { columns, rows };
}

// Duplicate header names (e.g. two "Email" columns) would otherwise silently
// overwrite each other when read into a plain object — disambiguate them.
function dedupeHeaders(headers) {
  const seen = new Map();
  return headers.map((h) => {
    const count = seen.get(h) ?? 0;
    seen.set(h, count + 1);
    return count === 0 ? h : `${h} (${count + 1})`;
  });
}

async function parseExcelBuffer(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) return { columns: [], rows: [] };

  const rawHeaders = [];
  worksheet.getRow(1).eachCell({ includeEmpty: false }, (cell, colNumber) => {
    rawHeaders[colNumber] = String(cell.value ?? "").trim();
  });

  const seen = new Map();
  const headers = rawHeaders.map((h) => {
    if (!h) return h;
    const count = seen.get(h) ?? 0;
    seen.set(h, count + 1);
    return count === 0 ? h : `${h} (${count + 1})`;
  });

  const columnSet = new Set();
  for (const h of headers) if (h) columnSet.add(h);
  const columns = Array.from(columnSet);

  const rows = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const clean = {};
    let hasValue = false;
    for (let colNumber = 1; colNumber < headers.length; colNumber++) {
      const header = headers[colNumber];
      if (!header) continue;
      let value = row.getCell(colNumber).value;
      if (value && typeof value === "object" && "text" in value) value = value.text;
      if (value && typeof value === "object" && "result" in value) value = value.result;
      const str = value === null || value === undefined ? "" : String(value).trim();
      if (str) hasValue = true;
      clean[header] = str;
    }
    if (hasValue) rows.push(clean);
  });

  return { columns, rows };
}

function guessEmailColumn(columns) {
  const exact = columns.find((c) => c.toLowerCase() === "email");
  if (exact) return exact;
  const partial = columns.find((c) => c.toLowerCase().includes("email"));
  return partial ?? null;
}

module.exports = { parseSpreadsheet, guessEmailColumn };
