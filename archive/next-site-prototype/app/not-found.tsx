import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { LinkButton } from "@/components/ui/Button";
import { PLATFORM_LINKS } from "@/lib/site";

export default function NotFound() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-grid opacity-30"
        style={{
          maskImage:
            "radial-gradient(ellipse 60% 50% at 50% 40%, black, transparent 72%)",
        }}
      />

      <Container className="relative flex min-h-[68vh] flex-col items-center justify-center gap-8 py-20 text-center">
        <div className="flex flex-col items-center gap-4">
          <span className="flex items-center gap-2.5 rounded-full border border-signal-down/35 bg-signal-down/10 px-3 py-1.5">
            <span
              aria-hidden="true"
              className="size-1.5 rounded-full bg-signal-down"
            />
            <span className="font-mono text-[0.625rem] tracking-[0.16em] text-signal-down uppercase">
              404 · Route not found
            </span>
          </span>

          <h1 className="max-w-2xl text-3xl leading-tight font-semibold text-fg sm:text-4xl lg:text-5xl">
            Signal lost.
            <br />
            <span className="text-fg-subtle">
              The system you&rsquo;re looking for isn&rsquo;t here.
            </span>
          </h1>

          <p className="max-w-lg text-base leading-relaxed text-fg-muted">
            This address does not resolve to anything on the BDS platform.
            It may have moved, or it may never have existed.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <LinkButton href="/" size="lg" withArrow>
            Return to BDS
          </LinkButton>
          <LinkButton href="/work" size="lg" variant="secondary">
            Explore our work
          </LinkButton>
        </div>

        <nav
          aria-label="Platform"
          className="mt-6 flex flex-wrap justify-center gap-2 border-t border-line pt-8"
        >
          {PLATFORM_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md border border-line bg-surface px-3.5 py-2 text-xs text-fg-muted transition-colors hover:border-primary/45 hover:text-accent"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </Container>
    </section>
  );
}
