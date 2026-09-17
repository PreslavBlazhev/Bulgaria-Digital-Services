import type { Metadata } from "next";
import { SITE, SITE_URL, absoluteUrl } from "./site";

interface PageMetaInput {
  title: string;
  description: string;
  /** Route path, e.g. "/work/pizza-pazzo". Drives canonical and og:url. */
  path: string;
  /** Overrides the generated OG image. */
  image?: string;
  type?: "website" | "article";
  publishedTime?: string;
  noIndex?: boolean;
}

/**
 * Builds a complete, consistent metadata object for a route.
 * OG images are generated per-page by `app/opengraph-image.tsx` unless the
 * caller supplies one explicitly.
 */
export function pageMetadata({
  title,
  description,
  path,
  image,
  type = "website",
  publishedTime,
  noIndex,
}: PageMetaInput): Metadata {
  const url = absoluteUrl(path);
  const images = image ? [{ url: image, width: 1200, height: 630 }] : undefined;

  return {
    title,
    description,
    metadataBase: new URL(SITE_URL),
    alternates: { canonical: url },
    robots: noIndex ? { index: false, follow: false } : undefined,
    openGraph: {
      title: `${title} — ${SITE.short}`,
      description,
      url,
      siteName: SITE.name,
      locale: "en_GB",
      type,
      ...(publishedTime ? { publishedTime } : {}),
      ...(images ? { images } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} — ${SITE.short}`,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}
