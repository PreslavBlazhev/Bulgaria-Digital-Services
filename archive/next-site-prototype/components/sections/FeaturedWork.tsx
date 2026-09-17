import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getFeaturedProjects } from "@/data/projects";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";

export function FeaturedWork() {
  const projects = getFeaturedProjects();

  return (
    <div className="flex flex-col gap-4">
      {projects.map((project, index) => (
        <article
          key={project.slug}
          className={cn(
            "group relative overflow-hidden rounded-xl border border-line bg-surface",
            "transition-[border-color,background-color] duration-500 hover:border-primary/40",
          )}
        >
          <div
            className={cn(
              "grid gap-0 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]",
              index % 2 === 1 && "lg:[&>*:first-child]:order-2",
            )}
          >
            {/* Narrative */}
            <div className="flex flex-col gap-6 border-b border-line p-7 sm:p-9 lg:border-b-0 lg:border-r">
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

              <div className="flex flex-col gap-3">
                <h3 className="text-2xl font-semibold text-fg sm:text-3xl">
                  <Link
                    href={`/work/${project.slug}`}
                    className="transition-colors duration-300 hover:text-accent"
                  >
                    <span className="absolute inset-0" aria-hidden="true" />
                    {project.name}
                  </Link>
                </h3>
                <p className="text-base font-medium text-accent">
                  {project.tagline}
                </p>
              </div>

              <p className="max-w-xl text-sm leading-relaxed text-fg-muted">
                {project.description}
              </p>

              <div className="mt-auto flex flex-wrap gap-1.5 pt-2">
                {project.technologies.slice(0, 6).map((tech) => (
                  <span
                    key={tech}
                    className="rounded border border-line bg-surface-sunken px-2 py-1 font-mono text-[0.6875rem] text-fg-muted"
                  >
                    {tech}
                  </span>
                ))}
              </div>

              <span className="relative z-10 flex w-fit items-center gap-2 text-sm font-medium text-fg transition-colors duration-300 group-hover:text-accent">
                Read the case study
                <ArrowUpRight
                  aria-hidden="true"
                  className="size-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                />
              </span>
            </div>

            {/* Verified scope */}
            <div className="flex flex-col bg-surface-sunken">
              <div className="border-b border-line px-7 py-4 sm:px-8">
                <span className="font-mono text-[0.625rem] tracking-[0.14em] text-fg-subtle uppercase">
                  Verified scope
                </span>
              </div>

              <dl className="grid flex-1 grid-cols-2 gap-px bg-line">
                {project.metrics.map((metric) => (
                  <div
                    key={metric.label}
                    className="flex flex-col justify-center gap-1 bg-surface-sunken px-6 py-5 sm:px-7"
                  >
                    <dt className="sr-only">{metric.label}</dt>
                    <dd className="font-display text-2xl font-semibold tabular-nums text-fg">
                      {metric.value}
                    </dd>
                    <span className="text-xs leading-snug text-fg-muted">
                      {metric.label}
                    </span>
                  </div>
                ))}
              </dl>

              <p className="border-t border-line px-7 py-4 text-[0.6875rem] leading-snug text-fg-subtle sm:px-8">
                Every figure is counted from the delivered system. No estimates.
              </p>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
