import { cn } from "@/lib/cn";

interface MetricProps {
  value: string;
  label: string;
  /** Provenance of the number. Rendered as a tooltip-style footnote. */
  source?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const VALUE_SIZES = {
  sm: "text-2xl",
  md: "text-3xl sm:text-4xl",
  lg: "text-4xl sm:text-5xl",
} as const;

export function Metric({
  value,
  label,
  source,
  className,
  size = "md",
}: MetricProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <span
        className={cn(
          "font-display font-semibold tracking-tight text-fg tabular-nums",
          VALUE_SIZES[size],
        )}
      >
        {value}
      </span>
      <span className="text-sm leading-snug font-medium text-fg-muted">
        {label}
      </span>
      {source ? (
        <span className="text-xs leading-snug text-fg-subtle">{source}</span>
      ) : null}
    </div>
  );
}

/** Metric arranged in a bordered grid cell — used on case study pages. */
export function MetricGrid({
  metrics,
  className,
}: {
  metrics: { value: string; label: string; source?: string }[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid gap-px overflow-hidden rounded-lg border border-line bg-line",
        "grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {metrics.map((m) => (
        <div key={m.label} className="bg-surface p-5 sm:p-6">
          <Metric value={m.value} label={m.label} source={m.source} size="sm" />
        </div>
      ))}
    </div>
  );
}
