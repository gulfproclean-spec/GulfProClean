const STYLES = {
  PENDING: "bg-amber-100 text-amber-800",
  MATCHED: "bg-shallow/10 text-shallow",
  IN_PROGRESS: "bg-tide/10 text-tide",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-red-100 text-red-700",
};

const LABELS = {
  PENDING: "Finding a pro",
  MATCHED: "Matched",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export default function StatusBadge({ status }) {
  return (
    <span
      className={
        "inline-block rounded-full px-3 py-1 font-mono text-[11px] uppercase tracking-wide " +
        (STYLES[status] || "bg-mist text-inkSoft")
      }
    >
      {LABELS[status] || status}
    </span>
  );
}
