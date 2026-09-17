import type { Metadata } from "next";
import { COOKIES } from "@/data/legal";
import { LegalDocumentView } from "@/components/sections/LegalDocument";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbSchema } from "@/lib/structured-data";
import { pageMetadata } from "@/lib/metadata";

export const metadata: Metadata = pageMetadata({
  title: COOKIES.title,
  description: COOKIES.description,
  path: "/cookies",
});

export default function COOKIESPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: COOKIES.title, path: "/cookies" },
        ])}
      />
      <LegalDocumentView doc={COOKIES} />
    </>
  );
}
