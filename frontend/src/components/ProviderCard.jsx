import { useState } from "react";
import { CheckCircle2, XCircle, ExternalLink, Star, Trash2, Loader2 } from "lucide-react";
import { apiErrorMessage } from "../api";
import { useToast } from "./Toast";

function StatusPill({ provider }) {
  if (provider.isDefault) return <span className="status-pill status-pill-default">Default</span>;
  if (!provider.enabled) return <span className="status-pill status-pill-off">Disabled</span>;
  if (provider.hasCredentials) return <span className="status-pill status-pill-on">Configured</span>;
  return <span className="status-pill status-pill-none">Not configured</span>;
}

// Generic provider settings card — used for both AI Providers and Mail Providers.
// `actions` supplies the API calls to run (save/clearCredentials/setDefault/test), so this
// component has no knowledge of which REST endpoints back it. The optional model
// picker only renders when the provider view includes `models` (AI providers do; mail
// providers don't).
export default function ProviderCard({ provider, actions, onChanged }) {
  const [fieldInputs, setFieldInputs] = useState(() => Object.fromEntries(provider.fields.map((f) => [f.key, ""])));
  const hasModels = Boolean(provider.models);
  const [model, setModel] = useState(provider.model || "");
  const [customModel, setCustomModel] = useState(hasModels && !provider.models.includes(provider.model));
  const [busy, setBusy] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const showToast = useToast();

  const enteredFields = Object.fromEntries(Object.entries(fieldInputs).filter(([, v]) => v.trim()));
  const hasEnteredInput = Object.keys(enteredFields).length > 0;
  const hasStoredCredentials = provider.fields.some((f) => f.source === "db");
  const dirty = hasEnteredInput || (hasModels && model !== (provider.model || ""));

  function setField(key, value) {
    setFieldInputs((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setBusy("save");
    try {
      const payload = {};
      if (hasEnteredInput) payload.fields = enteredFields;
      if (hasModels && model !== provider.model) payload.model = model;
      await actions.save(provider.id, payload);
      setFieldInputs(Object.fromEntries(provider.fields.map((f) => [f.key, ""])));
      showToast(`${provider.label} settings saved`);
      onChanged();
    } catch (err) {
      showToast(apiErrorMessage(err), "error");
    } finally {
      setBusy(null);
    }
  }

  async function handleToggleEnabled() {
    setBusy("enabled");
    try {
      await actions.save(provider.id, { enabled: !provider.enabled });
      showToast(`${provider.label} ${provider.enabled ? "disabled" : "enabled"}`);
      onChanged();
    } catch (err) {
      showToast(apiErrorMessage(err), "error");
    } finally {
      setBusy(null);
    }
  }

  async function handleSetDefault() {
    setBusy("default");
    try {
      await actions.setDefault(provider.id);
      showToast(`${provider.label} is now the default provider`);
      onChanged();
    } catch (err) {
      showToast(apiErrorMessage(err), "error");
    } finally {
      setBusy(null);
    }
  }

  async function handleClearCredentials() {
    if (!confirm(`Remove the stored credentials for ${provider.label}?`)) return;
    setBusy("clear");
    try {
      await actions.clearCredentials(provider.id);
      showToast(`${provider.label} credentials removed`);
      onChanged();
    } catch (err) {
      showToast(apiErrorMessage(err), "error");
    } finally {
      setBusy(null);
    }
  }

  async function handleTest() {
    setBusy("test");
    setTestResult(null);
    try {
      const result = await actions.test(provider.id, hasEnteredInput ? enteredFields : undefined);
      setTestResult(result);
      if (!result.ok) showToast(result.error || "Connection test failed", "error");
    } catch (err) {
      setTestResult({ ok: false, error: apiErrorMessage(err) });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="provider-card">
      <div className="provider-card-head">
        <div>
          <div className="provider-card-title">{provider.label}</div>
          <a href={provider.docsUrl} target="_blank" rel="noreferrer" className="provider-card-link">
            Get credentials <ExternalLink size={11} />
          </a>
        </div>
        <StatusPill provider={provider} />
      </div>

      {provider.fields.map((field) => (
        <div className="field" key={field.key}>
          <label className="field-label">
            {field.label}
            {field.required === false ? " (optional)" : ""}
          </label>
          <div className="btn-row" style={{ alignItems: "stretch" }}>
            <input
              type={field.type === "password" ? "password" : "text"}
              value={fieldInputs[field.key]}
              onChange={(e) => setField(field.key, e.target.value)}
              placeholder={field.hasValue ? `${field.preview} (saved)` : `Not set — paste your ${field.label} to add one`}
              autoComplete="off"
            />
          </div>
          {field.source === "env" && (
            <div className="text-sm muted mt-8">Currently using the value from your backend .env file.</div>
          )}
        </div>
      ))}

      {hasStoredCredentials && (
        <button className="btn btn-sm btn-danger" onClick={handleClearCredentials} disabled={busy !== null}>
          <Trash2 size={13} /> Remove stored credentials
        </button>
      )}

      {hasModels && (
        <div className="field mt-16">
          <label className="field-label">Model</label>
          {customModel ? (
            <input type="text" value={model} onChange={(e) => setModel(e.target.value)} placeholder="Model id" />
          ) : (
            <select
              value={provider.models.includes(model) ? model : ""}
              onChange={(e) => {
                if (e.target.value === "__custom__") {
                  setCustomModel(true);
                  setModel("");
                } else {
                  setModel(e.target.value);
                }
              }}
            >
              {provider.models.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
              <option value="__custom__">Custom…</option>
            </select>
          )}
        </div>
      )}

      <div className="btn-row provider-card-actions">
        <label className="checkbox-row">
          <input type="checkbox" checked={provider.enabled} onChange={handleToggleEnabled} disabled={busy !== null} />
          Enabled
        </label>
        <button className="btn btn-sm" onClick={handleTest} disabled={busy !== null || (!provider.hasCredentials && !hasEnteredInput)}>
          {busy === "test" ? <Loader2 size={13} className="spin-icon" /> : null} Test connection
        </button>
        <button className="btn btn-sm" onClick={handleSetDefault} disabled={busy !== null || provider.isDefault || !provider.hasCredentials}>
          <Star size={13} /> Set as default
        </button>
        <button className="btn btn-sm btn-primary" onClick={handleSave} disabled={busy !== null || !dirty}>
          {busy === "save" ? "Saving…" : "Save"}
        </button>
      </div>

      {testResult && (
        <div className={`test-result ${testResult.ok ? "test-result-ok" : "test-result-fail"}`}>
          {testResult.ok ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
          {testResult.ok ? "Connection successful" : testResult.error}
        </div>
      )}

      {provider.lastTestedAt && !testResult && (
        <div className="text-sm muted mt-8">
          Last tested {new Date(provider.lastTestedAt).toLocaleString()} —{" "}
          {provider.lastTestOk ? "succeeded" : `failed (${provider.lastTestError})`}
        </div>
      )}
    </div>
  );
}
