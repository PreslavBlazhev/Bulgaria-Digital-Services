import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";
import { PROJECTS, getProject } from "@/data/projects";
import { Container, Section } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { MetricGrid } from "@/components/ui/Metric";
import { ArchitectureExplorer } from "@/components/case-studies/ArchitectureExplorer";
import { ScreenMock } from "@/components/case-studies/ScreenMock";
import { CaseNav } from "@/components/case-studies/CaseNav";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbSchema } from "@/lib/structured-data";
import { pageMetadata } from "@/lib/metadata";

export function generateStaticParams() {
  return PROJECTS.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) return {};

  return pageMetadata({
    title: `${project.name} — ${project.category}`,
    description: project.description,
    path: `/work/${project.slug}`,
    type: "article",
  });
}

export default async function CaseStudyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) notFound();

  const next =
    PROJECTS[(PROJECTS.findIndex((p) => p.slug === project.slug) + 1) % PROJECTS.length];

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Work", path: "/work" },
          { name: project.name, path: `/work/${project.slug}` },
        ])}
      />

      {/* ---------------- Hero ---------------- */}
      <section className="relative overflow-hidden border-b border-line">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-grid opacity-25"
          style={{
            maskImage:
              "radial-gradient(ellipse 70% 60% at 25% 0%, black, transparent 72%)",
          }}
        />

        <Container size="wide" className="relative py-16 sm:py-20">
          <nav aria-label="Breadcrumb" className="mb-8">
            <ol className="flex items-center gap-2 font-mono text-[0.6875rem] tracking-[0.08em] text-fg-subtle uppercase">
              <li>
                <Link href="/work" className="hover:text-accent">
                  Work
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li className="text-fg-muted">{project.name}</li>
            </ol>
          </nav>

          <div className="flex flex-col gap-7">
            <div className="flex flex-wrap items-center gap-2.5">
              <Badge tone="primary">{project.category}</Badge>
              <Badge tone={project.status === "Delivered" ? "ok" : "warn"} dot>
                {project.status}
              </Badge>
              <span className="font-mono text-[0.6875rem] text-fg-subtle">
                {project.year}
              </span>
            </div>

            <h1 className="max-w-4xl text-4xl leading-[1.06] font-semibold tracking-tight text-fg sm:text-5xl lg:text-[3.5rem]">
              {project.name}
            </h1>

            <p className="max-w-2xl text-lg text-accent sm:text-xl">
              {project.tagline}
            </p>

            <p className="max-w-3xl text-base leading-relaxed text-fg-muted">
              {project.description}
            </p>

            <div className="mt-2 flex flex-wrap gap-1.5">
              {project.technologies.map((tech) => (
                <span
                  key={tech}
                  className="rounded border border-line bg-surface px-2.5 py-1 font-mono text-[0.6875rem] text-fg-muted"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* ---------------- Body ---------------- */}
      <Container size="wide" className="py-14 sm:py-16">
        {/* grid-cols-1 rather than an implicit column: an `auto` track sizes to
            max-content, which lets the horizontal section rail widen the whole
            page on mobile instead of scrolling inside itself. */}
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,180px)_minmax(0,1fr)] lg:gap-16">
          <div className="min-w-0 lg:pt-2">
            <CaseNav />
          </div>

          <div className="flex min-w-0 flex-col gap-20">
            {/* Overview */}
            <section id="overview" className="scroll-mt-32 flex flex-col gap-8">
              <SectionHeading
                eyebrow="Overview"
                title="Verified scope"
                lead="Each figure below is counted from the delivered system. The source of every number is stated — nothing here is an estimate."
              />
              <MetricGrid metrics={project.metrics} />

              <div className="flex flex-wrap gap-2">
                {project.services.map((service) => (
                  <Badge key={service}>{service}</Badge>
                ))}
              </div>
            </section>

            {/* Challenge */}
            <section id="challenge" className="scroll-mt-32 flex flex-col gap-6">
              <SectionHeading eyebrow="Challenge" title={project.challenge.heading} />
              <div className="flex flex-col gap-4">
                {project.challenge.body.map((paragraph, i) => (
                  <p
                    key={i}
                    className="text-base leading-relaxed text-fg-muted"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>

            {/* Solution */}
            <section className="flex flex-col gap-6">
              <SectionHeading eyebrow="Solution" title={project.solution.heading} />
              <div className="flex flex-col gap-4">
                {project.solution.body.map((paragraph, i) => (
                  <p
                    key={i}
                    className="text-base leading-relaxed text-fg-muted"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>

            {/* Architecture */}
            <section
              id="architecture"
              className="scroll-mt-32 flex flex-col gap-8"
            >
              <SectionHeading
                eyebrow="System architecture"
                title="The same system, three ways."
                lead="Switch between the engineering view, the customer's path through it, and what the people operating it see. Select any node for its role, responsibility, data flow and technology."
              />
              <ArchitectureExplorer
                views={project.views}
                projectSlug={project.slug}
              />
            </section>

            {/* Experience */}
            <section id="experience" className="scroll-mt-32 flex flex-col gap-8">
              <SectionHeading
                eyebrow="Interface"
                title="What it looks like in use."
                lead="Rendered as live interface constructions rather than screenshots, so they stay sharp at any size and adapt to the device you are reading on."
              />
              <div className="grid gap-8 sm:grid-cols-2">
                {project.screens.map((screen) => (
                  <ScreenMock key={screen.title} screen={screen} />
                ))}
              </div>
            </section>

            {/* Engineering */}
            <section
              id="engineering"
              className="scroll-mt-32 flex flex-col gap-8"
            >
              <SectionHeading
                eyebrow="Engineering decisions"
                title="What was decided, and what it cost."
                lead="Every architectural decision buys something and gives something up. Listing only the benefit would make these look free, and none of them were."
              />

              <div className="flex flex-col gap-3">
                {project.decisions.map((decision) => (
                  <div
                    key={decision.decision}
                    className="grid gap-px overflow-hidden rounded-xl border border-line bg-line lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)]"
                  >
                    <div className="flex flex-col gap-2 bg-surface p-5">
                      <span className="font-mono text-[0.625rem] tracking-[0.14em] text-accent uppercase">
                        Decision
                      </span>
                      <p className="text-sm leading-snug font-medium text-fg">
                        {decision.decision}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 bg-surface p-5">
                      <span className="font-mono text-[0.625rem] tracking-[0.14em] text-fg-subtle uppercase">
                        Rationale
                      </span>
                      <p className="text-sm leading-relaxed text-fg-muted">
                        {decision.rationale}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 bg-surface-sunken p-5">
                      <span className="font-mono text-[0.625rem] tracking-[0.14em] text-signal-warn uppercase">
                        Trade-off
                      </span>
                      <p className="text-sm leading-relaxed text-fg-muted">
                        {decision.tradeoff}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Results */}
            <section id="results" className="scroll-mt-32 flex flex-col gap-8">
              <SectionHeading
                eyebrow="Results"
                title="What the business ended up with."
              />
              <ul className="flex flex-col gap-3">
                {project.results.map((result) => (
                  <li
                    key={result}
                    className="flex items-start gap-3 rounded-lg border border-line bg-surface p-4"
                  >
                    <Check
                      aria-hidden="true"
                      className="mt-0.5 size-4 shrink-0 text-signal-ok"
                    />
                    <span className="text-sm leading-relaxed text-fg-muted">
                      {result}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </Container>

      {/* ---------------- Next project ---------------- */}
      {next && next.slug !== project.slug ? (
        <Section className="border-t border-line bg-bg-alt">
          <Container size="wide">
            <Link
              href={`/work/${next.slug}`}
              className="group flex flex-col gap-4 rounded-xl border border-line bg-surface p-8 transition-[border-color,background-color] duration-300 hover:border-primary/45 hover:bg-surface-raised sm:p-10"
            >
              <span className="font-mono text-[0.625rem] tracking-[0.14em] text-fg-subtle uppercase">
                Next case study
              </span>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h2 className="text-2xl font-semibold text-fg transition-colors group-hover:text-accent sm:text-3xl">
                  {next.name}
                </h2>
                <ArrowRight
                  aria-hidden="true"
                  className="size-5 text-fg-subtle transition-[transform,color] duration-300 group-hover:translate-x-1 group-hover:text-accent"
                />
              </div>
              <p className="max-w-2xl text-sm text-fg-muted">{next.tagline}</p>
            </Link>
          </Container>
        </Section>
      ) : null}

      <Section>
        <Container className="flex flex-col items-center gap-7 text-center">
          <SectionHeading
            align="center"
            eyebrow="Your project"
            title="Different business, same engineering."
            lead="If any part of this reads like your operation, the conversation starts with what currently costs you the most time."
          />
          <div className="flex flex-col gap-3 sm:flex-row">
            <LinkButton href="/contact" size="lg" withArrow>
              Start a Project
            </LinkButton>
            <LinkButton href="/build" size="lg" variant="secondary">
              Build Your Architecture
            </LinkButton>
          </div>
        </Container>
      </Section>
    </>
  );
}
