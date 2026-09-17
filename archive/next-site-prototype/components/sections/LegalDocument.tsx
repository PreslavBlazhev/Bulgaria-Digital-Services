import Link from "next/link";
import { FileWarning } from "lucide-react";
import type { LegalDocument as LegalDocumentType } from "@/data/legal";
import { LEGAL_DOCUMENTS } from "@/data/legal";
import { Container, Section } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { cn } from "@/lib/cn";

export function LegalDocumentView({ doc }: { doc: LegalDocumentType }) {
  const needsReview = doc.sections.some((section) => section.review);
  const others = LEGAL_DOCUMENTS.filter((d) => d.slug !== doc.slug);

  return (
    <>
      <Section className="pt-16 pb-8 sm:pt-20">
        <Container>
          <SectionHeading
            as="h1"
            eyebrow="Legal"
            title={doc.title}
            lead={doc.intro}
          />

          <p className="mt-6 font-mono text-[0.6875rem] tracking-[0.08em] text-fg-subtle uppercase">
            Last updated {doc.updated}
          </p>

          {needsReview ? (
            <div className="mt-8 flex items-start gap-3 rounded-lg border border-signal-warn/35 bg-signal-warn/[0.06] p-5">
              <FileWarning
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0 text-signal-warn"
              />
              <p className="text-sm leading-relaxed text-fg-muted">
                <span className="font-medium text-fg">
                  Pending legal review.
                </span>{" "}
                This document is a structurally complete draft. Sections marked
                below require confirmation by a qualified adviser, and company
                registration details have deliberately not been filled in rather
                than invented.
              </p>
            </div>
          ) : null}
        </Container>
      </Section>

      <Container size="narrow" className="pb-20 sm:pb-28">
        <div className="flex flex-col gap-10">
          {doc.sections.map((section, index) => (
            <section key={section.heading} className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-xl font-semibold text-fg">
                  <span className="mr-3 font-mono text-sm text-fg-subtle tabular-nums">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {section.heading}
                </h2>
                {section.review ? (
                  <span className="rounded border border-signal-warn/35 bg-signal-warn/10 px-2 py-0.5 font-mono text-[0.5625rem] tracking-[0.1em] text-signal-warn uppercase">
                    Needs review
                  </span>
                ) : null}
              </div>

              {section.paragraphs.map((paragraph) => (
                <p
                  key={paragraph}
                  className={cn(
                    "text-sm leading-relaxed",
                    paragraph.startsWith("TODO(legal)")
                      ? "rounded-md border border-dashed border-signal-warn/40 bg-surface px-4 py-3 font-mono text-xs text-signal-warn"
                      : "text-fg-muted",
                  )}
                >
                  {paragraph}
                </p>
              ))}

              {section.list ? (
                <ul className="flex flex-col gap-2.5 rounded-lg border border-line bg-surface p-5">
                  {section.list.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span
                        aria-hidden="true"
                        className="mt-2 size-1 shrink-0 rounded-full bg-primary"
                      />
                      <span className="text-sm leading-relaxed text-fg-muted">
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>

        <nav
          aria-label="Other legal documents"
          className="mt-14 flex flex-wrap gap-3 border-t border-line pt-8"
        >
          {others.map((other) => (
            <Link
              key={other.slug}
              href={`/${other.slug}`}
              className="rounded-md border border-line bg-surface px-4 py-2.5 text-sm text-fg-muted transition-colors hover:border-primary/45 hover:text-accent"
            >
              {other.title}
            </Link>
          ))}
        </nav>
      </Container>
    </>
  );
}
