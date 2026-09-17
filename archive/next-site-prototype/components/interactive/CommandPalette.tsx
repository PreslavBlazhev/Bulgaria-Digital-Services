"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowRight,
  Boxes,
  CornerDownLeft,
  FileText,
  FolderOpen,
  Home,
  Layers,
  MessageSquare,
  Search,
  Send,
  Sparkles,
} from "lucide-react";
import { INSIGHTS } from "@/data/insights";
import { PROJECTS } from "@/data/projects";
import { SOLUTIONS } from "@/data/solutions";
import { cn } from "@/lib/cn";
import { track } from "@/lib/analytics";

interface CommandItem {
  id: string;
  label: string;
  hint: string;
  group: string;
  href: string;
  icon: typeof Home;
  /** Extra terms that should match this item without being displayed. */
  keywords?: string;
}

const PRIMARY_COMMANDS: CommandItem[] = [
  { id: "home", label: "Go Home", hint: "Overview", group: "Navigate", href: "/", icon: Home },
  { id: "solutions", label: "Explore Solutions", hint: "What BDS builds", group: "Navigate", href: "/solutions", icon: Layers },
  { id: "work", label: "Open Work", hint: "Case studies", group: "Navigate", href: "/work", icon: FolderOpen },
  { id: "pizza", label: "View Pizza Pazzo", hint: "Restaurant infrastructure", group: "Navigate", href: "/work/pizza-pazzo", icon: FolderOpen },
  { id: "technology", label: "Open Technology", hint: "Engineering stack", group: "Navigate", href: "/technology", icon: Boxes },
  { id: "process", label: "Open Process", hint: "BDS Build System", group: "Navigate", href: "/process", icon: Activity },
  { id: "build", label: "Open Solution Architect", hint: "Design your architecture", group: "Platform", href: "/build", icon: Sparkles, keywords: "builder project configure modules" },
  { id: "consultant", label: "Open AI Consultant", hint: "Generate a project brief", group: "Platform", href: "/consultant", icon: MessageSquare, keywords: "ai chat brief qualify" },
  { id: "client", label: "Open Client Portal", hint: "Delivery dashboard demo", group: "Platform", href: "/client", icon: Layers, keywords: "dashboard portal login" },
  { id: "status", label: "System Status", hint: "Infrastructure state", group: "Platform", href: "/status", icon: Activity, keywords: "system uptime operational health" },
  { id: "contact", label: "Start a Project", hint: "Send an enquiry", group: "Contact", href: "/contact", icon: Send },
  { id: "about", label: "Contact BDS", hint: "About the company", group: "Contact", href: "/about", icon: FileText },
];

/** Typing either of these surfaces the inline system readout. */
const SYSTEM_TRIGGERS = ["system", "status"];

