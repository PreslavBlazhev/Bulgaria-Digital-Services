import type { Solution } from "@/types";

export const SOLUTIONS: Solution[] = [
  {
    slug: "websites",
    name: "Digital Presence",
    positioning: "Digital Presence Infrastructure",
    summary:
      "Corporate and premium websites engineered as long-lived infrastructure — structured content, multilingual routing, measurement and integrations from day one.",
    intro:
      "A website is the only part of most businesses that works every hour of every day without supervision. Treating it as a marketing artefact produces something that looks finished and behaves like a dead end. BDS builds digital presence as infrastructure: structured content models, real routing, server-rendered performance, and measurement wired in before launch rather than bolted on afterwards.",
    icon: "globe",
    capabilities: [
      {
        title: "Corporate websites",
        description:
          "Multi-page architecture with a content model behind it, so pages can be added without a rebuild of the whole site.",
      },
      {
        title: "Premium interfaces",
        description:
          "Interaction design that carries weight — motion used to explain hierarchy and relationship, never as decoration.",
      },
      {
        title: "Multilingual platforms",
        description:
          "Locale-aware routing and a single translation key namespace, so a second language is a data problem rather than a second website.",
      },
      {
        title: "Technical SEO",
        description:
          "Server-rendered markup, canonical URLs, generated sitemaps, structured data and Open Graph handled at the framework level.",
      },
      {
        title: "Content management",
        description:
          "Editable content boundaries where they earn their keep, and typed data files where a CMS would only add operational cost.",
      },
      {
        title: "Conversion paths",
        description:
          "Instrumented enquiry flows — what people clicked before they contacted you is a measurable fact, not a guess.",
      },
    ],
    deliverables: [
      "Production Next.js application, source included",
      "Typed content model and data layer",
      "Analytics with consent handling",
      "Sitemap, robots and structured data",
      "Deployment pipeline and environment configuration",
      "Documentation for content updates",
    ],
    signals: [
      "Content changes require a developer and a week of waiting",
      "The site loads acceptably on your laptop and badly on a phone",
      "A second language would mean building a second website",
      "You cannot say which page produced last month's enquiries",
    ],
    stack: ["Next.js", "React", "TypeScript", "Tailwind CSS", "GA4", "Vercel"],
    proof: ["pizza-pazzo", "makeup-by-denitsa"],
  },
  {
    slug: "commerce",
    name: "Commerce",
    positioning: "Owned Commerce Infrastructure",
    summary:
      "Catalogue, cart, checkout, payments and fulfilment running on infrastructure you own — not rented from a marketplace that owns your customer relationship.",
    intro:
      "Marketplaces are an efficient way to acquire a first order and an expensive way to keep a customer. Every transaction routed through a platform hands over margin, contact data and the ability to change how your own business operates. BDS builds commerce systems where the catalogue, the pricing logic, the customer accounts and the order history belong to the business running them.",
    icon: "cart",
    capabilities: [
      {
        title: "Product catalogue",
        description:
          "Categories, variants, modifiers and availability modelled properly, so a menu or range change is a data edit rather than a deployment.",
      },
      {
        title: "Cart and checkout",
        description:
          "Persistent carts, validated checkout flows and clear error states on the paths where revenue is actually lost.",
      },
      {
        title: "Server-authoritative pricing",
        description:
          "Totals are recalculated on the server from the source catalogue. A modified client payload cannot change what an order costs.",
      },
      {
        title: "Payments",
        description:
          "Card, cash-on-delivery and bank transfer flows, with the provider kept behind an interface so it can be changed later.",
      },
      {
        title: "Customer accounts",
        description:
          "Order history, saved addresses and repeat-order flows — the mechanics that turn a first purchase into a second one.",
      },
      {
        title: "Order lifecycle",
        description:
          "Explicit statuses from placement to completion, visible to both the customer and the people fulfilling the order.",
      },
    ],
    deliverables: [
      "Commerce application with admin management",
      "Server-side pricing and order validation",
      "Payment integration behind a provider interface",
      "Customer accounts and order history",
      "Transactional email templates",
      "Operational reporting",
    ],
    signals: [
      "A third-party platform takes a percentage of every order",
      "Your customer list belongs to someone else",
      "Prices are edited in more than one place",
      "Orders arrive by phone and get written down by hand",
    ],
    stack: ["Next.js", "Prisma", "PostgreSQL", "TypeScript", "REST APIs"],
    proof: ["pizza-pazzo", "makeup-by-denitsa"],
  },
  {
    slug: "business-systems",
    name: "Business Systems",
    positioning: "Operational Systems",
    summary:
      "Admin dashboards, client portals and internal tools shaped around how your business actually runs, rather than how generic software assumes it runs.",
    intro:
      "Most companies operate on a stack of spreadsheets, message threads and institutional memory. It works until the volume rises or the person holding it in their head takes a holiday. A custom business system encodes the process — who can do what, in what order, with what record — so operations survive growth and staff turnover.",
    icon: "layers",
    capabilities: [
      {
        title: "Admin dashboards",
        description:
          "Operational views built around decisions rather than tables — what needs attention now, not everything the database contains.",
      },
      {
        title: "Client portals",
        description:
          "External-facing accounts where customers see their own status without generating a phone call.",
      },
      {
        title: "Role-based access",
        description:
          "Permission tiers enforced on the server. Hiding a button is presentation; refusing the request is security.",
      },
      {
        title: "Workflow modelling",
        description:
          "State machines that reflect how work really moves, including the exceptions people currently handle informally.",
      },
      {
        title: "Reporting",
        description:
          "Operational reports generated from live records instead of exported, reconciled and emailed spreadsheets.",
      },
      {
        title: "Audit trails",
        description:
          "Who changed what and when — the difference between a disagreement and a lookup.",
      },
    ],
    deliverables: [
      "Custom internal application",
      "Role and permission model",
      "Operational reporting views",
      "Data model and migration setup",
      "Admin documentation",
      "Extension path for future modules",
    ],
    signals: [
      "Critical processes live in one spreadsheet nobody else understands",
      "Staff re-key the same information into two systems",
      "Nobody can answer a status question without asking a person",
      "Off-the-shelf software forces you to change how you operate",
    ],
    stack: ["Next.js", "TypeScript", "Prisma", "PostgreSQL", "Node.js"],
    proof: ["pizza-pazzo", "makeup-by-denitsa"],
  },
  {
    slug: "automation",
    name: "Automation",
    positioning: "Systems Integration & Automation",
    summary:
      "API integrations, event-driven workflows and notifications that remove the manual copying between systems that currently consumes staff hours.",
    intro:
      "When two systems cannot talk to each other, a person becomes the integration layer. That person is slower than an API, makes typing errors, and stops working at six o'clock. Automation is rarely about replacing people — it is about removing the mechanical work that stops them doing anything more valuable.",
    icon: "workflow",
    capabilities: [
      {
        title: "API integrations",
        description:
          "Connections to accounting, CRM, delivery, messaging and payment providers, with retry behaviour and failure visibility.",
      },
      {
        title: "Event-driven workflows",
        description:
          "Actions triggered by system events rather than by someone remembering to check.",
      },
      {
        title: "Transactional messaging",
        description:
          "Email and messaging triggered from real state changes — order confirmed, status changed, action required.",
      },
      {
        title: "Scheduled operations",
        description:
          "Recurring jobs for reporting, reconciliation, cleanup and synchronisation.",
      },
      {
        title: "Internal alerting",
        description:
          "Notifications routed to the people who can act, with enough context to act immediately.",
      },
      {
        title: "Failure handling",
        description:
          "Retries, dead-letter handling and logging, so a failed integration surfaces instead of silently losing data.",
      },
    ],
    deliverables: [
      "Integration layer with typed contracts",
      "Event and webhook handling",
      "Notification templates and routing",
      "Retry and failure logging",
      "Integration documentation",
    ],
    signals: [
      "Someone exports a file every morning and imports it somewhere else",
      "Order data is copied into accounting by hand",
      "Notifications depend on a person noticing something",
      "Two systems disagree and nobody knows which is right",
    ],
    stack: ["Node.js", "TypeScript", "REST APIs", "Python", "Webhooks"],
    proof: ["pizza-pazzo"],
  },
  {
    slug: "analytics",
    name: "Analytics",
    positioning: "Decision Infrastructure",
    summary:
      "Measurement designed around the decisions a business actually makes — consent-compliant, event-level, and connected to the product rather than sitting beside it.",
    intro:
      "Analytics fails in two directions: nothing is measured, or everything is measured and none of it changes a decision. Useful measurement starts from the questions the business needs answered, defines the events that answer them, and stops there. Consent handling is part of the design, not a banner added the week before launch.",
    icon: "chart",
    capabilities: [
      {
        title: "Event architecture",
        description:
          "A named, documented event schema agreed before implementation, so reports mean the same thing in six months.",
      },
      {
        title: "GA4 implementation",
        description:
          "Configured properly — custom events, parameters and conversions rather than default pageview tracking.",
      },
      {
        title: "Consent Mode v2",
        description:
          "Consent state drives measurement behaviour. Denied categories are respected in the data layer, not just visually.",
      },
      {
        title: "Conversion analysis",
        description:
          "Instrumented funnels that show where intent is lost, at the step where it is lost.",
      },
      {
        title: "Operational dashboards",
        description:
          "Internal reporting from your own database, for numbers that never belonged in a third-party analytics tool.",
      },
      {
        title: "Product feedback loops",
        description:
          "Measurement fed back into roadmap decisions instead of into a monthly report nobody reads.",
      },
    ],
    deliverables: [
      "Documented event schema",
      "GA4 property configuration",
      "Consent Mode v2 integration",
      "Conversion and funnel setup",
      "Internal reporting views",
    ],
    signals: [
      "You have analytics installed and have never made a decision from it",
      "Cookie consent exists visually but changes nothing technically",
      "Nobody agrees what counts as a conversion",
      "Reporting is assembled by hand each month",
    ],
    stack: ["GA4", "Consent Mode v2", "TypeScript", "PostgreSQL"],
    proof: ["makeup-by-denitsa", "pizza-pazzo"],
  },
  {
    slug: "restaurant-technology",
    name: "Restaurant Technology",
    positioning: "Hospitality Operations Infrastructure",
    summary:
      "Ordering, kitchen workflow and restaurant operations as one connected system — built from a production deployment, not a product demo.",
    intro:
      "Restaurants run on timing. An ordering system that produces a correct order thirty seconds late has produced a problem. BDS builds hospitality technology from the kitchen backwards: the order arrives on a screen someone is already looking at, in the order it needs to be cooked, with modifiers that survive the trip from the customer's phone.",
    icon: "utensils",
    capabilities: [
      {
        title: "Digital menu",
        description:
          "Categories, products, variants, extras and allergen information, editable without a developer.",
      },
      {
        title: "Online ordering",
        description:
          "Delivery and pickup flows with address handling, order notes and scheduled ordering.",
      },
      {
        title: "Server-side pricing",
        description:
          "Every total recalculated server-side from the live menu. Extras and variants cannot be repriced by the client.",
      },
      {
        title: "Kitchen workflow",
        description:
          "A dedicated kitchen view with explicit accept, prepare and complete states, designed for a tablet in a working kitchen.",
      },
      {
        title: "Order status",
        description:
          "Status visible to the customer and to staff, from the same record, with no reconciliation between them.",
      },
      {
        title: "Multi-location readiness",
        description:
          "Data model prepared for multiple venues, shared or separate menus, and per-location operating hours.",
      },
    ],
    deliverables: [
      "Customer ordering application",
      "Admin menu and order management",
      "Kitchen application",
      "Transactional email flows",
      "Operational reporting",
      "Operating-hours and closure controls",
    ],
    signals: [
      "Delivery platforms take a fifth of every order",
      "Orders are taken by phone during service",
      "The menu online and the menu printed disagree",
      "The kitchen finds out about an order when someone walks in with paper",
    ],
    stack: ["Next.js", "Prisma", "PostgreSQL", "Kotlin", "REST APIs"],
    proof: ["pizza-pazzo"],
  },
];

export function getSolution(slug: string): Solution | undefined {
  return SOLUTIONS.find((s) => s.slug === slug);
}
