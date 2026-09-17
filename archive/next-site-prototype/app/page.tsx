import Link from "next/link";
import {
  ArrowRight,
  MessageSquare,
  MonitorCog,
  Sparkles,
} from "lucide-react";
import { Container, Section } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { LinkButton } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { HeroNetwork } from "@/components/interactive/HeroNetwork";
import { Transformation } from "@/components/sections/Transformation";
import { SolutionsGrid } from "@/components/sections/SolutionsGrid";
import { FeaturedWork } from "@/components/sections/FeaturedWork";
import { PROCESS_STAGES } from "@/data/process";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Transformation />
      <Solutions />
      <Featured />
      <Platform />
      <BuildSystem />
      <FinalCta />
    </>
  );
}

/* ========================================================================== */

function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Ambient field */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-grid opacity-[0.35]"
        style={{
          maskImage:
            "radial-gradient(ellipse 80% 60% at 50% 30%, black, transparent 75%)",
        }}
      />

      <Container size="wide" className="relative pt-16 pb-20 sm:pt-24 lg:pt-28">
        <div className="grid items-center gap-14 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-12">
          <div className="flex flex-col gap-7">
            <div className="animate-fade-up">
              <Badge tone="primary" dot>
                Bulgaria Digital Services
              </Badge>
            </div>

            <h1
              className="animate-fade-up text-4xl leading-[1.05] font-semibold tracking-tight text-fg sm:text-5xl lg:text-[3.75rem]"
              style={{ animationDelay: "70ms" }}
            >
              Digital infrastructure
              <br />
              <span className="text-gradient-blue">
                for ambitious businesses.
              </span>
            </h1>

            <p
              className="animate-fade-up max-w-xl text-base leading-relaxed text-fg-muted sm:text-lg"
              style={{ animationDelay: "140ms" }}
            >
              BDS engineers websites, commerce platforms, business systems,
              automation and digital infrastructure built around the way modern
              companies operate.
            </p>

            <div
              className="animate-fade-up flex flex-col gap-3 sm:flex-row"
              style={{ animationDelay: "210ms" }}
            >
              <LinkButton href="/contact" size="lg" withArrow>
                Start a Project
              </LinkButton>
              <LinkButton href="/work" size="lg" variant="secondary">
                Explore Our Work
              </LinkButton>
            </div>

            <div
              className="animate-fade-up mt-2 flex flex-col gap-3 border-t border-line pt-7"
              style={{ animationDelay: "280ms" }}
            >
              <p className="max-w-lg text-sm leading-relaxed text-fg-subtle">
                <span className="font-medium text-fg-muted">
                  Websites present businesses. Systems operate them.
                </span>{" "}
                BDS engineers both — and this platform is built the same way the
                client work is.
              </p>
            </div>
          </div>

          <div className="relative -mx-5 sm:mx-0">
            <HeroNetwork />
          </div>
        </div>
      </Container>
    </section>
  );
}

/* ========================================================================== */

function Solutions() {
  return (
    <Section id="solutions">
      <Container size="wide" className="flex flex-col gap-12">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading
            eyebrow="Solutions"
            title="Six kinds of engineering, one connected system."
            lead="Most businesses need one of these built properly and the rest connected to it. The work is scoped that way rather than sold as a package."
            className="max-w-2xl"
          />
          <LinkButton href="/solutions" variant="secondary" withArrow>
            All solutions
          </LinkButton>
        </div>

        <SolutionsGrid />
      </Container>
    </Section>
  );
}

/* ========================================================================== */

function Featured() {
  return (
    <Section className="border-y border-line bg-bg-alt">
      <Container size="wide" className="flex flex-col gap-12">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading
            eyebrow="Featured engineering"
            title="Systems in production, described honestly."
            lead="Two projects, documented at the level an engineer would want: the architecture, the decisions, the trade-offs, and figures counted from the delivered system rather than estimated for a pitch."
            className="max-w-2xl"
          />
          <LinkButton href="/work" variant="secondary" withArrow>
            All work
          </LinkButton>
        </div>

        <FeaturedWork />
      </Container>
    </Section>
  );
}

/* ========================================================================== */

