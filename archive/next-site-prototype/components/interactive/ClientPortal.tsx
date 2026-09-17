"use client";

import { useState } from "react";
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  CircleDashed,
  Clock,
  FileText,
  FolderOpen,
  LayoutDashboard,
  LifeBuoy,
  ListChecks,
  Menu,
  Milestone,
  Server,
  ShieldCheck,
  X,
} from "lucide-react";
import {
  PORTAL_ACTIVITY,
  PORTAL_ANALYTICS,
  PORTAL_APPROVALS,
  PORTAL_ASSETS,
  PORTAL_DOCUMENTS,
  PORTAL_INFRASTRUCTURE,
  PORTAL_MILESTONES,
  PORTAL_PROGRESS,
  PORTAL_PROJECT,
  PORTAL_TASKS,
  PORTAL_WAITING,
} from "@/data/client-demo";
import { Progress, ProgressRing } from "@/components/ui/Progress";
import { Badge } from "@/components/ui/Badge";
import { Timeline } from "@/components/ui/Timeline";
import { cn } from "@/lib/cn";

type SectionId =
  | "overview"
  | "milestones"
  | "tasks"
  | "assets"
  | "approvals"
  | "infrastructure"
  | "analytics"
  | "documents"
  | "support";

const SECTIONS: { id: SectionId; label: string; icon: typeof LayoutDashboard }[] =
  [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "milestones", label: "Milestones", icon: Milestone },
    { id: "tasks", label: "Tasks", icon: ListChecks },
    { id: "assets", label: "Assets", icon: FolderOpen },
    { id: "approvals", label: "Approvals", icon: ShieldCheck },
    { id: "infrastructure", label: "Infrastructure", icon: Server },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "documents", label: "Documents", icon: FileText },
    { id: "support", label: "Support", icon: LifeBuoy },
  ];

