"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "challenge", label: "Challenge" },
  { id: "architecture", label: "Architecture" },
  { id: "experience", label: "Experience" },
  { id: "engineering", label: "Engineering" },
  { id: "results", label: "Results" },
];

/**
 * Sticky section navigation with scroll spy. Horizontal rail on mobile,
 * vertical list on desktop — same component, two shapes.
 */
export function CaseNav() {
  const [active, setActive] = useState(SECTIONS[0]!.id);

  useEffect(() => {
    const elements = SECTIONS.map((s) => document.getElementById(s.id)).filter(
      (el): el is HTMLElement => el !== null,
    );

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // The topmost intersecting section wins, so scrolling up feels right.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -65% 0px", threshold: 0 },
    );

    for (const el of elements) observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/* Mobile rail */}
      <nav
        aria-label="Case study sections"
        className="sticky top-[68px] z-40 -mx-5 border-y border-line bg-bg/90 backdrop-blur-lg lg:hidden"
      >
        <ul className="mask-fade-x flex gap-1 overflow-x-auto px-5 py-2.5">
          {SECTIONS.map((section) => (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                className={cn(
                  "block rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors",
                  active === section.id
                    ? "bg-primary/15 text-accent"
                    : "text-fg-subtle",
                )}
              >
                {section.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* Desktop rail */}
      <nav
        aria-label="Case study sections"
        className="sticky top-28 hidden lg:block"
      >
        <ul className="flex flex-col gap-1 border-l border-line">
          {SECTIONS.map((section) => (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                className={cn(
                  "-ml-px block border-l-2 py-2 pl-4 text-sm transition-colors duration-200",
                  active === section.id
                    ? "border-primary font-medium text-accent"
                    : "border-transparent text-fg-subtle hover:text-fg-muted",
                )}
              >
                {section.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
