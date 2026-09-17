"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Command, Menu, X } from "lucide-react";
import { COMPANY_LINKS, SOLUTION_LINKS } from "@/lib/site";
import { cn } from "@/lib/cn";
import { LinkButton } from "@/components/ui/Button";
import { LogoCompact } from "./Logo";
import { useCommandPalette } from "@/components/interactive/CommandPaletteProvider";

interface TopLevel {
  label: string;
  href?: string;
  panel?: typeof SOLUTION_LINKS;
}

const TOP_LEVEL: TopLevel[] = [
  { label: "Solutions", href: "/solutions", panel: SOLUTION_LINKS },
  { label: "Work", href: "/work" },
  { label: "Technology", href: "/technology" },
  { label: "Process", href: "/process" },
  { label: "Insights", href: "/insights" },
  { label: "BDS", panel: COMPANY_LINKS },
];

export function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [openPanel, setOpenPanel] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const { open: openPalette } = useCommandPalette();

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 12);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Route change closes everything. Derived from the pathname during render
  // rather than in an effect, so the menus never paint open on the new page.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpenPanel(null);
    setMobileOpen(false);
  }

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  // Dismiss the dropdown on outside click or Escape.
  useEffect(() => {
    if (!openPanel) return;

    function onPointerDown(event: PointerEvent) {
      if (!navRef.current?.contains(event.target as Node)) setOpenPanel(null);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenPanel(null);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openPanel]);

  function isActive(href?: string) {
    if (!href) return false;
    return href === "/" ? pathname === "/" : pathname.startsWith(href);
  }

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-200 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:text-white"
      >
        Skip to content
      </a>

      <header
        className={cn(
          "fixed inset-x-0 top-0 z-90 transition-[background-color,border-color,backdrop-filter] duration-300",
          scrolled
            ? "border-b border-line/80 bg-bg/80 backdrop-blur-xl"
            : "border-b border-transparent bg-transparent",
        )}
      >
        <nav
          ref={navRef}
          aria-label="Primary"
          className={cn(
            "mx-auto flex w-full max-w-[88rem] items-center gap-6 px-5 transition-[height] duration-300 sm:px-8",
            scrolled ? "h-14" : "h-[68px]",
          )}
        >
          <Link
            href="/"
            className="shrink-0 rounded-sm"
            aria-label="Bulgaria Digital Services — home"
          >
            <LogoCompact />
          </Link>

          {/* ---------- Desktop nav ---------- */}
          <ul className="ml-2 hidden items-center gap-1 lg:flex">
            {TOP_LEVEL.map((item) => {
              const active = isActive(item.href);
              const hasPanel = Boolean(item.panel?.length);
              const panelOpen = openPanel === item.label;

              if (!hasPanel && item.href) {
                return (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className={cn(
                        "rounded-md px-3 py-2 text-sm font-medium transition-colors duration-200",
                        active
                          ? "text-fg"
                          : "text-fg-muted hover:bg-surface/70 hover:text-fg",
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              }

              return (
                <li key={item.label} className="relative">
                  <button
                    type="button"
                    onClick={() =>
                      setOpenPanel(panelOpen ? null : item.label)
                    }
                    aria-expanded={panelOpen}
                    aria-haspopup="true"
                    className={cn(
                      "flex cursor-pointer items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-200",
                      active || panelOpen
                        ? "text-fg"
                        : "text-fg-muted hover:bg-surface/70 hover:text-fg",
                    )}
                  >
                    {item.label}
                    <ChevronDown
                      aria-hidden="true"
                      className={cn(
                        "size-3.5 transition-transform duration-200",
                        panelOpen && "rotate-180",
                      )}
                    />
                  </button>

                  {panelOpen && item.panel ? (
                    <div
                      className={cn(
                        "absolute top-[calc(100%+10px)] left-0 z-50 w-[22rem] overflow-hidden rounded-xl border border-line-strong",
                        "bg-surface-raised p-2 shadow-[var(--shadow-raised)] animate-fade-up",
                      )}
                    >
                      {item.panel.map((link) => (
                        <Link
                          key={link.href}
                          href={link.href}
                          className="group flex flex-col gap-0.5 rounded-lg px-3 py-2.5 transition-colors duration-200 hover:bg-primary/10"
                        >
                          <span className="text-sm font-medium text-fg group-hover:text-accent">
                            {link.label}
                          </span>
                          {link.description ? (
                            <span className="text-xs leading-snug text-fg-subtle">
                              {link.description}
                            </span>
                          ) : null}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={openPalette}
              aria-label="Open command palette"
              className="hidden cursor-pointer items-center gap-2 rounded-md border border-line px-2.5 py-1.5 text-fg-subtle transition-colors duration-200 hover:border-line-strong hover:text-fg-muted lg:flex"
            >
              <Command aria-hidden="true" className="size-3.5" />
              <span className="font-mono text-[0.6875rem] tracking-wider">
                K
              </span>
            </button>

            {/* Visibility lives on a wrapper, not on the button. The button's
                own `inline-flex` and a passed `hidden` are both single-class
                display utilities, so which one wins depends on stylesheet
                order rather than on the order they are listed here. */}
            <span className="hidden sm:inline-flex">
              <LinkButton href="/contact" size="sm">
                Start a Project
              </LinkButton>
            </span>

            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              aria-expanded={mobileOpen}
              className="grid size-10 cursor-pointer place-items-center rounded-md border border-line text-fg-muted transition-colors hover:text-fg lg:hidden"
            >
              <Menu aria-hidden="true" className="size-4.5" />
            </button>
          </div>
        </nav>
      </header>

      <MobileNav
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        pathname={pathname}
      />
    </>
  );
}

/* -------------------------------------------------------------------------- */

function MobileNav({
  open,
  onClose,
  pathname,
}: {
  open: boolean;
  onClose: () => void;
  pathname: string;
}) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const sections: { title: string; links: typeof SOLUTION_LINKS }[] = [
    {
      title: "Explore",
      links: [
        { href: "/work", label: "Work" },
        { href: "/technology", label: "Technology" },
        { href: "/process", label: "Process" },
        { href: "/insights", label: "Insights" },
      ],
    },
    { title: "Solutions", links: SOLUTION_LINKS },
    {
      title: "Platform",
      links: [
        { href: "/build", label: "Solution Architect" },
        { href: "/consultant", label: "AI Consultant" },
        { href: "/client", label: "Client Portal" },
      ],
    },
    { title: "Company", links: COMPANY_LINKS },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
      className="fixed inset-0 z-100 flex flex-col bg-bg lg:hidden"
    >
      <div className="flex h-[68px] shrink-0 items-center justify-between border-b border-line px-5">
        <LogoCompact />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close menu"
          className="grid size-10 cursor-pointer place-items-center rounded-md border border-line text-fg-muted transition-colors hover:text-fg"
        >
          <X aria-hidden="true" className="size-4.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-6">
        <div className="flex flex-col gap-8">
          {sections.map((section, sectionIndex) => (
            <div
              key={section.title}
              className="flex flex-col gap-2 animate-fade-up"
              style={{ animationDelay: `${sectionIndex * 55}ms` }}
            >
              <span className="eyebrow">{section.title}</span>
              <ul className="flex flex-col">
                {section.links.map((link) => {
                  const active = pathname === link.href;
                  return (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        onClick={onClose}
                        className={cn(
                          "flex min-h-12 items-center justify-between gap-3 border-b border-line-soft py-3 text-base transition-colors",
                          active
                            ? "font-medium text-accent"
                            : "text-fg-muted active:text-fg",
                        )}
                      >
                        {link.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="shrink-0 border-t border-line p-5">
        <LinkButton href="/contact" className="w-full" size="lg" withArrow>
          Start a Project
        </LinkButton>
      </div>
    </div>
  );
}
