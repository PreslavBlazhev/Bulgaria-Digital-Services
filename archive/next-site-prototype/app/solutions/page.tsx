import type { Metadata } from "next";
import { Container, Section } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { LinkButton } from "@/components/ui/Button";
import { SolutionsGrid } from "@/components/sections/SolutionsGrid";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbSchema } from "@/lib/structured-data";
import { pageMetadata } from "@/lib/metadata";

export const metadata: Metadata = pageMetadata({
  title: "Solutions",
  description:
    "Six engineering disciplines: digital presence, commerce, business systems, automation, analytics and restaurant technology. Built as connected infrastructure rather than separate projects.",
  path: "/solutions",
});

export default function SolutionsPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Solutions", path: "/solutions" },
        ])}
      />

      <Section className="pt-16 sm:pt-20">
        <Container size="wide" className="flex flex-col gap-14">
          <SectionHeading
            as="h1"
            eyebrow="Solutions"
            title="From digital presence to operational infrastructure."
            lead="These are not six products. They are six kinds of engineering that connect to each other, and most businesses need one built properly with the others wired into it."
            className="max-w-3xl"
          />

          <SolutionsGrid />
        </Container>
      </Section>

      <Section className="border-t border-line bg-bg-alt">
        <Container size="wide">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
            <SectionHeading
              eyebrow="How scope is decided"
              title="The order of work is not negotiable, the scope is."
              lead="Data models come before interfaces. Measurement comes before launch. Within that, what gets built first is decided by where the business is currently losing time or money — not by what is easiest to demonstrate."
            />

            <div className="flex flex-col gap-4">
              {[
                {
                  title: "Start with the constraint",
                  body: "The part of the operation that breaks first under growth is the part that gets engineered first. Everything else connects to it later.",
                },
                {
                  title: "Build for the second year",
                  body: "A data model that only fits today's process has to be rebuilt when the process changes. Modelling the general case costs slightly more now and considerably less later.",
                },
                {
                  title: "Leave the boring problems alone",
                  body: "Accounting, payroll and email are solved. BDS builds the part that is specific to your business and integrates the rest.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-lg border border-line bg-surface p-6"
                >
                  <h3 className="mb-2 text-base font-semibold text-fg">
                    {item.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-fg-muted">
                    {item.body}
                  </p>
                </div>
              ))}

              <LinkButton href="/build" variant="secondary" withArrow className="mt-2 w-fit">
                Design your architecture
              </LinkButton>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
