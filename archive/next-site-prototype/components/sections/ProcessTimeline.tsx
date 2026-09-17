"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { PROCESS_STAGES } from "@/data/process";
import { cn } from "@/lib/cn";

/**
 * Scroll-driven process diagram.
 *
 * Desktop keeps a horizontal stage rail pinned above the detail while the
 * reader moves through the stages. Mobile becomes a vertical stepper — the
 * horizontal rail would need seven columns on a 360px screen, which is not a
 * diagram, it is a scrollbar.
 */
export function ProcessTimeline() {
  const [activeIndex, setActiveIndex] = useState(0);
  const stageRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const elements = stageRefs.current.filter(
      (el): el is HTMLElement => el !== null,
    );
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        const first = visible[0];
        if (!first) return;

        const index = elements.indexOf(first.target as HTMLElement);
        if (index >= 0) setActiveIndex(index);
      },
      { rootMargin: "-25% 0px -55% 0px", threshold: 0 },
    );

    for (const el of elements) observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const progress =
    PROCESS_STAGES.length > 1
      ? (activeIndex / (PROCESS_STAGES.length - 1)) * 100
      : 0;

  return (
    <div className="flex flex-col gap-10">
      {/* Stage rail — desktop */}
      <div className="sticky top-20 z-40 hidden lg:block">
        <div className="rounded-xl border border-line bg-bg/85 p-4 backdrop-blur-lg">
          <div className="relative mb-4 h-px bg-line">
            <span
              className="absolute inset-y-0 left-0 bg-linear-to-r from-primary to-accent transition-[width] duration-500 ease-[var(--ease-out-quart)]"
              style={{ width: `${progress}%` }}
            />
          </div>

          <ol className="grid grid-cols-7 gap-2">
            {PROCESS_STAGES.map((stage, index) => {
              const isActive = index === activeIndex;
              const isPast = index < activeIndex;

              return (
                <li key={stage.id}>
                  <a
                    href={`#${stage.id}`}
                    className={cn(
                      "flex flex-col gap-1 rounded-md px-2 py-1.5 transition-colors duration-300",
                      isActive && "bg-primary/12",
                    )}
                  >
                    <span
                      className={cn(
                        "font-mono text-[0.625rem] tracking-[0.1em] transition-colors duration-300",
                        isActive
                          ? "text-accent"
                          : isPast
                            ? "text-fg-muted"
                            : "text-fg-subtle",
                      )}
                    >
                      {stage.index}
                    </span>
                    <span
                      className={cn(
                        "text-xs leading-tight font-medium transition-colors duration-300",
                        isActive ? "text-fg" : "text-fg-subtle",
                      )}
                    >
                      {stage.name}
                    </span>
                  </a>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      {/* Stages */}
      <div className="flex flex-col gap-4">
        {PROCESS_STAGES.map((stage, index) => {
          const isActive = index === activeIndex;

          return (
            <section
              key={stage.id}
              id={stage.id}
              ref={(el) => {
                stageRefs.current[index] = el;
              }}
              className={cn(
                "scroll-mt-40 rounded-xl border transition-[border-color,background-color] duration-500",
                isActive
                  ? "border-primary/40 bg-surface-raised"
                  : "border-line bg-surface",
              )}
            >
              <div className="grid gap-8 p-7 sm:p-9 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
                <div className="flex flex-col gap-4">
                  <div className="flex items-baseline gap-4">
                    <span
                      className={cn(
                        "font-mono text-sm tracking-[0.12em] transition-colors duration-500",
                        isActive ? "text-accent" : "text-fg-subtle",
                      )}
                    >
                      {stage.index}
                    </span>
                    <div className="flex flex-col gap-1">
                      <h2 className="text-xl font-semibold text-fg sm:text-2xl">
                        {stage.name}
                      </h2>
                      <span className="font-mono text-[0.6875rem] tracking-[0.1em] text-fg-subtle uppercase">
                        {stage.focus}
                      </span>
                    </div>
                  </div>

                  <p className="text-sm leading-relaxed text-fg-muted">
                    {stage.description}
                  </p>

                  <div className="mt-auto flex items-start gap-2.5 border-t border-line pt-4">
                    <ArrowRight
                      aria-hidden="true"
                      className="mt-0.5 size-3.5 shrink-0 text-accent"
                    />
                    <p className="text-sm leading-snug text-fg">
                      <span className="font-mono text-[0.625rem] tracking-[0.14em] text-fg-subtle uppercase">
                        Output
                      </span>
                      <br />
                      {stage.output}
                    </p>
                  </div>
                </div>

                <ul className="flex flex-col gap-px overflow-hidden rounded-lg border border-line bg-line">
                  {stage.activities.map((activity) => (
                    <li
                      key={activity}
                      className="flex items-start gap-3 bg-surface-sunken px-4 py-3.5"
                    >
                      <span
                        aria-hidden="true"
                        className="mt-1.5 size-1 shrink-0 rounded-full bg-primary"
                      />
                      <span className="text-sm leading-snug text-fg-muted">
                        {activity}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
