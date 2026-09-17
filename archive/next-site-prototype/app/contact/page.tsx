import type { Metadata } from "next";
import { Mail, MapPin, MessageSquare, Phone, Sparkles } from "lucide-react";
import Link from "next/link";
import { Container, Section } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ContactForm } from "@/components/interactive/ContactForm";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbSchema } from "@/lib/structured-data";
import { pageMetadata } from "@/lib/metadata";
import { SITE } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Start a Project",
  description:
    "Tell BDS what your operation currently does and where it costs you time. Every enquiry gets a reply — including the ones where BDS is not the right fit.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Contact", path: "/contact" },
        ])}
      />

      <Section className="relative overflow-hidden pt-16 pb-10 sm:pt-20">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-grid opacity-25"
          style={{
            maskImage:
              "radial-gradient(ellipse 65% 55% at 30% 0%, black, transparent 70%)",
          }}
        />

        <Container size="wide" className="relative">
          <SectionHeading
            as="h1"
            eyebrow="Start a project"
            title="Begin with the constraint, not the wishlist."
            lead="The useful first question is not what you want built — it is what currently costs you the most time or money. Answer that and the rest of the scope tends to follow."
            className="max-w-3xl"
          />
        </Container>
      </Section>

      <Container size="wide" className="pb-20 sm:pb-28">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] lg:gap-16">
          <div className="rounded-2xl border border-line bg-surface/40 p-6 sm:p-9">
            <ContactForm />
          </div>

          <aside className="flex flex-col gap-4">
            <div className="rounded-xl border border-line bg-surface p-6">
              <h2 className="mb-5 font-mono text-[0.625rem] tracking-[0.14em] text-fg-subtle uppercase">
                Direct contact
              </h2>

              <ul className="flex flex-col gap-4">
                <li>
                  <a
                    href={`mailto:${SITE.email}`}
                    className="flex items-start gap-3 text-sm text-fg-muted transition-colors hover:text-accent"
                  >
                    <Mail
                      aria-hidden="true"
                      className="mt-0.5 size-4 shrink-0 text-fg-subtle"
                    />
                    {SITE.email}
                  </a>
                </li>
                <li>
                  <a
                    href={`tel:${SITE.phone}`}
                    className="flex items-start gap-3 text-sm text-fg-muted transition-colors hover:text-accent"
                  >
                    <Phone
                      aria-hidden="true"
                      className="mt-0.5 size-4 shrink-0 text-fg-subtle"
                    />
                    {SITE.phoneDisplay}
                  </a>
                </li>
                <li className="flex items-start gap-3 text-sm text-fg-muted">
                  <MapPin
                    aria-hidden="true"
                    className="mt-0.5 size-4 shrink-0 text-fg-subtle"
                  />
                  {SITE.region}
                </li>
              </ul>
            </div>

            <div className="rounded-xl border border-line bg-surface p-6">
              <h2 className="mb-4 font-mono text-[0.625rem] tracking-[0.14em] text-fg-subtle uppercase">
                Not ready to write it all out?
              </h2>

              <div className="flex flex-col gap-2.5">
                <Link
                  href="/build"
                  className="group flex items-start gap-3 rounded-lg border border-line bg-surface-sunken p-4 transition-colors hover:border-primary/45"
                >
                  <Sparkles
                    aria-hidden="true"
                    className="mt-0.5 size-4 shrink-0 text-accent"
                  />
                  <span className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-fg transition-colors group-hover:text-accent">
                      Solution Architect
                    </span>
                    <span className="text-xs leading-snug text-fg-subtle">
                      Five questions, then a generated architecture you can send
                      with your enquiry.
                    </span>
                  </span>
                </Link>

                <Link
                  href="/consultant"
                  className="group flex items-start gap-3 rounded-lg border border-line bg-surface-sunken p-4 transition-colors hover:border-primary/45"
                >
                  <MessageSquare
                    aria-hidden="true"
                    className="mt-0.5 size-4 shrink-0 text-accent"
                  />
                  <span className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-fg transition-colors group-hover:text-accent">
                      Project consultant
                    </span>
                    <span className="text-xs leading-snug text-fg-subtle">
                      Talk it through and get a structured brief you can attach.
                    </span>
                  </span>
                </Link>
              </div>
            </div>

            <div className="rounded-xl border border-line bg-surface p-6">
              <h2 className="mb-4 font-mono text-[0.625rem] tracking-[0.14em] text-fg-subtle uppercase">
                What happens next
              </h2>
              <ol className="flex flex-col gap-3">
                {[
                  "A reply within one working day, from the person who would do the work.",
                  "A short call to establish what the constraint actually is.",
                  "A written scope with explicit boundaries and known unknowns.",
                  "A price against that scope — not against a guess.",
                ].map((step, index) => (
                  <li key={step} className="flex items-start gap-3">
                    <span className="mt-0.5 font-mono text-[0.625rem] text-accent tabular-nums">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="text-sm leading-relaxed text-fg-muted">
                      {step}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </aside>
        </div>
      </Container>
    </>
  );
}
