import { useRef, useState } from "react";
import { startGeneration, apiErrorMessage } from "../api";

export default function TemplateStep({ batchId, filename, columns, records, templates, onStarted }) {
  const [mode, setMode] = useState(templates.length > 0 ? "existing" : "custom");
  const [selectedTemplateId, setSelectedTemplateId] = useState(templates[0]?.id ?? "");

  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [tone, setTone] = useState("professional but friendly");
  const [purpose, setPurpose] = useState("");
  const [instructions, setInstructions] = useState("");

  const subjectRef = useRef(null);
  const bodyRef = useRef(null);
  const recipientSearchRef = useRef(null);

  const [selMode, setSelMode] = useState("all");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [oneId, setOneId] = useState(records[0]?.id ?? "");
  const [recipientSearch, setRecipientSearch] = useState("");

  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  function insertVar(target, col) {
    const token = `{{${col}}}`;
    if (target === "subject") {
      const el = subjectRef.current;
      const start = el?.selectionStart ?? subject.length;
      const end = el?.selectionEnd ?? subject.length;
      const next = subject.slice(0, start) + token + subject.slice(end);
      setSubject(next);
      requestAnimationFrame(() => el?.setSelectionRange(start + token.length, start + token.length));
    } else {
      const el = bodyRef.current;
      const start = el?.selectionStart ?? body.length;
      const end = el?.selectionEnd ?? body.length;
      const next = body.slice(0, start) + token + body.slice(end);
      setBody(next);
      requestAnimationFrame(() => el?.setSelectionRange(start + token.length, start + token.length));
    }
  }

  function matchesSearch(r) {
    const q = recipientSearch.trim().toLowerCase();
    if (!q) return true;
    if (r.recipientEmail?.toLowerCase().includes(q)) return true;
    return Object.values(r.data).some((v) => String(v ?? "").toLowerCase().includes(q));
  }

  const filteredRecords = records.filter(matchesSearch);

  function toggleSelected(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleGenerate() {
    setError(null);

    let resolvedIds;
    if (selMode === "all") resolvedIds = records.map((r) => r.id);
    else if (selMode === "one") {
      if (!oneId) return setError("Select a record");
      resolvedIds = [oneId];
    } else {
      if (selectedIds.size === 0) return setError("Select at least one record");
      resolvedIds = Array.from(selectedIds);
    }
    const recordIds = selMode === "all" ? "all" : resolvedIds;

    const payload = { batchId, recordIds };

    if (mode === "existing") {
      if (!selectedTemplateId) return setError("Select a template");
      payload.templateId = selectedTemplateId;
    } else {
      if (!subject.trim() || !body.trim()) return setError("Subject and body are required");
      payload.customTemplate = { name: name || "Custom", subject, body, tone, purpose, instructions };
    }

    setBusy(true);
    try {
      await startGeneration(payload);
      onStarted(resolvedIds);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  return (
    <div>
      <div className="card">
        <h2>3. Choose or create a template</h2>
        <p className="card-desc">
          Use an existing template, or write a custom prompt. Insert dynamic fields from your imported
          columns — they'll be replaced per-record when AI generates each email.
        </p>

        <div className="tabs">
          <button className={`tab-btn${mode === "existing" ? " active" : ""}`} onClick={() => setMode("existing")}>
            Use Existing Template
          </button>
          <button className={`tab-btn${mode === "custom" ? " active" : ""}`} onClick={() => setMode("custom")}>
            Create New Template
          </button>
        </div>

        {mode === "existing" ? (
          <div>
            {templates.length === 0 ? (
              <p className="muted text-sm">No templates yet — create one instead.</p>
            ) : (
              <>
                <div className="field" style={{ maxWidth: 360 }}>
                  <label className="field-label">Template</label>
                  <select value={selectedTemplateId} onChange={(e) => setSelectedTemplateId(e.target.value)}>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                {selectedTemplate && (
                  <div className="email-body-preview">
                    <strong>Subject:</strong> {selectedTemplate.subject}
                    {"\n\n"}
                    {selectedTemplate.body}
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div>
            <div className="field">
              <label className="field-label">Template name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Partnership Outreach" />
            </div>

            <div className="field">
              <label className="field-label">Subject</label>
              <input ref={subjectRef} type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. A quick idea for {{Company Name}}" />
              <div className="btn-row mt-8">
                {columns.map((c) => (
                  <button key={c} className="tag-btn" type="button" onClick={() => insertVar("subject", c)}>
                    {`{{${c}}}`}
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <label className="field-label">Email body / instructions for AI</label>
              <textarea
                ref={bodyRef}
                rows={6}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Create a professional but friendly sales email. Mention the company name, analyze the company's website, and explain how our service could be useful to them."
              />
              <div className="btn-row mt-8">
                {columns.map((c) => (
                  <button key={c} className="tag-btn" type="button" onClick={() => insertVar("body", c)}>
                    {`{{${c}}}`}
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <label className="field-label">Tone</label>
              <input type="text" value={tone} onChange={(e) => setTone(e.target.value)} placeholder="e.g. professional but friendly" />
            </div>
            <div className="field">
              <label className="field-label">Purpose</label>
              <input type="text" value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="e.g. Introduce our services and book a call" />
            </div>
            <div className="field">
              <label className="field-label">Additional instructions / personalization requirements</label>
              <textarea rows={3} value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Any extra guidance for the AI..." />
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <h2>4. Select recipients</h2>
        <div className="btn-row mt-8" style={{ marginBottom: 14 }}>
          <label className="checkbox-row">
            <input type="radio" checked={selMode === "one"} onChange={() => setSelMode("one")} /> One
          </label>
          <label className="checkbox-row">
            <input type="radio" checked={selMode === "selected"} onChange={() => setSelMode("selected")} /> Selected
          </label>
          <label className="checkbox-row">
            <input type="radio" checked={selMode === "all"} onChange={() => setSelMode("all")} /> All ({records.length})
          </label>
        </div>

        {selMode === "all" && (
          <div className="mt-8">
            <p className="text-sm muted" style={{ marginBottom: 8 }}>
              All {records.length} records from <strong>{filename}</strong> will be used:
            </p>
            <div className="table-scroll" style={{ maxHeight: 260, overflowY: "auto" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Recipient</th>
                    {columns.slice(0, 3).map((c) => (
                      <th key={c}>{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r.id}>
                      <td>{r.recipientEmail || <span className="muted">—</span>}</td>
                      {columns.slice(0, 3).map((c) => (
                        <td key={c}>{r.data[c]}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {selMode === "one" && (
          <select value={oneId} onChange={(e) => setOneId(e.target.value)} style={{ maxWidth: 360 }}>
            {records.map((r) => (
              <option key={r.id} value={r.id}>
                {r.recipientEmail || "(no email)"} — {Object.values(r.data)[0]}
              </option>
            ))}
          </select>
        )}

        {selMode === "selected" && (
          <>
            <div className="field search-input-wrap" style={{ maxWidth: 360 }}>
              <input
                ref={recipientSearchRef}
                type="text"
                value={recipientSearch}
                onChange={(e) => setRecipientSearch(e.target.value)}
                placeholder="Search by email or any field…"
              />
            </div>
            <div className="table-scroll" style={{ maxHeight: 260, overflowY: "auto" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th></th>
                    <th>Recipient</th>
                    {columns.slice(0, 3).map((c) => (
                      <th key={c}>{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <input type="checkbox" checked={selectedIds.has(r.id)} onChange={() => toggleSelected(r.id)} />
                      </td>
                      <td>{r.recipientEmail || <span className="muted">—</span>}</td>
                      {columns.slice(0, 3).map((c) => (
                        <td key={c}>{r.data[c]}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredRecords.length === 0 && (
                <p className="muted text-sm" style={{ padding: 10 }}>No records match your search.</p>
              )}
            </div>
          </>
        )}

        {error && <div className="error-banner mt-16">{error}</div>}

        <div className="btn-row mt-16">
          <button className="btn btn-primary" onClick={handleGenerate} disabled={busy}>
            {busy ? "Starting…" : "Generate with AI →"}
          </button>
        </div>
      </div>
    </div>
  );
}
