"use client";

import type { Ref } from "react";
import {
  Boxes,
  Cloud,
  Database,
  MonitorCog,
  Server,
  UserRound,
} from "lucide-react";
import type { ArchitectureNode, ArchitectureNodeKind } from "@/types";
import { cn } from "@/lib/cn";

export const NODE_ICONS: Record<
  ArchitectureNodeKind,
  typeof Server
> = {
  entry: UserRound,
  app: Boxes,
  service: Server,
  data: Database,
  external: Cloud,
  ops: MonitorCog,
};

export const NODE_KIND_LABEL: Record<ArchitectureNodeKind, string> = {
  entry: "Entry point",
  app: "Application",
  service: "Service",
  data: "Data",
  external: "External",
  ops: "Operations",
};

/** Kind-specific accent, so the graph is readable without reading labels. */
const KIND_ACCENT: Record<ArchitectureNodeKind, string> = {
  entry: "text-accent",
  app: "text-primary",
  service: "text-primary",
  data: "text-signal-ok",
  external: "text-fg-subtle",
  ops: "text-signal-warn",
};

interface NodeCardProps {
  node: ArchitectureNode;
  selected: boolean;
  dimmed: boolean;
  onSelect: (id: string) => void;
  ref?: Ref<HTMLButtonElement>;
  className?: string;
}

export function ArchitectureNodeCard({
  node,
  selected,
  dimmed,
  onSelect,
  ref,
  className,
}: NodeCardProps) {
  const Icon = NODE_ICONS[node.kind];

  return (
    <button
      ref={ref}
      type="button"
      onClick={() => onSelect(node.id)}
      aria-pressed={selected}
      aria-label={`${node.label} — ${NODE_KIND_LABEL[node.kind]}. ${node.role}`}
      className={cn(
        "group relative z-10 flex w-full cursor-pointer flex-col gap-1.5 rounded-lg border px-3.5 py-3 text-left",
        "transition-[border-color,background-color,box-shadow,opacity] duration-300 ease-[var(--ease-out-quart)]",
        selected
          ? "border-primary/70 bg-surface-raised shadow-[var(--shadow-glow)]"
          : "border-line bg-surface hover:border-primary/45 hover:bg-surface-raised",
        dimmed && "opacity-40",
        className,
      )}
    >
      <span className="flex items-center gap-2">
        <Icon
          aria-hidden="true"
          className={cn("size-3.5 shrink-0", KIND_ACCENT[node.kind])}
        />
        <span className="font-mono text-[0.5625rem] tracking-[0.14em] uppercase text-fg-subtle">
          {NODE_KIND_LABEL[node.kind]}
        </span>
      </span>

      <span className="text-sm leading-tight font-medium text-fg">
        {node.label}
      </span>

      <span className="line-clamp-2 text-xs leading-snug text-fg-subtle">
        {node.role}
      </span>
    </button>
  );
}

/** Expanded detail shown when a node is selected. */
export function ArchitectureNodeDetail({ node }: { node: ArchitectureNode }) {
  const Icon = NODE_ICONS[node.kind];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "mt-0.5 grid size-9 shrink-0 place-items-center rounded-md border border-line bg-surface-sunken",
            KIND_ACCENT[node.kind],
          )}
        >
          <Icon aria-hidden="true" className="size-4" />
        </span>
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-[0.625rem] tracking-[0.14em] uppercase text-fg-subtle">
            {NODE_KIND_LABEL[node.kind]}
          </span>
          <h4 className="text-base font-semibold text-fg">{node.label}</h4>
        </div>
      </div>

      <dl className="flex flex-col gap-3.5">
        <DetailRow term="Role" description={node.role} />
        <DetailRow term="Responsibility" description={node.responsibility} />
        <DetailRow term="Data flow" description={node.dataFlow} />
      </dl>

      <div className="flex flex-col gap-2">
        <span className="font-mono text-[0.625rem] tracking-[0.14em] uppercase text-fg-subtle">
          Technology
        </span>
        <div className="flex flex-wrap gap-1.5">
          {node.technology.map((tech) => (
            <span
              key={tech}
              className="rounded border border-line bg-surface-sunken px-2 py-1 font-mono text-[0.6875rem] text-fg-muted"
            >
              {tech}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  term,
  description,
}: {
  term: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="font-mono text-[0.625rem] tracking-[0.14em] uppercase text-fg-subtle">
        {term}
      </dt>
      <dd className="text-sm leading-relaxed text-fg-muted">{description}</dd>
    </div>
  );
}
