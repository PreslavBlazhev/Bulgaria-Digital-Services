import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Globe,
  Layers,
  ShoppingCart,
  UtensilsCrossed,
  Workflow,
} from "lucide-react";
import { SOLUTIONS } from "@/data/solutions";
import type { SolutionIcon } from "@/types";
import { cn } from "@/lib/cn";

export const SOLUTION_ICONS: Record<SolutionIcon, typeof Globe> = {
  globe: Globe,
  cart: ShoppingCart,
  layers: Layers,
  workflow: Workflow,
  chart: BarChart3,
  utensils: UtensilsCrossed,
};

/**
 * Deliberately uneven grid. Six identical rectangles read as a template;
 * varying the density signals that these are different kinds of work while
 * the shared border, type scale and accent keep it one system.
 */
const SPANS: Record<string, string> = {
  websites: "lg:col-span-3 lg:row-span-2",
  commerce: "lg:col-span-3",
  "business-systems": "lg:col-span-3",
  automation: "lg:col-span-2",
  analytics: "lg:col-span-2",
  "restaurant-technology": "lg:col-span-2",
};

export function SolutionsGrid({ className }: { className?: string }) {
  return (
    <div className={cn("grid gap-3 sm:grid-cols-2 lg:grid-cols-6", className)}>
      {SOLUTIONS.map((solution) => {
        const Icon = SOLUTION_ICONS[solution.icon];
        const isLead = solution.slug === "websites";

        return (
          <Link
            key={solution.slug}
            href={`/solutions/${solution.slug}`}
            className={cn(
              "group relative flex flex-col overflow-hidden rounded-xl border border-line bg-surface p-6",
              "transition-[border-color,background-color,transform] duration-300 ease-[var(--ease-out-quart)]",
              "hover:-translate-y-0.5 hover:border-primary/45 hover:bg-surface-raised",
              SPANS[solution.slug],
            )}
          >
            {/* Accent wash on hover */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary/60 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
            />

            <div className="flex items-start justify-between gap-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-line bg-surface-sunken text-accent transition-colors duration-300 group-hover:border-primary/40">
                <Icon aria-hidden="true" className="size-4.5" />
              </span>
              <ArrowRight
                aria-hidden="true"
                className="size-4 shrink-0 text-fg-subtle transition-[transform,color] duration-300 group-hover:translate-x-0.5 group-hover:text-accent"
              />
            </div>

            <div className="mt-5 flex flex-col gap-2">
              <h3
                className={cn(
                  "font-semibold text-fg transition-colors duration-300 group-hover:text-accent",
                  isLead ? "text-2xl" : "text-lg",
                )}
              >
                {solution.name}
              </h3>
              <p className="font-mono text-[0.625rem] tracking-[0.12em] text-fg-subtle uppercase">
                {solution.positioning}
              </p>
            </div>

            <p
              className={cn(
                "mt-3 leading-relaxed text-fg-muted",
                isLead ? "text-sm sm:text-base" : "text-sm",
              )}
            >
              {solution.summary}
            </p>

            {/* Lead card carries extra density. */}
            {isLead ? (
              <ul className="mt-6 grid gap-2 border-t border-line pt-5 sm:grid-cols-2">
                {solution.capabilities.slice(0, 4).map((capability) => (
                  <li
                    key={capability.title}
                    className="flex items-start gap-2 text-sm text-fg-muted"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-1.5 size-1 shrink-0 rounded-full bg-primary"
                    />
                    {capability.title}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-auto flex flex-wrap gap-1.5 pt-5">
                {solution.stack.slice(0, 3).map((tech) => (
                  <span
                    key={tech}
                    className="rounded border border-line bg-surface-sunken px-1.5 py-0.5 font-mono text-[0.625rem] text-fg-subtle"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            )}
          </Link>
        );
      })}
    </div>
  );
}
