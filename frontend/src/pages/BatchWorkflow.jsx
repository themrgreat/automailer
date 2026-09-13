import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getBatch, listTemplates, apiErrorMessage } from "../api";
import Stepper from "../components/Stepper";
import PreviewStep from "../components/PreviewStep";
import TemplateStep from "../components/TemplateStep";
import GenerateStep from "../components/GenerateStep";
import ReviewStep from "../components/ReviewStep";

const STEP_ORDER = ["preview", "template", "generate", "review"];

export default function BatchWorkflow() {
  const { batchId } = useParams();
  const [batch, setBatch] = useState(null);
  const [records, setRecords] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [step, setStep] = useState("preview");
  const [furthest, setFurthest] = useState("preview");
  const [targetIds, setTargetIds] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!batchId) return;
    try {
      const data = await getBatch(batchId);
      setBatch(data.batch);
      setRecords(data.records);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }, [batchId]);

  useEffect(() => {
    if (!batchId) return;

    async function loadInitial() {
      setLoading(true);
      try {
        const [data, tpls] = await Promise.all([getBatch(batchId), listTemplates()]);
        setBatch(data.batch);
        setRecords(data.records);
        setTemplates(tpls);
      } catch (err) {
        setError(apiErrorMessage(err));
      } finally {
        setLoading(false);
      }
    }

    loadInitial();
  }, [batchId]);

  const recordsRef = useRef(records);
  recordsRef.current = records;

  useEffect(() => {
    const inFlight = records.some((r) => r.status === "generating" || r.status === "sending");
    if (!inFlight) return;
    const id = setInterval(refresh, 1200);
    return () => clearInterval(id);
  }, [records, refresh]);

  function goTo(target) {
    const idx = STEP_ORDER.indexOf(target);
    const furthestIdx = STEP_ORDER.indexOf(furthest);
    if (idx <= furthestIdx) setStep(target);
  }

  function advanceTo(target) {
    setStep(target);
    const idx = STEP_ORDER.indexOf(target);
    const furthestIdx = STEP_ORDER.indexOf(furthest);
    if (idx > furthestIdx) setFurthest(target);
  }

  if (loading) return <div className="card muted">Loading batch…</div>;
  if (error && !batch) return <div className="error-banner">{error}</div>;
  if (!batch) return null;

  return (
    <div>
      <div className="btn-row" style={{ marginBottom: 12 }}>
        <Link to="/" className="btn btn-sm">← New Import</Link>
      </div>

      <Stepper current={step} furthest={furthest} onJump={goTo} />

      {error && <div className="error-banner">{error}</div>}

      {step === "preview" && (
        <PreviewStep
          batch={batch}
          records={records}
          onContinue={() => advanceTo("template")}
          onEmailColumnApplied={refresh}
        />
      )}

      {step === "template" && (
        <TemplateStep
          batchId={batch.id}
          filename={batch.filename}
          columns={batch.columns}
          records={records}
          templates={templates}
          onStarted={(ids) => {
            setTargetIds(ids);
            advanceTo("generate");
            refresh();
          }}
        />
      )}

      {step === "generate" && (
        <GenerateStep records={records} targetIds={targetIds} onContinue={() => advanceTo("review")} />
      )}

      {step === "review" && (
        <ReviewStep batchId={batch.id} records={records} targetIds={targetIds} onChanged={refresh} />
      )}
    </div>
  );
}
