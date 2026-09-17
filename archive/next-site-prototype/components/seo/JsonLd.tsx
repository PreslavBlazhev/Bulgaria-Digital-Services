/**
 * Emits a JSON-LD block.
 *
 * The payload is always built from typed internal data in `lib/structured-data`,
 * never from user input, so serialising it here carries no injection surface.
 */
export function JsonLd({ data }: { data: object | object[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
