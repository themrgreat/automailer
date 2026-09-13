const LABELS = {
  draft: "Draft",
  generating: "Generating…",
  ai_generated: "AI Generated",
  reviewed: "Reviewed",
  ready_to_send: "Ready to Send",
  sending: "Sending…",
  sent: "Sent",
  failed: "Failed",
};

export default function StatusBadge({ status }) {
  return <span className={`badge badge-${status}`}>{LABELS[status] ?? status}</span>;
}
