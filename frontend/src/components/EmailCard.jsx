import { useState } from "react";
import {
  updateRecord,
  deleteRecord,
  regenerateRecord,
  sendSingleRecord,
  getRecordHistory,
  apiErrorMessage,
} from "../api";
import StatusBadge from "./StatusBadge";

export default function EmailCard({ record, checked, onToggleCheck, onChanged, onDeleted }) {
  const [mode, setMode] = useState("view");
  const [subject, setSubject] = useState(record.subject ?? "");
  const [body, setBody] = useState(record.body ?? "");
  const [recipient, setRecipient] = useState(record.recipientEmail);
  const [instruction, setInstruction] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState(null);

  const title = Object.values(record.data)[0] || record.recipientEmail || "Record";

  async function saveEdit() {
    setBusy(true);
    setError(null);
    try {
      await updateRecord(record.id, { subject, body, recipientEmail: recipient });
      setMode("view");
      onChanged();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function doRegenerate() {
    setBusy(true);
    setError(null);
    try {
      await regenerateRecord(record.id, instruction);
      setMode("view");
      setInstruction("");
      onChanged();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function doSend() {
    setBusy(true);
    setError(null);
    try {
      const result = await sendSingleRecord(record.id);
      if (result.status === "failed") setError(result.error || "Send failed");
      onChanged();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function doDelete() {
    if (!confirm("Delete this record and its generated email?")) return;
    setBusy(true);
    try {
      await deleteRecord(record.id);
      onDeleted();
    } catch (err) {
      setError(apiErrorMessage(err));
      setBusy(false);
    }
  }

  async function openHistory() {
    setMode("history");
    setHistory(null);
    setError(null);
    try {
      const h = await getRecordHistory(record.id);
      setHistory(h);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  const canSend = !!(record.subject && record.body && record.recipientEmail) && record.status !== "sending";

  return (
    <div className="email-card">
      <div className="email-card-head">
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <input type="checkbox" checked={checked} onChange={onToggleCheck} style={{ marginTop: 3 }} />
          <div>
            <div className="email-card-title">{title}</div>
            <div className="email-card-meta">
              To: {record.recipientEmail || "—"}
              {record.editedManually && " · edited manually"}
              {record.regenerateCount > 0 && ` · regenerated ${record.regenerateCount}×`}
            </div>
          </div>
        </div>
        <StatusBadge status={record.status} />
      </div>

      {mode === "view" && (
        <>
          <div style={{ fontWeight: 600, fontSize: 12.5, marginBottom: 4 }}>{record.subject || <span className="muted">No subject yet</span>}</div>
          <div className="email-body-preview">{record.body || <span className="muted">Not generated yet</span>}</div>
          {record.error && <div className="error-banner mt-8">{record.error}</div>}
          <div className="btn-row mt-8">
            <button className="btn btn-sm" onClick={() => setMode("edit")} disabled={busy}>Edit</button>
            <button className="btn btn-sm" onClick={() => setMode("reprompt")} disabled={busy || !record.templateSnapshot}>Re-prompt</button>
            <button className="btn btn-sm btn-primary" onClick={doSend} disabled={busy || !canSend}>Send</button>
            <button className="btn btn-sm" onClick={openHistory} disabled={busy}>History</button>
            <button className="btn btn-sm btn-danger" onClick={doDelete} disabled={busy}>Delete</button>
          </div>
        </>
      )}

      {mode === "edit" && (
        <div>
          <div className="field">
            <label className="field-label">Recipient</label>
            <input type="email" value={recipient} onChange={(e) => setRecipient(e.target.value)} />
          </div>
          <div className="field">
            <label className="field-label">Subject</label>
            <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div className="field">
            <label className="field-label">Body</label>
            <textarea rows={7} value={body} onChange={(e) => setBody(e.target.value)} />
          </div>
          <div className="btn-row">
            <button className="btn btn-sm btn-primary" onClick={saveEdit} disabled={busy}>Save</button>
            <button className="btn btn-sm" onClick={() => setMode("view")} disabled={busy}>Cancel</button>
          </div>
        </div>
      )}

      {mode === "reprompt" && (
        <div>
          <div className="field">
            <label className="field-label">Additional instruction for AI (re-prompt)</label>
            <textarea
              rows={3}
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="e.g. Make this shorter and more persuasive. Don't sound like a sales pitch."
            />
          </div>
          <div className="btn-row">
            <button className="btn btn-sm btn-primary" onClick={doRegenerate} disabled={busy}>
              {busy ? "Regenerating…" : "Regenerate"}
            </button>
            <button className="btn btn-sm" onClick={() => setMode("view")} disabled={busy}>Cancel</button>
          </div>
        </div>
      )}

      {mode === "history" && (
        <div>
          {history === null ? (
            <div className="muted text-sm">Loading…</div>
          ) : history.length === 0 ? (
            <div className="muted text-sm">No history yet.</div>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5 }}>
              {history.map((h) => (
                <li key={h.id} style={{ marginBottom: 4 }}>
                  <strong>{h.type}</strong> — {h.detail} <span className="muted">({new Date(h.createdAt).toLocaleString()})</span>
                </li>
              ))}
            </ul>
          )}
          <div className="btn-row mt-8">
            <button className="btn btn-sm" onClick={() => setMode("view")}>Close</button>
          </div>
        </div>
      )}

      {error && mode !== "view" && <div className="error-banner mt-8">{error}</div>}
    </div>
  );
}
