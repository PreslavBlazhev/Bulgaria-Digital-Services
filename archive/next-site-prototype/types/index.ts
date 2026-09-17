/* ==========================================================================
   BDS shared domain types.
   Content lives in `data/` and is typed against these — never inline in JSX.
   ========================================================================== */

export type SolutionSlug =
  | "websites"
  | "commerce"
  | "business-systems"
  | "automation"
  | "analytics"
  | "restaurant-technology";

export interface Capability {
  title: string;
  description: string;
}

export interface Solution {
  slug: SolutionSlug;
  /** Short label used in navigation and cards. */
  name: string;
  /** Positioning line — what this really is, not what it's called. */
  positioning: string;
  summary: string;
  /** Long-form intro on the detail page. */
  intro: string;
  icon: SolutionIcon;
  capabilities: Capability[];
  /** What the client actually ends up owning. */
  deliverables: string[];
  /** Signals that a business has outgrown its current setup. */
  signals: string[];
  stack: string[];
  /** Slugs of case studies that prove this solution. */
  proof: string[];
}

export type SolutionIcon =
  | "globe"
  | "cart"
  | "layers"
  | "workflow"
  | "chart"
  | "utensils";

/* -------------------------------------------------------------------------- */

export type ArchitectureNodeKind =
  | "entry"
  | "app"
  | "service"
  | "data"
  | "external"
  | "ops";

export interface ArchitectureNode {
  id: string;
  label: string;
  kind: ArchitectureNodeKind;
  /** One-line job description. */
  role: string;
  /** What it is accountable for. */
  responsibility: string;
  /** What moves in and out of it. */
  dataFlow: string;
  technology: string[];
  /** Grid column/row for the desktop graph. 1-indexed. */
  col: number;
  row: number;
}

export interface ArchitectureEdge {
  from: string;
  to: string;
  label?: string;
  /** Dashed edges are asynchronous / event-driven. */
  async?: boolean;
}

export interface ArchitectureView {
  id: string;
  name: string;
  description: string;
  nodes: ArchitectureNode[];
  edges: ArchitectureEdge[];
}

/* -------------------------------------------------------------------------- */

export interface ProjectMetric {
  value: string;
  label: string;
  /** How this number was established. Keeps claims honest. */
  source: string;
}

export interface ProjectSection {
  heading: string;
  body: string[];
}

export interface EngineeringDecision {
  decision: string;
  rationale: string;
  tradeoff: string;
}

export interface InterfaceScreen {
  title: string;
  description: string;
  /** Rendered as a CSS/DOM mock — see components/case-studies/ScreenMock. */
  mock: "menu" | "checkout" | "admin" | "kitchen" | "course" | "dashboard";
}

export interface Project {
  slug: string;
  name: string;
  client: string;
  category: string;
  /** One line for cards. */
  tagline: string;
  /** Two or three sentences for the index page. */
  description: string;
  year: string;
  status: "Live" | "In development" | "Delivered";
  services: string[];
  technologies: string[];
  metrics: ProjectMetric[];
  challenge: ProjectSection;
  solution: ProjectSection;
  decisions: EngineeringDecision[];
  /** Multiple lenses on the same system — the signature BDS feature. */
  views: ArchitectureView[];
  screens: InterfaceScreen[];
  results: string[];
  /** True when a real public URL exists. */
  liveUrl?: string;
  featured: boolean;
}

/* -------------------------------------------------------------------------- */

export type TechCategory =
  | "Frontend"
  | "Backend"
  | "Data"
  | "Infrastructure"
  | "Analytics"
  | "Payments"
  | "Mobile"
  | "Automation";

export interface Technology {
  name: string;
  category: TechCategory;
  /** Plain-language definition. */
  what: string;
  /** The engineering reason BDS reaches for it. */
  why: string;
  /** Where it is actually running. Empty array = not yet shipped. */
  usedIn: string[];
}

/* -------------------------------------------------------------------------- */

export interface ProcessStage {
  id: string;
  index: string;
  name: string;
  focus: string;
  description: string;
  activities: string[];
  output: string;
}

/* -------------------------------------------------------------------------- */

export interface Insight {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  readingTime: string;
  publishedAt: string;
  /** ISO date for structured data and sorting. */
  date: string;
  body: InsightBlock[];
}

export type InsightBlock =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "list"; items: string[] }
  | { type: "quote"; text: string };

/* -------------------------------------------------------------------------- */

export interface StatusComponent {
  name: string;
  description: string;
  state: "operational" | "degraded" | "maintenance" | "down";
  /** Presented as a demo figure until monitoring is wired in. */
  uptime: string;
}
