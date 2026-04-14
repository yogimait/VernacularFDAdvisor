"use client";

import { useCallback, useRef, useSyncExternalStore } from "react";
import { SESSION_SYNC_EVENT } from "@/lib/chat-events";

function subscribe(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const onStorage = () => onStoreChange();
  const onSessionSync = () => onStoreChange();

  window.addEventListener("storage", onStorage);
  window.addEventListener(SESSION_SYNC_EVENT, onSessionSync);

  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(SESSION_SYNC_EVENT, onSessionSync);
  };
}

export function useSessionStorageValue<T>(
  key: string,
  parse: (raw: string) => T,
  fallback: T
): T {
  const cacheRef = useRef<{ raw: string | null; value: T } | null>(null);

  const getSnapshot = useCallback(() => {
    if (typeof window === "undefined") {
      return fallback;
    }

    const raw = window.sessionStorage.getItem(key);
    if (cacheRef.current && cacheRef.current.raw === raw) {
      return cacheRef.current.value;
    }

    if (!raw) {
      cacheRef.current = { raw: null, value: fallback };
      return fallback;
    }

    try {
      const parsed = parse(raw);
      cacheRef.current = { raw, value: parsed };
      return parsed;
    } catch {
      cacheRef.current = { raw, value: fallback };
      return fallback;
    }
  }, [fallback, key, parse]);

  const getServerSnapshot = useCallback(() => fallback, [fallback]);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
