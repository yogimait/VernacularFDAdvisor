import type { Language } from "@/hooks/use-language";

export const LANGUAGES = {
  en: "English",
  hi: "Hindi",
  hinglish: "Hinglish",
  mr: "Marathi",
  gu: "Gujarati",
  ta: "Tamil",
  bho: "Bhojpuri",
} as const;

type LegacyLanguageKey =
  | "english"
  | "hindi"
  | "marathi"
  | "gujarati"
  | "tamil"
  | "bhojpuri";

type LocalizationKey = Language | LegacyLanguageKey;

export type LocalizedValues<T> = Partial<Record<LocalizationKey, T>>;

export const LANGUAGE_SEQUENCE: Language[] = Object.keys(LANGUAGES) as Language[];

export const LANGUAGE_SHORT_LABELS: Record<Language, string> = {
  en: "EN",
  hi: "हिं",
  hinglish: "MIX",
  mr: "MR",
  gu: "GU",
  ta: "TA",
  bho: "BHO",
};

export const LANGUAGE_LABELS: Record<Language, string> = {
  ...LANGUAGES,
};

const LANGUAGE_FALLBACK_KEYS: Record<Language, LocalizationKey[]> = {
  en: ["en", "english"],
  hi: ["hi", "hindi"],
  hinglish: ["hinglish"],
  mr: ["mr", "marathi", "hi", "hindi", "en", "english"],
  gu: ["gu", "gujarati", "hi", "hindi", "en", "english"],
  ta: ["ta", "tamil", "hi", "hindi", "en", "english"],
  bho: ["bho", "bhojpuri", "hinglish", "hi", "hindi", "en", "english"],
};

export function pickLocalized<T>(
  language: Language,
  values: LocalizedValues<T>
): T {
  for (const key of LANGUAGE_FALLBACK_KEYS[language]) {
    const value = values[key];
    if (value !== undefined) {
      return value;
    }
  }

  const englishFallback = values.en ?? values.english;
  if (englishFallback !== undefined) {
    return englishFallback;
  }

  const firstAvailable = Object.values(values)[0];
  if (firstAvailable !== undefined) {
    return firstAvailable as T;
  }

  throw new Error("pickLocalized requires at least one localized value.");
}