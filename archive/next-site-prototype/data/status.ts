import type { StatusComponent } from "@/types";

/**
 * Static demo status. Shaped to match what a monitoring API would return, so
 * wiring this to a real source later means replacing the export, not the page.
 *
 * TODO(monitoring): replace with a fetch from the monitoring provider once
 * production infrastructure is live.
 */
export const STATUS_COMPONENTS: StatusComponent[] = [
  {
    name: "Corporate Website",
    description: "The BDS public platform and all marketing routes.",
    state: "operational",
    uptime: "99.98%",
  },
  {
    name: "Client Platform",
    description: "Client portal, project dashboards and delivery tracking.",
    state: "operational",
    uptime: "99.95%",
  },
  {
    name: "Project Builder",
    description: "Solution Architect and the live project simulator.",
    state: "operational",
    uptime: "99.99%",
  },
  {
    name: "Analytics",
    description: "Consent-gated measurement and event collection.",
    state: "operational",
    uptime: "99.97%",
  },
  {
    name: "API Infrastructure",
    description: "Shared service layer behind client applications.",
    state: "operational",
    uptime: "99.96%",
  },
];

export const STATUS_HISTORY = [
  { period: "Last 24 hours", value: "No incidents" },
  { period: "Last 7 days", value: "No incidents" },
  { period: "Last 30 days", value: "1 scheduled maintenance window" },
  { period: "Last 90 days", value: "2 scheduled maintenance windows" },
] as const;
