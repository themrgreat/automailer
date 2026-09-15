import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { uploadFile, apiErrorMessage } from "../api";

export default function ImportPage() {
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  async function handleFile(file) {
    setBusy(true);
    setError(null);
    try {
      const result = await uploadFile(file);
      navigate(`/batches/${result.batchId}`);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="card">
        <h2>1. Import recipient data</h2>
        <p className="card-desc">
          Upload an Excel (.xlsx) or CSV file with your recipient/company data. Columns are detected
          automatically — any headers your file has (Company Name, Email, Website, Industry, etc.)
          become available for personalization later.
        </p>

        {error && <div className="error-banner">{error}</div>}

        <div
          className={`dropzone${dragging ? " drag" : ""}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file) handleFile(file);
          }}
        >
          {busy ? (
            "Uploading and parsing..."
          ) : (
            <>
              <div style={{ fontSize: 15, marginBottom: 6, color: "var(--text)" }}>
                Drag & drop your .xlsx or .csv file here
              </div>
              <div className="text-sm">or click to browse</div>
            </>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.csv"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = ""; // allow re-selecting the same file after a failed upload
            if (file) handleFile(file);
          }}
        />
      </div>
    </div>
  );
}
