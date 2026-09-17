import type { Metadata } from "next";
import { Container, Section } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { SolutionArchitect } from "@/components/interactive/SolutionArchitect";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbSchema } from "@/lib/structured-data";
import { pageMetadata } from "@/lib/metadata";

export const metadata: Metadata = pageMetadata({
  title: "Solution Architect",
  description:
    "Answer five questions and get a recommended system architecture — generated from your requirements, with a live simulator that redraws the graph as you add modules.",
  path: "/build",
});

export default function BuildPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Solution Architect", path: "/build" },
        ])}
      />

      <Section className="relative overflow-hidden pt-16 pb-10 sm:pt-20">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-grid opacity-25"
          style={{
            maskImage:
              "radial-gradient(ellipse 65% 55% at 30% 0%, black, transparent 70%)",
          }}
        />

        <Container size="wide" className="relative">
          <SectionHeading
            as="h1"
            eyebrow="Solution Architect"
            title="Design your system architecture."
            lead="Five questions, then a real architecture generated from your answers — components, connections, complexity and the engineering considerations that come with it. No price is invented, because a price before discovery is a guess in a nicer font."
            className="max-w-3xl"
          />
        </Container>
      </Section>

      <Container size="wide" className="pb-20 sm:pb-28">
        <div className="rounded-2xl border border-line bg-surface/40 p-6 sm:p-9">
          <SolutionArchitect />
        </div>

        <p className="mt-6 max-w-3xl text-xs leading-relaxed text-fg-subtle">
          Your answers are stored in this browser only, so you can leave and
          come back without losing the configuration. Nothing is transmitted
          anywhere until you choose to send it with an enquiry.
        </p>
      </Container>
    </>
  );
}
