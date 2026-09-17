import type { Project } from "@/types";

/* ==========================================================================
   Case studies.

   Every metric below carries a `source` field describing how it was
   established. Nothing here is a marketing estimate — if a number cannot be
   traced to the codebase or a delivered artefact, it does not appear.
   ========================================================================== */

const pizzaPazzo: Project = {
  slug: "pizza-pazzo",
  name: "Pizza Pazzo",
  client: "Pizza Pazzo",
  category: "Restaurant Digital Infrastructure",
  tagline: "A restaurant running on infrastructure it owns.",
  description:
    "A complete ordering platform for a pizza restaurant: bilingual customer application, server-authoritative pricing, customer accounts, admin management, a dedicated Android kitchen application and transactional email — replacing phone orders and marketplace commission with a system the business controls.",
  year: "2026",
  status: "Delivered",
  featured: true,
  services: [
    "Commerce",
    "Restaurant Technology",
    "Business Systems",
    "Automation",
  ],
  technologies: [
    "Next.js",
    "TypeScript",
    "Prisma",
    "SQLite",
    "React",
    "Kotlin",
    "REST APIs",
  ],
  metrics: [
    {
      value: "98",
      label: "Products in catalogue",
      source: "Counted from the production seed data",
    },
    {
      value: "10",
      label: "Menu categories",
      source: "Counted from the production seed data",
    },
    {
      value: "84",
      label: "Product variants",
      source: "Counted from the production seed data",
    },
    {
      value: "378",
      label: "Localization keys",
      source: "Counted from the BG/EN translation namespace",
    },
    {
      value: "7",
      label: "Order statuses",
      source: "Defined in the order state machine",
    },
    {
      value: "4",
      label: "Access roles",
      source: "CUSTOMER, STAFF, ADMIN, SUPER_ADMIN in the permission model",
    },
  ],
  challenge: {
    heading: "The challenge",
    body: [
      "The restaurant's digital presence was a static site with a photographed menu. Orders arrived by phone during service, were written down by hand, and were repriced verbally whenever a customer asked for an extra topping. The printed menu and the online menu disagreed often enough that staff had learned to trust neither.",
      "Delivery marketplaces solved the ordering problem and created a worse one: commission on every order, no access to the customer relationship, and no ability to change how the business operated without waiting for a third party to allow it.",
      "The requirement was not a nicer menu page. It was an ordering system the restaurant would own outright, that a kitchen could actually use during a Friday service, and that would not fall apart the first time someone ordered a large pizza with three modifications in English.",
    ],
  },
  solution: {
    heading: "The solution",
    body: [
      "BDS built a Next.js application with the catalogue modelled properly — categories, products, variants and extras as first-class data rather than text. Every price the customer sees is recalculated on the server from that catalogue at checkout, so a modified client request cannot change what an order costs.",
      "Bilingual support is a data concern, not a second website: a single translation namespace covers both Bulgarian and English across the entire interface, including product modifiers and order statuses.",
      "Orders move through an explicit seven-state lifecycle, visible to the customer and to staff from the same record. A dedicated Android application gives the kitchen a purpose-built order screen with Bluetooth thermal printing, so the order arrives on a device the kitchen is already watching rather than on paper carried in from the front.",
      "Administration covers menu editing, order management, role-based staff access and manual closure with enforced operating hours — the controls a restaurant needs on a night when it has to stop taking orders at short notice.",
    ],
  },
  decisions: [
    {
      decision: "Recalculate every order total on the server",
      rationale:
        "Client-submitted prices are user input. Extras and variants multiply the number of ways a total can be manipulated, and a pricing bug in hospitality is a direct financial loss.",
      tradeoff:
        "Checkout carries an extra server round trip. At restaurant order volumes this is imperceptible, and it removes an entire class of exploit.",
    },
    {
      decision: "A native Android kitchen application rather than a web view alone",
      rationale:
        "Kitchens need Bluetooth thermal printing and a screen that stays awake through a service. A browser tab cannot reliably do either on a tablet mounted near a hot oven.",
      tradeoff:
        "A second codebase to maintain in Kotlin. Contained by keeping the app a thin shell over the same order API rather than reimplementing business logic.",
    },
    {
      decision: "One translation namespace instead of duplicated pages",
      rationale:
        "Duplicated language routes drift. The moment a price or an allergen changes in one language and not the other, the system is lying to somebody.",
      tradeoff:
        "Every new string must be added in both languages before it ships. Enforced by typing the key namespace so a missing translation surfaces at build time.",
    },
    {
      decision: "Explicit order state machine with seven states",
      rationale:
        "Hospitality operations are timing-critical. A boolean 'completed' flag cannot express the difference between an order that has been accepted, one being prepared, and one waiting for a driver.",
      tradeoff:
        "More states to handle in the interface. Each one is a state the kitchen already had informally — the system just made it visible.",
    },
    {
      decision: "Role-based permissions enforced server-side",
      rationale:
        "Four roles operate the system, including staff who should not be able to change prices. Hiding a control is presentation; refusing the request is security.",
      tradeoff:
        "Every mutating endpoint carries an authorization check. Centralised so the check is one call rather than a pattern to remember.",
    },
  ],
  views: [
    {
      id: "system",
      name: "System View",
      description:
        "How the parts of the platform relate. Solid lines are synchronous requests; dashed lines are asynchronous or event-driven.",
      nodes: [
        {
          id: "customer",
          label: "Customer",
          kind: "entry",
          role: "Places orders from a phone or desktop browser",
          responsibility:
            "Browses the menu, configures products with variants and extras, and completes checkout.",
          dataFlow: "Sends cart contents and delivery details; receives order status.",
          technology: ["Browser", "BG / EN"],
          col: 1,
          row: 3,
        },
        {
          id: "web",
          label: "Next.js Application",
          kind: "app",
          role: "Server-rendered customer and admin interface",
          responsibility:
            "Renders the catalogue, holds cart state, and routes authenticated users to the right surface.",
          dataFlow: "Reads catalogue data; posts orders to the order API.",
          technology: ["Next.js", "React", "TypeScript"],
          col: 2,
          row: 3,
        },
        {
          id: "auth",
          label: "Authentication",
          kind: "service",
          role: "Identity and role resolution",
          responsibility:
            "Establishes sessions and resolves one of four roles: customer, staff, admin, super admin.",
          dataFlow: "Validates credentials against the database; issues a session.",
          technology: ["Custom auth", "Session cookies"],
          col: 3,
          row: 1,
        },
        {
          id: "orders",
          label: "Order API",
          kind: "service",
          role: "Order intake and lifecycle control",
          responsibility:
            "Validates incoming orders, advances them through the seven-state lifecycle, and exposes the kitchen feed.",
          dataFlow: "Receives carts; writes orders; emits status changes.",
          technology: ["Route handlers", "TypeScript", "REST"],
          col: 3,
          row: 3,
        },
        {
          id: "pricing",
          label: "Pricing Engine",
          kind: "service",
          role: "Server-authoritative total calculation",
          responsibility:
            "Recomputes every line, variant and extra from the live catalogue. Client-supplied prices are discarded.",
          dataFlow: "Reads catalogue prices; returns an authoritative total.",
          technology: ["TypeScript", "Server-only"],
          col: 3,
          row: 5,
        },
        {
          id: "db",
          label: "Database",
          kind: "data",
          role: "System of record",
          responsibility:
            "Stores catalogue, orders, customers, roles and operating-hours configuration.",
          dataFlow: "Single source of truth for every other component.",
          technology: ["Prisma", "SQLite"],
          col: 4,
          row: 3,
        },
        {
          id: "admin",
          label: "Admin Panel",
          kind: "ops",
          role: "Menu and operations management",
          responsibility:
            "Menu editing, order management, staff accounts, manual closure and enforced operating hours.",
          dataFlow: "Reads and writes catalogue and order records.",
          technology: ["Next.js", "Role-gated"],
          col: 5,
          row: 1,
        },
        {
          id: "kitchen",
          label: "Kitchen Application",
          kind: "ops",
          role: "Android tablet application for the kitchen",
          responsibility:
            "Displays incoming orders, drives accept and complete transitions, prints tickets over Bluetooth.",
          dataFlow: "Polls the order feed; posts status transitions.",
          technology: ["Kotlin", "WebView", "Bluetooth ESC/POS"],
          col: 5,
          row: 3,
        },
        {
          id: "email",
          label: "Transactional Email",
          kind: "external",
          role: "Automated customer messaging",
          responsibility:
            "Sends order confirmation and status notifications triggered by real state changes.",
          dataFlow: "Consumes order events; delivers messages.",
          technology: ["SMTP", "Templated"],
          col: 5,
          row: 5,
        },
      ],
      edges: [
        { from: "customer", to: "web", label: "browse / order" },
        { from: "web", to: "auth", label: "session" },
        { from: "web", to: "orders", label: "submit cart" },
        { from: "orders", to: "pricing", label: "validate" },
        { from: "pricing", to: "db", label: "read prices" },
        { from: "auth", to: "db" },
        { from: "orders", to: "db", label: "write order" },
        { from: "db", to: "admin" },
        { from: "orders", to: "kitchen", label: "order feed", async: true },
        { from: "orders", to: "email", label: "confirmation", async: true },
      ],
    },
    {
      id: "customer",
      name: "Customer Journey",
      description:
        "The path a customer takes from opening the menu to tracking a placed order.",
      nodes: [
        {
          id: "menu",
          label: "Menu",
          kind: "entry",
          role: "Catalogue browsing",
          responsibility:
            "Presents 10 categories and 98 products with allergen information in Bulgarian or English.",
          dataFlow: "Reads published catalogue data.",
          technology: ["Server components"],
          col: 1,
          row: 2,
        },
        {
          id: "product",
          label: "Product",
          kind: "app",
          role: "Configuration",
          responsibility:
            "Size variants and extras are selected here. The displayed price updates as options change.",
          dataFlow: "Builds a configured line item.",
          technology: ["Client state"],
          col: 2,
          row: 2,
        },
        {
          id: "cart",
          label: "Cart",
          kind: "app",
          role: "Order assembly",
          responsibility:
            "Holds configured items across navigation and survives a page reload.",
          dataFlow: "Persists cart state locally until checkout.",
          technology: ["Persistent client state"],
          col: 3,
          row: 2,
        },
        {
          id: "checkout",
          label: "Checkout",
          kind: "service",
          role: "Validation and submission",
          responsibility:
            "Collects delivery details, revalidates the whole order server-side, and creates the record.",
          dataFlow: "Posts the cart; receives an authoritative total.",
          technology: ["Server validation"],
          col: 4,
          row: 2,
        },
        {
          id: "confirmation",
          label: "Confirmation",
          kind: "app",
          role: "Acknowledgement",
          responsibility:
            "Confirms the order on screen and by email, with the final server-calculated total.",
          dataFlow: "Reads the created order.",
          technology: ["Email", "Order record"],
          col: 5,
          row: 1,
        },
        {
          id: "tracking",
          label: "Order Status",
          kind: "app",
          role: "Post-order visibility",
          responsibility:
            "Shows the customer the same lifecycle state the kitchen is working from.",
          dataFlow: "Reads live order status.",
          technology: ["Shared order record"],
          col: 5,
          row: 3,
        },
      ],
      edges: [
        { from: "menu", to: "product" },
        { from: "product", to: "cart", label: "add" },
        { from: "cart", to: "checkout" },
        { from: "checkout", to: "confirmation", label: "placed" },
        { from: "checkout", to: "tracking", async: true },
      ],
    },
    {
      id: "operations",
      name: "Operations View",
      description:
        "What happens inside the restaurant once an order exists. This is the view the kitchen works from.",
      nodes: [
        {
          id: "incoming",
          label: "Incoming Order",
          kind: "entry",
          role: "Order arrives on the kitchen device",
          responsibility:
            "Appears on the Android tablet with items, variants, extras and order notes.",
          dataFlow: "Received from the order feed.",
          technology: ["Kotlin", "WebView"],
          col: 1,
          row: 2,
        },
        {
          id: "accept",
          label: "Accept",
          kind: "ops",
          role: "Kitchen acknowledgement",
          responsibility:
            "Staff confirm the order can be made. The state change is recorded against the order.",
          dataFlow: "Posts a status transition.",
          technology: ["Order API"],
          col: 2,
          row: 2,
        },
        {
          id: "print",
          label: "Ticket Print",
          kind: "external",
          role: "Physical kitchen ticket",
          responsibility:
            "Prints the order to a Bluetooth thermal printer for the line.",
          dataFlow: "Formatted ESC/POS payload.",
          technology: ["Bluetooth", "ESC/POS"],
          col: 2,
          row: 1,
        },
        {
          id: "prepare",
          label: "Preparing",
          kind: "ops",
          role: "Active production",
          responsibility:
            "The order is being made. Visible as in-progress to both staff and customer.",
          dataFlow: "Order state: preparing.",
          technology: ["Order state machine"],
          col: 3,
          row: 2,
        },
        {
          id: "ready",
          label: "Ready",
          kind: "ops",
          role: "Awaiting handover",
          responsibility:
            "Production complete, waiting for delivery or collection.",
          dataFlow: "Order state: ready.",
          technology: ["Order state machine"],
          col: 4,
          row: 2,
        },
        {
          id: "notify",
          label: "Customer Notified",
          kind: "external",
          role: "Automated status message",
          responsibility:
            "The customer is informed without anyone making a phone call.",
          dataFlow: "Triggered by the state change.",
          technology: ["Transactional email"],
          col: 4,
          row: 1,
        },
        {
          id: "complete",
          label: "Completed",
          kind: "ops",
          role: "Order closed",
          responsibility:
            "Final state. The order enters operational reporting.",
          dataFlow: "Order state: completed.",
          technology: ["Reporting"],
          col: 5,
          row: 2,
        },
      ],
      edges: [
        { from: "incoming", to: "accept" },
        { from: "accept", to: "print", label: "ticket", async: true },
        { from: "accept", to: "prepare" },
        { from: "prepare", to: "ready" },
        { from: "ready", to: "notify", async: true },
        { from: "ready", to: "complete" },
      ],
    },
  ],
  screens: [
    {
      title: "Bilingual menu",
      description:
        "Ten categories and ninety-eight products with allergen information, served in Bulgarian or English from one translation namespace.",
      mock: "menu",
    },
    {
      title: "Checkout",
      description:
        "Delivery details and order summary. The total shown here is the one the server calculated, not the one the browser proposed.",
      mock: "checkout",
    },
    {
      title: "Admin panel",
      description:
        "Menu editing, order management, staff roles, manual closure and enforced operating hours.",
      mock: "admin",
    },
    {
      title: "Kitchen application",
      description:
        "The Android tablet view: incoming orders, explicit state transitions and Bluetooth ticket printing.",
      mock: "kitchen",
    },
  ],
  results: [
    "Ordering infrastructure owned by the restaurant, with no per-order commission to a third party",
    "Customer relationships and order history held by the business rather than a marketplace",
    "One catalogue driving the customer menu, the admin panel and the kitchen — no reconciliation between them",
    "Bilingual operation across the entire interface, including modifiers and order statuses",
    "Orders reaching the kitchen on a purpose-built device rather than on paper",
    "Pricing that cannot be manipulated from the client, verified server-side on every order",
  ],
};

