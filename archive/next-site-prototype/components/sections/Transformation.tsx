"use client";

import { useEffect, useRef, useState } from "react";
import {
  BarChart3,
  ClipboardList,
  CreditCard,
  Globe,
  MessageSquare,
  Phone,
  Settings2,
  Table2,
} from "lucide-react";
import { usePrefersReducedMotion } from "@/hooks/useMediaQuery";
import { Container, Section } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { cn } from "@/lib/cn";

interface Piece {
  id: string;
  label: string;
  icon: typeof Globe;
  /** Scattered state: percentage position and rotation. */
  from: { x: number; y: number; r: number };
  /** Connected state: position on the ring. */
  to: { x: number; y: number };
}

const PIECES: Piece[] = [
  { id: "website", label: "Website", icon: Globe, from: { x: 8, y: 12, r: -7 }, to: { x: 50, y: 6 } },
  { id: "excel", label: "Spreadsheet", icon: Table2, from: { x: 62, y: 6, r: 6 }, to: { x: 82, y: 22 } },
  { id: "phone", label: "Phone", icon: Phone, from: { x: 78, y: 44, r: -4 }, to: { x: 90, y: 52 } },
  { id: "orders", label: "Orders", icon: ClipboardList, from: { x: 30, y: 30, r: 9 }, to: { x: 74, y: 80 } },
  { id: "messages", label: "Messages", icon: MessageSquare, from: { x: 4, y: 58, r: 5 }, to: { x: 40, y: 92 } },
  { id: "payments", label: "Payments", icon: CreditCard, from: { x: 52, y: 74, r: -8 }, to: { x: 12, y: 78 } },
  { id: "analytics", label: "Analytics", icon: BarChart3, from: { x: 24, y: 86, r: 4 }, to: { x: 2, y: 46 } },
  { id: "admin", label: "Admin work", icon: Settings2, from: { x: 84, y: 76, r: -6 }, to: { x: 14, y: 16 } },
];

export function Transformation() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const reduced = usePrefersReducedMotion();

  // Reduced motion users get the resolved state immediately — the point of
  // the section is the contrast, not the animation.
  const connected = reduced || inView;

  useEffect(() => {
    if (reduced) return;

    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          window.setTimeout(() => setInView(true), 380);
          observer.disconnect();
        }
      },
      { threshold: 0.45 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [reduced]);

  return (
    <Section className="relative overflow-hidden border-y border-line bg-bg-alt">
      <Container size="wide">
        <div className="grid items-center gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-20">
          {/* Copy */}
          <div className="flex flex-col gap-8">
            <SectionHeading
              eyebrow="The problem"
              title={
                <>
                  Businesses grow. Their digital systems{" "}
                  <span className="text-fg-subtle">
                    don&rsquo;t always grow with them.
                  </span>
                </>
              }
              lead="A website here. A spreadsheet there. Orders by phone, confirmations by message, payments reconciled by hand at the end of the week. Every part works. None of them are connected — so a person becomes the connection."
            />

            <div className="flex flex-col gap-4 border-l-2 border-line pl-5">
              <p className="text-sm leading-relaxed text-fg-muted">
                The cost is rarely a dramatic failure. It is an hour a day of
                copying between systems, a question nobody can answer without
                asking a colleague, and a number that is right in one place and
                wrong in another.
              </p>
              <p className="text-sm leading-relaxed text-fg-muted">
                BDS connects those parts into one system with a single source of
                truth — so the operation runs on infrastructure instead of on
                somebody&rsquo;s memory.
              </p>
            </div>

            <div
              className={cn(
                "flex items-center gap-3 transition-opacity duration-700",
                connected ? "opacity-100" : "opacity-40",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "size-2 rounded-full transition-colors duration-700",
                  connected
                    ? "bg-signal-ok shadow-[0_0_10px_var(--color-signal-ok)]"
                    : "bg-fg-subtle",
                )}
              />
              <span className="font-mono text-xs tracking-[0.12em] uppercase">
                <span
                  className={cn(
                    "transition-colors duration-700",
                    connected ? "text-accent" : "text-fg-subtle",
                  )}
                >
                  {connected
                    ? "BDS Digital Ecosystem"
                    : "Disconnected tools"}
                </span>
              </span>
            </div>
          </div>

          {/* Visual */}
          <div
            ref={sectionRef}
            className="relative aspect-square w-full max-w-xl justify-self-center"
          >
            <div className="absolute inset-0 rounded-2xl border border-line bg-surface-sunken bg-grid-sm" />

            {/* Connection lines appear only in the connected state. */}
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className={cn(
                "absolute inset-0 h-full w-full transition-opacity duration-1000",
                connected ? "opacity-100" : "opacity-0",
              )}
              aria-hidden="true"
            >
              {PIECES.map((piece) => (
                <line
                  key={piece.id}
                  x1="50"
                  y1="50"
                  x2={piece.to.x + 9}
                  y2={piece.to.y + 5}
                  stroke="var(--color-primary)"
                  strokeWidth="0.25"
                  opacity="0.55"
                />
              ))}
            </svg>

            {/* Core */}
            <div
              className={cn(
                "absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2",
                "grid place-items-center rounded-full border transition-all duration-1000 ease-[var(--ease-out-quart)]",
                connected
                  ? "size-24 border-primary bg-surface-raised shadow-[var(--shadow-glow)] opacity-100"
                  : "size-16 border-line bg-surface opacity-0",
              )}
            >
              <span className="font-display text-sm font-bold tracking-[0.18em] text-fg">
                BDS
              </span>
            </div>

            {/* Pieces */}
            {PIECES.map((piece, index) => {
              const Icon = piece.icon;
              const pos = connected ? piece.to : piece.from;

              return (
                <div
                  key={piece.id}
                  className="absolute transition-all duration-1000 ease-[var(--ease-out-quart)]"
                  style={{
                    left: `${pos.x}%`,
                    top: `${pos.y}%`,
                    transform: `rotate(${connected ? 0 : piece.from.r}deg)`,
                    transitionDelay: `${index * 55}ms`,
                  }}
                >
                  <span
                    className={cn(
                      "flex items-center gap-1.5 rounded-md border px-2 py-1.5 whitespace-nowrap sm:gap-2 sm:px-2.5",
                      "transition-colors duration-1000",
                      connected
                        ? "border-primary/45 bg-surface-raised"
                        : "border-line bg-surface",
                    )}
                  >
                    <Icon
                      aria-hidden="true"
                      className={cn(
                        "size-3 shrink-0 transition-colors duration-1000 sm:size-3.5",
                        connected ? "text-accent" : "text-fg-subtle",
                      )}
                    />
                    <span
                      className={cn(
                        "text-[0.625rem] font-medium transition-colors duration-1000 sm:text-xs",
                        connected ? "text-fg" : "text-fg-subtle",
                      )}
                    >
                      {piece.label}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </Container>
    </Section>
  );
}
