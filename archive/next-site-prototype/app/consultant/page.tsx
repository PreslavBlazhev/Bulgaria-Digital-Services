import type { Metadata } from "next";
import { Container, Section } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ProjectConsultant } from "@/components/interactive/ProjectConsultant";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbSchema } from "@/lib/structured-data";
import { pageMetadata } from "@/lib/metadata";

export const metadata: Metadata = pageMetadata({
  title: "AI Project Consultant",
  description:
    "A qualification conversation that asks what a scoping call would ask, then produces a structured project brief: solution, modules, integrations, complexity and risks.",
  path: "/consultant",
});

export default function ConsultantPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "AI Project Consultant", path: "/consultant" },
        ])}
      />

      <Section className="pt-16 pb-10 sm:pt-20">
        <Container size="wide">
          <SectionHeading
            as="h1"
            eyebrow="Project consultant"
            title="A scoping conversation, before the scoping call."
            lead="This asks what a first consultation asks — how the business runs, where the money leaks, what has to connect to what — and produces a structured brief from the answers. It is a qualification instrument, not a chatbot, and it does not quote a price."
            className="max-w-3xl"
          />
        </Container>
      </Section>

      <Container size="wide" className="pb-20 sm:pb-28">
        <ProjectConsultant />

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <p className="rounded-lg border border-line bg-surface px-5 py-4 text-xs leading-relaxed text-fg-subtle">
            <span className="font-medium text-fg-muted">
              How this currently works.
            </span>{" "}
            The consultant runs on a deterministic rule engine, so the same
            answers always produce the same brief. That is what makes the output
            defensible in a commercial conversation.
          </p>
          <p className="rounded-lg border border-line bg-surface px-5 py-4 text-xs leading-relaxed text-fg-subtle">
            <span className="font-medium text-fg-muted">Privacy.</span> The
            conversation stays in this browser tab. Nothing is sent to a server
            unless you choose to send the brief with an enquiry.
          </p>
        </div>
      </Container>
    </>
  );
}
