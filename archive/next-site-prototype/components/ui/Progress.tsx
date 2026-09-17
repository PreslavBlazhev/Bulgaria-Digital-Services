import { cn } from "@/lib/cn";

interface ProgressProps {
  value: number;
  label?: string;
  note?: string;
  className?: string;
  showValue?: boolean;
  tone?: "primary" | "ok";
}

export function Progress({
  value,
  label,
  note,
  className,
  showValue = true,
  tone = "primary",
}: ProgressProps) {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {label || showValue ? (
        <div className="flex items-baseline justify-between gap-3">
          {label ? (
            <span className="text-sm font-medium text-fg">{label}</span>
          ) : null}
          {showValue ? (
            <span className="font-mono text-xs tabular-nums text-fg-muted">
              {clamped}%
            </span>
          ) : null}
        </div>
      ) : null}

      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? "Progress"}
        className="h-1.5 w-full overflow-hidden rounded-full bg-surface-sunken ring-1 ring-line-soft ring-inset"
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-700 ease-[var(--ease-out-quart)]",
            tone === "primary"
              ? "bg-linear-to-r from-primary to-accent"
              : "bg-signal-ok",
          )}
          style={{ width: `${clamped}%` }}
        />
      </div>

      {note ? (
        <p className="text-xs leading-snug text-fg-subtle">{note}</p>
      ) : null}
    </div>
  );
}

/** Circular variant for a single headline figure. */
export function ProgressRing({
  value,
  size = 132,
  label,
}: {
  value: number;
  size?: number;
  label?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div
      className="relative inline-grid place-items-center"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-line)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#bds-ring)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
        <defs>
          <linearGradient id="bds-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#60a5fa" />
          </linearGradient>
        </defs>
      </svg>

      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="font-display text-3xl font-semibold tabular-nums text-fg">
            {clamped}%
          </div>
          {label ? (
            <div className="mt-0.5 font-mono text-[0.625rem] tracking-[0.14em] uppercase text-fg-subtle">
              {label}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
