/* ==========================================================================
   Handoff between the interactive tools and the contact form.

   sessionStorage rather than URL parameters: a project summary is several
   hundred characters of structured text, which makes for an unusable link and
   an unnecessary thing to leak into referrer headers and server logs.

   The contact page reads whichever handoff is present and renders it above
   the form so the visitor can see exactly what is being carried across.
   ========================================================================== */

import { getBrowserStore } from "./browser-store";

export const HANDOFF_KEYS = {
  builder: "bds_handoff_builder_v1",
  consultant: "bds_handoff_consultant_v1",
} as const;

export type HandoffSource = keyof typeof HANDOFF_KEYS;

export interface Handoff {
  source: HandoffSource;
  title: string;
  /** Short key/value facts rendered as a definition list. */
  facts: { label: string; value: string }[];
  /** Full plain-text summary submitted with the enquiry. */
  summary: string;
  createdAt: string;
}

function store(source: HandoffSource) {
  return getBrowserStore<Handoff | null>("session", HANDOFF_KEYS[source], null);
}

/** Written through the shared store so any mounted reader updates immediately. */
export function writeHandoff(handoff: Handoff): void {
  store(handoff.source).set(handoff);
}

export function readHandoff(source: HandoffSource): Handoff | null {
  return store(source).getSnapshot();
}

export function readAnyHandoff(): Handoff | null {
  return readHandoff("builder") ?? readHandoff("consultant");
}

export function clearHandoff(source: HandoffSource): void {
  store(source).clear();
}
