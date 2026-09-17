import type {
  ArchitectureEdge,
  ArchitectureNode,
  ArchitectureNodeKind,
  ArchitectureView,
} from "@/types";

/* ==========================================================================
   BDS Solution Architect — deterministic recommendation engine.

   Given the five answers, this produces a real architecture: nodes, edges and
   layout are derived from the selected modules rather than picked from a set
   of prebuilt diagrams. Adding a module genuinely changes the graph, which is
   the whole point of the simulator.

   Deliberately pure and dependency-free so it can be unit tested, run on the
   server, or replaced by a model-backed version later without touching the UI.
   ========================================================================== */

export type ProjectType =
  | "website"
  | "ecommerce"
  | "restaurant"
  | "business-system"
  | "internal-tool"
  | "platform"
  | "exploring";

export type BusinessSize =
  | "solo"
  | "small"
  | "growing"
  | "multi-location"
  | "enterprise";

export type Infrastructure =
  | "nothing"
  | "website"
  | "legacy"
  | "saas"
  | "marketplace"
  | "disconnected";

export type ModuleId =
  | "accounts"
  | "admin"
  | "ordering"
  | "payments"
  | "analytics"
  | "multilingual"
  | "booking"
  | "delivery"
  | "crm"
  | "integrations"
  | "automation"
  | "mobile"
  | "reporting"
  | "operations";

export interface BuilderState {
  projectType: ProjectType | null;
  businessSize: BusinessSize | null;
  modules: ModuleId[];
  infrastructure: Infrastructure | null;
}

export const EMPTY_BUILDER_STATE: BuilderState = {
  projectType: null,
  businessSize: null,
  modules: [],
  infrastructure: null,
};

/* -------------------------------------------------------------------------- */
/* Option catalogues                                                           */
/* -------------------------------------------------------------------------- */

export const PROJECT_TYPES: {
  value: ProjectType;
  label: string;
  description: string;
}[] = [
  { value: "website", label: "Company Website", description: "Digital presence engineered as infrastructure." },
  { value: "ecommerce", label: "E-commerce", description: "Catalogue, checkout and fulfilment you own." },
  { value: "restaurant", label: "Restaurant Platform", description: "Ordering, kitchen workflow and operations." },
  { value: "business-system", label: "Custom Business System", description: "Software shaped around how you operate." },
  { value: "internal-tool", label: "Internal Tool", description: "One process, done properly, for your team." },
  { value: "platform", label: "Digital Platform", description: "Multi-sided product with its own users." },
  { value: "exploring", label: "Something New", description: "Not sure yet — start from the problem." },
];

export const BUSINESS_SIZES: {
  value: BusinessSize;
  label: string;
  description: string;
}[] = [
  { value: "solo", label: "Solo / Startup", description: "One to three people." },
  { value: "small", label: "Small Business", description: "Under twenty people, one location." },
  { value: "growing", label: "Growing Company", description: "Scaling faster than the current tools." },
  { value: "multi-location", label: "Multi-location", description: "Several venues, branches or teams." },
  { value: "enterprise", label: "Enterprise", description: "Established processes and compliance requirements." },
];

export const INFRASTRUCTURES: {
  value: Infrastructure;
  label: string;
  description: string;
}[] = [
  { value: "nothing", label: "Nothing yet", description: "Starting from a clean slate." },
  { value: "website", label: "Existing website", description: "A site exists but does no operational work." },
  { value: "legacy", label: "Legacy system", description: "Old software that still runs the business." },
  { value: "saas", label: "SaaS tools", description: "Several subscriptions doing part of the job." },
  { value: "marketplace", label: "Marketplace dependent", description: "A platform owns the customer relationship." },
  { value: "disconnected", label: "Multiple disconnected systems", description: "Everything exists; nothing talks." },
];

