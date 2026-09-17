"use client";

import { useState } from "react";
import type { ArchitectureView } from "@/types";
import { Tabs } from "@/components/ui/Tabs";
import { ArchitectureGraph } from "@/components/interactive/ArchitectureGraph";
import { track } from "@/lib/analytics";

/**
 * The interactive case study engine: the same system seen through several
 * lenses. Switching view swaps both the node set and the edges, so a reader
 * can look at the platform as an engineer, as a customer, or as the staff
 * operating it.
 */
export function ArchitectureExplorer({
  views,
  projectSlug,
}: {
  views: ArchitectureView[];
  projectSlug: string;
}) {
  const [activeId, setActiveId] = useState(views[0]?.id ?? "");
  const active = views.find((v) => v.id === activeId) ?? views[0];

  if (!active) return null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <Tabs
          ariaLabel="Architecture view"
          items={views.map((v) => ({ id: v.id, label: v.name }))}
          active={active.id}
          onChange={(id) => {
            setActiveId(id);
            track("case_study_view_changed", { project: projectSlug, view: id });
          }}
        />

        <p className="max-w-md text-sm leading-relaxed text-fg-muted sm:text-right">
          {active.description}
        </p>
      </div>

      <ArchitectureGraph view={active} />
    </div>
  );
}
