"use client";

import { useId, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Hover + focus tooltip. Focus support is not optional here — a tooltip that
 * only appears on hover is invisible to keyboard and touch users.
 */
export function Tooltip({
  content,
  children,
  className,
  side = "top",
}: {
  content: ReactNode;
  children: ReactNode;
  className?: string;
  side?: "top" | "bottom";
}) {
  const [visible, setVisible] = useState(false);
  const id = useId();

  return (
    <span
      className={cn("relative inline-flex", className)}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      <span aria-describedby={visible ? id : undefined} tabIndex={0}>
        {children}
      </span>

      {visible ? (
        <span
          role="tooltip"
          id={id}
          className={cn(
            "pointer-events-none absolute left-1/2 z-50 w-max max-w-64 -translate-x-1/2",
            "rounded-md border border-line-strong bg-surface-raised px-3 py-2",
            "text-xs leading-snug font-normal text-fg-muted shadow-[var(--shadow-raised)]",
            side === "top" ? "bottom-[calc(100%+8px)]" : "top-[calc(100%+8px)]",
          )}
        >
          {content}
        </span>
      ) : null}
    </span>
  );
}
