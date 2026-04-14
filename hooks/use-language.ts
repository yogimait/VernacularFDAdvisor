"use client";

import { useCallback, useSyncExternalStore } from "react";

export type Language = "en" | "hi" | "hinglish" | "mr" | "gu" | "ta" | "bho";

const STORAGE_KEY = "fd-advisor-language";
const LANGUAGE_SYNC_EVENT = "fdadvisor:language-sync";
const SUPPORTED_LANGUAGES: Language[] = [
  "en",
  "hi",
  "hinglish",
  "mr",
  "gu",
  "ta",
  "bho",
];

const LEGACY_LANGUAGE_MAP: Record<string, Language> = {
  english: "en",
  hindi: "hi",
  hinglish: "hinglish",
  marathi: "mr",
  gujarati: "gu",
  tamil: "ta",
  bhojpuri: "bho",
};

function isLanguage(value: string | null): value is Language {
  return !!value && SUPPORTED_LANGUAGES.includes(value as Language);
}

function normalizeLanguage(value: string | null): Language | null {
  if (!value) {
    return null;
  }

  if (isLanguage(value)) {
    return value;
  }

  return LEGACY_LANGUAGE_MAP[value] ?? null;
}

function readStoredLanguage(): Language {
  if (typeof window === "undefined") {
    return "en";
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  return normalizeLanguage(stored) ?? "en";
}

function subscribeLanguage(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      onStoreChange();
    }
  };

  const handleSync = () => {
    onStoreChange();
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(LANGUAGE_SYNC_EVENT, handleSync);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(LANGUAGE_SYNC_EVENT, handleSync);
  };
}

export function useLanguage() {
  const language = useSyncExternalStore<Language>(
    subscribeLanguage,
    readStoredLanguage,
    () => "en" as Language
  );

  const setLanguage = useCallback((lang: Language) => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, lang);
    window.dispatchEvent(new Event(LANGUAGE_SYNC_EVENT));
  }, []);

  return { language, setLanguage };
}
