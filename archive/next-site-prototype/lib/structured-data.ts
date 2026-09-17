import { SITE, absoluteUrl } from "./site";
import type { Insight } from "@/types";

/**
 * JSON-LD builders.
 *
 * Only facts that are verifiable appear here. No aggregate ratings, no review
 * counts, no employee numbers — Google penalises fabricated structured data
 * and it would be dishonest regardless.
 */

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    "@id": `${absoluteUrl("/")}#organization`,
    name: SITE.name,
    alternateName: SITE.short,
    legalName: SITE.legalName,
    description: SITE.description,
    slogan: SITE.tagline,
    url: absoluteUrl("/"),
    email: SITE.email,
    telephone: SITE.phone,
    areaServed: { "@type": "Country", name: "Bulgaria" },
    address: {
      "@type": "PostalAddress",
      addressCountry: SITE.country,
      addressRegion: "Pleven",
    },
    sameAs: [SITE.social.instagram],
    knowsAbout: [
      "Web development",
      "E-commerce systems",
      "Business systems",
      "Restaurant technology",
      "Systems integration",
      "Digital analytics",
    ],
  };
}

export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${absoluteUrl("/")}#website`,
    name: SITE.name,
    url: absoluteUrl("/"),
    publisher: { "@id": `${absoluteUrl("/")}#organization` },
    inLanguage: "en",
  };
}

export function breadcrumbSchema(
  trail: { name: string; path: string }[],
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  };
}

export function articleSchema(insight: Insight) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: insight.title,
    description: insight.excerpt,
    datePublished: insight.date,
    dateModified: insight.date,
    articleSection: insight.category,
    inLanguage: "en",
    author: { "@type": "Organization", name: SITE.name },
    publisher: { "@id": `${absoluteUrl("/")}#organization` },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": absoluteUrl(`/insights/${insight.slug}`),
    },
  };
}

export function serviceSchema(input: {
  name: string;
  description: string;
  path: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: input.name,
    description: input.description,
    url: absoluteUrl(input.path),
    provider: { "@id": `${absoluteUrl("/")}#organization` },
    areaServed: { "@type": "Country", name: "Bulgaria" },
  };
}

