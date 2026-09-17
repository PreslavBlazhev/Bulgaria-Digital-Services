/**
 * Single source of truth for identity, origin and navigation.
 * Metadata, sitemap, robots, JSON-LD and the header all read from here.
 */

export const SITE = {
  short: "BDS",
  name: "Bulgaria Digital Services",
  legalName: "Bulgaria Digital Services",
  tagline: "Digital infrastructure for ambitious businesses.",
  description:
    "BDS engineers websites, commerce platforms, business systems, automation and digital infrastructure built around the way modern companies operate.",
  locale: "en",
  country: "BG",
  /** TODO(legal): confirm the public contact address before launch. */
  email: "pr2.blazhev@gmail.com",
  phone: "+359877364001",
  phoneDisplay: "+359 877 364 001",
  region: "Pleven, Bulgaria",
  social: {
    instagram: "https://instagram.com/_.preslav._b",
  },
} as const;

/**
 * Absolute origin. Falls back to localhost so `next build` never emits
 * broken canonical URLs when the env var is missing.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
).replace(/\/$/, "");

export function absoluteUrl(path = "/"): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/* -------------------------------------------------------------------------- */

export interface NavLink {
  href: string;
  label: string;
  description?: string;
}

export interface NavGroup {
  label: string;
  href?: string;
  links: NavLink[];
}

export const SOLUTION_LINKS: NavLink[] = [
  {
    href: "/solutions/websites",
    label: "Websites & Digital Presence",
    description: "Corporate sites engineered as infrastructure, not brochures.",
  },
  {
    href: "/solutions/commerce",
    label: "Commerce & Online Ordering",
    description: "Catalogue, cart, checkout and fulfilment you own outright.",
  },
  {
    href: "/solutions/business-systems",
    label: "Custom Business Systems",
    description: "Dashboards, portals and internal tools built to your process.",
  },
  {
    href: "/solutions/automation",
    label: "Automation & Integrations",
    description: "Connect the systems that currently talk through people.",
  },
  {
    href: "/solutions/analytics",
    label: "Analytics & Business Intelligence",
    description: "Measurement that changes decisions, not just dashboards.",
  },
  {
    href: "/solutions/restaurant-technology",
    label: "Restaurant Technology",
    description: "Ordering, kitchen and operations for hospitality businesses.",
  },
];

export const COMPANY_LINKS: NavLink[] = [
  { href: "/about", label: "About", description: "How BDS works and why." },
  { href: "/contact", label: "Contact", description: "Start a project." },
  { href: "/status", label: "Status", description: "Live systems status." },
];

export const PRIMARY_NAV: NavGroup[] = [
  { label: "Solutions", href: "/solutions", links: SOLUTION_LINKS },
  { label: "Work", href: "/work", links: [] },
  { label: "Technology", href: "/technology", links: [] },
  { label: "Process", href: "/process", links: [] },
  { label: "Insights", href: "/insights", links: [] },
  { label: "BDS", links: COMPANY_LINKS },
];

export const PLATFORM_LINKS: NavLink[] = [
  {
    href: "/build",
    label: "Solution Architect",
    description: "Design your system architecture in five steps.",
  },
  {
    href: "/consultant",
    label: "AI Project Consultant",
    description: "Talk through scope and get a structured brief.",
  },
  {
    href: "/client",
    label: "Client Portal",
    description: "How delivery looks from the client side.",
  },
  {
    href: "/status",
    label: "Systems Status",
    description: "Operational state of BDS infrastructure.",
  },
];

export const FOOTER_NAV: NavGroup[] = [
  { label: "Solutions", links: SOLUTION_LINKS },
  {
    label: "Work",
    links: [
      { href: "/work", label: "All projects" },
      { href: "/work/pizza-pazzo", label: "Pizza Pazzo" },
      { href: "/work/makeup-by-denitsa", label: "Makeup by Denitsa" },
    ],
  },
  {
    label: "Company",
    links: [
      { href: "/about", label: "About BDS" },
      { href: "/process", label: "Build System" },
      { href: "/technology", label: "Engineering Stack" },
      { href: "/contact", label: "Start a Project" },
    ],
  },
  {
    label: "Platform",
    links: [
      { href: "/build", label: "Solution Architect" },
      { href: "/consultant", label: "AI Consultant" },
      { href: "/client", label: "Client Portal" },
      { href: "/insights", label: "Insights" },
    ],
  },
  {
    label: "Legal",
    links: [
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/cookies", label: "Cookie Policy" },
      { href: "/terms", label: "Terms of Service" },
    ],
  },
];
