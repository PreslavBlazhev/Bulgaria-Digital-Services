import type { Metadata } from "next";
import { Container, Section } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { LinkButton } from "@/components/ui/Button";
import { ProcessTimeline } from "@/components/sections/ProcessTimeline";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbSchema } from "@/lib/structured-data";
import { pageMetadata } from "@/lib/metadata";

export const metadata: Metadata = pageMetadata({
  title: "The BDS Build System",
  description:
    "Seven stages from discovery to evolution. The order is fixed because data models are expensive to change later and measurement cannot be retrofitted honestly.",
  path: "/process",
});

export default function ProcessPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Process", path: "/process" },
        ])}
      />

      <Section className="pt-16 sm:pt-20">
        <Container size="wide" className="flex flex-col gap-14">
          <SectionHeading
            as="h1"
            eyebrow="The BDS Build System"
            title="Seven stages, in this order, every time."
            lead="The sequence is the part that matters. Data models are decided before interfaces because they are expensive to change afterwards. Measurement is designed before launch because it cannot be added honestly later. Verification happens before deployment because the alternative is verification by customer."
            className="max-w-3xl"
          />

          <ProcessTimeline />
        </Container>
      </Section>

      <Section className="border-t border-line bg-bg-alt">
        <Container size="wide">
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
            <SectionHeading
              eyebrow="What this is not"
              title="A process is a constraint, not a sales artefact."
              lead="Most published agency processes are the same five stages with different adjectives. This one is written down because it is enforced — and because the ordering carries real consequences."
            />

            <div className="flex flex-col gap-3">
              {[
                {
                  q: "What if the client already knows what they want?",
                  a: "Discovery gets shorter, not skipped. The requirement usually survives; the assumptions underneath it frequently do not.",
                },
                {
                  q: "Can design and engineering run in parallel?",
                  a: "Partly. Component work overlaps engineering comfortably. Data modelling does not — building interfaces against an unsettled schema produces rework in both.",
                },
                {
                  q: "What happens when scope changes mid-build?",
                  a: "It gets priced and scheduled as a change rather than absorbed silently. Absorbed changes are how projects quietly become late.",
                },
                {
                  q: "Is the last stage real, or is it a retainer pitch?",
                  a: "It is real work with an exit. Evolution means acting on what the system measures. If nothing needs changing, nothing gets billed.",
                },
              ].map((item) => (
                <div
                  key={item.q}
                  className="rounded-lg border border-line bg-surface p-5"
                >
                  <h3 className="mb-2 text-sm font-semibold text-fg">
                    {item.q}
                  </h3>
                  <p className="text-sm leading-relaxed text-fg-muted">
                    {item.a}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </Section>

      <Section>
        <Container className="flex flex-col items-center gap-7 text-center">
          <SectionHeading
            align="center"
            eyebrow="Start"
            title="Stage 01 is a conversation."
            lead="Discovery begins by describing what your operation currently does, including the parts held together by somebody remembering to do them."
          />
          <div className="flex flex-col gap-3 sm:flex-row">
            <LinkButton href="/contact" size="lg" withArrow>
              Start a Project
            </LinkButton>
            <LinkButton href="/consultant" size="lg" variant="secondary">
              Talk to the consultant first
            </LinkButton>
          </div>
        </Container>
      </Section>
    </>
  );
}
