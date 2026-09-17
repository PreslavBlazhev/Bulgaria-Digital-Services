"use client";

import { useCallback, useSyncExternalStore } from "react";
import { getBrowserStore } from "@/lib/browser-store";
import { HANDOFF_KEYS, type Handoff } from "@/lib/handoff";

const builderStore = () =>
  getBrowserStore<Handoff | null>("session", HANDOFF_KEYS.builder, null);

const consultantStore = () =>
  getBrowserStore<Handoff | null>("session", HANDOFF_KEYS.consultant, null);

/**
 * Reads whichever tool handoff is waiting in sessionStorage.
 *
 * Both stores are subscribed so the panel appears without a refresh if a
 * handoff is written while the contact page is already open.
 */
export function useHandoff(): [Handoff | null, () => void] {
  const subscribe = useCallback((listener: () => void) => {
    const unsubscribeBuilder = builderStore().subscribe(listener);
    const unsubscribeConsultant = consultantStore().subscribe(listener);
    return () => {
      unsubscribeBuilder();
      unsubscribeConsultant();
    };
  }, []);

  const getSnapshot = useCallback(
    () => builderStore().getSnapshot() ?? consultantStore().getSnapshot(),
    [],
  );

  const handoff = useSyncExternalStore(subscribe, getSnapshot, () => null);

  const clear = useCallback(() => {
    builderStore().clear();
    consultantStore().clear();
  }, []);

  return [handoff, clear];
}
