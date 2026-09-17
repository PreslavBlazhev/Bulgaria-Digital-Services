type ClassValue =
  | string
  | number
  | null
  | undefined
  | false
  | ClassValue[]
  | Record<string, boolean | null | undefined>;

/**
 * Minimal class name joiner. Deliberately not tailwind-merge: the component
 * API exposes variants rather than arbitrary overrides, so conflict resolution
 * is not needed and the dependency is not worth its weight.
 *
 * The trade-off: passing a utility that conflicts with a component's own base
 * class (for example `hidden` to a Button that is already `inline-flex`) does
 * NOT reliably win — CSS resolves equal-specificity classes by stylesheet
 * order, not by the order they appear here. Put layout and visibility on a
 * wrapper element instead of overriding a component's base display.
 */
export function cn(...inputs: ClassValue[]): string {
  const out: string[] = [];

  for (const input of inputs) {
    if (!input) continue;

    if (typeof input === "string" || typeof input === "number") {
      out.push(String(input));
    } else if (Array.isArray(input)) {
      const nested = cn(...input);
      if (nested) out.push(nested);
    } else if (typeof input === "object") {
      for (const [key, value] of Object.entries(input)) {
        if (value) out.push(key);
      }
    }
  }

  return out.join(" ");
}