export function CommandPalette({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const index = useMemo<CommandItem[]>(() => {
    const solutionItems: CommandItem[] = SOLUTIONS.map((s) => ({
      id: `solution-${s.slug}`,
      label: s.name,
      hint: s.positioning,
      group: "Solutions",
      href: `/solutions/${s.slug}`,
      icon: Layers,
      keywords: s.summary,
    }));

    const projectItems: CommandItem[] = PROJECTS.map((p) => ({
      id: `project-${p.slug}`,
      label: p.name,
      hint: p.category,
      group: "Work",
      href: `/work/${p.slug}`,
      icon: FolderOpen,
      keywords: p.tagline,
    }));

    const insightItems: CommandItem[] = INSIGHTS.map((i) => ({
      id: `insight-${i.slug}`,
      label: i.title,
      hint: i.category,
      group: "Insights",
      href: `/insights/${i.slug}`,
      icon: FileText,
      keywords: i.excerpt,
    }));

    return [
      ...PRIMARY_COMMANDS,
      ...solutionItems,
      ...projectItems,
      ...insightItems,
    ];
  }, []);

  const normalized = query.trim().toLowerCase();
  const showSystem = SYSTEM_TRIGGERS.includes(normalized);

  const results = useMemo(() => {
    if (!normalized) return PRIMARY_COMMANDS;
    return index.filter((item) =>
      `${item.label} ${item.hint} ${item.group} ${item.keywords ?? ""}`
        .toLowerCase()
        .includes(normalized),
    );
  }, [index, normalized]);

  // Highlight returns to the first row whenever the result set changes, and
  // the palette starts empty each time it opens. Both derive from values we
  // already have, so they are adjusted during render rather than in effects.
  const [lastQuery, setLastQuery] = useState(normalized);
  if (lastQuery !== normalized) {
    setLastQuery(normalized);
    setActiveIndex(0);
  }

  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (!open) {
      setQuery("");
      setActiveIndex(0);
    }
  }

  useEffect(() => {
    if (!open) return;

    const timer = window.setTimeout(() => inputRef.current?.focus(), 30);
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = overflow;
    };
  }, [open]);

  // Keep the highlighted row inside the scroll viewport.
  useEffect(() => {
    if (!open) return;
    const active = listRef.current?.querySelector<HTMLElement>(
      '[data-active="true"]',
    );
    active?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  if (!open) return null;

  function go(item: CommandItem) {
    track("command_palette_navigate", { destination: item.href });
    onClose();
    router.push(item.href);
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => (results.length ? (i + 1) % results.length : 0));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) =>
        results.length ? (i - 1 + results.length) % results.length : 0,
      );
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const item = results[activeIndex];
      if (item) go(item);
    }
  }

  const grouped = results.reduce<Record<string, CommandItem[]>>((acc, item) => {
    (acc[item.group] ??= []).push(item);
    return acc;
  }, {});

  let flatIndex = -1;

  return (
    <div className="fixed inset-0 z-110 flex items-start justify-center px-4 pt-[12vh] pb-6">
      <div
        className="absolute inset-0 bg-bg/85 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onKeyDown={onKeyDown}
        className="relative flex max-h-[70vh] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-line-strong bg-surface-raised shadow-[var(--shadow-raised)] animate-fade-up"
      >
        <div className="flex shrink-0 items-center gap-3 border-b border-line px-4">
          <Search aria-hidden="true" className="size-4 shrink-0 text-fg-subtle" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls="bds-command-results"
            aria-autocomplete="list"
            placeholder="Search pages, solutions, work, insights…"
            className="h-14 w-full bg-transparent text-sm text-fg placeholder:text-fg-subtle focus:outline-none"
          />
          <kbd className="hidden shrink-0 rounded border border-line px-1.5 py-0.5 font-mono text-[0.625rem] text-fg-subtle sm:block">
            ESC
          </kbd>
        </div>

        <div
          ref={listRef}
          id="bds-command-results"
          role="listbox"
          aria-label="Results"
          className="flex-1 overflow-y-auto overscroll-contain p-2"
        >
          {showSystem ? <SystemReadout /> : null}

          {results.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-fg-subtle">
              No matches for “{query}”.
            </p>
          ) : (
            Object.entries(grouped).map(([group, items]) => (
              <div key={group} className="mb-1">
                <div className="px-3 py-2 font-mono text-[0.625rem] tracking-[0.14em] text-fg-subtle uppercase">
                  {group}
                </div>
                {items.map((item) => {
                  flatIndex += 1;
                  const isActive = flatIndex === activeIndex;
                  const Icon = item.icon;
                  const myIndex = flatIndex;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      data-active={isActive}
                      onMouseMove={() => setActiveIndex(myIndex)}
                      onClick={() => go(item)}
                      className={cn(
                        "flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors duration-150",
                        isActive ? "bg-primary/12" : "hover:bg-surface",
                      )}
                    >
                      <Icon
                        aria-hidden="true"
                        className={cn(
                          "size-4 shrink-0",
                          isActive ? "text-accent" : "text-fg-subtle",
                        )}
                      />
                      <span className="flex min-w-0 flex-col">
                        <span
                          className={cn(
                            "truncate text-sm font-medium",
                            isActive ? "text-fg" : "text-fg-muted",
                          )}
                        >
                          {item.label}
                        </span>
                        <span className="truncate text-xs text-fg-subtle">
                          {item.hint}
                        </span>
                      </span>
                      {isActive ? (
                        <ArrowRight
                          aria-hidden="true"
                          className="ml-auto size-3.5 shrink-0 text-accent"
                        />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className="flex shrink-0 items-center gap-4 border-t border-line px-4 py-2.5 text-fg-subtle">
          <LegendKey icon={<CornerDownLeft className="size-3" />} label="open" />
          <LegendKey label="↑ ↓ navigate" />
          <span className="ml-auto font-mono text-[0.625rem] tracking-wider">
            BDS
          </span>
        </div>
      </div>
    </div>
  );
}

function LegendKey({
  icon,
  label,
}: {
  icon?: React.ReactNode;
  label: string;
}) {
  return (
    <span className="flex items-center gap-1.5 font-mono text-[0.625rem] tracking-wider">
      {icon ? (
        <span className="grid size-4 place-items-center rounded border border-line">
          {icon}
        </span>
      ) : null}
      {label}
    </span>
  );
}

/**
 * The `system` / `status` readout. Deliberately understated — a status line,
 * not a terminal toy.
 */
function SystemReadout() {
  const rows = [
    { key: "Infrastructure", value: "BDS Digital Infrastructure" },
    { key: "Status", value: "Operational" },
    { key: "Environment", value: "Production" },
    { key: "Systems", value: "Online" },
  ];

  return (
    <div className="mb-2 rounded-lg border border-primary/25 bg-primary/[0.06] p-4">
      <div className="mb-3 flex items-center gap-2">
        <span
          aria-hidden="true"
          className="size-1.5 rounded-full bg-signal-ok shadow-[0_0_8px_var(--color-signal-ok)]"
        />
        <span className="font-mono text-[0.625rem] tracking-[0.14em] text-accent uppercase">
          System
        </span>
      </div>
      <dl className="grid gap-1.5">
        {rows.map((row) => (
          <div key={row.key} className="flex items-baseline justify-between gap-4">
            <dt className="font-mono text-[0.6875rem] text-fg-subtle">
              {row.key}
            </dt>
            <dd className="font-mono text-[0.6875rem] text-fg-muted">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
