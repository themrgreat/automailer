const STEPS = [
  { id: "preview", label: "Preview Data" },
  { id: "template", label: "Template & Recipients" },
  { id: "generate", label: "Generate" },
  { id: "review", label: "Review & Send" },
];

export default function Stepper({ current, furthest, onJump }) {
  const order = STEPS.map((s) => s.id);
  const furthestIdx = order.indexOf(furthest);

  return (
    <div className="stepper">
      {STEPS.map((s, idx) => {
        const isActive = s.id === current;
        const isDone = idx < furthestIdx;
        const clickable = idx <= furthestIdx;
        return (
          <div
            key={s.id}
            className={`step-pill${isActive ? " active" : ""}${isDone && !isActive ? " done" : ""}`}
            onClick={() => clickable && onJump(s.id)}
            style={{ cursor: clickable ? "pointer" : "default" }}
          >
            <span className="n">{idx + 1}</span>
            {s.label}
          </div>
        );
      })}
    </div>
  );
}
