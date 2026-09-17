import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface TimelineEntry {
  id: string;
  title: string;
  meta?: string;
  state?: "complete" | "active" | "upcoming";
  content?: ReactNode;
}

const DOT_STATES = {
  complete: "border-signal-ok bg-signal-ok",
  active: "border-primary bg-primary shadow-[0_0_0_4px_rgb(59_130_246/0.18)]",
  upcoming: "border-line-strong bg-surface",
} as const;

export function Timeline({
  entries,
  className,
}: {
  entries: TimelineEntry[];
  className?: string;
}) {
  return (
    <ol className={cn("relative flex flex-col", className)}>
      {entries.map((entry, index) => {
        const isLast = index === entries.length - 1;
        const state = entry.state ?? "upcoming";

        return (
          <li key={entry.id} className="relative flex gap-4 pb-8 last:pb-0">
            {/* Rail */}
            {!isLast ? (
              <span
                aria-hidden="true"
                className="absolute top-4 bottom-0 left-[7px] w-px bg-line"
              />
            ) : null}

            <span
              aria-hidden="true"
              className={cn(
                "relative z-10 mt-1 size-3.5 shrink-0 rounded-full border-2",
                DOT_STATES[state],
              )}
            />

            <div className="flex min-w-0 flex-col gap-1 pb-1">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-sm font-medium text-fg">
                  {entry.title}
                </span>
                {entry.meta ? (
                  <span className="font-mono text-[0.6875rem] tracking-[0.08em] uppercase text-fg-subtle">
                    {entry.meta}
                  </span>
                ) : null}
              </div>
              {entry.content ? (
                <div className="text-sm leading-relaxed text-fg-muted">
                  {entry.content}
                </div>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
