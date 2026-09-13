import { useState } from "react";
import { setEmailColumn, apiErrorMessage } from "../api";

export default function PreviewStep({ batch, records, onContinue, onEmailColumnApplied }) {
  const guessed =
    batch.columns.find((c) => c.toLowerCase() === "email") ||
    batch.columns.find((c) => c.toLowerCase().includes("email")) ||
    batch.columns[0];
  const [emailCol, setEmailCol] = useState(guessed);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState(null);

  const missingEmails = records.filter((r) => !r.recipientEmail).length;

  async function apply() {
    setApplying(true);
    setError(null);
    try {
      await setEmailColumn(batch.id, emailCol);
      await onEmailColumnApplied();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setApplying(false);
    }
  }

  return (
    <div>
      <div className="card">
        <h2>2. Preview imported data</h2>
        <p className="card-desc">
          {batch.filename} — {batch.rowCount} records, {batch.columns.length} columns detected.
        </p>

        <div className="summary-row">
          <div className="summary-tile">
            <div className="num">{batch.rowCount}</div>
            <div className="lbl">Records</div>
          </div>
          <div className="summary-tile">
            <div className="num">{batch.columns.length}</div>
            <div className="lbl">Columns</div>
          </div>
          <div className="summary-tile">
            <div className="num" style={{ color: missingEmails ? "var(--danger)" : "var(--success)" }}>
              {missingEmails}
            </div>
            <div className="lbl">Missing Email</div>
          </div>
        </div>

        <div className="field" style={{ maxWidth: 340 }}>
          <label className="field-label">Which column is the recipient email address?</label>
          <div className="btn-row">
            <select value={emailCol} onChange={(e) => setEmailCol(e.target.value)}>
              {batch.columns.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <button className="btn btn-sm" onClick={apply} disabled={applying}>
              {applying ? "Applying…" : "Apply"}
            </button>
          </div>
          {error && <div className="error-banner mt-8">{error}</div>}
        </div>

        <div className="table-scroll mt-16" style={{ maxHeight: 340, overflowY: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                {batch.columns.map((c) => (
                  <th key={c}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id}>
                  {batch.columns.map((c) => (
                    <td key={c} title={r.data[c]}>
                      {r.data[c] || <span className="muted">—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="text-sm muted mt-8">Showing all {records.length} rows.</div>

        <div className="btn-row mt-16">
          <button className="btn btn-primary" onClick={onContinue} disabled={missingEmails === records.length}>
            Continue to Template →
          </button>
        </div>
      </div>
    </div>
  );
}
