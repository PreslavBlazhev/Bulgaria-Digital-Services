"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown } from "lucide-react";
import type { ArchitectureEdge, ArchitectureView } from "@/types";
import { cn } from "@/lib/cn";
import {
  ArchitectureNodeCard,
  ArchitectureNodeDetail,
} from "./ArchitectureNode";

interface DrawnEdge extends ArchitectureEdge {
  path: string;
  labelX: number;
  labelY: number;
}

/**
 * Renders a system architecture as an interactive graph.
 *
 * Edge geometry is measured from the DOM rather than hardcoded, so the graph
 * survives font changes, container resizes and long node labels. Below `lg`
 * the graph is replaced with a vertical stack — a scaled-down node diagram is
 * unreadable on a phone, so it becomes a different layout rather than a
 * smaller one.
 */
export function ArchitectureGraph({
  view,
  className,
}: {
  view: ArchitectureView;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [drawn, setDrawn] = useState<DrawnEdge[]>([]);
  const [box, setBox] = useState({ width: 0, height: 0 });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const cols = Math.max(...view.nodes.map((n) => n.col));
  const rows = Math.max(...view.nodes.map((n) => n.row));

  const measure = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const base = container.getBoundingClientRect();
    setBox({ width: base.width, height: base.height });

    const next: DrawnEdge[] = [];

    for (const edge of view.edges) {
      const fromEl = nodeRefs.current[edge.from];
      const toEl = nodeRefs.current[edge.to];
      if (!fromEl || !toEl) continue;

      const a = rectRelative(fromEl.getBoundingClientRect(), base);
      const b = rectRelative(toEl.getBoundingClientRect(), base);

      next.push({ ...edge, ...elbow(a, b) });
    }

    setDrawn(next);
  }, [view]);

  useEffect(() => {
    measure();

    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(measure);
    observer.observe(container);
    for (const el of Object.values(nodeRefs.current)) {
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [measure]);

  // Reset selection when the view changes so a stale node is never highlighted.
  // Adjusting during render is React's documented alternative to an effect for
  // state that derives from a prop change.
  const [lastViewId, setLastViewId] = useState(view.id);
  if (lastViewId !== view.id) {
    setLastViewId(view.id);
    setSelectedId(null);
  }

  const connectedIds = new Set<string>();
  if (selectedId) {
    connectedIds.add(selectedId);
    for (const edge of view.edges) {
      if (edge.from === selectedId) connectedIds.add(edge.to);
      if (edge.to === selectedId) connectedIds.add(edge.from);
    }
  }

  const selectedNode = view.nodes.find((n) => n.id === selectedId) ?? null;

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      {/* ---------------- Desktop graph ---------------- */}
      <div
        ref={containerRef}
        className="relative hidden overflow-hidden rounded-xl border border-line bg-surface-sunken bg-grid p-8 lg:block"
      >
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox={`0 0 ${box.width || 1} ${box.height || 1}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <marker
              id={`bds-arrow-${view.id}`}
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="5"
              markerHeight="5"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--color-line-strong)" />
            </marker>
            <marker
              id={`bds-arrow-active-${view.id}`}
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="5"
              markerHeight="5"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--color-accent)" />
            </marker>
          </defs>

          {drawn.map((edge) => {
            const isActive =
              selectedId !== null &&
              (edge.from === selectedId || edge.to === selectedId);
            const isDimmed = selectedId !== null && !isActive;

            return (
              <g key={`${edge.from}-${edge.to}`}>
                <path
                  d={edge.path}
                  fill="none"
                  stroke={
                    isActive ? "var(--color-accent)" : "var(--color-line-strong)"
                  }
                  strokeWidth={isActive ? 1.75 : 1.25}
                  strokeDasharray={edge.async ? "5 6" : undefined}
                  markerEnd={`url(#bds-arrow${isActive ? "-active" : ""}-${view.id})`}
                  opacity={isDimmed ? 0.25 : 1}
                  className="transition-[stroke,opacity] duration-300"
                />
                {edge.label ? (
                  <text
                    x={edge.labelX}
                    y={edge.labelY}
                    textAnchor="middle"
                    className="font-mono"
                    fontSize="9.5"
                    letterSpacing="0.06em"
                    fill={
                      isActive ? "var(--color-accent)" : "var(--color-fg-subtle)"
                    }
                    opacity={isDimmed ? 0.25 : 1}
                  >
                    {edge.label}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>

        <div
          className="relative grid gap-x-10 gap-y-5"
          style={{
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${rows}, minmax(0, auto))`,
          }}
        >
          {view.nodes.map((node) => (
            <div
              key={node.id}
              style={{ gridColumn: node.col, gridRow: node.row }}
              className="flex items-center"
            >
              <ArchitectureNodeCard
                ref={(el) => {
                  nodeRefs.current[node.id] = el;
                }}
                node={node}
                selected={node.id === selectedId}
                dimmed={selectedId !== null && !connectedIds.has(node.id)}
                onSelect={(id) =>
                  setSelectedId((current) => (current === id ? null : id))
                }
              />
            </div>
          ))}
        </div>
      </div>

      {/* ---------------- Mobile / tablet stack ---------------- */}
      <div className="flex flex-col lg:hidden">
        {view.nodes.map((node, index) => {
          const outgoing = view.edges.filter((e) => e.from === node.id);
          const isLast = index === view.nodes.length - 1;

          return (
            <div key={node.id} className="flex flex-col">
              <ArchitectureNodeCard
                node={node}
                selected={node.id === selectedId}
                dimmed={false}
                onSelect={(id) =>
                  setSelectedId((current) => (current === id ? null : id))
                }
              />

              {node.id === selectedId ? (
                <div className="mt-2 rounded-lg border border-primary/35 bg-surface-sunken p-4">
                  <ArchitectureNodeDetail node={node} />
                </div>
              ) : null}

              {!isLast ? (
                <div className="flex items-center gap-2 py-2 pl-4">
                  <ArrowDown
                    aria-hidden="true"
                    className="size-3.5 shrink-0 text-line-strong"
                  />
                  {outgoing.length > 0 ? (
                    <span className="font-mono text-[0.625rem] tracking-[0.08em] text-fg-subtle">
                      {outgoing
                        .map(
                          (e) =>
                            `${e.label ?? "connects"} → ${labelFor(view, e.to)}`,
                        )
                        .join("  ·  ")}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* ---------------- Detail panel (desktop) ---------------- */}
      <div className="hidden lg:block">
        {selectedNode ? (
          <div className="rounded-xl border border-primary/30 bg-surface p-6">
            <ArchitectureNodeDetail node={selectedNode} />
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-line bg-surface/40 px-6 py-5">
            <p className="text-sm text-fg-muted">
              <span className="font-medium text-fg">Select any node</span> to see
              its role, responsibility, data flow and technology. Dashed
              connections are asynchronous or event-driven.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

interface Box {
  left: number;
  right: number;
  top: number;
  bottom: number;
  cx: number;
  cy: number;
}

function rectRelative(rect: DOMRect, base: DOMRect): Box {
  const left = rect.left - base.left;
  const top = rect.top - base.top;
  return {
    left,
    top,
    right: left + rect.width,
    bottom: top + rect.height,
    cx: left + rect.width / 2,
    cy: top + rect.height / 2,
  };
}

/**
 * Orthogonal connector between two boxes. Horizontal when the target is to the
 * right, vertical when it is below, straight otherwise. Elbows read as system
 * diagrams; bezier curves read as decoration.
 */
function elbow(a: Box, b: Box): { path: string; labelX: number; labelY: number } {
  const GAP = 6;

  if (b.left > a.right) {
    const sx = a.right + GAP;
    const ex = b.left - GAP;
    const midX = sx + (ex - sx) / 2;
    return {
      path: `M ${sx} ${a.cy} H ${midX} V ${b.cy} H ${ex}`,
      labelX: midX,
      labelY: (a.cy + b.cy) / 2 - 7,
    };
  }

  if (b.top > a.bottom) {
    const sy = a.bottom + GAP;
    const ey = b.top - GAP;
    const midY = sy + (ey - sy) / 2;
    return {
      path: `M ${a.cx} ${sy} V ${midY} H ${b.cx} V ${ey}`,
      labelX: (a.cx + b.cx) / 2,
      labelY: midY - 5,
    };
  }

  if (a.top > b.bottom) {
    const sy = a.top - GAP;
    const ey = b.bottom + GAP;
    const midY = ey + (sy - ey) / 2;
    return {
      path: `M ${a.cx} ${sy} V ${midY} H ${b.cx} V ${ey}`,
      labelX: (a.cx + b.cx) / 2,
      labelY: midY - 5,
    };
  }

  return {
    path: `M ${a.cx} ${a.cy} L ${b.cx} ${b.cy}`,
    labelX: (a.cx + b.cx) / 2,
    labelY: (a.cy + b.cy) / 2 - 6,
  };
}

function labelFor(view: ArchitectureView, id: string): string {
  return view.nodes.find((n) => n.id === id)?.label ?? id;
}
