import type { Language } from "@/hooks/use-language";
import { detectMessageLanguage } from "@/lib/language-detection";
import type { Message, StructuredResponse } from "@/types/chat";

const TTS_STATE_EVENT = "fdadvisor:tts-state";
let activeSpeechSession = 0;
let activeSpeechMessageId: string | null = null;

function dispatchTtsState(messageId: string | null) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(TTS_STATE_EVENT, {
      detail: { messageId },
    })
  );
}

export function getActiveSpeechMessageId(): string | null {
  return activeSpeechMessageId;
}

export function subscribeTtsState(
  handler: (messageId: string | null) => void
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const listener = (event: Event) => {
    const detail = (event as CustomEvent<{ messageId: string | null }>).detail;
    handler(detail?.messageId ?? null);
  };

  window.addEventListener(TTS_STATE_EVENT, listener);

  return () => {
    window.removeEventListener(TTS_STATE_EVENT, listener);
  };
}

export function canUseTts(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function isSpeechPlaying(): boolean {
  if (!canUseTts()) {
    return false;
  }

  return window.speechSynthesis.speaking || Boolean(activeSpeechMessageId);
}

export function stopSpeech() {
  if (!canUseTts()) {
    return;
  }

  activeSpeechSession += 1;
  activeSpeechMessageId = null;
  window.speechSynthesis.cancel();
  dispatchTtsState(null);
}

function resolveTtsLocale(language: Language): string {
  if (language === "en") {
    return "en-IN";
  }

  return "hi-IN";
}

function pickVoice(
  voices: SpeechSynthesisVoice[],
  locale: string
): SpeechSynthesisVoice | null {
  const exact = voices.find((voice) => voice.lang === locale);
  if (exact) {
    return exact;
  }

  const prefix = locale.split("-")[0]?.toLowerCase();
  return (
    voices.find((voice) => voice.lang?.toLowerCase().startsWith(prefix)) ?? null
  );
}

function cleanSpeechText(raw: string): string {
  let text = raw;

  text = text.replace(/```[\s\S]*?```/g, " ");
  text = text.replace(/`([^`]+)`/g, "$1");
  text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1");
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  text = text.replace(/(\*\*|__)(.*?)\1/g, "$2");
  text = text.replace(/(\*|_)(.*?)\1/g, "$2");
  text = text.replace(/^#{1,6}\s+/gm, "");
  text = text.replace(/^\s*>\s+/gm, "");
  text = text.replace(/^\s*[-*•]\s+/gm, "");
  text = text.replace(/^\s*\d+[.)]\s+/gm, "");
  text = text.replace(/[\p{Extended_Pictographic}]/gu, "");
  text = text.replace(/[•●■◆►▶]+/g, " ");
  text = text.replace(/\s{2,}/g, " ").trim();

  const lines = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.join(". ");
}

function chunkSpeechText(text: string, maxChars = 180): string[] {
  const sentences = text.match(/[^.!?।]+[.!?।]*/g);
  const units = sentences
    ? sentences.map((sentence) => sentence.trim()).filter(Boolean)
    : [text];
  const chunks: string[] = [];
  let current = "";

  const pushCurrent = () => {
    if (current.trim()) {
      chunks.push(current.trim());
    }
    current = "";
  };

  for (const unit of units) {
    if (!unit) {
      continue;
    }

    const next = current ? `${current} ${unit}` : unit;
    if (next.length <= maxChars) {
      current = next;
      continue;
    }

    pushCurrent();

    if (unit.length <= maxChars) {
      current = unit;
      continue;
    }

    let start = 0;
    while (start < unit.length) {
      chunks.push(unit.slice(start, start + maxChars).trim());
      start += maxChars;
    }
  }

  pushCurrent();

  return chunks;
}

type SpeechOptions = {
  interrupt?: boolean;
  summaryOnly?: boolean;
  maxSentences?: number;
  maxChars?: number;
};

function buildStructuredSpeechText(
  structured: StructuredResponse,
  options?: SpeechOptions
): string {
  const parts: string[] = [];

  if (options?.summaryOnly) {
    if (structured.explanation) parts.push(structured.explanation);
    if (structured.nextStep) parts.push(structured.nextStep);
    return parts.join("\n");
  }

  if (structured.explanation) parts.push(structured.explanation);
  if (structured.example) parts.push(structured.example);
  if (structured.points?.length) parts.push(structured.points.join(". "));

  if (structured.recommendations?.length) {
    const recLines = structured.recommendations.map((rec) => {
      const pieces = [
        rec.bank,
        rec.rate ? `rate ${rec.rate}%` : "",
        rec.tenure ? `tenure ${rec.tenure} months` : "",
        rec.reason ?? "",
      ].filter(Boolean);
      return pieces.join(", ");
    });
    parts.push(recLines.join(". "));
  }

  if (structured.nextStep) parts.push(structured.nextStep);

  if (structured.bookingFlow) {
    const flow = structured.bookingFlow;
    if (flow.title) parts.push(flow.title);
    if (flow.subtitle) parts.push(flow.subtitle);
    if (flow.steps?.length) parts.push(flow.steps.join(". "));
    if (flow.cta) parts.push(flow.cta);
    if (flow.suggestions?.length) parts.push(flow.suggestions.join(". "));
  }

  return parts.join("\n");
}

function getSpeechText(message: Message, options?: SpeechOptions): string {
  if (message.structured) {
    const structuredText = buildStructuredSpeechText(message.structured, options);
    if (structuredText.trim()) {
      return structuredText;
    }
  }

  return message.content;
}

function trimSpeechText(text: string, options?: SpeechOptions): string {
  if (!options?.summaryOnly && !options?.maxSentences && !options?.maxChars) {
    return text;
  }

  let trimmed = text;

  const maxSentences = options?.maxSentences ?? (options?.summaryOnly ? 2 : undefined);
  if (maxSentences) {
    const sentences = trimmed.match(/[^.!?।]+[.!?।]*/g) ?? [trimmed];
    trimmed = sentences.slice(0, maxSentences).join(" ").trim();
  }

  if (options?.maxChars && trimmed.length > options.maxChars) {
    trimmed = trimmed.slice(0, options.maxChars).trim();
  }

  return trimmed;
}

export function speakMessage(
  message: Message,
  fallbackLanguage: Language,
  options?: SpeechOptions
) {
  if (!canUseTts()) {
    return;
  }

  const rawText = getSpeechText(message, options);
  const cleaned = cleanSpeechText(rawText);
  const trimmed = trimSpeechText(cleaned, options);
  if (!trimmed) {
    return;
  }

  if (options?.interrupt === false && isSpeechPlaying()) {
    return;
  }

  if (options?.interrupt !== false) {
    stopSpeech();
  }

  const detectedLanguage = detectMessageLanguage(trimmed, fallbackLanguage);
  const chunks = chunkSpeechText(trimmed, 180);
  if (chunks.length === 0) {
    return;
  }

  const sessionId = activeSpeechSession;
  activeSpeechMessageId = message.id;
  dispatchTtsState(message.id);

  const locale = resolveTtsLocale(detectedLanguage);
  const voices = window.speechSynthesis.getVoices();
  const voice = pickVoice(voices, locale);

  let index = 0;

  const speakNext = () => {
    if (sessionId !== activeSpeechSession) {
      return;
    }

    const chunk = chunks[index];
    if (!chunk) {
      activeSpeechMessageId = null;
      dispatchTtsState(null);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(chunk);
    utterance.lang = locale;
    if (voice) {
      utterance.voice = voice;
    }

    utterance.onend = () => {
      index += 1;
      speakNext();
    };

    utterance.onerror = () => {
      activeSpeechMessageId = null;
      dispatchTtsState(null);
    };

    window.speechSynthesis.speak(utterance);
  };

  speakNext();
}
