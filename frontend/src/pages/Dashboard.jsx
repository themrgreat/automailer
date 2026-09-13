import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UploadCloud, FileSpreadsheet, ArrowRight, Trash2 } from "lucide-react";
import { listBatches, deleteBatch, apiErrorMessage } from "../api";
import { useToast } from "../components/Toast";

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export default function Dashboard() {
  const [batches, setBatches] = useState(null);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const navigate = useNavigate();
  const showToast = useToast();

  async function refresh() {
    try {
      const data = await listBatches();
      setBatches(data);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleDelete(id, filename) {
    if (!confirm(`Delete batch "${filename}" and all its records? This can't be undone.`)) return;
    setBusyId(id);
    try {
      await deleteBatch(id);
      setBatches((prev) => prev.filter((b) => b.id !== id));
      showToast("Batch deleted");
    } catch (err) {
      showToast(apiErrorMessage(err), "error");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Import recipients, generate personalized emails with AI, and send.</p>
        </div>
      </div>

      <div className="dashboard-grid dashboard-grid-single">
        <button className="cta-card" onClick={() => navigate("/import")}>
          <div className="cta-card-icon">
            <UploadCloud size={22} />
          </div>
          <div>
            <div className="cta-card-title">New Import</div>
            <div className="cta-card-desc">Upload a .xlsx or .csv file to start a new batch</div>
          </div>
          <ArrowRight size={18} className="cta-card-arrow" />
        </button>
      </div>

      <div className="card">
        <h2>Recent batches</h2>
        <p className="card-desc">Continue a previous import, or start a new one.</p>

        {error && <div className="error-banner">{error}</div>}

        {batches === null ? (
          <div className="skeleton-list">
            <div className="skeleton-row" />
            <div className="skeleton-row" />
            <div className="skeleton-row" />
          </div>
        ) : batches.length === 0 ? (
          <div className="empty-state">
            <FileSpreadsheet size={32} className="muted" />
            <div className="empty-state-title">No batches yet</div>
            <div className="empty-state-desc">Import your first recipient file to get started.</div>
            <Link to="/import" className="btn btn-primary mt-16">
              <UploadCloud size={15} /> Import a file
            </Link>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>File</th>
                  <th>Records</th>
                  <th>Columns</th>
                  <th>Imported</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => (
                  <tr key={b.id}>
                    <td>{b.filename}</td>
                    <td>{b.rowCount}</td>
                    <td>{b.columns?.length ?? 0}</td>
                    <td>{formatDate(b.createdAt)}</td>
                    <td>
                      <div className="btn-row" style={{ justifyContent: "flex-end" }}>
                        <Link to={`/batches/${b.id}`} className="btn btn-sm btn-primary">
                          Continue
                        </Link>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDelete(b.id, b.filename)}
                          disabled={busyId === b.id}
                          aria-label="Delete batch"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
