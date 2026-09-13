export default function GenerateStep({ records, targetIds, onContinue }) {
  const targetSet = new Set(targetIds);
  const targeted = records.filter((r) => targetSet.has(r.id));
  const total = targeted.length || 1;
  const pending = targeted.filter((r) => r.status === "draft" || r.status === "generating").length;
  const done = targeted.length - pending;
  const failed = targeted.filter((r) => r.status === "failed").length;
  const succeeded = targeted.filter((r) => r.status === "ai_generated").length;
  const pct = Math.round((done / total) * 100);
  const complete = pending === 0;

  return (
    <div className="card">
      <h2>5. Generating personalized emails</h2>
      <p className="card-desc">
        AI is writing a unique email for each selected record ({targeted.length} total). Larger batches, or
        hitting the AI provider's rate limit, can take a few minutes — it keeps retrying automatically in the
        background, this isn't frozen.
      </p>

      <div className="progress-bar">
        <div className={`progress-bar-fill${complete ? "" : " active"}`} style={{ width: `${pct}%` }} />
      </div>

      <div className="text-sm muted mt-8" style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {!complete && <span className="spinner" />}
        <span>
          {done} / {targeted.length} processed — {succeeded} generated, {failed} failed
        </span>
      </div>

      <div className="status-chip-row">
        <span className="status-chip">Pending: <strong>{pending}</strong></span>
        <span className="status-chip">Generated: <strong>{succeeded}</strong></span>
        <span className="status-chip">Failed: <strong>{failed}</strong></span>
      </div>

      <div className="btn-row mt-16">
        <button className="btn btn-primary" onClick={onContinue} disabled={!complete}>
          {complete ? "Continue to Review →" : "Generating…"}
        </button>
      </div>
    </div>
  );
}
