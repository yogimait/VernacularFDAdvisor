import type { Language } from "@/hooks/use-language";

const DEVANAGARI_RE = /[\u0900-\u097F]/;
const GUJARATI_RE = /[\u0A80-\u0AFF]/;
const TAMIL_RE = /[\u0B80-\u0BFF]/;
const LATIN_RE = /[A-Za-z]/;

const MARATHI_HINTS =
  /\b(aahe|ahet|mala|majha|majhi|majhe|tumhi|kaay|kay|nahi|pahije|karaycha)\b|\b(आहे|आहेत|मला|माझा|माझी|माझे|तुम्ही|काय|नाही|पाहिजे|करायचा)\b/i;

const BHOJPURI_HINTS =
  /\b(ham|rauwa|ka\s+ba|bani|ba|chahi|batai|bataai|boli|kaise)\b|\b(हम|रउआ|का\s*बा|बानी|बा|चाही|बताई|बोली|कइसे)\b/i;

const HINGLISH_HINTS =
  /\b(kya|kaise|mera|meri|mujhe|chahiye|karna|bolo|samjhao|batao|acha|theek|hain?|hai)\b/i;

export function detectMessageLanguage(
  message: string,
  fallback: Language = "en"
): Language {
  const text = message.trim();
  if (!text) {
    return fallback;
  }

  if (TAMIL_RE.test(text)) {
    return "ta";
  }

  if (GUJARATI_RE.test(text)) {
    return "gu";
  }

  if (DEVANAGARI_RE.test(text)) {
    if (MARATHI_HINTS.test(text)) {
      return "mr";
    }

    if (BHOJPURI_HINTS.test(text)) {
      return "bho";
    }

    return "hi";
  }

  if (LATIN_RE.test(text)) {
    if (BHOJPURI_HINTS.test(text)) {
      return "bho";
    }

    if (MARATHI_HINTS.test(text)) {
      return "mr";
    }

    if (HINGLISH_HINTS.test(text)) {
      return "hinglish";
    }

    return "en";
  }

  return fallback;
}
