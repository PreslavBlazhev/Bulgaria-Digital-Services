/* ==========================================================================
   Client Portal demo data.

   This is a demonstration dataset for an unauthenticated preview of the BDS
   client portal. It is deliberately isolated in one module so that swapping it
   for a real data source is a single import change, not a refactor.
   ========================================================================== */

export interface PortalProgress {
  label: string;
  value: number;
  note: string;
}

export interface PortalMilestone {
  name: string;
  state: "complete" | "active" | "upcoming";
  detail: string;
  date: string;
}

export interface PortalTask {
  title: string;
  owner: "BDS" | "Client";
  status: "done" | "in-progress" | "blocked" | "queued";
  due: string;
}

export interface PortalWaitingItem {
  item: string;
  detail: string;
  requestedOn: string;
}

export interface PortalActivity {
  time: string;
  actor: string;
  action: string;
}

export interface PortalAsset {
  name: string;
  type: string;
  state: "received" | "pending" | "review";
  count: string;
}

export interface PortalApproval {
  item: string;
  state: "approved" | "awaiting" | "changes-requested";
  requestedOn: string;
}

export interface PortalInfraItem {
  name: string;
  value: string;
  state: "operational" | "pending" | "configured";
}

export interface PortalDocument {
  name: string;
  kind: string;
  updated: string;
}

export const PORTAL_PROJECT = {
  name: "Pizza Pazzo Digital System",
  client: "Pizza Pazzo",
  reference: "BDS-2026-014",
  phase: "Core Development",
  overallProgress: 74,
  startedOn: "12 March 2026",
  targetDate: "30 September 2026",
} as const;

export const PORTAL_PROGRESS: PortalProgress[] = [
  {
    label: "Development",
    value: 82,
    note: "Ordering, admin and kitchen surfaces built; reporting in progress",
  },
  {
    label: "Content",
    value: 60,
    note: "Menu data complete; product photography outstanding",
  },
  {
    label: "Infrastructure",
    value: 100,
    note: "Environments, database and deployment pipeline configured",
  },
  { label: "QA", value: 65, note: "Critical order paths verified; device matrix in progress" },
];

export const PORTAL_MILESTONES: PortalMilestone[] = [
  {
    name: "Discovery",
    state: "complete",
    detail: "Operational mapping and scope agreed",
    date: "March 2026",
  },
  {
    name: "Architecture",
    state: "complete",
    detail: "Data model, permissions and integration contracts signed off",
    date: "April 2026",
  },
  {
    name: "Core Development",
    state: "active",
    detail: "Ordering, admin, kitchen application and transactional email",
    date: "In progress",
  },
  {
    name: "Quality Assurance",
    state: "active",
    detail: "Business path testing, device matrix, authorization review",
    date: "In progress",
  },
  {
    name: "Production Deployment",
    state: "upcoming",
    detail: "Environment cutover, monitoring and handover",
    date: "Scheduled",
  },
];

export const PORTAL_TASKS: PortalTask[] = [
  { title: "Order state machine — seven states", owner: "BDS", status: "done", due: "Completed" },
  { title: "Server-side pricing validation", owner: "BDS", status: "done", due: "Completed" },
  { title: "Kitchen application — Bluetooth printing", owner: "BDS", status: "done", due: "Completed" },
  { title: "Operational reporting views", owner: "BDS", status: "in-progress", due: "This week" },
  { title: "Product photography — 14 items", owner: "Client", status: "blocked", due: "Overdue" },
  { title: "Final allergen list confirmation", owner: "Client", status: "blocked", due: "Overdue" },
  { title: "Email sending domain confirmation", owner: "Client", status: "blocked", due: "This week" },
  { title: "Device matrix QA — Android tablets", owner: "BDS", status: "in-progress", due: "Next week" },
  { title: "Production environment cutover", owner: "BDS", status: "queued", due: "Scheduled" },
];

export const PORTAL_WAITING: PortalWaitingItem[] = [
  {
    item: "14 product images",
    detail: "Remaining catalogue items have no photography. Placeholders are in place and will ship if not supplied.",
    requestedOn: "28 July 2026",
  },
  {
    item: "Final allergen list",
    detail: "Required before the menu can be published. Regulatory content — cannot be inferred by BDS.",
    requestedOn: "28 July 2026",
  },
  {
    item: "Email domain confirmation",
    detail: "Needed to configure the sending domain for order confirmations and status notifications.",
    requestedOn: "4 August 2026",
  },
];

export const PORTAL_ACTIVITY: PortalActivity[] = [
  { time: "Today, 09:14", actor: "BDS", action: "Deployed reporting views to the staging environment" },
  { time: "Yesterday, 16:42", actor: "BDS", action: "Completed authorization review on all mutating endpoints" },
  { time: "Yesterday, 11:20", actor: "Client", action: "Approved the kitchen application interface" },
  { time: "3 days ago", actor: "BDS", action: "Bluetooth ticket printing verified on target hardware" },
  { time: "5 days ago", actor: "BDS", action: "Requested outstanding product photography" },
  { time: "1 week ago", actor: "Client", action: "Supplied final menu pricing for all 10 categories" },
];

export const PORTAL_ASSETS: PortalAsset[] = [
  { name: "Menu data", type: "Structured content", state: "received", count: "98 products" },
  { name: "Product photography", type: "Images", state: "pending", count: "84 of 98" },
  { name: "Brand assets", type: "Logo, colours", state: "received", count: "Complete" },
  { name: "Allergen information", type: "Regulatory content", state: "pending", count: "Partial" },
  { name: "Translation copy", type: "BG / EN", state: "review", count: "378 keys" },
];

export const PORTAL_APPROVALS: PortalApproval[] = [
  { item: "Kitchen application interface", state: "approved", requestedOn: "10 August 2026" },
  { item: "Customer ordering flow", state: "approved", requestedOn: "22 July 2026" },
  { item: "Admin panel layout", state: "approved", requestedOn: "18 July 2026" },
  { item: "Transactional email templates", state: "awaiting", requestedOn: "11 August 2026" },
  { item: "Operating hours configuration", state: "changes-requested", requestedOn: "8 August 2026" },
];

export const PORTAL_INFRASTRUCTURE: PortalInfraItem[] = [
  { name: "Production environment", value: "Provisioned", state: "operational" },
  { name: "Staging environment", value: "Provisioned", state: "operational" },
  { name: "Database", value: "Migrations applied", state: "operational" },
  { name: "Deployment pipeline", value: "Automated", state: "operational" },
  { name: "Email sending domain", value: "Awaiting client confirmation", state: "pending" },
  { name: "Monitoring", value: "Configured, activates at cutover", state: "configured" },
];

export const PORTAL_DOCUMENTS: PortalDocument[] = [
  { name: "Scope agreement", kind: "PDF", updated: "March 2026" },
  { name: "System architecture", kind: "Document", updated: "April 2026" },
  { name: "Data model reference", kind: "Document", updated: "May 2026" },
  { name: "Admin operations guide", kind: "Document", updated: "August 2026" },
  { name: "Kitchen application setup", kind: "Document", updated: "August 2026" },
];

export const PORTAL_ANALYTICS = {
  note: "Measurement activates at production cutover. Figures below are from the staging environment and are not customer traffic.",
  rows: [
    { label: "Staging orders processed", value: "1,284", change: "QA volume" },
    { label: "Median checkout duration", value: "48s", change: "Target under 60s" },
    { label: "Server pricing rejections", value: "0", change: "No mismatches" },
    { label: "Kitchen acknowledgement time", value: "12s", change: "Median, staging" },
  ],
} as const;
