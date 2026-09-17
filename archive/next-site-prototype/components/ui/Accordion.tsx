"use client";

import { useState, type ReactNode } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/cn";

export interface AccordionItem {
  id: string;
  title: string;
  content: ReactNode;
  meta?: string;
}

/**
 * Native <details> would be simpler, but the animated open state and the
 * single-open behaviour both need controlled state.
 */
export function Accordion({
  items,
  className,
  defaultOpen,
  allowMultiple = false,
}: {
  items: AccordionItem[];
  className?: string;
  defaultOpen?: string;
  allowMultiple?: boolean;
}) {
  const [open, setOpen] = useState<string[]>(defaultOpen ? [defaultOpen] : []);

  function toggle(id: string) {
    setOpen((current) => {
      const isOpen = current.includes(id);
      if (allowMultiple) {
        return isOpen ? current.filter((i) => i !== id) : [...current, id];
      }
      return isOpen ? [] : [id];
    });
  }

  return (
    <div className={cn("divide-y divide-line border-y border-line", className)}>
      {items.map((item) => {
        const isOpen = open.includes(item.id);
        return (
          <div key={item.id}>
            <h3>
              <button
                type="button"
                onClick={() => toggle(item.id)}
                aria-expanded={isOpen}
                aria-controls={`acc-panel-${item.id}`}
                className="group flex w-full cursor-pointer items-center justify-between gap-6 py-5 text-left"
              >
                <span className="flex flex-col gap-1">
                  <span
                    className={cn(
                      "text-base font-medium transition-colors duration-200",
                      isOpen ? "text-accent" : "text-fg group-hover:text-accent",
                    )}
                  >
                    {item.title}
                  </span>
                  {item.meta ? (
                    <span className="font-mono text-[0.6875rem] tracking-[0.1em] uppercase text-fg-subtle">
                      {item.meta}
                    </span>
                  ) : null}
                </span>

                <Plus
                  aria-hidden="true"
                  className={cn(
                    "size-4 shrink-0 text-fg-subtle transition-transform duration-300 ease-[var(--ease-out-quart)]",
                    isOpen && "rotate-45 text-accent",
                  )}
                />
              </button>
            </h3>

            <div
              id={`acc-panel-${item.id}`}
              hidden={!isOpen}
              className="pb-6 text-sm leading-relaxed text-fg-muted"
            >
              {item.content}
            </div>
          </div>
        );
      })}
    </div>
  );
}
