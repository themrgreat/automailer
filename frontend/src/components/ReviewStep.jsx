import { useState } from "react";
import { sendRecords, apiErrorMessage } from "../api";
import EmailCard from "./EmailCard";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "ai_generated", label: "AI Generated" },
  { id: "reviewed", label: "Reviewed" },
  { id: "sent", label: "Sent" },
  { id: "failed", label: "Failed" },
  { id: "draft", label: "Draft" },
];

export default function ReviewStep({ batchId, records, targetIds, onChanged }) {
  const [filter, setFilter] = useState("all");
  const [checked, setChecked] = useState(new Set());
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const targeted =
    targetIds && targetIds.length > 0
      ? records.filter((r) => targetIds.includes(r.id))
      : records;

  const counts = {
    total: targeted.length,
    generated: targeted.filter((r) => r.subject && r.body).length,
    sent: targeted.filter((r) => r.status === "sent").length,
    failed: targeted.filter((r) => r.status === "failed").length,
    editedManually: targeted.filter((r) => r.editedManually).length,
    regenerated: targeted.filter((r) => r.regenerateCount > 0).length,
  };

  const visible = filter === "all" ? targeted : targeted.filter((r) => r.status === filter);

  function toggle(id) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllVisible() {
    setChecked((prev) => {
      const allSelected = visible.every((r) => prev.has(r.id));
      const next = new Set(prev);
      if (allSelected) visible.forEach((r) => next.delete(r.id));
      else visible.forEach((r) => next.add(r.id));
      return next;
    });
  }

  function isSendable(r) {
    return r.status !== "sent" && r.status !== "sending";
  }

  async function sendSelected() {
    const sendable = targeted.filter((r) => checked.has(r.id) && isSendable(r));
    if (sendable.length === 0) return setError("Select at least one email that hasn't already been sent");
    setBusy(true);
    setError(null);
    try {
      await sendRecords({ recordIds: sendable.map((r) => r.id) });
      setChecked(new Set());
      onChanged();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function sendAll() {
    const sendable = targeted.filter(isSendable);
    if (sendable.length === 0) return setError("Everything in this batch has already been sent");
    if (!confirm(`Send ${sendable.length} email(s) now?`)) return;
    setBusy(true);
    setError(null);
    try {
      await sendRecords({ batchId, recordIds: sendable.map((r) => r.id) });
      setChecked(new Set());
      onChanged();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="card">
        <h2>6. Review, edit & send</h2>
        <p className="card-desc">
          Review every generated email. Edit manually, re-prompt the AI for an individual email, then send
          one, selected, or all.
        </p>

        <div className="summary-row">
          <div className="summary-tile"><div className="num">{counts.total}</div><div className="lbl">Total Records</div></div>
          <div className="summary-tile"><div className="num">{counts.generated}</div><div className="lbl">Generated</div></div>
          <div className="summary-tile"><div className="num" style={{ color: "var(--success)" }}>{counts.sent}</div><div className="lbl">Sent</div></div>
          <div className="summary-tile"><div className="num" style={{ color: counts.failed ? "var(--danger)" : undefined }}>{counts.failed}</div><div className="lbl">Failed</div></div>
          <div className="summary-tile"><div className="num">{counts.editedManually}</div><div className="lbl">Edited Manually</div></div>
          <div className="summary-tile"><div className="num">{counts.regenerated}</div><div className="lbl">Regenerated</div></div>
        </div>

        <div className="tabs">
          {FILTERS.map((f) => (
            <button key={f.id} className={`tab-btn${filter === f.id ? " active" : ""}`} onClick={() => setFilter(f.id)}>
              {f.label}
            </button>
          ))}
        </div>

        {error && <div className="error-banner">{error}</div>}

        <div className="btn-row" style={{ marginBottom: 14 }}>
          <button className="btn btn-sm" onClick={toggleAllVisible}>
            {visible.every((r) => checked.has(r.id)) && visible.length > 0 ? "Unselect all" : "Select all"}
          </button>
          <button className="btn btn-sm btn-primary" onClick={sendSelected} disabled={busy || checked.size === 0}>
            Send Selected ({checked.size})
          </button>
          <button className="btn btn-sm btn-primary" onClick={sendAll} disabled={busy}>
            Send All ({targeted.length})
          </button>
          <button className="btn btn-sm" onClick={onChanged} disabled={busy}>
            Refresh
          </button>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="card muted text-sm">No emails match this filter.</div>
      ) : (
        visible.map((r) => (
          <EmailCard
            key={r.id}
            record={r}
            checked={checked.has(r.id)}
            onToggleCheck={() => toggle(r.id)}
            onChanged={onChanged}
            onDeleted={onChanged}
          />
        ))
      )}
    </div>
  );
}
