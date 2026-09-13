import { useCallback, useEffect, useState } from "react";
import {
  listAiProviders,
  saveAiProvider,
  clearAiProviderCredentials,
  setDefaultAiProvider,
  testAiProvider,
  apiErrorMessage,
} from "../api";
import ProviderCard from "../components/ProviderCard";

const aiActions = {
  save: saveAiProvider,
  clearCredentials: clearAiProviderCredentials,
  setDefault: setDefaultAiProvider,
  test: testAiProvider,
};

export default function AiProviders() {
  const [providers, setProviders] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const data = await listAiProviders();
      setProviders(data);
      setError(null);
      setSelectedId((prev) => prev ?? data.find((p) => p.isDefault)?.id ?? data[0]?.id ?? null);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const selectedProvider = providers?.find((p) => p.id === selectedId) ?? null;
  const defaultProvider = providers?.find((p) => p.isDefault) ?? null;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">AI Providers</h1>
          <p className="page-subtitle">
            Choose a provider, add its credentials and model, then test the connection and set it as default.
          </p>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {providers === null && !error ? (
        <div className="skeleton-list">
          <div className="skeleton-row" style={{ height: 40 }} />
          <div className="skeleton-row" style={{ height: 220 }} />
        </div>
      ) : (
        <div className="card" style={{ maxWidth: 460 }}>
          <div className="field">
            <label className="field-label">AI Provider</label>
            <select value={selectedId ?? ""} onChange={(e) => setSelectedId(e.target.value)}>
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                  {p.isDefault ? " (default)" : ""}
                </option>
              ))}
            </select>
          </div>

          {defaultProvider && (
            <p className="text-sm muted mt-8" style={{ marginBottom: 0 }}>
              Currently generating emails with <strong>{defaultProvider.label}</strong>.
            </p>
          )}
        </div>
      )}

      {selectedProvider && (
        <div className="mt-16" style={{ maxWidth: 460 }}>
          <ProviderCard key={selectedProvider.id} provider={selectedProvider} actions={aiActions} onChanged={refresh} />
        </div>
      )}
    </div>
  );
}
