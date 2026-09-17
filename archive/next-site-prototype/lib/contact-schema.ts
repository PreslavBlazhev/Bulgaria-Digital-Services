import { z } from "zod";

/**
 * One schema, used by the form and by the API route.
 *
 * Client-side validation is a convenience; the server revalidates the same
 * shape because anything arriving over HTTP is untrusted regardless of what
 * the browser was told to send.
 */

export const PROJECT_TYPE_OPTIONS = [
  { value: "website", label: "Company website" },
  { value: "commerce", label: "E-commerce / online ordering" },
  { value: "restaurant", label: "Restaurant platform" },
  { value: "business-system", label: "Custom business system" },
  { value: "automation", label: "Automation / integrations" },
  { value: "analytics", label: "Analytics / measurement" },
  { value: "unsure", label: "Not sure yet" },
] as const;

export const BUDGET_OPTIONS = [
  { value: "under-2k", label: "Under €2,000" },
  { value: "2k-5k", label: "€2,000 – €5,000" },
  { value: "5k-15k", label: "€5,000 – €15,000" },
  { value: "15k-plus", label: "€15,000+" },
  { value: "undecided", label: "Not decided yet" },
] as const;

export const TIMELINE_OPTIONS = [
  { value: "asap", label: "As soon as possible" },
  { value: "1-3-months", label: "Within 1–3 months" },
  { value: "3-6-months", label: "Within 3–6 months" },
  { value: "exploring", label: "Exploring options" },
] as const;

export const FEATURE_OPTIONS = [
  { value: "payments", label: "Payments" },
  { value: "accounts", label: "User accounts" },
  { value: "admin", label: "Admin panel" },
  { value: "ordering", label: "Online ordering" },
  { value: "booking", label: "Booking" },
  { value: "delivery", label: "Delivery" },
  { value: "multilingual", label: "Multilingual" },
  { value: "analytics", label: "Analytics" },
  { value: "integrations", label: "Integrations" },
  { value: "automation", label: "Automation" },
  { value: "reporting", label: "Reporting" },
  { value: "mobile", label: "Mobile application" },
] as const;

const values = <T extends readonly { value: string }[]>(options: T) =>
  options.map((o) => o.value) as [string, ...string[]];

export const contactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Please enter your name.")
    .max(120, "That name is longer than we can store."),

  company: z
    .string()
    .trim()
    .max(160, "That company name is longer than we can store.")
    .optional()
    .or(z.literal("")),

  email: z.email("Please enter a valid email address."),

  phone: z
    .string()
    .trim()
    .max(40, "That phone number looks too long.")
    .optional()
    .or(z.literal("")),

  projectType: z.enum(values(PROJECT_TYPE_OPTIONS), {
    message: "Please choose the closest project type.",
  }),

  budget: z.enum(values(BUDGET_OPTIONS), {
    message: "Please choose a budget range.",
  }),

  timeline: z.enum(values(TIMELINE_OPTIONS), {
    message: "Please choose a timeline.",
  }),

  situation: z
    .string()
    .trim()
    .min(20, "A sentence or two about the current situation helps a lot.")
    .max(2000, "Please keep this under 2000 characters."),

  goals: z
    .string()
    .trim()
    .min(10, "What would make this project worth doing?")
    .max(2000, "Please keep this under 2000 characters."),

  features: z.array(z.string()).default([]),

  context: z
    .string()
    .trim()
    .max(2000, "Please keep this under 2000 characters.")
    .optional()
    .or(z.literal("")),

  /** Populated from the builder or consultant handoff when present. */
  attachedSummary: z.string().max(6000).optional().or(z.literal("")),

  /**
   * Honeypot. Real users never see this field, so anything in it is a bot.
   * Cheaper and less hostile than a captcha.
   */
  website: z.string().max(0, "Submission rejected.").optional(),
});

export type ContactInput = z.input<typeof contactSchema>;
export type ContactPayload = z.output<typeof contactSchema>;

export function labelFor(
  options: readonly { value: string; label: string }[],
  value: string,
): string {
  return options.find((o) => o.value === value)?.label ?? value;
}
