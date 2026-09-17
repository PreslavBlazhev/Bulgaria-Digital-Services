import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getSortedInsights } from "@/data/insights";
import { Container, Section } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Badge } from "@/components/ui/Badge";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbSchema } from "@/lib/structured-data";
import { pageMetadata } from "@/lib/metadata";

export const metadata: Metadata = pageMetadata({
  title: "Insights",
  description:
    "Writing on digital architecture, commerce infrastructure, restaurant technology, analytics and when a business genuinely needs a custom system.",
  path: "/insights",
});

export default function InsightsPage() {
  const insights = getSortedInsights();
  const [lead, ...rest] = insights;

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Insights", path: "/insights" },
        ])}
      />

      <Section className="pt-16 sm:pt-20">
        <Container size="wide" className="flex flex-col gap-12">
          <SectionHeading
            as="h1"
            eyebrow="Insights"
            title="Notes on building systems that businesses run on."
            lead="Written for the person deciding whether to commission something, and for the engineer who will have to maintain it afterwards."
            className="max-w-3xl"
          />

          {lead ? (
            <Link
              href={`/insights/${lead.slug}`}
              className="group flex flex-col gap-6 rounded-xl border border-line bg-surface p-8 transition-[border-color,background-color] duration-300 hover:border-primary/45 hover:bg-surface-raised sm:p-10"
            >
              <div className="flex flex-wrap items-center gap-3">
                <Badge tone="primary">{lead.category}</Badge>
                <span className="font-mono text-[0.6875rem] text-fg-subtle">
                  {lead.publishedAt} · {lead.readingTime}
                </span>
              </div>

              <h2 className="max-w-3xl text-2xl leading-snug font-semibold text-fg transition-colors duration-300 group-hover:text-accent sm:text-3xl">
                {lead.title}
              </h2>

              <p className="max-w-2xl text-base leading-relaxed text-fg-muted">
                {lead.excerpt}
              </p>

              <span className="flex items-center gap-2 text-sm font-medium text-fg-subtle transition-colors duration-300 group-hover:text-accent">
                Read the article
                <ArrowUpRight
                  aria-hidden="true"
                  className="size-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                />
              </span>
            </Link>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            {rest.map((insight) => (
              <Link
                key={insight.slug}
                href={`/insights/${insight.slug}`}
                className="group flex flex-col gap-4 rounded-xl border border-line bg-surface p-6 transition-[border-color,background-color,transform] duration-300 ease-[var(--ease-out-quart)] hover:-translate-y-0.5 hover:border-primary/45 hover:bg-surface-raised"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-mono text-[0.625rem] tracking-[0.12em] text-accent uppercase">
                    {insight.category}
                  </span>
                  <span className="font-mono text-[0.625rem] text-fg-subtle">
                    {insight.readingTime}
                  </span>
                </div>

                <h2 className="text-lg leading-snug font-semibold text-fg transition-colors duration-300 group-hover:text-accent">
                  {insight.title}
                </h2>

                <p className="text-sm leading-relaxed text-fg-muted">
                  {insight.excerpt}
                </p>

                <span className="mt-auto pt-2 font-mono text-[0.625rem] text-fg-subtle">
                  {insight.publishedAt}
                </span>
              </Link>
            ))}
          </div>
        </Container>
      </Section>
    </>
  );
}
