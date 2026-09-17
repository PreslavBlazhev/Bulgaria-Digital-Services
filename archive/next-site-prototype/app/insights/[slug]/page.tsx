import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { INSIGHTS, getInsight, getSortedInsights } from "@/data/insights";
import type { InsightBlock } from "@/types";
import { Container, Section } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { JsonLd } from "@/components/seo/JsonLd";
import { articleSchema, breadcrumbSchema } from "@/lib/structured-data";
import { pageMetadata } from "@/lib/metadata";

export function generateStaticParams() {
  return INSIGHTS.map((insight) => ({ slug: insight.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const insight = getInsight(slug);
  if (!insight) return {};

  return pageMetadata({
    title: insight.title,
    description: insight.excerpt,
    path: `/insights/${insight.slug}`,
    type: "article",
    publishedTime: insight.date,
  });
}

export default async function InsightPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const insight = getInsight(slug);
  if (!insight) notFound();

  const others = getSortedInsights()
    .filter((i) => i.slug !== insight.slug)
    .slice(0, 2);

  return (
    <>
      <JsonLd
        data={[
          articleSchema(insight),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Insights", path: "/insights" },
            { name: insight.title, path: `/insights/${insight.slug}` },
          ]),
        ]}
      />

      <article>
        {/* Header */}
        <section className="border-b border-line">
          <Container className="py-16 sm:py-20">
            <nav aria-label="Breadcrumb" className="mb-8">
              <ol className="flex items-center gap-2 font-mono text-[0.6875rem] tracking-[0.08em] text-fg-subtle uppercase">
                <li>
                  <Link href="/insights" className="hover:text-accent">
                    Insights
                  </Link>
                </li>
                <li aria-hidden="true">/</li>
                <li className="truncate text-fg-muted">{insight.category}</li>
              </ol>
            </nav>

            <div className="flex flex-col gap-6">
              <div className="flex flex-wrap items-center gap-3">
                <Badge tone="primary">{insight.category}</Badge>
                <span className="font-mono text-[0.6875rem] text-fg-subtle">
                  {insight.publishedAt} · {insight.readingTime} read
                </span>
              </div>

              <h1 className="text-3xl leading-[1.12] font-semibold tracking-tight text-fg sm:text-4xl lg:text-[2.75rem]">
                {insight.title}
              </h1>

              <p className="max-w-2xl text-lg leading-relaxed text-fg-muted">
                {insight.excerpt}
              </p>
            </div>
          </Container>
        </section>

        {/* Body */}
        <Container size="narrow" className="py-14 sm:py-16">
          <div className="flex flex-col gap-6">
            {insight.body.map((block, index) => (
              <Block key={index} block={block} />
            ))}
          </div>
        </Container>
      </article>

      {/* Continue reading */}
      <Section className="border-t border-line bg-bg-alt">
        <Container size="wide" className="flex flex-col gap-10">
          <SectionHeading eyebrow="Continue" title="More insights" />

          <div className="grid gap-3 sm:grid-cols-2">
            {others.map((other) => (
              <Link
                key={other.slug}
                href={`/insights/${other.slug}`}
                className="group flex flex-col gap-3 rounded-xl border border-line bg-surface p-6 transition-[border-color,background-color] duration-300 hover:border-primary/45 hover:bg-surface-raised"
              >
                <span className="font-mono text-[0.625rem] tracking-[0.12em] text-accent uppercase">
                  {other.category}
                </span>
                <h3 className="text-base leading-snug font-semibold text-fg transition-colors group-hover:text-accent">
                  {other.title}
                </h3>
                <p className="text-sm leading-relaxed text-fg-muted">
                  {other.excerpt}
                </p>
                <span className="mt-auto flex items-center gap-2 pt-2 text-sm text-fg-subtle transition-colors group-hover:text-accent">
                  Read
                  <ArrowRight
                    aria-hidden="true"
                    className="size-3.5 transition-transform group-hover:translate-x-0.5"
                  />
                </span>
              </Link>
            ))}
          </div>

          <div className="flex flex-col items-start gap-5 rounded-xl border border-line bg-surface p-7 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-xl text-sm leading-relaxed text-fg-muted">
              If any of this describes your operation, the useful next step is
              a conversation about what it currently costs you.
            </p>
            <LinkButton href="/contact" withArrow>
              Start a Project
            </LinkButton>
          </div>
        </Container>
      </Section>
    </>
  );
}

function Block({ block }: { block: InsightBlock }) {
  switch (block.type) {
    case "h2":
      return (
        <h2 className="mt-6 text-xl font-semibold text-fg sm:text-2xl">
          {block.text}
        </h2>
      );

    case "p":
      return (
        <p className="text-base leading-relaxed text-fg-muted">{block.text}</p>
      );

    case "list":
      return (
        <ul className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-5">
          {block.items.map((item) => (
            <li key={item} className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className="mt-2 size-1 shrink-0 rounded-full bg-primary"
              />
              <span className="text-sm leading-relaxed text-fg-muted">
                {item}
              </span>
            </li>
          ))}
        </ul>
      );

    case "quote":
      return (
        <blockquote className="my-4 border-l-2 border-primary py-1 pl-6">
          <p className="text-lg leading-relaxed font-medium text-fg">
            {block.text}
          </p>
        </blockquote>
      );
  }
}
