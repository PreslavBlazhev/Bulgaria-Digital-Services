import type { Metadata } from "next";
import { Container, Section } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { LinkButton } from "@/components/ui/Button";
import { TechnologyExplorer } from "@/components/sections/TechnologyExplorer";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbSchema } from "@/lib/structured-data";
import { pageMetadata } from "@/lib/metadata";

export const metadata: Metadata = pageMetadata({
  title: "Engineering Stack",
  description:
    "The technologies BDS builds with, why each one is used, and which delivered projects they run in. Nothing listed without a working reason.",
  path: "/technology",
});

const PRINCIPLES = [
  {
    title: "Boring where it matters",
    body: "Databases, authentication and payments are chosen for predictability, not novelty. Innovation belongs in what the system does, not in whether it stays up.",
  },
  {
    title: "One language across the boundary",
    body: "TypeScript on both sides means validation logic is shared rather than reimplemented, and a shape mismatch is a build failure instead of a support ticket.",
  },
  {
    title: "Replaceable by design",
    body: "Payment providers, hosting and analytics sit behind interfaces. Commercial decisions should not require rewriting checkout.",
  },
  {
    title: "No dependency without a reason",
    body: "Every package is weight a visitor downloads and a surface someone has to maintain. If forty lines replace a library, it is forty lines.",
  },
];

export default function TechnologyPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Technology", path: "/technology" },
        ])}
      />

      <Section className="pt-16 sm:pt-20">
        <Container size="wide" className="flex flex-col gap-14">
          <SectionHeading
            as="h1"
            eyebrow="Technology"
            title="Engineering Stack"
            lead="Every technology here has a working reason to be on the list. Select any of them for what it is, why BDS uses it and which delivered projects it runs in — including the ones marked honestly as selected but not yet shipped."
            className="max-w-3xl"
          />

          <div className="flex flex-wrap items-center gap-6 rounded-lg border border-line bg-surface px-5 py-4">
            <Legend
              tone="ok"
              label="Running in a delivered project"
            />
            <Legend tone="neutral" label="Selected for the stack, not yet shipped" />
          </div>

          <TechnologyExplorer />
        </Container>
      </Section>

      <Section className="border-t border-line bg-bg-alt">
        <Container size="wide" className="flex flex-col gap-12">
          <SectionHeading
            eyebrow="Selection principles"
            title="How a technology gets onto this page."
            className="max-w-2xl"
          />

          <div className="grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2">
            {PRINCIPLES.map((principle) => (
              <div key={principle.title} className="flex flex-col gap-2.5 bg-surface p-6">
                <h3 className="text-base font-semibold text-fg">
                  {principle.title}
                </h3>
                <p className="text-sm leading-relaxed text-fg-muted">
                  {principle.body}
                </p>
              </div>
            ))}
          </div>

          <div className="flex flex-col items-start gap-5 rounded-xl border border-line bg-surface p-7 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-xl text-sm leading-relaxed text-fg-muted">
              This site runs on the same stack described above — Next.js,
              TypeScript, Tailwind and a typed content layer, with consent-gated
              measurement. It is the reference implementation, not a brochure
              about one.
            </p>
            <LinkButton href="/work" variant="secondary" withArrow>
              See it in production
            </LinkButton>
          </div>
        </Container>
      </Section>
    </>
  );
}

function Legend({ tone, label }: { tone: "ok" | "neutral"; label: string }) {
  return (
    <span className="flex items-center gap-2.5">
      <span
        aria-hidden="true"
        className={
          tone === "ok"
            ? "size-1.5 rounded-full bg-signal-ok shadow-[0_0_8px_var(--color-signal-ok)]"
            : "size-1.5 rounded-full bg-line-strong"
        }
      />
      <span className="text-xs text-fg-muted">{label}</span>
    </span>
  );
}