export const MODULES: {
  value: ModuleId;
  label: string;
  description: string;
}[] = [
  { value: "payments", label: "Payments", description: "Card, transfer or cash-on-delivery flows." },
  { value: "accounts", label: "User accounts", description: "Identity, sessions and entitlements." },
  { value: "admin", label: "Admin panel", description: "Manage content, records and staff access." },
  { value: "analytics", label: "Analytics", description: "Consent-aware measurement of real events." },
  { value: "multilingual", label: "Multilingual", description: "One system, several languages." },
  { value: "booking", label: "Booking", description: "Appointments, slots and availability." },
  { value: "ordering", label: "Online ordering", description: "Catalogue, cart and order lifecycle." },
  { value: "delivery", label: "Delivery", description: "Dispatch, zones and courier handoff." },
  { value: "crm", label: "CRM integration", description: "Sync customers into your sales tooling." },
  { value: "integrations", label: "API integrations", description: "Connect accounting, ERP or third parties." },
  { value: "automation", label: "Automation", description: "Event-driven workflows and notifications." },
  { value: "mobile", label: "Mobile application", description: "A native app against the same API." },
  { value: "reporting", label: "Reporting", description: "Operational reports from live records." },
  { value: "operations", label: "Internal operations", description: "Console for the people running the business." },
];

/* -------------------------------------------------------------------------- */
/* Module → architecture definitions                                           */
/* -------------------------------------------------------------------------- */

/** Column layer. Entry → application → services → data → operations. */
type Layer = 1 | 2 | 3 | 4 | 5;

interface NodeSpec {
  id: string;
  label: string;
  kind: ArchitectureNodeKind;
  layer: Layer;
  role: string;
  responsibility: string;
  dataFlow: string;
  technology: string[];
}

interface ModuleSpec {
  nodes: NodeSpec[];
  edges: ArchitectureEdge[];
  /** Complexity contribution. */
  weight: number;
}

const CORE_NODES: NodeSpec[] = [
  {
    id: "visitor",
    label: "User",
    kind: "entry",
    layer: 1,
    role: "The person the system exists for",
    responsibility: "Enters through a browser or an application.",
    dataFlow: "Sends requests; receives rendered responses.",
    technology: ["Browser"],
  },
  {
    id: "web",
    label: "Web Application",
    kind: "app",
    layer: 2,
    role: "Server-rendered interface",
    responsibility: "Renders content, holds interface state, routes requests.",
    dataFlow: "Reads data; posts user actions.",
    technology: ["Next.js", "React", "TypeScript"],
  },
  {
    id: "db",
    label: "Database",
    kind: "data",
    layer: 4,
    role: "System of record",
    responsibility: "Single source of truth for every other component.",
    dataFlow: "Reads and writes from services only.",
    technology: ["PostgreSQL", "Prisma"],
  },
];

