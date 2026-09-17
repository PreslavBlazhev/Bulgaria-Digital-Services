import type { Metadata } from "next";
import { TERMS } from "@/data/legal";
import { LegalDocumentView } from "@/components/sections/LegalDocument";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbSchema } from "@/lib/structured-data";
import { pageMetadata } from "@/lib/metadata";

export const metadata: Metadata = pageMetadata({
  title: TERMS.title,
  description: TERMS.description,
  path: "/terms",
});

export default function TERMSPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: TERMS.title, path: "/terms" },
        ])}
      />
      <LegalDocumentView doc={TERMS} />
    </>
  );
}
