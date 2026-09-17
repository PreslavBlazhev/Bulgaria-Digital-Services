"use client";

import { useState } from "react";
import Link from "next/link";
import { CircleSlash, FolderOpen } from "lucide-react";
import { TECHNOLOGIES, TECH_CATEGORIES } from "@/data/technology";
import { PROJECTS } from "@/data/projects";
import type { Technology } from "@/types";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/cn";

/** Maps a `usedIn` entry to a case study route when one exists. */
function projectHref(name: string): string | null {
  const match = PROJECTS.find((p) => p.name === name);
  return match ? `/work/${match.slug}` : null;
}

export function TechnologyExplorer() {
  const [selected, setSelected] = useState<Technology | null>(null);

  return (
    <>
      <div className="flex flex-col gap-12">
        {TECH_CATEGORIES.map((category) => {
          const items = TECHNOLOGIES.filter((t) => t.category === category);
          if (items.length === 0) return null;

          return (
            <section key={category} className="flex flex-col gap-5">
              <div className="flex items-center gap-4">
                <h2 className="font-mono text-[0.6875rem] tracking-[0.16em] text-accent uppercase">
                  {category}
                </h2>
                <span
                  aria-hidden="true"
                  className="h-px flex-1 rule-fade opacity-60"
                />
                <span className="font-mono text-[0.6875rem] text-fg-subtle tabular-nums">
                  {String(items.length).padStart(2, "0")}
                </span>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((tech) => {
                  const shipped = tech.usedIn.length > 0;

                  return (
                    <button
                      key={tech.name}
                      type="button"
                      onClick={() => setSelected(tech)}
                      className={cn(
                        "group flex cursor-pointer flex-col gap-2.5 rounded-lg border border-line bg-surface p-4 text-left",
                        "transition-[border-color,background-color,transform] duration-300 ease-[var(--ease-out-quart)]",
                        "hover:-translate-y-0.5 hover:border-primary/45 hover:bg-surface-raised",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-sm font-semibold text-fg transition-colors group-hover:text-accent">
                          {tech.name}
                        </span>
                        <span
                          aria-hidden="true"
                          className={cn(
                            "mt-1 size-1.5 shrink-0 rounded-full",
                            shipped
                              ? "bg-signal-ok shadow-[0_0_8px_var(--color-signal-ok)]"
                              : "bg-line-strong",
                          )}
                        />
                      </div>

                      <p className="line-clamp-2 text-xs leading-relaxed text-fg-subtle">
                        {tech.what}
                      </p>

                      <span className="mt-auto pt-1 font-mono text-[0.625rem] tracking-[0.08em] text-fg-subtle uppercase">
                        {shipped
                          ? `${tech.usedIn.length} project${tech.usedIn.length > 1 ? "s" : ""}`
                          : "Selected, not yet shipped"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <Modal
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected?.name ?? ""}
        description={selected?.category}
      >
        {selected ? (
          <div className="flex flex-col gap-6">
            <Block label="What it is" body={selected.what} />
            <Block label="Why BDS uses it" body={selected.why} />

            <div className="flex flex-col gap-2.5">
              <span className="font-mono text-[0.625rem] tracking-[0.14em] text-fg-subtle uppercase">
                Where BDS has used it
              </span>

              {selected.usedIn.length > 0 ? (
                <ul className="flex flex-col gap-1.5">
                  {selected.usedIn.map((name) => {
                    const href = projectHref(name);
                    return (
                      <li key={name}>
                        {href ? (
                          <Link
                            href={href}
                            className="flex items-center gap-2 rounded-md border border-line bg-surface-sunken px-3 py-2 text-sm text-fg-muted transition-colors hover:border-primary/45 hover:text-accent"
                          >
                            <FolderOpen
                              aria-hidden="true"
                              className="size-3.5 shrink-0"
                            />
                            {name}
                          </Link>
                        ) : (
                          <span className="flex items-center gap-2 rounded-md border border-line bg-surface-sunken px-3 py-2 text-sm text-fg-muted">
                            <FolderOpen
                              aria-hidden="true"
                              className="size-3.5 shrink-0"
                            />
                            {name}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="flex items-start gap-2 rounded-md border border-dashed border-line px-3 py-2.5 text-sm text-fg-subtle">
                  <CircleSlash
                    aria-hidden="true"
                    className="mt-0.5 size-3.5 shrink-0"
                  />
                  Selected for the stack but not yet used in a delivered
                  project. Listed honestly rather than padded with a claim.
                </p>
              )}
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
}

function Block({ label, body }: { label: string; body: string }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="font-mono text-[0.625rem] tracking-[0.14em] text-fg-subtle uppercase">
        {label}
      </span>
      <p className="text-sm leading-relaxed text-fg-muted">{body}</p>
    </div>
  );
}