const MODULE_SPECS: Record<ModuleId, ModuleSpec> = {
  accounts: {
    weight: 2,
    nodes: [
      {
        id: "auth",
        label: "Authentication",
        kind: "service",
        layer: 3,
        role: "Identity and access resolution",
        responsibility: "Establishes sessions and resolves permissions per request.",
        dataFlow: "Validates credentials; issues sessions.",
        technology: ["Session auth", "Role model"],
      },
    ],
    edges: [
      { from: "web", to: "auth", label: "session" },
      { from: "auth", to: "db" },
    ],
  },
  admin: {
    weight: 1,
    nodes: [
      {
        id: "admin",
        label: "Admin Panel",
        kind: "ops",
        layer: 5,
        role: "Content and record management",
        responsibility: "Lets the business edit its own data without a developer.",
        dataFlow: "Reads and writes records directly.",
        technology: ["Role-gated UI"],
      },
    ],
    edges: [{ from: "db", to: "admin" }],
  },
  ordering: {
    weight: 2,
    nodes: [
      {
        id: "orders",
        label: "Order Service",
        kind: "service",
        layer: 3,
        role: "Order intake and lifecycle",
        responsibility: "Validates orders server-side and advances their state.",
        dataFlow: "Receives carts; writes orders; emits state changes.",
        technology: ["Route handlers", "State machine"],
      },
    ],
    edges: [
      { from: "web", to: "orders", label: "submit" },
      { from: "orders", to: "db", label: "write" },
    ],
  },
  payments: {
    weight: 3,
    nodes: [
      {
        id: "payments",
        label: "Payment Provider",
        kind: "external",
        layer: 3,
        role: "Transaction processing",
        responsibility: "Handles the payment and confirms the result back.",
        dataFlow: "Receives an intent; returns a confirmation.",
        technology: ["Provider interface"],
      },
    ],
    edges: [
      { from: "orders", to: "payments", label: "charge" },
      { from: "payments", to: "db", label: "confirm", async: true },
    ],
  },
  booking: {
    weight: 2,
    nodes: [
      {
        id: "booking",
        label: "Booking Service",
        kind: "service",
        layer: 3,
        role: "Availability and reservations",
        responsibility: "Owns slots, capacity and double-booking prevention.",
        dataFlow: "Reads availability; writes reservations.",
        technology: ["Scheduling logic"],
      },
    ],
    edges: [
      { from: "web", to: "booking", label: "reserve" },
      { from: "booking", to: "db" },
    ],
  },
  integrations: {
    weight: 2,
    nodes: [
      {
        id: "api",
        label: "Integration Layer",
        kind: "service",
        layer: 3,
        role: "Typed contracts with external systems",
        responsibility: "Isolates third-party APIs behind stable interfaces.",
        dataFlow: "Translates between internal and external shapes.",
        technology: ["REST", "Webhooks", "Zod"],
      },
    ],
    edges: [
      { from: "web", to: "api" },
      { from: "api", to: "db" },
    ],
  },
  mobile: {
    weight: 3,
    nodes: [
      {
        id: "mobile",
        label: "Mobile Application",
        kind: "app",
        layer: 2,
        role: "Native client",
        responsibility: "Consumes the same API as the web application.",
        dataFlow: "Requests and posts over the shared API.",
        technology: ["Kotlin", "REST"],
      },
    ],
    edges: [{ from: "mobile", to: "db", label: "via API" }],
  },
  analytics: {
    weight: 1,
    nodes: [
      {
        id: "analytics",
        label: "Analytics",
        kind: "external",
        layer: 5,
        role: "Consent-gated measurement",
        responsibility: "Collects a defined event schema when consent allows.",
        dataFlow: "Receives events; never writes back.",
        technology: ["GA4", "Consent Mode v2"],
      },
    ],
    edges: [{ from: "web", to: "analytics", label: "events", async: true }],
  },
  automation: {
    weight: 2,
    nodes: [
      {
        id: "automation",
        label: "Workflow Engine",
        kind: "ops",
        layer: 5,
        role: "Event-driven actions",
        responsibility: "Reacts to state changes without anyone checking.",
        dataFlow: "Consumes events; triggers side effects.",
        technology: ["Event handlers", "Scheduled jobs"],
      },
    ],
    edges: [{ from: "db", to: "automation", label: "events", async: true }],
  },
  delivery: {
    weight: 2,
    nodes: [
      {
        id: "delivery",
        label: "Delivery Integration",
        kind: "external",
        layer: 5,
        role: "Dispatch and courier handoff",
        responsibility: "Passes fulfilment details to the delivery operation.",
        dataFlow: "Receives dispatch-ready orders.",
        technology: ["Provider API"],
      },
    ],
    edges: [{ from: "orders", to: "delivery", label: "dispatch", async: true }],
  },
  crm: {
    weight: 2,
    nodes: [
      {
        id: "crm",
        label: "CRM",
        kind: "external",
        layer: 5,
        role: "Customer relationship tooling",
        responsibility: "Receives customer and transaction records.",
        dataFlow: "One-way sync from the system of record.",
        technology: ["Provider API"],
      },
    ],
    edges: [{ from: "db", to: "crm", label: "sync", async: true }],
  },
  reporting: {
    weight: 1,
    nodes: [
      {
        id: "reporting",
        label: "Reporting",
        kind: "ops",
        layer: 5,
        role: "Operational reporting",
        responsibility: "Generates reports from live records, not exports.",
        dataFlow: "Reads aggregated data.",
        technology: ["SQL views"],
      },
    ],
    edges: [{ from: "db", to: "reporting" }],
  },
  operations: {
    weight: 2,
    nodes: [
      {
        id: "operations",
        label: "Operations Console",
        kind: "ops",
        layer: 5,
        role: "The daily working surface",
        responsibility: "What the team running the business actually opens.",
        dataFlow: "Reads and advances operational state.",
        technology: ["Role-gated UI"],
      },
    ],
    edges: [{ from: "db", to: "operations" }],
  },
  multilingual: {
    weight: 1,
    nodes: [
      {
        id: "i18n",
        label: "Localization",
        kind: "service",
        layer: 3,
        role: "Locale routing and translation",
        responsibility: "One translation namespace across the whole system.",
        dataFlow: "Resolves content per locale at render time.",
        technology: ["Locale routing", "Typed keys"],
      },
    ],
    edges: [{ from: "web", to: "i18n" }],
  },
};