const PLATFORM_TILES = [
  {
    href: "/build",
    icon: Sparkles,
    name: "Solution Architect",
    description:
      "Answer five questions and get a recommended system architecture you can add modules to and watch redraw itself.",
    action: "Build your architecture",
  },
  {
    href: "/consultant",
    icon: MessageSquare,
    name: "AI Project Consultant",
    description:
      "A qualification conversation that asks the questions a scoping call would, then produces a structured project brief.",
    action: "Start a conversation",
  },
  {
    href: "/client",
    icon: MonitorCog,
    name: "Client Portal",
    description:
      "How a BDS delivery looks from the client side: progress, milestones, approvals and what is waiting on whom.",
    action: "Open the demo",
  },
];

function Platform() {
  return (
    <Section>
      <Container size="wide" className="flex flex-col gap-12">
        <SectionHeading
          eyebrow="The platform"
          title="Interactive systems, not screenshots of them."
          lead="Three working tools built into this site. They are the clearest demonstration of what BDS does, because you can use them rather than read about them."
          className="max-w-2xl"
        />

        <div className="grid gap-3 md:grid-cols-3">
          {PLATFORM_TILES.map((tile) => {
            const Icon = tile.icon;
            return (
              <Link
                key={tile.href}
                href={tile.href}
                className="group flex flex-col gap-5 rounded-xl border border-line bg-surface p-6 transition-[border-color,background-color,transform] duration-300 ease-[var(--ease-out-quart)] hover:-translate-y-0.5 hover:border-primary/45 hover:bg-surface-raised"
              >
                <span className="grid size-10 w-fit place-items-center rounded-lg border border-line bg-surface-sunken text-accent transition-colors duration-300 group-hover:border-primary/40">
                  <Icon aria-hidden="true" className="size-4.5" />
                </span>

                <div className="flex flex-col gap-2">
                  <h3 className="text-lg font-semibold text-fg transition-colors duration-300 group-hover:text-accent">
                    {tile.name}
                  </h3>
                  <p className="text-sm leading-relaxed text-fg-muted">
                    {tile.description}
                  </p>
                </div>

                <span className="mt-auto flex items-center gap-2 pt-2 text-sm font-medium text-fg-subtle transition-colors duration-300 group-hover:text-accent">
                  {tile.action}
                  <ArrowRight
                    aria-hidden="true"
                    className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5"
                  />
                </span>
              </Link>
            );
          })}
        </div>
      </Container>
    </Section>
  );
}

/* ========================================================================== */

function BuildSystem() {
  return (
    <Section className="border-y border-line bg-bg-alt">
      <Container size="wide" className="flex flex-col gap-12">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading
            eyebrow="The BDS Build System"
            title="Seven stages, in this order, every time."
            lead="The order matters more than the list. Data models are decided before interfaces because they are expensive to change later; measurement is designed before launch because it cannot be retrofitted honestly."
            className="max-w-2xl"
          />
          <LinkButton href="/process" variant="secondary" withArrow>
            How BDS works
          </LinkButton>
        </div>

        <ol className="grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {PROCESS_STAGES.map((stage) => (
            <li
              key={stage.id}
              className="group flex flex-col gap-2.5 bg-surface p-6 transition-colors duration-300 hover:bg-surface-raised"
            >
              <span className="font-mono text-[0.6875rem] tracking-[0.14em] text-accent">
                {stage.index}
              </span>
              <h3 className="text-base font-semibold text-fg">{stage.name}</h3>
              <p className="text-xs leading-relaxed text-fg-subtle">
                {stage.focus}
              </p>
            </li>
          ))}
        </ol>
      </Container>
    </Section>
  );
}

/* ========================================================================== */

function FinalCta() {
  return (
    <Section className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 100%, rgb(59 130 246 / 0.14), transparent 70%)",
        }}
      />

      <Container className="relative flex flex-col items-center gap-8 text-center">
        <h2 className="max-w-3xl text-3xl leading-[1.12] font-semibold text-fg sm:text-4xl lg:text-5xl">
          Your business already has a digital system.
        </h2>

        <p className="max-w-2xl text-lg leading-relaxed text-fg-muted sm:text-xl">
          The question is whether it was engineered intentionally — or whether
          it assembled itself out of whatever was convenient at the time.
        </p>

        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          <LinkButton href="/contact" size="lg" withArrow>
            Start a Project
          </LinkButton>
          <LinkButton href="/build" size="lg" variant="secondary">
            Build Your Architecture
          </LinkButton>
        </div>
      </Container>
    </Section>
  );
}
