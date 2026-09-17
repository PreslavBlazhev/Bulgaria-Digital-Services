import type { TechCategory, Technology } from "@/types";

/**
 * Only technologies BDS has a working reason to use appear here.
 * `usedIn` is factual — an empty array means "selected, not yet shipped".
 */
export const TECHNOLOGIES: Technology[] = [
  /* --- Frontend --------------------------------------------------------- */
  {
    name: "Next.js",
    category: "Frontend",
    what: "A React framework with server rendering, file-based routing and a build system that ships less JavaScript to the browser.",
    why: "Server rendering is what makes a content page indexable and fast on mobile data, while still allowing genuinely interactive surfaces in the same application. One framework covers both without a second stack.",
    usedIn: ["Pizza Pazzo", "BDS Digital Platform"],
  },
  {
    name: "React",
    category: "Frontend",
    what: "A component library for building interfaces out of composable, stateful pieces.",
    why: "Interfaces like an order configurator or an architecture graph are state problems. Modelling them as components keeps that state contained instead of spread across a page.",
    usedIn: ["Pizza Pazzo", "BDS Digital Platform"],
  },
  {
    name: "TypeScript",
    category: "Frontend",
    what: "JavaScript with a static type system checked before the code runs.",
    why: "Most production incidents are shape mismatches between two parts of a system. Typing the boundary turns those into build failures instead of customer-facing errors.",
    usedIn: ["Pizza Pazzo", "BDS Digital Platform"],
  },
  {
    name: "Tailwind CSS",
    category: "Frontend",
    what: "A utility-first styling system driven by design tokens.",
    why: "Design decisions live in one token file rather than in a stylesheet that grows forever. Changing a colour is one edit, not a search across the codebase.",
    usedIn: ["BDS Digital Platform"],
  },

  /* --- Backend ---------------------------------------------------------- */
  {
    name: "Node.js",
    category: "Backend",
    what: "A JavaScript runtime for server-side applications.",
    why: "One language across client and server removes an entire category of translation errors, and lets validation logic be shared rather than reimplemented on both sides.",
    usedIn: ["Makeup by Denitsa", "Pizza Pazzo"],
  },
  {
    name: "Express",
    category: "Backend",
    what: "A minimal HTTP framework for Node.js.",
    why: "When an application does not need a full framework, Express keeps the surface small and the request path obvious. Fewer abstractions to reason about during an incident.",
    usedIn: ["Makeup by Denitsa"],
  },
  {
    name: "Python",
    category: "Backend",
    what: "A general-purpose language with strong data and scripting libraries.",
    why: "Used for data processing, migration and automation tasks where a scripting language is a better fit than an application server.",
    usedIn: [],
  },
  {
    name: "REST APIs",
    category: "Backend",
    what: "HTTP interfaces with predictable resources, verbs and status codes.",
    why: "A native mobile application and a browser client can consume the same endpoints. The kitchen app on a tablet talks to exactly the API the website does.",
    usedIn: ["Pizza Pazzo"],
  },

  /* --- Data ------------------------------------------------------------- */
  {
    name: "Prisma",
    category: "Data",
    what: "A typed database toolkit with schema-driven migrations.",
    why: "The database schema and the application types come from one definition. A column rename becomes a compile error rather than a runtime surprise in production.",
    usedIn: ["Pizza Pazzo"],
  },
  {
    name: "PostgreSQL",
    category: "Data",
    what: "A relational database with strong consistency guarantees.",
    why: "Orders, payments and entitlements are relational data with correctness requirements. Constraints and transactions belong in the database, not in application code hoping for the best.",
    usedIn: [],
  },
  {
    name: "SQLite",
    category: "Data",
    what: "An embedded relational database contained in a single file.",
    why: "For single-venue workloads it removes an entire piece of infrastructure while keeping real SQL semantics. The migration path to PostgreSQL stays open because the schema is defined in Prisma.",
    usedIn: ["Pizza Pazzo", "Makeup by Denitsa"],
  },

  /* --- Infrastructure ---------------------------------------------------- */
  {
    name: "Vercel",
    category: "Infrastructure",
    what: "A deployment platform built around Next.js.",
    why: "Server rendering, edge caching and preview deployments without maintaining a build pipeline. Preview URLs make review a link rather than a screen share.",
    usedIn: ["BDS Digital Platform"],
  },
  {
    name: "Render",
    category: "Infrastructure",
    what: "A managed hosting platform for applications with persistent state.",
    why: "Used when an application needs a long-running process and a persistent disk rather than a serverless execution model.",
    usedIn: ["Makeup by Denitsa"],
  },
  {
    name: "Netlify",
    category: "Infrastructure",
    what: "A hosting platform for static and edge-rendered sites.",
    why: "Appropriate where a site is genuinely static. Cheap, fast and one less moving part to monitor.",
    usedIn: [],
  },

  /* --- Analytics --------------------------------------------------------- */
  {
    name: "GA4",
    category: "Analytics",
    what: "Google Analytics 4, an event-based measurement platform.",
    why: "Event-based measurement matches how products actually work. Configured with a defined schema, not left on default pageview tracking.",
    usedIn: ["Makeup by Denitsa"],
  },
  {
    name: "Consent Mode v2",
    category: "Analytics",
    what: "Google's mechanism for adjusting measurement behaviour based on a visitor's consent state.",
    why: "It makes a consent banner mean something technically. Denied categories change what is collected rather than only what is displayed.",
    usedIn: ["Makeup by Denitsa", "BDS Digital Platform"],
  },

  /* --- Payments ---------------------------------------------------------- */
  {
    name: "Payment provider interface",
    category: "Payments",
    what: "An internal abstraction that keeps the specific payment processor behind a stable contract.",
    why: "Providers get replaced for commercial reasons. Keeping the integration behind an interface makes that a contained change instead of a rewrite of checkout.",
    usedIn: ["Makeup by Denitsa"],
  },
  {
    name: "Cash on delivery",
    category: "Payments",
    what: "Payment collected on handover rather than at checkout.",
    why: "Still the dominant expectation for food delivery in this market. Supporting it properly, with the order lifecycle reflecting unpaid state, matters more than supporting every card scheme.",
    usedIn: ["Pizza Pazzo"],
  },

  /* --- Mobile ------------------------------------------------------------ */
  {
    name: "Kotlin",
    category: "Mobile",
    what: "The primary language for native Android development.",
    why: "Required for hardware access. Bluetooth thermal printing and reliable wake behaviour on a kitchen tablet are not available to a browser tab.",
    usedIn: ["Pizza Pazzo"],
  },
  {
    name: "Bluetooth ESC/POS",
    category: "Mobile",
    what: "The command standard thermal receipt printers speak.",
    why: "Kitchen tickets have to print on the hardware restaurants already own, over the connection those printers actually support.",
    usedIn: ["Pizza Pazzo"],
  },

  /* --- Automation -------------------------------------------------------- */
  {
    name: "Webhooks",
    category: "Automation",
    what: "HTTP callbacks fired by one system when an event occurs in it.",
    why: "Event-driven integration removes polling and removes the person who currently checks whether something happened.",
    usedIn: ["Makeup by Denitsa"],
  },
  {
    name: "Transactional email",
    category: "Automation",
    what: "Templated messages triggered by system state changes.",
    why: "Order confirmations and access details should be a consequence of a state change, not a task on somebody's list.",
    usedIn: ["Pizza Pazzo", "Makeup by Denitsa"],
  },
  {
    name: "Zod",
    category: "Automation",
    what: "A schema library that validates data at runtime and infers static types from the same definition.",
    why: "External input — forms, webhooks, API payloads — has to be validated at the boundary. One schema producing both the runtime check and the type keeps them from drifting apart.",
    usedIn: ["BDS Digital Platform"],
  },
];

export const TECH_CATEGORIES: TechCategory[] = [
  "Frontend",
  "Backend",
  "Data",
  "Infrastructure",
  "Analytics",
  "Payments",
  "Mobile",
  "Automation",
];

export function technologiesByCategory(category: TechCategory): Technology[] {
  return TECHNOLOGIES.filter((t) => t.category === category);
}
