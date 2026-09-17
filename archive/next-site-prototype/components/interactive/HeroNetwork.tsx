"use client";

import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/hooks/useMediaQuery";
import { cn } from "@/lib/cn";

/* --------------------------------------------------------------------------
   The hero system diagram.

   A central BDS node with the seven capability domains orbiting it. Lines
   respond to pointer position with a small parallax offset — enough to feel
   alive, never enough to distract from the headline sitting beside it.

   Everything is inline SVG: no canvas, no WebGL, no image request.
   -------------------------------------------------------------------------- */

const VIEWBOX = { w: 720, h: 620 };
const CENTER = { x: 360, y: 310 };

interface Satellite {
  id: string;
  label: string;
  x: number;
  y: number;
  /** Parallax weight — outer nodes drift slightly more. */
  depth: number;
}

const SATELLITES: Satellite[] = [
  { id: "web", label: "Web", x: 360, y: 92, depth: 1 },
  { id: "commerce", label: "Commerce", x: 592, y: 178, depth: 0.85 },
  { id: "systems", label: "Systems", x: 636, y: 392, depth: 1.15 },
  { id: "payments", label: "Payments", x: 470, y: 540, depth: 0.9 },
  { id: "analytics", label: "Analytics", x: 246, y: 546, depth: 1.1 },
  { id: "automation", label: "Automation", x: 90, y: 396, depth: 0.8 },
  { id: "infrastructure", label: "Infrastructure", x: 116, y: 174, depth: 1.05 },
];

export function HeroNetwork({ className }: { className?: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState<string | null>(null);
  const reduced = usePrefersReducedMotion();
  const frame = useRef<number | null>(null);

  useEffect(() => {
    if (reduced) return;
    const el = wrapRef.current;
    if (!el) return;

    function onPointerMove(event: PointerEvent) {
      if (frame.current !== null) return;
      frame.current = window.requestAnimationFrame(() => {
        frame.current = null;
        const rect = el!.getBoundingClientRect();
        // Normalised to roughly [-1, 1] from the centre of the graphic.
        setPointer({
          x: ((event.clientX - rect.left) / rect.width - 0.5) * 2,
          y: ((event.clientY - rect.top) / rect.height - 0.5) * 2,
        });
      });
    }

    function onPointerLeave() {
      setPointer({ x: 0, y: 0 });
      setHovered(null);
    }

    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerleave", onPointerLeave);
    return () => {
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerleave", onPointerLeave);
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [reduced]);

  const SHIFT = reduced ? 0 : 14;

  return (
    <div
      ref={wrapRef}
      className={cn("relative w-full", className)}
      aria-hidden="true"
    >
      {/* Ambient glow behind the graphic. */}
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(circle at 50% 48%, rgb(59 130 246 / 0.16), transparent 62%)",
        }}
      />

      <svg
        viewBox={`0 0 ${VIEWBOX.w} ${VIEWBOX.h}`}
        className="relative w-full"
        role="presentation"
      >
        <defs>
          <radialGradient id="hero-core" cx="50%" cy="42%" r="60%">
            <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.95" />
            <stop offset="55%" stopColor="#3b82f6" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#1d3a68" stopOpacity="0.15" />
          </radialGradient>

          <linearGradient id="hero-edge" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.12" />
          </linearGradient>
        </defs>

        {/* Orbit rings */}
        <g opacity="0.5">
          <ellipse
            cx={CENTER.x}
            cy={CENTER.y}
            rx="248"
            ry="216"
            fill="none"
            stroke="var(--color-line)"
            strokeWidth="1"
            strokeDasharray="2 9"
          />
          <ellipse
            cx={CENTER.x}
            cy={CENTER.y}
            rx="150"
            ry="132"
            fill="none"
            stroke="var(--color-line-soft)"
            strokeWidth="1"
          />
        </g>

        {/* Connections */}
        <g>
          {SATELLITES.map((node) => {
            const dx = pointer.x * SHIFT * node.depth;
            const dy = pointer.y * SHIFT * node.depth;
            const isHot = hovered === node.id;

            return (
              <line
                key={`edge-${node.id}`}
                x1={CENTER.x}
                y1={CENTER.y}
                x2={node.x + dx}
                y2={node.y + dy}
                stroke={isHot ? "var(--color-accent)" : "url(#hero-edge)"}
                strokeWidth={isHot ? 1.6 : 1}
                className={cn(
                  "transition-[stroke,stroke-width] duration-300",
                  !reduced && "animate-dash",
                )}
                style={{ animationDelay: `${node.depth * -3}s` }}
              />
            );
          })}
        </g>

        {/* Core */}
        <g>
          <circle
            cx={CENTER.x}
            cy={CENTER.y}
            r="72"
            fill="url(#hero-core)"
            opacity="0.5"
          />
          <circle
            cx={CENTER.x}
            cy={CENTER.y}
            r="46"
            fill="var(--color-surface-raised)"
            stroke="var(--color-primary)"
            strokeWidth="1.25"
          />
          <text
            x={CENTER.x}
            y={CENTER.y}
            textAnchor="middle"
            dominantBaseline="central"
            fill="var(--color-fg)"
            fontSize="19"
            fontWeight="700"
            letterSpacing="2.5"
            style={{ fontFamily: "var(--font-display), sans-serif" }}
          >
            BDS
          </text>
        </g>

        {/* Satellites */}
        <g>
          {SATELLITES.map((node) => {
            const dx = pointer.x * SHIFT * node.depth;
            const dy = pointer.y * SHIFT * node.depth;
            const isHot = hovered === node.id;

            return (
              <g
                key={node.id}
                transform={`translate(${dx} ${dy})`}
                className="transition-transform duration-500 ease-[var(--ease-out-quart)]"
                onPointerEnter={() => setHovered(node.id)}
                style={{ pointerEvents: "auto", cursor: "default" }}
              >
                {!reduced ? (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r="14"
                    fill="var(--color-primary)"
                    className="animate-pulse-node"
                    style={{ animationDelay: `${node.depth * 1.4}s` }}
                    opacity="0.35"
                  />
                ) : null}

                <circle
                  cx={node.x}
                  cy={node.y}
                  r="6.5"
                  fill={
                    isHot ? "var(--color-accent)" : "var(--color-surface-raised)"
                  }
                  stroke="var(--color-primary)"
                  strokeWidth="1.5"
                  className="transition-[fill] duration-300"
                />

                <text
                  x={node.x}
                  y={node.y + (node.y < CENTER.y ? -20 : 28)}
                  textAnchor="middle"
                  fill={
                    isHot ? "var(--color-accent)" : "var(--color-fg-muted)"
                  }
                  fontSize="12.5"
                  letterSpacing="0.06em"
                  className="transition-[fill] duration-300"
                  style={{ fontFamily: "var(--font-mono), monospace" }}
                >
                  {node.label}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
