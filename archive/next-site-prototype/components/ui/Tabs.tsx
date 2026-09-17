"use client";

import { useId, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface TabItem {
  id: string;
  label: string;
  description?: string;
}

interface TabsProps {
  items: TabItem[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
  /** `rail` is a segmented control; `underline` is a text row. */
  variant?: "rail" | "underline";
  ariaLabel: string;
}

/**
 * Controlled tab list with full keyboard support
 * (arrow keys, Home / End) per the WAI-ARIA tabs pattern.
 */
export function Tabs({
  items,
  active,
  onChange,
  className,
  variant = "rail",
  ariaLabel,
}: TabsProps) {
  const baseId = useId();
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  function onKeyDown(event: React.KeyboardEvent) {
    const index = items.findIndex((i) => i.id === active);
    if (index === -1) return;

    let next = index;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      next = (index + 1) % items.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      next = (index - 1 + items.length) % items.length;
    } else if (event.key === "Home") {
      next = 0;
    } else if (event.key === "End") {
      next = items.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    const target = items[next];
    if (!target) return;
    onChange(target.id);
    refs.current[target.id]?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      className={cn(
        variant === "rail"
          ? "inline-flex flex-wrap gap-1 rounded-lg border border-line bg-surface-sunken p-1"
          : "flex flex-wrap gap-6 border-b border-line",
        className,
      )}
    >
      {items.map((item) => {
        const selected = item.id === active;
        return (
          <button
            key={item.id}
            ref={(el) => {
              refs.current[item.id] = el;
            }}
            role="tab"
            id={`${baseId}-tab-${item.id}`}
            aria-selected={selected}
            aria-controls={`${baseId}-panel-${item.id}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(item.id)}
            className={cn(
              "cursor-pointer text-sm font-medium transition-colors duration-200",
              variant === "rail"
                ? cn(
                    "rounded-md px-4 py-2",
                    selected
                      ? "bg-primary/15 text-accent ring-1 ring-primary/35"
                      : "text-fg-muted hover:bg-surface hover:text-fg",
                  )
                : cn(
                    "-mb-px border-b-2 px-1 pb-3",
                    selected
                      ? "border-primary text-fg"
                      : "border-transparent text-fg-muted hover:text-fg",
                  ),
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({
  id,
  active,
  children,
  className,
}: {
  id: string;
  active: string;
  children: ReactNode;
  className?: string;
}) {
  if (id !== active) return null;
  return (
    <div role="tabpanel" tabIndex={0} className={cn("outline-none", className)}>
      {children}
    </div>
  );
}