/** Restaurant projects always get a kitchen surface — it is the whole point. */
const KITCHEN_SPEC: ModuleSpec = {
  weight: 3,
  nodes: [
    {
      id: "kitchen",
      label: "Kitchen System",
      kind: "ops",
      layer: 5,
      role: "Order screen for the kitchen",
      responsibility: "Displays incoming orders and drives state transitions.",
      dataFlow: "Polls the order feed; posts transitions.",
      technology: ["Tablet app", "ESC/POS"],
    },
  ],
  edges: [{ from: "orders", to: "kitchen", label: "order feed", async: true }],
};

const EMAIL_SPEC: ModuleSpec = {
  weight: 1,
  nodes: [
    {
      id: "email",
      label: "Transactional Email",
      kind: "external",
      layer: 5,
      role: "Automated messaging",
      responsibility: "Confirmations and status notifications from real events.",
      dataFlow: "Triggered by state changes.",
      technology: ["SMTP", "Templates"],
    },
  ],
  edges: [{ from: "db", to: "email", label: "notify", async: true }],
};

/* -------------------------------------------------------------------------- */
/* Recommendation                                                              */
/* -------------------------------------------------------------------------- */

export type Complexity = "Foundation" | "Advanced" | "Complex" | "Platform";

export interface Recommendation {
  solution: string;
  solutionSlug: string;
  summary: string;
  requiredModules: ModuleId[];
  suggestedModules: ModuleId[];
  complexity: Complexity;
  score: number;
  view: ArchitectureView;
  considerations: string[];
  nextStep: string;
}

/** Modules a given project type cannot sensibly ship without. */
const REQUIRED_BY_TYPE: Record<ProjectType, ModuleId[]> = {
  website: ["analytics"],
  ecommerce: ["ordering", "payments", "accounts", "admin"],
  restaurant: ["ordering", "admin"],
  "business-system": ["accounts", "admin"],
  "internal-tool": ["accounts"],
  platform: ["accounts", "admin", "integrations"],
  exploring: [],
};

const SOLUTION_BY_TYPE: Record<
  ProjectType,
  { name: string; slug: string; summary: string }
> = {
  website: {
    name: "Digital Presence Infrastructure",
    slug: "websites",
    summary:
      "A server-rendered site with a real content model, technical SEO and consent-aware measurement built in from the start.",
  },
  ecommerce: {
    name: "Owned Commerce Infrastructure",
    slug: "commerce",
    summary:
      "Catalogue, cart, server-authoritative checkout and order lifecycle running on infrastructure you own outright.",
  },
  restaurant: {
    name: "Hospitality Operations Infrastructure",
    slug: "restaurant-technology",
    summary:
      "Ordering, kitchen workflow and venue operations as one connected system, built from a production deployment.",
  },
  "business-system": {
    name: "Operational Business System",
    slug: "business-systems",
    summary:
      "A custom system shaped around your process, with roles enforced server-side and reporting from live records.",
  },
  "internal-tool": {
    name: "Internal Operations Tool",
    slug: "business-systems",
    summary:
      "One process built properly for the team that runs it, rather than a generic product bent into shape.",
  },
  platform: {
    name: "Multi-sided Digital Platform",
    slug: "business-systems",
    summary:
      "A product with its own users, permissions and integration surface, architected to add sides without a rewrite.",
  },
  exploring: {
    name: "Discovery Engagement",
    slug: "business-systems",
    summary:
      "Start from the constraint rather than the solution. Discovery establishes what is actually costing time before anything is built.",
  },
};

const SIZE_WEIGHT: Record<BusinessSize, number> = {
  solo: 0,
  small: 1,
  growing: 2,
  "multi-location": 4,
  enterprise: 5,
};

const INFRA_WEIGHT: Record<Infrastructure, number> = {
  nothing: 0,
  website: 1,
  saas: 2,
  marketplace: 2,
  legacy: 4,
  disconnected: 4,
};

