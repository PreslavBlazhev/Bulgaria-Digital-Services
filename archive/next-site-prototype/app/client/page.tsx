import type { Metadata } from "next";
import { Lock } from "lucide-react";
import { Container, Section } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { LinkButton } from "@/components/ui/Button";
import { ClientPortal } from "@/components/interactive/ClientPortal";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbSchema } from "@/lib/structured-data";
import { pageMetadata } from "@/lib/metadata";

export const metadata: Metadata = pageMetadata({
  title: "Client Portal",
  description:
    "How a BDS delivery looks from the client side: progress, milestones, tasks, approvals, infrastructure state and what is waiting on whom.",
  path: "/client",
});

export default function ClientPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Client Portal", path: "/client" },
        ])}
      />

      <Section className="pt-16 pb-10 sm:pt-20">
        <Container size="wide" className="flex flex-col gap-8">
          <SectionHeading
            as="h1"
            eyebrow="Client platform"
            title="Delivery you can see, without asking."
            lead="Most agency projects are opaque between kickoff and launch. The BDS client portal shows progress by workstream, what is blocked, what is waiting on you, and what changed since you last looked."
            className="max-w-3xl"
          />

          <div className="flex flex-col items-start gap-4 rounded-xl border border-line bg-surface px-5 py-4 sm:flex-row sm:items-center">
            <span className="grid size-9 shrink-0 place-items-center rounded-md border border-line bg-surface-sunken text-fg-subtle">
              <Lock aria-hidden="true" className="size-4" />
            </span>
            <p className="text-sm leading-relaxed text-fg-muted">
              <span className="font-medium text-fg">
                Unauthenticated demonstration.
              </span>{" "}
              This is a working interface running on a demo dataset, not a live
              client project. The data layer is isolated in one module so real
              authentication and live records can be connected without changing
              the interface.
            </p>
          </div>
        </Container>
      </Section>

      <Container size="wide" className="pb-16">
        <ClientPortal />
      </Container>

      <Section className="border-t border-line bg-bg-alt">
        <Container size="wide">
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
            <SectionHeading
              eyebrow="Why this exists"
              title="Visibility removes the status meeting."
              lead="The most common friction in a build is not disagreement about the work — it is not knowing where it stands. A portal that shows blocked items and outstanding client dependencies replaces most of that correspondence."
            />

            <div className="flex flex-col gap-3">
              {[
                {
                  title: "Blockers are named, not implied",
                  body: "If a project is waiting on fourteen product images, that appears as a blocked item with a request date — not as a delay nobody explained.",
                },
                {
                  title: "Progress by workstream",
                  body: "A single percentage hides the useful information. Development at 82% with content at 60% tells you where the risk actually is.",
                },
                {
                  title: "Built for real authentication later",
                  body: "The demo dataset lives in one module with a typed shape. Adding sessions and per-client scoping is an integration, not a rebuild.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-lg border border-line bg-surface p-5"
                >
                  <h3 className="mb-2 text-sm font-semibold text-fg">
                    {item.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-fg-muted">
                    {item.body}
                  </p>
                </div>
              ))}

              <LinkButton
                href="/contact"
                variant="secondary"
                withArrow
                className="mt-2 w-fit"
              >
                Start a Project
              </LinkButton>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
