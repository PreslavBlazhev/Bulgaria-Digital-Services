import type { Metadata } from "next";
import { Container, Section } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Badge } from "@/components/ui/Badge";
import { STATUS_COMPONENTS, STATUS_HISTORY } from "@/data/status";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbSchema } from "@/lib/structured-data";
import { pageMetadata } from "@/lib/metadata";
import { cn } from "@/lib/cn";

export const metadata: Metadata = pageMetadata({
  title: "Systems Status",
  description:
    "Operational state of BDS digital infrastructure: corporate website, client platform, project builder, analytics and API infrastructure.",
  path: "/status",
});

const STATE_META = {
  operational: { label: "Operational", tone: "ok" },
  degraded: { label: "Degraded", tone: "warn" },
  maintenance: { label: "Maintenance", tone: "primary" },
  down: { label: "Down", tone: "down" },
} as const;

export default function StatusPage() {
  const allOperational = STATUS_COMPONENTS.every(
    (c) => c.state === "operational",
  );

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Status", path: "/status" },
        ])}
      />

      <Section className="pt-16 sm:pt-20">
        <Container className="flex flex-col gap-10">
          <SectionHeading
            as="h1"
            eyebrow="Systems status"
            title="BDS Digital Infrastructure"
          />

          {/* Overall banner */}
          <div
            className={cn(
              "flex items-center gap-4 rounded-xl border p-6",
              allOperational
                ? "border-signal-ok/30 bg-signal-ok/[0.06]"
                : "border-signal-warn/30 bg-signal-warn/[0.06]",
            )}
          >
            <span className="relative grid size-10 shrink-0 place-items-center">
              <span
                aria-hidden="true"
                className={cn(
                  "absolute inset-0 rounded-full opacity-20",
                  allOperational ? "bg-signal-ok" : "bg-signal-warn",
                )}
              />
              <span
                aria-hidden="true"
                className={cn(
                  "size-2.5 rounded-full",
                  allOperational
                    ? "bg-signal-ok shadow-[0_0_12px_var(--color-signal-ok)]"
                    : "bg-signal-warn",
                )}
              />
            </span>

            <div className="flex flex-col gap-0.5">
              <h2 className="text-lg font-semibold text-fg">
                {allOperational
                  ? "All Systems Operational"
                  : "Partial Service Disruption"}
              </h2>
              <span className="font-mono text-[0.6875rem] text-fg-subtle">
                Environment: Production · Region: EU
              </span>
            </div>
          </div>

          {/* Components */}
          <div className="flex flex-col gap-3">
            {STATUS_COMPONENTS.map((component) => {
              const meta = STATE_META[component.state];
              return (
                <div
                  key={component.name}
                  className="flex flex-wrap items-center gap-4 rounded-lg border border-line bg-surface px-5 py-4"
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="text-sm font-medium text-fg">
                      {component.name}
                    </span>
                    <span className="text-xs leading-snug text-fg-muted">
                      {component.description}
                    </span>
                  </div>

                  <span className="font-mono text-xs tabular-nums text-fg-subtle">
                    {component.uptime}
                  </span>

                  <Badge tone={meta.tone} dot>
                    {meta.label}
                  </Badge>
                </div>
              );
            })}
          </div>

          {/* History */}
          <div className="grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            {STATUS_HISTORY.map((entry) => (
              <div
                key={entry.period}
                className="flex flex-col gap-1.5 bg-surface p-5"
              >
                <span className="font-mono text-[0.625rem] tracking-[0.12em] text-fg-subtle uppercase">
                  {entry.period}
                </span>
                <span className="text-sm text-fg-muted">{entry.value}</span>
              </div>
            ))}
          </div>

          <p className="rounded-lg border border-dashed border-line px-5 py-4 text-xs leading-relaxed text-fg-subtle">
            <span className="font-medium text-fg-muted">
              Reporting note.
            </span>{" "}
            This page currently reports a static demonstration state. Components
            are modelled in the shape a monitoring API returns, so connecting a
            live source replaces the data export without changing this page.
            Figures shown are not measured uptime.
          </p>
        </Container>
      </Section>
    </>
  );
}
