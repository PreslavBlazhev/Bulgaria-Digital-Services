"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { getBrowserStore } from "@/lib/browser-store";

/**
 * State mirrored into localStorage, read through `useSyncExternalStore`.
 *
 * The server snapshot is `initial` and the client snapshot is whatever storage
 * holds, so hydration is handled by React rather than by a post-mount setState.
 */
export function usePersistentState<T>(
  key: string,
  initial: T,
): [T, (next: T | ((current: T) => T)) => void, () => void] {
  const store = useMemo(
    () => getBrowserStore<T>("local", key, initial),
    [key, initial],
  );

  const value = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );

  const setValue = useCallback(
    (next: T | ((current: T) => T)) => {
      const resolved =
        typeof next === "function"
          ? (next as (current: T) => T)(store.getSnapshot())
          : next;
      store.set(resolved);
    },
    [store],
  );

  const clear = useCallback(() => store.clear(), [store]);

  return [value, setValue, clear];
}
