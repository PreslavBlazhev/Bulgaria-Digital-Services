import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, Check, TriangleAlert } from "lucide-react";
import { SOLUTIONS, getSolution } from "@/data/solutions";
import { PROJECTS } from "@/data/projects";
import { Container, Section } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { LinkButton } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { SOLUTION_ICONS } from "@/components/sections/SolutionsGrid";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbSchema, serviceSchema } from "@/lib/structured-data";
import { pageMetadata } from "@/lib/metadata";

export function generateStaticParams() {
  return SOLUTIONS.map((solution) => ({ slug: solution.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const solution = getSolution(slug);
  if (!solution) return {};

  return pageMetadata({
    title: solution.positioning,
    description: solution.summary,
    path: `/solutions/${solution.slug}`,
  });
}

export default async function SolutionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const solution = getSolution(slug);
  if (!solution) notFound();

  const Icon = SOLUTION_ICONS[solution.icon];
  const proof = PROJECTS.filter((p) => solution.proof.includes(p.slug));
  const others = SOLUTIONS.filter((s) => s.slug !== solution.slug).slice(0, 3);

  return (
    <>
      <JsonLd
        data={[
          serviceSchema({
            name: solution.positioning,
            description: solution.summary,
            path: `/solutions/${solution.slug}`,
          }),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Solutions", path: "/solutions" },
            { name: solution.name, path: `/solutions/${solution.slug}` },
          ]),
        ]}
      />

      {/* ---------------- Hero ---------------- */}
      <Section className="relative overflow-hidden pt-16 sm:pt-20">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-grid opacity-25"
          style={{
            maskImage:
              "radial-gradient(ellipse 70% 55% at 30% 0%, black, transparent 70%)",
          }}
        />

        <Container size="wide" className="relative">
          <nav aria-label="Breadcrumb" className="mb-8">
            <ol className="flex items-center gap-2 font-mono text-[0.6875rem] tracking-[0.08em] text-fg-subtle uppercase">
              <li>
                <Link href="/solutions" className="hover:text-accent">
                  Solutions
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li className="text-fg-muted">{solution.name}</li>
            </ol>
          </nav>

          <div className="grid gap-12 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-16">
            <div className="flex flex-col gap-7">
              <span className="grid size-12 w-fit place-items-center rounded-xl border border-primary/40 bg-primary/10 text-accent">
                <Icon aria-hidden="true" className="size-5" />
              </span>

              <SectionHeading
                as="h1"
                eyebrow={solution.name}
                title={solution.positioning}
                lead={solution.summary}
              />

              <div className="flex flex-wrap gap-2">
                {solution.stack.map((tech) => (
                  <Badge key={tech}>{tech}</Badge>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-line bg-surface p-6 lg:mt-4">
              <h2 className="mb-4 font-mono text-[0.625rem] tracking-[0.14em] text-fg-subtle uppercase">
                Signals you need this
              </h2>
              <ul className="flex flex-col gap-3.5">
                {solution.signals.map((signal) => (
                  <li key={signal} className="flex items-start gap-2.5">
                    <TriangleAlert
                      aria-hidden="true"
                      className="mt-0.5 size-3.5 shrink-0 text-signal-warn"
                    />
                    <span className="text-sm leading-snug text-fg-muted">
                      {signal}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Container>
      </Section>

      {/* ---------------- Intro ---------------- */}
      <Section className="border-y border-line bg-bg-alt py-16 sm:py-20">
        <Container>
          <p className="text-lg leading-relaxed text-fg-muted sm:text-xl">
            {solution.intro}
          </p>
        </Container>
      </Section>

      {/* ---------------- Capabilities ---------------- */}
      <Section>
        <Container size="wide" className="flex flex-col gap-12">
          <SectionHeading
            eyebrow="Capabilities"
            title="What this actually includes."
            className="max-w-2xl"
          />

          <div className="grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
            {solution.capabilities.map((capability) => (
              <div
                key={capability.title}
                className="flex flex-col gap-2.5 bg-surface p-6 transition-colors duration-300 hover:bg-surface-raised"
              >
                <h3 className="text-base font-semibold text-fg">
                  {capability.title}
                </h3>
                <p className="text-sm leading-relaxed text-fg-muted">
                  {capability.description}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      {/* ---------------- Deliverables + proof ---------------- */}
      <Section className="border-y border-line bg-bg-alt">
        <Container size="wide">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
            <div className="flex flex-col gap-7">
              <SectionHeading
                eyebrow="Deliverables"
                title="What you own at the end."
              />
              <ul className="flex flex-col gap-3">
                {solution.deliverables.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 border-b border-line pb-3 last:border-0"
                  >
                    <Check
                      aria-hidden="true"
                      className="mt-0.5 size-4 shrink-0 text-signal-ok"
                    />
                    <span className="text-sm text-fg-muted">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {proof.length > 0 ? (
              <div className="flex flex-col gap-7">
                <SectionHeading eyebrow="Proof" title="Where this has shipped." />

                <div className="flex flex-col gap-3">
                  {proof.map((project) => (
                    <Link
                      key={project.slug}
                      href={`/work/${project.slug}`}
                      className="group flex flex-col gap-2 rounded-lg border border-line bg-surface p-5 transition-[border-color,background-color] duration-300 hover:border-primary/45 hover:bg-surface-raised"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <h3 className="text-base font-semibold text-fg transition-colors group-hover:text-accent">
                          {project.name}
                        </h3>
                        <ArrowUpRight
                          aria-hidden="true"
                          className="size-4 shrink-0 text-fg-subtle transition-[transform,color] duration-300 group-hover:-translate-y-0.5 group-hover:text-accent"
                        />
                      </div>
                      <p className="text-sm text-fg-muted">{project.tagline}</p>
                      <span className="font-mono text-[0.625rem] tracking-[0.1em] text-fg-subtle uppercase">
                        {project.category}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </Container>
      </Section>

      {/* ---------------- Next ---------------- */}
      <Section>
        <Container size="wide" className="flex flex-col gap-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <SectionHeading
              eyebrow="Continue"
              title="Other solutions"
              className="max-w-xl"
            />
            <LinkButton href="/contact" withArrow>
              Start a Project
            </LinkButton>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {others.map((other) => {
              const OtherIcon = SOLUTION_ICONS[other.icon];
              return (
                <Link
                  key={other.slug}
                  href={`/solutions/${other.slug}`}
                  className="group flex flex-col gap-3 rounded-lg border border-line bg-surface p-5 transition-[border-color,background-color] duration-300 hover:border-primary/45 hover:bg-surface-raised"
                >
                  <OtherIcon
                    aria-hidden="true"
                    className="size-4 text-accent"
                  />
                  <span className="text-sm font-semibold text-fg transition-colors group-hover:text-accent">
                    {other.name}
                  </span>
                  <span className="text-xs leading-snug text-fg-subtle">
                    {other.positioning}
                  </span>
                </Link>
              );
            })}
          </div>
        </Container>
      </Section>
    </>
  );
}
