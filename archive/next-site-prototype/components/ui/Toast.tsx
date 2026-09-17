"use client";

import { useEffect } from "react";
import { Check, Info, TriangleAlert, X } from "lucide-react";
import { cn } from "@/lib/cn";

export type ToastTone = "success" | "info" | "error";

const ICONS = {
  success: Check,
  info: Info,
  error: TriangleAlert,
} as const;

const TONES = {
  success: "border-signal-ok/40 text-signal-ok",
  info: "border-primary/40 text-accent",
  error: "border-signal-down/40 text-signal-down",
} as const;

/**
 * Single-instance toast. Announced politely rather than assertively — these
 * confirm actions the user just took, so they should not interrupt.
 */
export function Toast({
  open,
  tone = "info",
  message,
  onClose,
  duration = 5000,
}: {
  open: boolean;
  tone?: ToastTone;
  message: string;
  onClose: () => void;
  duration?: number;
}) {
  useEffect(() => {
    if (!open || duration <= 0) return;
    const timer = window.setTimeout(onClose, duration);
    return () => window.clearTimeout(timer);
  }, [open, duration, onClose]);

  const Icon = ICONS[tone];

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-none fixed inset-x-4 bottom-6 z-100 flex justify-center sm:inset-x-auto sm:right-6"
    >
      {open ? (
        <div
          className={cn(
            "pointer-events-auto flex max-w-md items-start gap-3 rounded-lg border bg-surface-raised px-4 py-3",
            "shadow-[var(--shadow-raised)] animate-fade-up",
            TONES[tone],
          )}
        >
          <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <p className="text-sm leading-snug text-fg">{message}</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Dismiss notification"
            className="-mt-1 -mr-1 cursor-pointer rounded p-1 text-fg-subtle transition-colors hover:text-fg"
          >
            <X aria-hidden="true" className="size-3.5" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
