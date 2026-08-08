export default function StatBadge({ value, label }) {
  return (
    <div className="border-l-2 border-shallow pl-4">
      <p className="font-display text-2xl font-bold text-tide sm:text-3xl">{value}</p>
      <p className="mt-1 text-xs text-inkSoft sm:text-sm">{label}</p>
    </div>
  );
}
