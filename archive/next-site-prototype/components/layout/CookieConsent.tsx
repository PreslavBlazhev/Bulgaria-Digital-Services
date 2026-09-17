"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cookie } from "lucide-react";
import {
  DEFAULT_CONSENT,
  readStoredConsent,
  storeConsent,
  updateConsent,
  type ConsentState,
} from "@/lib/analytics";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

const CATEGORIES = [
  {
    key: "necessary" as const,
    name: "Necessary",
    description:
      "Required for the site to function — routing, security and your consent choice itself. Cannot be disabled.",
    locked: true,
  },
  {
    key: "analytics" as const,
    name: "Analytics",
    description:
      "Measures how the site is used so it can be improved. Denying this genuinely stops collection, not just the display of it.",
    locked: false,
  },
  {
    key: "marketing" as const,
    name: "Marketing",
    description:
      "Advertising and remarketing signals. Not currently used on this site; the category is declared so the choice is honoured if it ever is.",
    locked: false,
  },
];

export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState<ConsentState>(DEFAULT_CONSENT);

  useEffect(() => {
    const stored = readStoredConsent();
    if (stored) {
      updateConsent(stored);
      return;
    }
    // Delay slightly so the banner does not compete with first paint.
    const timer = window.setTimeout(() => setVisible(true), 900);
    return () => window.clearTimeout(timer);
  }, []);

  function commit(state: ConsentState) {
    storeConsent(state);
    updateConsent(state);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Cookie preferences"
      className="fixed inset-x-0 bottom-0 z-95 p-3 sm:p-5"
    >
      <div className="mx-auto w-full max-w-3xl overflow-hidden rounded-xl border border-line-strong bg-surface-raised shadow-[var(--shadow-raised)] animate-fade-up">
        <div className="flex flex-col gap-4 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-md border border-line bg-surface-sunken text-accent">
              <Cookie aria-hidden="true" className="size-4" />
            </span>
            <div className="flex flex-col gap-1.5">
              <h2 className="text-sm font-semibold text-fg">
                Cookies and measurement
              </h2>
              <p className="text-sm leading-relaxed text-fg-muted">
                We use necessary cookies to run this site. Analytics is optional
                and off until you allow it. Your choice is applied technically —
                see the{" "}
                <Link
                  href="/cookies"
                  className="text-accent underline underline-offset-2 hover:text-primary"
                >
                  cookie policy
                </Link>
                .
              </p>
            </div>
          </div>

          {expanded ? (
            <div className="flex flex-col divide-y divide-line border-y border-line">
              {CATEGORIES.map((category) => {
                const checked = category.locked || draft[category.key];
                return (
                  <label
                    key={category.key}
                    className={cn(
                      "flex items-start gap-3 py-3.5",
                      !category.locked && "cursor-pointer",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(checked)}
                      disabled={category.locked}
                      onChange={(e) =>
                        setDraft((current) => ({
                          ...current,
                          [category.key]: e.target.checked,
                        }))
                      }
                      className="mt-0.5 size-4 shrink-0 accent-[var(--color-primary)] disabled:opacity-50"
                    />
                    <span className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium text-fg">
                        {category.name}
                        {category.locked ? (
                          <span className="ml-2 font-mono text-[0.625rem] tracking-wider text-fg-subtle uppercase">
                            Always on
                          </span>
                        ) : null}
                      </span>
                      <span className="text-xs leading-snug text-fg-subtle">
                        {category.description}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button
              size="sm"
              onClick={() =>
                commit({ necessary: true, analytics: true, marketing: true })
              }
              className="sm:order-3"
            >
              Accept all
            </Button>

            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                commit(
                  expanded
                    ? { ...draft, necessary: true }
                    : { necessary: true, analytics: false, marketing: false },
                )
              }
              className="sm:order-2"
            >
              {expanded ? "Save preferences" : "Necessary only"}
            </Button>

            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="cursor-pointer text-left text-xs font-medium text-fg-subtle underline underline-offset-4 transition-colors hover:text-fg-muted sm:order-1 sm:mr-auto"
            >
              {expanded ? "Hide options" : "Customise"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