export function ClientPortal() {
  const [section, setSection] = useState<SectionId>("overview");
  const [navOpen, setNavOpen] = useState(false);

  const current = SECTIONS.find((s) => s.id === section)!;

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface-sunken">
      <div className="grid lg:grid-cols-[210px_minmax(0,1fr)]">
        {/* ---------------- Sidebar ---------------- */}
        <aside
          className={cn(
            "border-line bg-bg-alt lg:block lg:border-r",
            navOpen ? "block border-b" : "hidden",
          )}
        >
          <div className="hidden items-center gap-2.5 border-b border-line px-5 py-4 lg:flex">
            <span className="grid size-7 place-items-center rounded-md border border-primary/40 bg-primary/10 font-mono text-[0.5625rem] font-bold tracking-wider text-accent">
              BDS
            </span>
            <span className="font-mono text-[0.625rem] tracking-[0.1em] text-fg-subtle uppercase">
              Portal
            </span>
          </div>

          <nav aria-label="Portal sections" className="p-3">
            <ul className="flex flex-col gap-0.5">
              {SECTIONS.map((item) => {
                const Icon = item.icon;
                const active = item.id === section;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSection(item.id);
                        setNavOpen(false);
                      }}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex w-full cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition-colors duration-200",
                        active
                          ? "bg-primary/12 font-medium text-accent"
                          : "text-fg-muted hover:bg-surface hover:text-fg",
                      )}
                    >
                      <Icon aria-hidden="true" className="size-3.5 shrink-0" />
                      {item.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        {/* ---------------- Main ---------------- */}
        <div className="flex min-w-0 flex-col">
          {/* Topbar */}
          <header className="flex flex-wrap items-center gap-4 border-b border-line bg-surface px-5 py-4">
            <button
              type="button"
              onClick={() => setNavOpen((v) => !v)}
              aria-label={navOpen ? "Close portal menu" : "Open portal menu"}
              aria-expanded={navOpen}
              className="grid size-9 cursor-pointer place-items-center rounded-md border border-line text-fg-muted lg:hidden"
            >
              {navOpen ? (
                <X aria-hidden="true" className="size-4" />
              ) : (
                <Menu aria-hidden="true" className="size-4" />
              )}
            </button>

            <div className="flex min-w-0 flex-col gap-0.5">
              <h2 className="truncate text-sm font-semibold text-fg">
                {PORTAL_PROJECT.name}
              </h2>
              <span className="font-mono text-[0.625rem] text-fg-subtle">
                {PORTAL_PROJECT.reference} · {current.label}
              </span>
            </div>

            <div className="ml-auto flex items-center gap-3">
              <Badge tone="primary" dot>
                {PORTAL_PROJECT.phase}
              </Badge>
              <span className="hidden font-mono text-[0.6875rem] text-fg-subtle sm:block">
                {PORTAL_PROJECT.overallProgress}%
              </span>
            </div>
          </header>

          {/* Body */}
          <div className="min-h-[34rem] p-5 sm:p-6">
            {section === "overview" ? <Overview /> : null}
            {section === "milestones" ? <Milestones /> : null}
            {section === "tasks" ? <Tasks /> : null}
            {section === "assets" ? <Assets /> : null}
            {section === "approvals" ? <Approvals /> : null}
            {section === "infrastructure" ? <Infrastructure /> : null}
            {section === "analytics" ? <Analytics /> : null}
            {section === "documents" ? <Documents /> : null}
            {section === "support" ? <Support /> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================== */

function Panel({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn("rounded-xl border border-line bg-surface", className)}
    >
      <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-3.5">
        <h3 className="font-mono text-[0.625rem] tracking-[0.14em] text-fg-subtle uppercase">
          {title}
        </h3>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Overview() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <Panel title="Overall progress">
          <div className="flex flex-col items-center gap-5 py-2">
            <ProgressRing
              value={PORTAL_PROJECT.overallProgress}
              label="Complete"
            />
            <div className="flex w-full flex-col gap-1.5 text-center">
              <span className="text-sm font-medium text-fg">
                {PORTAL_PROJECT.phase}
              </span>
              <span className="text-xs text-fg-subtle">
                Started {PORTAL_PROJECT.startedOn} · Target{" "}
                {PORTAL_PROJECT.targetDate}
              </span>
            </div>
          </div>
        </Panel>

        <Panel title="Workstreams">
          <div className="flex flex-col gap-5">
            {PORTAL_PROGRESS.map((item) => (
              <Progress
                key={item.label}
                label={item.label}
                value={item.value}
                note={item.note}
                tone={item.value === 100 ? "ok" : "primary"}
              />
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="Waiting on client"
          action={
            <Badge tone="warn" dot>
              {PORTAL_WAITING.length} items
            </Badge>
          }
        >
          <ul className="flex flex-col gap-3.5">
            {PORTAL_WAITING.map((item) => (
              <li key={item.item} className="flex items-start gap-3">
                <AlertCircle
                  aria-hidden="true"
                  className="mt-0.5 size-4 shrink-0 text-signal-warn"
                />
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-fg">
                    {item.item}
                  </span>
                  <span className="text-xs leading-relaxed text-fg-muted">
                    {item.detail}
                  </span>
                  <span className="font-mono text-[0.625rem] text-fg-subtle">
                    Requested {item.requestedOn}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Recent activity">
          <ul className="flex flex-col gap-3.5">
            {PORTAL_ACTIVITY.map((entry, index) => (
              <li key={index} className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className={cn(
                    "mt-1.5 size-1.5 shrink-0 rounded-full",
                    entry.actor === "BDS" ? "bg-primary" : "bg-signal-ok",
                  )}
                />
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm leading-snug text-fg-muted">
                    {entry.action}
                  </span>
                  <span className="font-mono text-[0.625rem] text-fg-subtle">
                    {entry.actor} · {entry.time}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}

function Milestones() {
  return (
    <Panel title="Delivery milestones">
      <Timeline
        entries={PORTAL_MILESTONES.map((milestone) => ({
          id: milestone.name,
          title: milestone.name,
          meta: milestone.date,
          state: milestone.state,
          content: milestone.detail,
        }))}
      />
    </Panel>
  );
}

const TASK_STATE = {
  done: { label: "Complete", tone: "ok", icon: CheckCircle2 },
  "in-progress": { label: "In progress", tone: "primary", icon: Clock },
  blocked: { label: "Blocked", tone: "warn", icon: AlertCircle },
  queued: { label: "Queued", tone: "neutral", icon: CircleDashed },
} as const;

function Tasks() {
  return (
    <Panel title="Task board">
      <ul className="flex flex-col divide-y divide-line">
        {PORTAL_TASKS.map((task) => {
          const state = TASK_STATE[task.status];
          const Icon = state.icon;

          return (
            <li
              key={task.title}
              className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0"
            >
              <Icon
                aria-hidden="true"
                className={cn(
                  "size-4 shrink-0",
                  state.tone === "ok" && "text-signal-ok",
                  state.tone === "primary" && "text-accent",
                  state.tone === "warn" && "text-signal-warn",
                  state.tone === "neutral" && "text-fg-subtle",
                )}
              />
              <span
                className={cn(
                  "min-w-0 flex-1 text-sm",
                  task.status === "done"
                    ? "text-fg-subtle line-through"
                    : "text-fg-muted",
                )}
              >
                {task.title}
              </span>
              <Badge tone={task.owner === "Client" ? "warn" : "neutral"}>
                {task.owner}
              </Badge>
              <span className="w-20 shrink-0 text-right font-mono text-[0.625rem] text-fg-subtle">
                {task.due}
              </span>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

function Assets() {
  return (
    <Panel title="Project assets">
      <ul className="flex flex-col divide-y divide-line">
        {PORTAL_ASSETS.map((asset) => (
          <li
            key={asset.name}
            className="flex flex-wrap items-center gap-3 py-3.5 first:pt-0 last:pb-0"
          >
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-sm font-medium text-fg">{asset.name}</span>
              <span className="font-mono text-[0.625rem] text-fg-subtle">
                {asset.type}
              </span>
            </div>
            <span className="font-mono text-xs text-fg-muted">
              {asset.count}
            </span>
            <Badge
              tone={
                asset.state === "received"
                  ? "ok"
                  : asset.state === "review"
                    ? "primary"
                    : "warn"
              }
              dot
            >
              {asset.state}
            </Badge>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function Approvals() {
  return (
    <Panel title="Approvals">
      <ul className="flex flex-col divide-y divide-line">
        {PORTAL_APPROVALS.map((approval) => (
          <li
            key={approval.item}
            className="flex flex-wrap items-center gap-3 py-3.5 first:pt-0 last:pb-0"
          >
            <span className="min-w-0 flex-1 text-sm text-fg-muted">
              {approval.item}
            </span>
            <span className="font-mono text-[0.625rem] text-fg-subtle">
              {approval.requestedOn}
            </span>
            <Badge
              tone={
                approval.state === "approved"
                  ? "ok"
                  : approval.state === "awaiting"
                    ? "warn"
                    : "down"
              }
              dot
            >
              {approval.state === "changes-requested"
                ? "Changes requested"
                : approval.state}
            </Badge>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function Infrastructure() {
  return (
    <Panel title="Infrastructure">
      <ul className="grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2">
        {PORTAL_INFRASTRUCTURE.map((item) => (
          <li
            key={item.name}
            className="flex items-start justify-between gap-3 bg-surface-sunken p-4"
          >
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-fg">{item.name}</span>
              <span className="text-xs text-fg-muted">{item.value}</span>
            </div>
            <span
              aria-label={item.state}
              className={cn(
                "mt-1.5 size-1.5 shrink-0 rounded-full",
                item.state === "operational" &&
                  "bg-signal-ok shadow-[0_0_8px_var(--color-signal-ok)]",
                item.state === "pending" && "bg-signal-warn",
                item.state === "configured" && "bg-primary",
              )}
            />
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function Analytics() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3 rounded-lg border border-signal-warn/30 bg-signal-warn/[0.06] p-4">
        <AlertCircle
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0 text-signal-warn"
        />
        <p className="text-xs leading-relaxed text-fg-muted">
          {PORTAL_ANALYTICS.note}
        </p>
      </div>

      <Panel title="Staging measurement">
        <dl className="grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {PORTAL_ANALYTICS.rows.map((row) => (
            <div
              key={row.label}
              className="flex flex-col gap-1.5 bg-surface-sunken p-4"
            >
              <dt className="text-xs text-fg-muted">{row.label}</dt>
              <dd className="font-display text-xl font-semibold tabular-nums text-fg">
                {row.value}
              </dd>
              <span className="font-mono text-[0.625rem] text-fg-subtle">
                {row.change}
              </span>
            </div>
          ))}
        </dl>
      </Panel>
    </div>
  );
}

function Documents() {
  return (
    <Panel title="Documents">
      <ul className="flex flex-col divide-y divide-line">
        {PORTAL_DOCUMENTS.map((doc) => (
          <li
            key={doc.name}
            className="flex items-center gap-3 py-3.5 first:pt-0 last:pb-0"
          >
            <FileText
              aria-hidden="true"
              className="size-4 shrink-0 text-fg-subtle"
            />
            <span className="min-w-0 flex-1 text-sm text-fg-muted">
              {doc.name}
            </span>
            <span className="font-mono text-[0.625rem] text-fg-subtle">
              {doc.kind}
            </span>
            <span className="w-24 shrink-0 text-right font-mono text-[0.625rem] text-fg-subtle">
              {doc.updated}
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function Support() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="Support">
        <div className="flex flex-col gap-4">
          <p className="text-sm leading-relaxed text-fg-muted">
            Every BDS project has one named contact for its whole lifetime.
            There is no ticket queue and no account manager relaying questions
            to somebody who knows the answer.
          </p>
          <dl className="flex flex-col gap-3 border-t border-line pt-4">
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-xs text-fg-subtle">Response target</dt>
              <dd className="text-sm text-fg-muted">Within one working day</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-xs text-fg-subtle">Production incidents</dt>
              <dd className="text-sm text-fg-muted">Same day</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-xs text-fg-subtle">Working languages</dt>
              <dd className="text-sm text-fg-muted">Bulgarian, English</dd>
            </div>
          </dl>
        </div>
      </Panel>

      <Panel title="Escalation">
        <ul className="flex flex-col gap-3.5">
          {[
            "Production down — reported immediately, worked until resolved.",
            "Data integrity issue — investigated before any new work continues.",
            "Blocked delivery — flagged in the portal with the specific dependency named.",
            "Scope change — priced and scheduled rather than absorbed silently.",
          ].map((item) => (
            <li key={item} className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className="mt-1.5 size-1 shrink-0 rounded-full bg-primary"
              />
              <span className="text-sm leading-relaxed text-fg-muted">
                {item}
              </span>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
