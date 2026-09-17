/* ==========================================================================
   Subscribable browser-storage stores.

   These exist so components can read localStorage / sessionStorage through
   `useSyncExternalStore` instead of setting state inside an effect. That is
   the API React provides for exactly this problem: the server snapshot is the
   fallback value, the client snapshot is whatever storage holds, and React
   handles the switch after hydration without a mismatch.

   Stores are memoised per key, so two components reading the same key stay in
   sync automatically.
   ========================================================================== */

export interface BrowserStore<T> {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => T;
  getServerSnapshot: () => T;
  set: (next: T) => void;
  clear: () => void;
}

type Area = "local" | "session";

const registry = new Map<string, BrowserStore<unknown>>();

function storageFor(area: Area): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return area === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    // Storage can be blocked entirely (private mode, strict settings).
    return null;
  }
}

function createStore<T>(area: Area, key: string, fallback: T): BrowserStore<T> {
  const listeners = new Set<() => void>();

  // Cached so `getSnapshot` returns a stable reference between renders —
  // returning a fresh object each call would loop React forever.
  let cache: T = fallback;
  let loaded = false;

  function load(): T {
    if (loaded) return cache;
    loaded = true;

    const storage = storageFor(area);
    if (!storage) return cache;

    try {
      const raw = storage.getItem(key);
      if (raw !== null) cache = JSON.parse(raw) as T;
    } catch {
      // Corrupt entry: keep the fallback rather than throwing on read.
    }
    return cache;
  }

  function emit() {
    for (const listener of listeners) listener();
  }

  return {
    subscribe(listener) {
      listeners.add(listener);

      // Cross-tab updates for localStorage. sessionStorage is tab-scoped, so
      // it never fires and the listener is harmless.
      const onStorage = (event: StorageEvent) => {
        if (event.key !== key) return;
        loaded = false;
        load();
        emit();
      };

      window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(listener);
        window.removeEventListener("storage", onStorage);
      };
    },

    getSnapshot() {
      return load();
    },

    getServerSnapshot() {
      return fallback;
    },

    set(next) {
      cache = next;
      loaded = true;

      const storage = storageFor(area);
      if (storage) {
        try {
          storage.setItem(key, JSON.stringify(next));
        } catch {
          // Quota or private mode: value stays in memory for this session.
        }
      }
      emit();
    },

    clear() {
      cache = fallback;
      loaded = true;

      const storage = storageFor(area);
      if (storage) {
        try {
          storage.removeItem(key);
        } catch {
          // Nothing to clean up.
        }
      }
      emit();
    },
  };
}

export function getBrowserStore<T>(
  area: Area,
  key: string,
  fallback: T,
): BrowserStore<T> {
  const id = `${area}:${key}`;
  const existing = registry.get(id);
  if (existing) return existing as BrowserStore<T>;

  const store = createStore(area, key, fallback);
  registry.set(id, store as BrowserStore<unknown>);
  return store;
}
