import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "neutral" | "primary" | "ok" | "warn" | "down";

const TONES: Record<Tone, string> = {
  neutral: "border-line text-fg-muted bg-surface/60",
  primary: "border-primary/40 text-accent bg-primary/10",
  ok: "border-signal-ok/35 text-signal-ok bg-signal-ok/10",
  warn: "border-signal-warn/35 text-signal-warn bg-signal-warn/10",
  down: "border-signal-down/35 text-signal-down bg-signal-down/10",
};

export function Badge({
  children,
  tone = "neutral",
  className,
  dot,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1",
        "font-mono text-[0.6875rem] font-medium tracking-[0.08em] uppercase",
        TONES[tone],
        className,
      )}
    >
      {dot ? (
        <span
          aria-hidden="true"
          className="size-1.5 rounded-full bg-current shadow-[0_0_8px_currentColor]"
        />
      ) : null}
      {children}
    </span>
  );
}