const INFRA_CONSIDERATION: Record<Infrastructure, string> = {
  nothing:
    "Starting clean is the cheapest position to build from — there is no migration and no legacy behaviour to preserve.",
  website:
    "The existing site can usually be kept live during the build and cut over once the new system is verified.",
  legacy:
    "Legacy migration is the largest unknown in this scope. Data extraction and behaviour parity need their own discovery before a date is agreed.",
  saas:
    "Existing subscriptions should be kept where they already work. The integration layer connects them rather than replacing them.",
  marketplace:
    "Moving off marketplace dependency works best as an added channel first, so acquisition continues while the direct channel builds volume.",
  disconnected:
    "Disconnected systems usually mean a person is acting as the integration layer. Identifying that manual step is the first discovery task.",
};

export function buildRecommendation(state: BuilderState): Recommendation | null {
  if (!state.projectType || !state.businessSize || !state.infrastructure) {
    return null;
  }

  const type = state.projectType;
  const required = REQUIRED_BY_TYPE[type];

  // Required modules are unioned with the user's choices — a restaurant
  // platform without ordering is not a thing anyone should be sold.
  const active = Array.from(new Set<ModuleId>([...required, ...state.modules]));

  const specs: ModuleSpec[] = active.map((id) => MODULE_SPECS[id]);

  if (type === "restaurant") specs.push(KITCHEN_SPEC);

  const wantsEmail =
    active.includes("ordering") ||
    active.includes("accounts") ||
    active.includes("automation") ||
    active.includes("payments");
  if (wantsEmail) specs.push(EMAIL_SPEC);

  // ---- Assemble nodes ----------------------------------------------------
  const nodeSpecs = new Map<string, NodeSpec>();
  for (const node of CORE_NODES) nodeSpecs.set(node.id, node);
  for (const spec of specs) {
    for (const node of spec.nodes) nodeSpecs.set(node.id, node);
  }

  // ---- Assemble edges ----------------------------------------------------
  const rawEdges: ArchitectureEdge[] = [{ from: "visitor", to: "web" }];
  for (const spec of specs) rawEdges.push(...spec.edges);

  // Anything that never reaches the database is connected directly, so no
  // service is left floating when its usual upstream was not selected.
  const present = new Set(nodeSpecs.keys());
  const edges = rawEdges.filter((e) => present.has(e.from) && present.has(e.to));

  for (const [id, node] of nodeSpecs) {
    if (id === "visitor" || id === "db") continue;
    const connected = edges.some((e) => e.from === id || e.to === id);
    if (connected) continue;
    edges.push(
      node.layer === 5 ? { from: "db", to: id } : { from: "web", to: id },
    );
  }

  // If nothing else links the web app to storage, show the direct read path.
  const dbLinked = edges.some((e) => e.to === "db" || e.from === "db");
  if (!dbLinked) edges.push({ from: "web", to: "db", label: "read" });

  // ---- Lay out on the grid ----------------------------------------------
  const byLayer = new Map<Layer, NodeSpec[]>();
  for (const node of nodeSpecs.values()) {
    const list = byLayer.get(node.layer) ?? [];
    list.push(node);
    byLayer.set(node.layer, list);
  }

  const tallest = Math.max(
    ...Array.from(byLayer.values(), (list) => list.length),
  );

  const nodes: ArchitectureNode[] = [];
  for (const [layer, list] of byLayer) {
    // Centre each column vertically against the tallest one.
    const offset = Math.floor((tallest - list.length) / 2);
    list.forEach((node, index) => {
      nodes.push({
        id: node.id,
        label: node.label,
        kind: node.kind,
        role: node.role,
        responsibility: node.responsibility,
        dataFlow: node.dataFlow,
        technology: node.technology,
        col: layer,
        row: offset + index + 1,
      });
    });
  }

  nodes.sort((a, b) => a.col - b.col || a.row - b.row);

  // ---- Complexity --------------------------------------------------------
  const moduleWeight = specs.reduce((sum, spec) => sum + spec.weight, 0);
  const score =
    moduleWeight +
    SIZE_WEIGHT[state.businessSize] +
    INFRA_WEIGHT[state.infrastructure];

  const complexity: Complexity =
    score <= 7
      ? "Foundation"
      : score <= 13
        ? "Advanced"
        : score <= 20
          ? "Complex"
          : "Platform";

  // ---- Suggestions -------------------------------------------------------
  const suggested = suggestModules(type, state.businessSize, active);

  // ---- Considerations ----------------------------------------------------
  const considerations = [INFRA_CONSIDERATION[state.infrastructure]];

  if (state.businessSize === "multi-location" || state.businessSize === "enterprise") {
    considerations.push(
      "Multiple locations change the data model, not just the settings. Venue scoping, per-location permissions and shared-or-separate catalogues are decided in architecture, before any interface work.",
    );
  }

  if (active.includes("payments")) {
    considerations.push(
      "Payments mean money can be lost to a bug. Totals are recalculated server-side from the source catalogue, and the provider stays behind an interface so it can be replaced commercially.",
    );
  }

  if (active.includes("mobile")) {
    considerations.push(
      "A native application is a second codebase. It is worth it when hardware access or reliability requirements make a browser insufficient — otherwise the web application already covers mobile.",
    );
  }

  if (!active.includes("analytics")) {
    considerations.push(
      "No measurement was selected. That is a valid choice, but it means questions about how the system is used will not be answerable later without retrofitting.",
    );
  }

  return {
    solution: SOLUTION_BY_TYPE[type].name,
    solutionSlug: SOLUTION_BY_TYPE[type].slug,
    summary: SOLUTION_BY_TYPE[type].summary,
    requiredModules: required,
    suggestedModules: suggested,
    complexity,
    score,
    considerations,
    nextStep:
      complexity === "Foundation"
        ? "This scope is small enough to specify in one conversation. Discovery would confirm the content model and the measurement plan, then build."
        : complexity === "Advanced"
          ? "This needs a short discovery to settle the data model and the permission tiers before an estimate means anything."
          : "This is a system, not a project. Discovery and architecture should be scoped and priced separately from build, so the estimate rests on decided facts.",
    view: {
      id: "generated",
      name: "Recommended Architecture",
      description:
        "Generated from your selections. Solid lines are synchronous requests; dashed lines are asynchronous or event-driven. Add or remove modules below and the graph is rebuilt.",
      nodes,
      edges,
    },
  };
}

