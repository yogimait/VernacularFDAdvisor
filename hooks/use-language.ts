"use client";

import { useState, useEffect, useCallback } from "react";

export type Language = "auto" | "english" | "hindi" | "hinglish";

const STORAGE_KEY = "fd-advisor-language";

export function useLanguage() {
  const [language, setLanguageState] = useState<Language>("auto");

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Language | null;
    if (stored && ["auto", "english", "hindi", "hinglish"].includes(stored)) {
      setLanguageState(stored);
    }
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEY, lang);
  }, []);

  return { language, setLanguage };
}
