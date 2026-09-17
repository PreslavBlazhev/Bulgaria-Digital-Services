import Link from "next/link";
import { ArrowUpRight, Mail, MapPin, Phone } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { FOOTER_NAV, SITE } from "@/lib/site";
import { LogoFull } from "./Logo";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative border-t border-line bg-bg-alt">
      <Container size="wide" className="py-16 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,3fr)]">
          {/* Brand block */}
          <div className="flex flex-col gap-6">
            <LogoFull />

            <p className="max-w-xs text-sm leading-relaxed text-fg-muted">
              {SITE.tagline} From digital presence to operational
              infrastructure.
            </p>

            <ul className="flex flex-col gap-2.5 text-sm">
              <li>
                <a
                  href={`mailto:${SITE.email}`}
                  className="flex items-center gap-2.5 text-fg-muted transition-colors hover:text-accent"
                >
                  <Mail aria-hidden="true" className="size-3.5 shrink-0" />
                  {SITE.email}
                </a>
              </li>
              <li>
                <a
                  href={`tel:${SITE.phone}`}
                  className="flex items-center gap-2.5 text-fg-muted transition-colors hover:text-accent"
                >
                  <Phone aria-hidden="true" className="size-3.5 shrink-0" />
                  {SITE.phoneDisplay}
                </a>
              </li>
              <li className="flex items-center gap-2.5 text-fg-muted">
                <MapPin aria-hidden="true" className="size-3.5 shrink-0" />
                {SITE.region}
              </li>
            </ul>

            <a
              href={SITE.social.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-fit items-center gap-1.5 rounded-md border border-line px-3 py-2 text-xs font-medium text-fg-subtle transition-colors hover:border-primary/50 hover:text-accent"
            >
              Instagram
              <ArrowUpRight aria-hidden="true" className="size-3" />
            </a>
          </div>

          {/* Link columns */}
          <nav
            aria-label="Footer"
            className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-5"
          >
            {FOOTER_NAV.map((group) => (
              <div key={group.label} className="flex flex-col gap-3.5">
                <h3 className="font-mono text-[0.625rem] tracking-[0.14em] text-fg-subtle uppercase">
                  {group.label}
                </h3>
                <ul className="flex flex-col gap-2.5">
                  {group.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-sm leading-snug text-fg-muted transition-colors hover:text-accent"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-line pt-7 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-fg-subtle">
            © {year} {SITE.name}. All rights reserved.
          </p>

          <Link
            href="/status"
            className="group flex items-center gap-2 text-xs text-fg-subtle transition-colors hover:text-fg-muted"
          >
            <span className="font-mono tracking-wider uppercase">
              System Status
            </span>
            <span className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="size-1.5 rounded-full bg-signal-ok shadow-[0_0_8px_var(--color-signal-ok)]"
              />
              <span className="text-signal-ok">Operational</span>
            </span>
          </Link>
        </div>
      </Container>
    </footer>
  );
}
