import type { Metadata } from "next";
import { PRIVACY } from "@/data/legal";
import { LegalDocumentView } from "@/components/sections/LegalDocument";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbSchema } from "@/lib/structured-data";
import { pageMetadata } from "@/lib/metadata";

export const metadata: Metadata = pageMetadata({
  title: PRIVACY.title,
  description: PRIVACY.description,
  path: "/privacy",
});

export default function PRIVACYPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: PRIVACY.title, path: "/privacy" },
        ])}
      />
      <LegalDocumentView doc={PRIVACY} />
    </>
  );
}
