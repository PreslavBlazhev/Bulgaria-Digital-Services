"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Reads a media query through `useSyncExternalStore`.
 *
 * A media query is an external system, so this is what the API is for —
 * no post-mount setState, and it stays correct if the user changes the
 * setting while the page is open.
 *
 * Server snapshot is always `false`: the server cannot know, and `false` is
 * the safe default for every query used here.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (listener: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", listener);
      return () => list.removeEventListener("change", listener);
    },
    [query],
  );

  const getSnapshot = useCallback(
    () => window.matchMedia(query).matches,
    [query],
  );

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

export function usePrefersReducedMotion(): boolean {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}