function suggestModules(
  type: ProjectType,
  size: BusinessSize,
  active: ModuleId[],
): ModuleId[] {
  const pool: ModuleId[] = [];

  if (type === "ecommerce" || type === "restaurant") {
    pool.push("delivery", "reporting", "automation", "multilingual");
  }
  if (type === "business-system" || type === "internal-tool") {
    pool.push("reporting", "automation", "integrations", "operations");
  }
  if (type === "website") {
    pool.push("multilingual", "admin", "integrations");
  }
  if (type === "platform") {
    pool.push("payments", "analytics", "automation", "mobile");
  }
  if (type === "exploring") {
    pool.push("analytics", "admin", "accounts");
  }

  if (size === "multi-location" || size === "enterprise") {
    pool.push("operations", "reporting", "crm");
  }

  if (!active.includes("analytics")) pool.push("analytics");

  return Array.from(new Set(pool)).filter((id) => !active.includes(id)).slice(0, 5);
}

/* -------------------------------------------------------------------------- */

export function moduleLabel(id: ModuleId): string {
  return MODULES.find((m) => m.value === id)?.label ?? id;
}

/** Plain-text summary for the clipboard and the contact handoff. */
export function summariseProject(
  state: BuilderState,
  recommendation: Recommendation,
): string {
  const typeLabel =
    PROJECT_TYPES.find((t) => t.value === state.projectType)?.label ?? "—";
  const sizeLabel =
    BUSINESS_SIZES.find((s) => s.value === state.businessSize)?.label ?? "—";
  const infraLabel =
    INFRASTRUCTURES.find((i) => i.value === state.infrastructure)?.label ?? "—";

  const modules = Array.from(
    new Set([...recommendation.requiredModules, ...state.modules]),
  )
    .map(moduleLabel)
    .join(", ");

  return [
    "BDS PROJECT ARCHITECTURE",
    "",
    `Project type:      ${typeLabel}`,
    `Business size:     ${sizeLabel}`,
    `Current situation: ${infraLabel}`,
    "",
    `Recommended:       ${recommendation.solution}`,
    `Complexity:        ${recommendation.complexity}`,
    "",
    `Modules:           ${modules || "None selected"}`,
    "",
    `Architecture:      ${recommendation.view.nodes.length} components, ${recommendation.view.edges.length} connections`,
    "",
    "Next step:",
    recommendation.nextStep,
    "",
    "Scope and pricing are established in discovery — custom scope required.",
  ].join("\n");
}
