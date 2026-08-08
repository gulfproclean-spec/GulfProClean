import { SERVICE_AREA } from "@/lib/services";

const STEP_LABELS = ["Service", "Location", "Schedule", "You", "Matched"];

export default function CorridorMap({ variant = "hero", activeIndex = 0, className = "" }) {
  if (variant === "progress") {
    return <ProgressLine activeIndex={activeIndex} className={className} />;
  }
  return <HeroLine compact={variant === "compact"} className={className} />;
}

function HeroLine({ compact, className }) {
  const stops = SERVICE_AREA;
  const width = 1000;
  const y = compact ? 40 : 88;
  const height = compact ? 80 : 176;
  const left = 30;
  const right = width - 30;
  const step = (right - left) / (stops.length - 1);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      role="img"
      aria-label="Map of the Gulf Coast ProClean service corridor from Pensacola to Panama City Beach"
    >
      <line
        x1={left}
        y1={y}
        x2={right}
        y2={y}
        stroke="#DCE6E4"
        strokeWidth={compact ? 2 : 3}
      />
      <line
        x1={left}
        y1={y}
        x2={right}
        y2={y}
        stroke="#12897E"
        strokeWidth={compact ? 2 : 3}
        strokeDasharray="1000"
        strokeDashoffset="1000"
        className="animate-dash"
      />
      {stops.map((s, i) => {
        const cx = left + step * i;
        const isCore = s.phase === 1;
        const color = isCore ? "#FF5A36" : "#0B3142";
        return (
          <g key={s.city}>
            {isCore && (
              <circle cx={cx} cy={y} r={compact ? 5 : 8} fill={color} opacity="0.25" className="animate-pulsePin" />
            )}
            <circle cx={cx} cy={y} r={compact ? 3.5 : 5.5} fill={color} />
            {!compact && (
              <>
                <text
                  x={cx}
                  y={y - 16}
                  textAnchor="middle"
                  fontSize="12"
                  fontFamily="var(--font-mono)"
                  fill={isCore ? "#E2431E" : "#4A5C58"}
                >
                  {isCore ? "CORE" : "PHASE " + s.phase}
                </text>
                <text
                  x={cx}
                  y={y + 26}
                  textAnchor="middle"
                  fontSize="13"
                  fontFamily="var(--font-body)"
                  fill="#0E211D"
                  fontWeight="600"
                >
                  {s.city}
                </text>
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function ProgressLine({ activeIndex, className }) {
  const width = 600;
  const y = 24;
  const left = 24;
  const right = width - 24;
  const step = (right - left) / (STEP_LABELS.length - 1);

  return (
    <svg viewBox={`0 0 ${width} 56`} className={className} role="img" aria-label="Booking progress">
      <line x1={left} y1={y} x2={right} y2={y} stroke="#DCE6E4" strokeWidth="3" />
      <line
        x1={left}
        y1={y}
        x2={left + step * Math.min(activeIndex, STEP_LABELS.length - 1)}
        y2={y}
        stroke="#12897E"
        strokeWidth="3"
        style={{ transition: "all 0.4s ease" }}
      />
      {STEP_LABELS.map((label, i) => {
        const cx = left + step * i;
        const done = i <= activeIndex;
        return (
          <g key={label}>
            <circle
              cx={cx}
              cy={y}
              r={i === activeIndex ? 8 : 5.5}
              fill={done ? (i === activeIndex ? "#FF5A36" : "#12897E") : "#DCE6E4"}
              style={{ transition: "all 0.3s ease" }}
            />
            <text
              x={cx}
              y={y + 22}
              textAnchor={i === 0 ? "start" : i === STEP_LABELS.length - 1 ? "end" : "middle"}
              fontSize="11"
              fontFamily="var(--font-mono)"
              fill={done ? "#0E211D" : "#4A5C58"}
            >
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
