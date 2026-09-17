/* ==========================================================================
   Measurement layer.

   Two rules hold this together:
   1. No measurement ID, no script. Nothing is injected when NEXT_PUBLIC_GA_ID
      is unset, so a development build sends nothing anywhere.
   2. Consent drives behaviour, not appearance. `updateConsent` pushes real
      Consent Mode v2 signals — a denied category changes what is collected.
   ========================================================================== */

export const GA_ID = process.env.NEXT_PUBLIC_GA_ID ?? "";

export const ANALYTICS_ENABLED = GA_ID.length > 0;

/**
 * The complete event vocabulary. Declaring it as a union means a typo becomes
 * a build error rather than a silently orphaned event in a report.
 */
export type AnalyticsEvent =
  | "solution_builder_started"
  | "solution_builder_step_completed"
  | "solution_builder_completed"
  | "project_module_added"
  | "project_module_removed"
  | "case_study_viewed"
  | "case_study_view_changed"
  | "consultant_started"
  | "consultant_completed"
  | "contact_started"
  | "contact_submitted"
  | "command_palette_navigate";

type EventParams = Record<string, string | number | boolean | undefined>;

interface GtagWindow extends Window {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
}

function gtagWindow(): GtagWindow | null {
  if (typeof window === "undefined") return null;
  return window as GtagWindow;
}

/** Queue a command on the GA dataLayer. Safe before the script has loaded. */
function push(...args: unknown[]): void {
  const w = gtagWindow();
  if (!w) return;
  w.dataLayer ??= [];
  w.dataLayer.push(args);
}

export function track(event: AnalyticsEvent, params: EventParams = {}): void {
  if (!ANALYTICS_ENABLED) {
    if (process.env.NODE_ENV === "development") {
      // Visible during development so event wiring can be verified without
      // a live measurement ID.
      console.debug("[analytics]", event, params);
    }
    return;
  }
  push("event", event, params);
}

export function pageView(path: string): void {
  if (!ANALYTICS_ENABLED) return;
  push("config", GA_ID, { page_path: path });
}

/* -------------------------------------------------------------------------- */

export interface ConsentState {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
}

export const DEFAULT_CONSENT: ConsentState = {
  necessary: true,
  analytics: false,
  marketing: false,
};

export const CONSENT_STORAGE_KEY = "bds_consent_v1";

/** Push a Consent Mode v2 update reflecting the visitor's actual choice. */
export function updateConsent(state: ConsentState): void {
  push("consent", "update", {
    ad_storage: state.marketing ? "granted" : "denied",
    ad_user_data: state.marketing ? "granted" : "denied",
    ad_personalization: state.marketing ? "granted" : "denied",
    analytics_storage: state.analytics ? "granted" : "denied",
    functionality_storage: "granted",
    security_storage: "granted",
  });
}

export function readStoredConsent(): ConsentState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ConsentState>;
    return {
      necessary: true,
      analytics: Boolean(parsed.analytics),
      marketing: Boolean(parsed.marketing),
    };
  } catch {
    return null;
  }
}

export function storeConsent(state: ConsentState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage can be unavailable in private modes. Consent then applies to
    // this session only, which is the correct failure mode.
  }
}
