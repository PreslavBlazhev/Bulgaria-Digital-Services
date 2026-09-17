import type { Metadata } from "next";
import { Container, Section } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { LinkButton } from "@/components/ui/Button";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbSchema } from "@/lib/structured-data";
import { pageMetadata } from "@/lib/metadata";
import { SITE } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "About",
  description:
    "BDS engineers digital infrastructure for businesses in Bulgaria — from digital presence through commerce to the operational systems companies run on.",
  path: "/about",
});

const EVOLUTION = [
  {
    stage: "Web presence",
    body: "It starts with a site that presents the business properly. Structured, fast, indexable, measurable — infrastructure rather than a brochure.",
  },
  {
    stage: "Business systems",
    body: "Then the operational layer: ordering, accounts, admin, the dashboard someone opens every morning. The point where software stops describing the business and starts running it.",
  },
  {
    stage: "Digital infrastructure",
    body: "Data models, permissions, integrations and measurement designed as one system rather than six tools with a person in between.",
  },
  {
    stage: "Connected platforms",
    body: "Systems that talk to each other and to the outside world — payments, delivery, accounting, hardware — with the business owning the connections.",
  },
];

const PRINCIPLES = [
  {
    title: "The client owns the system",
    body: "Source code, data, infrastructure and administrative access belong to the business that paid for them. There is no version of this arrangement where leaving is difficult.",
  },
  {
    title: "Claims must be checkable",
    body: "Every figure on this site is counted from a delivered system, and the case studies list the trade-offs alongside the wins. There are no testimonials here because none have been formally collected.",
  },
  {
    title: "Say no to the wrong project",
    body: "Custom software is frequently the wrong answer. When off-the-shelf will do the job, that is the recommendation — it is a shorter conversation and a better outcome.",
  },
  {
    title: "Build for the second year",
    body: "A system that only fits today's process has to be rebuilt when the process changes. Modelling the general case costs slightly more now and considerably less later.",
  },
];

export default function AboutPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "About", path: "/about" },
        ])}
      />

      <Section className="relative overflow-hidden pt-16 sm:pt-20">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-grid opacity-25"
          style={{
            maskImage:
              "radial-gradient(ellipse 70% 55% at 30% 0%, black, transparent 70%)",
          }}
        />

        <Container size="wide" className="relative flex flex-col gap-12">
          <SectionHeading
            as="h1"
            eyebrow="About BDS"
            title="Engineering better digital businesses."
            lead="Bulgaria Digital Services builds the software companies operate on. That means websites where a website is the right answer, and systems where it is not — with the same engineering standard applied to both."
            className="max-w-3xl"
          />

          <div className="grid gap-6 border-t border-line pt-10 lg:grid-cols-2 lg:gap-16">
            <p className="text-base leading-relaxed text-fg-muted">
              Most businesses do not fail at digital because they picked the
              wrong platform. They end up with a website that markets the
              company, a spreadsheet that actually runs it, and a person whose
              job is to keep the two in agreement. Every part works. The gaps
              between them are where the cost sits.
            </p>
            <p className="text-base leading-relaxed text-fg-muted">
              BDS closes those gaps. The work ranges from a properly engineered
              corporate site to a restaurant ordering platform with its own
              kitchen application — but the approach does not change: model the
              data first, put the rules on the server, measure what informs a
              decision, and hand over something the client owns outright.
            </p>
          </div>
        </Container>
      </Section>

      {/* Evolution */}
      <Section className="border-y border-line bg-bg-alt">
        <Container size="wide" className="flex flex-col gap-12">
          <SectionHeading
            eyebrow="The transition"
            title="From digital presence to operational infrastructure."
            lead="These are not service tiers. They are the stages a business moves through as its digital footprint stops being marketing and starts being operations."
            className="max-w-2xl"
          />

          <ol className="grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            {EVOLUTION.map((item, index) => (
              <li key={item.stage} className="flex flex-col gap-3 bg-surface p-6">
                <span className="font-mono text-[0.6875rem] tracking-[0.14em] text-accent">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="text-base font-semibold text-fg">{item.stage}</h3>
                <p className="text-sm leading-relaxed text-fg-muted">
                  {item.body}
                </p>
              </li>
            ))}
          </ol>
        </Container>
      </Section>

      {/* Principles */}
      <Section>
        <Container size="wide" className="flex flex-col gap-12">
          <SectionHeading
            eyebrow="Operating principles"
            title="Four commitments that shape the work."
            className="max-w-2xl"
          />

          <div className="grid gap-3 sm:grid-cols-2">
            {PRINCIPLES.map((principle) => (
              <div
                key={principle.title}
                className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-7"
              >
                <h3 className="text-lg font-semibold text-fg">
                  {principle.title}
                </h3>
                <p className="text-sm leading-relaxed text-fg-muted">
                  {principle.body}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      {/* Contact strip */}
      <Section className="border-t border-line bg-bg-alt">
        <Container size="wide">
          <div className="grid gap-10 rounded-xl border border-line bg-surface p-8 sm:p-10 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-16">
            <div className="flex flex-col gap-5">
              <SectionHeading
                eyebrow="Working with BDS"
                title="Start with the constraint, not the wishlist."
                lead="The first conversation is about what currently costs the most time or money in your operation. That determines what gets built first — everything else connects to it later."
              />
              <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                <LinkButton href="/contact" withArrow>
                  Start a Project
                </LinkButton>
                <LinkButton href="/process" variant="secondary">
                  See the build system
                </LinkButton>
              </div>
            </div>

            <dl className="flex flex-col gap-5 border-t border-line pt-8 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-10">
              <ContactRow term="Email" value={SITE.email} href={`mailto:${SITE.email}`} />
              <ContactRow
                term="Phone"
                value={SITE.phoneDisplay}
                href={`tel:${SITE.phone}`}
              />
              <ContactRow term="Based in" value={SITE.region} />
              <ContactRow term="Working language" value="Bulgarian and English" />
            </dl>
          </div>
        </Container>
      </Section>
    </>
  );
}

function ContactRow({
  term,
  value,
  href,
}: {
  term: string;
  value: string;
  href?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="font-mono text-[0.625rem] tracking-[0.14em] text-fg-subtle uppercase">
        {term}
      </dt>
      <dd className="text-sm text-fg-muted">
        {href ? (
          <a href={href} className="transition-colors hover:text-accent">
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}
