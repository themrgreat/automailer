import { useCallback, useEffect, useState } from "react";
import { getAdminSettings, updateAdminSettings, resetAdminSettings, apiErrorMessage } from "../api";
import { useToast } from "../components/Toast";

const FIELD_LIMITS = {
  retryLimit: { min: 0, max: 10 },
  concurrency: { min: 1, max: 20 },
  emailsPerMinute: { min: 0, max: 10000 },
};

function NumberField({ label, hint, section, fieldKey, form, setField }) {
  const { min, max } = FIELD_LIMITS[fieldKey];
  return (
    <div className="field">
      <label className="field-label">{label}</label>
      <input
        type="number"
        min={min}
        max={max}
        value={form[section][fieldKey]}
        onChange={(e) => setField(section, fieldKey, e.target.value)}
      />
      <div className="text-sm muted mt-8">{hint}</div>
    </div>
  );
}

export default function AdminSettings() {
  const [settings, setSettings] = useState(null);
  const [form, setForm] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null);
  const showToast = useToast();

  const refresh = useCallback(async () => {
    try {
      const data = await getAdminSettings();
      setSettings(data);
      setForm(data);
      setError(null);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  function setField(section, key, value) {
    setForm((prev) => ({ ...prev, [section]: { ...prev[section], [key]: value } }));
  }

  const dirty = Boolean(settings && form && JSON.stringify(settings) !== JSON.stringify(form));

  async function handleSave() {
    setBusy("save");
    try {
      const payload = {
        aiGeneration: {
          retryLimit: Number(form.aiGeneration.retryLimit),
          concurrency: Number(form.aiGeneration.concurrency),
        },
        emailSending: {
          emailsPerMinute: Number(form.emailSending.emailsPerMinute),
          concurrency: Number(form.emailSending.concurrency),
          retryLimit: Number(form.emailSending.retryLimit),
        },
      };
      const data = await updateAdminSettings(payload);
      setSettings(data);
      setForm(data);
      showToast("Admin settings saved");
    } catch (err) {
      showToast(apiErrorMessage(err), "error");
    } finally {
      setBusy(null);
    }
  }

  async function handleReset() {
    if (!confirm("Reset AI generation and email sending limits back to their defaults?")) return;
    setBusy("reset");
    try {
      const data = await resetAdminSettings();
      setSettings(data);
      setForm(data);
      showToast("Admin settings reset to defaults");
    } catch (err) {
      showToast(apiErrorMessage(err), "error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Admin Panel</h1>
          <p className="page-subtitle">
            Tune AI generation and email sending limits at runtime — no code changes or restarts needed.
          </p>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {!form ? (
        <div className="skeleton-list">
          <div className="skeleton-row" style={{ height: 180 }} />
          <div className="skeleton-row" style={{ height: 220 }} />
        </div>
      ) : (
        <>
          <div className="card" style={{ maxWidth: 460 }}>
            <h2>AI Generation</h2>
            <NumberField
              label="Retry Limit"
              hint={`How many times to retry a rate-limited/overloaded AI call before marking it failed (${FIELD_LIMITS.retryLimit.min}-${FIELD_LIMITS.retryLimit.max}).`}
              section="aiGeneration"
              fieldKey="retryLimit"
              form={form}
              setField={setField}
            />
            <NumberField
              label="Concurrency"
              hint={`How many emails to generate in parallel during bulk generation (${FIELD_LIMITS.concurrency.min}-${FIELD_LIMITS.concurrency.max}).`}
              section="aiGeneration"
              fieldKey="concurrency"
              form={form}
              setField={setField}
            />
          </div>

          <div className="card mt-16" style={{ maxWidth: 460 }}>
            <h2>Email Sending</h2>
            <NumberField
              label="Emails / Minute"
              hint={`Maximum emails sent per rolling 60s window (${FIELD_LIMITS.emailsPerMinute.min} = unlimited, up to ${FIELD_LIMITS.emailsPerMinute.max}).`}
              section="emailSending"
              fieldKey="emailsPerMinute"
              form={form}
              setField={setField}
            />
            <NumberField
              label="Concurrency"
              hint={`How many emails to send in parallel during bulk sending (${FIELD_LIMITS.concurrency.min}-${FIELD_LIMITS.concurrency.max}).`}
              section="emailSending"
              fieldKey="concurrency"
              form={form}
              setField={setField}
            />
            <NumberField
              label="Retry Limit"
              hint={`How many times to retry a failed send before marking it failed (${FIELD_LIMITS.retryLimit.min}-${FIELD_LIMITS.retryLimit.max}).`}
              section="emailSending"
              fieldKey="retryLimit"
              form={form}
              setField={setField}
            />
          </div>

          <div className="btn-row mt-16">
            <button className="btn btn-primary" onClick={handleSave} disabled={busy !== null || !dirty}>
              {busy === "save" ? "Saving…" : "Save Settings"}
            </button>
            <button className="btn" onClick={handleReset} disabled={busy !== null}>
              {busy === "reset" ? "Resetting…" : "Reset to Defaults"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
