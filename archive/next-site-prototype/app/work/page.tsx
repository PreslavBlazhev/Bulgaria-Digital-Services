import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PROJECTS } from "@/data/projects";
import { Container, Section } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbSchema } from "@/lib/structured-data";
import { pageMetadata } from "@/lib/metadata";

export const metadata: Metadata = pageMetadata({
  title: "Work",
  description:
    "Case studies documented at engineering depth: architecture, decisions, trade-offs and figures counted from the delivered system.",
  path: "/work",
});

export default function WorkPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Work", path: "/work" },
        ])}
      />

      <Section className="pt-16 sm:pt-20">
        <Container size="wide" className="flex flex-col gap-14">
          <SectionHeading
            as="h1"
            eyebrow="Work"
            title="Systems in production, documented properly."
            lead="Each case study covers the architecture, the engineering decisions and the trade-offs those decisions carried. Every figure is counted from the delivered system — there are no estimates and no rounded-up claims."
            className="max-w-3xl"
          />

          <div className="flex flex-col gap-3">
            {PROJECTS.map((project) => (
              <article
                key={project.slug}
                className="group relative overflow-hidden rounded-xl border border-line bg-surface transition-[border-color] duration-300 hover:border-primary/45"
              >
                <div className="grid gap-0 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                  <div className="flex flex-col gap-5 p-7 sm:p-9">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <Badge tone="primary">{project.category}</Badge>
                      <Badge
                        tone={project.status === "Delivered" ? "ok" : "warn"}
                        dot
                      >
                        {project.status}
                      </Badge>
                      <span className="font-mono text-[0.6875rem] text-fg-subtle">
                        {project.year}
                      </span>
                    </div>

                    <h2 className="text-2xl font-semibold text-fg sm:text-3xl">
                      <Link
                        href={`/work/${project.slug}`}
                        className="transition-colors duration-300 hover:text-accent"
                      >
                        <span className="absolute inset-0" aria-hidden="true" />
                        {project.name}
                      </Link>
                    </h2>

                    <p className="max-w-2xl text-sm leading-relaxed text-fg-muted">
                      {project.description}
                    </p>

                    <div className="flex flex-wrap gap-1.5">
                      {project.services.map((service) => (
                        <span
                          key={service}
                          className="rounded border border-line bg-surface-sunken px-2 py-1 font-mono text-[0.6875rem] text-fg-muted"
                        >
                          {service}
                        </span>
                      ))}
                    </div>

                    <span className="relative z-10 mt-2 flex w-fit items-center gap-2 text-sm font-medium text-fg transition-colors duration-300 group-hover:text-accent">
                      Read the case study
                      <ArrowUpRight
                        aria-hidden="true"
                        className="size-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                      />
                    </span>
                  </div>

                  <dl className="grid grid-cols-2 gap-px border-t border-line bg-line lg:border-t-0 lg:border-l">
                    {project.metrics.slice(0, 4).map((metric) => (
                      <div
                        key={metric.label}
                        className="flex flex-col justify-center gap-1 bg-surface-sunken p-5"
                      >
                        <dt className="sr-only">{metric.label}</dt>
                        <dd className="font-display text-xl font-semibold tabular-nums text-fg">
                          {metric.value}
                        </dd>
                        <span className="text-[0.6875rem] leading-snug text-fg-muted">
                          {metric.label}
                        </span>
                      </div>
                    ))}
                  </dl>
                </div>
              </article>
            ))}
          </div>
        </Container>
      </Section>

      <Section className="border-t border-line bg-bg-alt">
        <Container className="flex flex-col items-center gap-7 text-center">
          <SectionHeading
            align="center"
            eyebrow="No testimonials yet"
            title="Claims are only worth what backs them."
            lead="BDS does not display client testimonials, because none have been formally collected and approved. Showing invented ones would be easier and would tell you nothing. The case studies stand on verifiable scope instead."
          />
          <LinkButton href="/contact" withArrow>
            Discuss your project
          </LinkButton>
        </Container>
      </Section>
    </>
  );
}