/* -------------------------------------------------------------------------- */

const makeupByDenitsa: Project = {
  slug: "makeup-by-denitsa",
  name: "Makeup by Denitsa",
  client: "Makeup by Denitsa",
  category: "Digital Course & Payment Platform",
  tagline: "Turning a teaching practice into a product that sells itself.",
  description:
    "A course platform for a professional makeup academy: course catalogue, customer accounts, purchase flow, payment integration and consent-aware analytics — moving enrolment from direct messages into a system that runs without supervision.",
  year: "2026",
  status: "In development",
  featured: true,
  services: ["Commerce", "Business Systems", "Analytics", "Digital Presence"],
  technologies: [
    "Node.js",
    "Express",
    "SQLite",
    "JavaScript",
    "GA4",
    "Consent Mode v2",
  ],
  metrics: [
    {
      value: "86/86",
      label: "Automated tests passing",
      source: "Project test suite at the last verified run",
    },
    {
      value: "4",
      label: "Course products",
      source: "Counted from the course catalogue data",
    },
    {
      value: "2",
      label: "Access tiers",
      source: "Public visitor and authenticated course owner",
    },
    {
      value: "GA4",
      label: "Consent-aware analytics",
      source: "Consent Mode v2 integration in the measurement layer",
    },
  ],
  challenge: {
    heading: "The challenge",
    body: [
      "The academy sold places on its courses through direct messages. Every enrolment required a conversation, a manual payment reminder and a note somewhere about who had paid. The practice was constrained not by demand but by the founder's available hours.",
      "A social media profile is also a poor storefront for a considered purchase. Prospective students could not see what a course contained, what it cost, or what happened after they paid, without asking — and a proportion of them never asked.",
      "The requirement was a platform where a course could be evaluated, bought and accessed without a single message being exchanged, and where the business could see what was actually happening rather than inferring it from a message inbox.",
    ],
  },
  solution: {
    heading: "The solution",
    body: [
      "BDS built a course platform with a structured catalogue: each course carries its own content model, pricing and access rules rather than existing as a page of text.",
      "Accounts and purchase flows connect enrolment to access directly. Buying a course grants entitlement to its content through the same record that recorded the payment, so there is no manual step between money arriving and a student getting in.",
      "Measurement was designed alongside the product rather than added afterwards. GA4 is configured with a defined event schema, and Consent Mode v2 means a visitor's consent choice changes what is actually collected — not just what a banner claims.",
      "The administrative side exposes enrolments, purchases and course state, so the business can answer questions about its own operation without reading back through a chat history.",
    ],
  },
  decisions: [
    {
      decision: "Entitlement derived from the purchase record",
      rationale:
        "Any manual step between payment and access is a step that gets forgotten at eleven at night. Deriving access from the transaction removes the gap entirely.",
      tradeoff:
        "Refunds and manual grants need explicit handling rather than being an edit to a flag. Correct behaviour, slightly more code.",
    },
    {
      decision: "Consent Mode v2 wired into the data layer",
      rationale:
        "A consent banner that does not change measurement behaviour is a compliance liability wearing the costume of a solution.",
      tradeoff:
        "Analytics from non-consenting visitors is modelled rather than observed. That is the correct trade, and the legally defensible one.",
    },
    {
      decision: "A defined event schema agreed before implementation",
      rationale:
        "Events named ad hoc during development stop meaning anything within two months. Naming them first makes reports comparable over time.",
      tradeoff:
        "Adding a new event requires updating the schema rather than firing a string. That friction is the point.",
    },
    {
      decision: "Server-rendered course pages",
      rationale:
        "Course pages are the acquisition surface. They have to be indexable and fast on a phone over mobile data, which is where most of the audience is.",
      tradeoff:
        "Less client-side interactivity on those pages. Nothing on them needed it.",
    },
  ],
  views: [
    {
      id: "system",
      name: "System View",
      description:
        "Platform components and their relationships. Dashed lines are asynchronous or consent-gated.",
      nodes: [
        {
          id: "visitor",
          label: "Visitor",
          kind: "entry",
          role: "Prospective or enrolled student",
          responsibility:
            "Evaluates courses, creates an account, purchases and accesses content.",
          dataFlow: "Sends account and purchase requests; receives entitlements.",
          technology: ["Browser"],
          col: 1,
          row: 3,
        },
        {
          id: "web",
          label: "Web Application",
          kind: "app",
          role: "Course catalogue and account surface",
          responsibility:
            "Renders courses, handles the purchase journey and gates member content.",
          dataFlow: "Reads course data; posts purchases.",
          technology: ["Express", "Server-rendered"],
          col: 2,
          row: 3,
        },
        {
          id: "auth",
          label: "Accounts",
          kind: "service",
          role: "Authentication and entitlement",
          responsibility:
            "Establishes identity and resolves which courses an account may access.",
          dataFlow: "Validates credentials; resolves entitlements.",
          technology: ["Session auth"],
          col: 3,
          row: 1,
        },
        {
          id: "courses",
          label: "Course Service",
          kind: "service",
          role: "Catalogue and enrolment logic",
          responsibility:
            "Owns course structure, pricing and the rules that grant access after purchase.",
          dataFlow: "Reads catalogue; writes enrolments.",
          technology: ["Node.js", "REST"],
          col: 3,
          row: 3,
        },
        {
          id: "payments",
          label: "Payment Provider",
          kind: "external",
          role: "Payment processing",
          responsibility:
            "Handles the transaction and confirms the result back to the platform.",
          dataFlow: "Receives payment intent; returns confirmation.",
          technology: ["Provider interface"],
          col: 3,
          row: 5,
        },
        {
          id: "db",
          label: "Database",
          kind: "data",
          role: "System of record",
          responsibility:
            "Accounts, courses, purchases and entitlements.",
          dataFlow: "Single source of truth.",
          technology: ["SQLite"],
          col: 4,
          row: 3,
        },
        {
          id: "admin",
          label: "Admin",
          kind: "ops",
          role: "Business operations view",
          responsibility:
            "Enrolments, purchases and course state, without reading a message history.",
          dataFlow: "Reads operational records.",
          technology: ["Role-gated"],
          col: 5,
          row: 1,
        },
        {
          id: "analytics",
          label: "Analytics",
          kind: "external",
          role: "Consent-aware measurement",
          responsibility:
            "Collects the defined event schema, gated by the visitor's consent state.",
          dataFlow: "Receives events when consent allows.",
          technology: ["GA4", "Consent Mode v2"],
          col: 5,
          row: 3,
        },
        {
          id: "email",
          label: "Email",
          kind: "external",
          role: "Transactional messaging",
          responsibility:
            "Purchase confirmation and access details.",
          dataFlow: "Triggered by purchase events.",
          technology: ["SMTP"],
          col: 5,
          row: 5,
        },
      ],
      edges: [
        { from: "visitor", to: "web" },
        { from: "web", to: "auth", label: "session" },
        { from: "web", to: "courses", label: "catalogue" },
        { from: "courses", to: "payments", label: "purchase" },
        { from: "auth", to: "db" },
        { from: "courses", to: "db", label: "enrolment" },
        { from: "db", to: "admin" },
        { from: "web", to: "analytics", label: "consented events", async: true },
        { from: "courses", to: "email", label: "access details", async: true },
      ],
    },
    {
      id: "customer",
      name: "Learner Journey",
      description:
        "From discovering a course to having access to its content.",
      nodes: [
        {
          id: "browse",
          label: "Course Catalogue",
          kind: "entry",
          role: "Discovery",
          responsibility:
            "Server-rendered course listings, indexable and fast on mobile data.",
          dataFlow: "Reads published courses.",
          technology: ["Server-rendered"],
          col: 1,
          row: 2,
        },
        {
          id: "detail",
          label: "Course Detail",
          kind: "app",
          role: "Evaluation",
          responsibility:
            "Content, outcomes and price presented without requiring a conversation.",
          dataFlow: "Reads the course content model.",
          technology: ["Content model"],
          col: 2,
          row: 2,
        },
        {
          id: "account",
          label: "Account",
          kind: "service",
          role: "Identity",
          responsibility:
            "Registration or sign-in, positioned at the point of intent rather than before it.",
          dataFlow: "Creates or resumes an account.",
          technology: ["Session auth"],
          col: 3,
          row: 2,
        },
        {
          id: "purchase",
          label: "Purchase",
          kind: "service",
          role: "Transaction",
          responsibility:
            "Payment handled through the provider, result confirmed back to the platform.",
          dataFlow: "Creates a purchase record.",
          technology: ["Payment provider"],
          col: 4,
          row: 2,
        },
        {
          id: "access",
          label: "Course Access",
          kind: "app",
          role: "Entitlement",
          responsibility:
            "Access derived from the purchase record — granted without a manual step.",
          dataFlow: "Resolves entitlement on every request.",
          technology: ["Entitlement check"],
          col: 5,
          row: 2,
        },
      ],
      edges: [
        { from: "browse", to: "detail" },
        { from: "detail", to: "account", label: "intent" },
        { from: "account", to: "purchase" },
        { from: "purchase", to: "access", label: "entitlement" },
      ],
    },
    {
      id: "operations",
      name: "Operations View",
      description:
        "What the business sees and does once a student is in the system.",
      nodes: [
        {
          id: "enrolment",
          label: "Enrolment",
          kind: "entry",
          role: "A student joins",
          responsibility:
            "Recorded automatically at purchase, with no message thread to reconcile.",
          dataFlow: "Written by the course service.",
          technology: ["Purchase record"],
          col: 1,
          row: 2,
        },
        {
          id: "confirmed",
          label: "Payment Confirmed",
          kind: "ops",
          role: "Transaction settled",
          responsibility:
            "The provider result is recorded against the purchase.",
          dataFlow: "Provider confirmation.",
          technology: ["Provider callback"],
          col: 2,
          row: 2,
        },
        {
          id: "granted",
          label: "Access Granted",
          kind: "ops",
          role: "Entitlement active",
          responsibility:
            "Derived from the purchase record rather than granted by hand.",
          dataFlow: "Entitlement resolution.",
          technology: ["Access rules"],
          col: 3,
          row: 2,
        },
        {
          id: "notified",
          label: "Student Notified",
          kind: "external",
          role: "Automated confirmation",
          responsibility:
            "Purchase confirmation and access details sent automatically.",
          dataFlow: "Triggered by the purchase event.",
          technology: ["Email"],
          col: 3,
          row: 1,
        },
        {
          id: "visibility",
          label: "Business Visibility",
          kind: "ops",
          role: "Operational reporting",
          responsibility:
            "Enrolments and purchases visible as records, answerable without a person.",
          dataFlow: "Reads operational data.",
          technology: ["Admin views"],
          col: 4,
          row: 2,
        },
        {
          id: "measurement",
          label: "Measurement",
          kind: "external",
          role: "Consent-gated analytics",
          responsibility:
            "The defined event schema feeding decisions about the catalogue.",
          dataFlow: "Consented events only.",
          technology: ["GA4", "Consent Mode v2"],
          col: 5,
          row: 2,
        },
      ],
      edges: [
        { from: "enrolment", to: "confirmed" },
        { from: "confirmed", to: "granted" },
        { from: "granted", to: "notified", async: true },
        { from: "granted", to: "visibility" },
        { from: "visibility", to: "measurement", async: true },
      ],
    },
  ],
  screens: [
    {
      title: "Course catalogue",
      description:
        "Server-rendered course listings — indexable, fast on mobile data, and evaluable without a direct message.",
      mock: "course",
    },
    {
      title: "Purchase flow",
      description:
        "Account and payment positioned at the point of intent, with entitlement following automatically.",
      mock: "checkout",
    },
    {
      title: "Operations view",
      description:
        "Enrolments, purchases and course state as records rather than as a chat history.",
      mock: "dashboard",
    },
  ],
  results: [
    "Enrolment moved from direct messages into a system that operates unsupervised",
    "Course access derived from the payment record, removing the manual grant step",
    "Consent-aware measurement where the visitor's choice changes what is collected",
    "A defined event schema, so reports remain comparable over time",
    "Business questions answerable from records rather than from a message inbox",
  ],
};

/* -------------------------------------------------------------------------- */

export const PROJECTS: Project[] = [pizzaPazzo, makeupByDenitsa];

export function getProject(slug: string): Project | undefined {
  return PROJECTS.find((p) => p.slug === slug);
}

export function getFeaturedProjects(): Project[] {
  return PROJECTS.filter((p) => p.featured);
}
