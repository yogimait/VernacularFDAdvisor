"use client";

import dynamic from "next/dynamic";
import {
  RiCloseLine,
  RiChat3Line,
  RiMoneyDollarCircleLine,
  RiExchangeLine,
  RiCalculatorLine,
  RiTimeLine,
} from "@remixicon/react";
import { useState, useCallback, useEffect, useRef } from "react";
import { ChatMessages } from "./chat-messages";
import { ChatInput } from "./chat-input";
import { SmartInsightsSidebar } from "./smart-insights-sidebar";
import { useLanguage, type Language } from "@/hooks/use-language";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { pickLocalized } from "@/lib/i18n";
import { detectMessageLanguage } from "@/lib/language-detection";
import { isSpeechPlaying, speakMessage, stopSpeech, subscribeTtsState } from "@/lib/tts";
import { findBestFDs } from "@/lib/fd-data";
import {
  applyBookingCommand,
  applyBookingTextUpdates,
  buildBookingGuideText,
  buildBookingStructuredResponse,
  createBookingState,
  decodeBookingCommand,
  extractAmountFromText,
  extractBankFromText,
  extractTenureFromText,
  getBookingCommandLabel,
  isBookingRelatedMessage,
  isComparisonIntentMessage,
  type BookingLanguage,
  type FDBookingActionCommand,
} from "@/lib/fd-booking-flow";
import type {
  FDRecommendation,
  FDBookingState,
  Message,
  StructuredResponse,
} from "@/types/chat";
import {
  BOOKING_STATE_KEY,
  CHAT_RESET_EVENT,
  CHAT_LANGUAGE_CHANGE_EVENT,
  CHAT_QUICK_ACTION_EVENT,
  LAST_CHAT_ACTIVITY_KEY,
  consumePendingChatAction,
  dispatchSessionSync,
  type LastChatActivity,
  type ChatLanguageChangeDetail,
  type ChatQuickActionDetail,
} from "@/lib/chat-events";

const CHAT_MODES = [
  { key: "ask" },
  { key: "open" },
  { key: "compare" },
  { key: "calculator" },
] as const;

const RESPONSE_MODE_STORAGE_KEY = "fdadvisor:response-mode";
const VOICE_MODE_STORAGE_KEY = "fdadvisor:voice-mode";
const CHAT_HISTORY_CACHE_KEY = "fdadvisor:chat-history-v1";
const CHAT_RECOMMENDATION_CACHE_KEY = "fdadvisor:chat-recommendations-v1";
const MAX_CACHED_CHAT_TURNS = 5;
const MAX_CACHED_MESSAGES = MAX_CACHED_CHAT_TURNS * 2;
const MAX_CACHED_RECOMMENDATIONS = 5;
const SEND_DEBOUNCE_MS = 450;

const FDCalculatorModal = dynamic(
  () => import("./fd-calculator-modal").then((mod) => mod.FDCalculatorModal),
  { ssr: false }
);

interface CachedMessageRecord {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  structured?: StructuredResponse;
}

interface CachedRecommendationRecord {
  timestamp: number;
  structured: StructuredResponse;
}

function readCachedMessagesFromStorage(): Message[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(CHAT_HISTORY_CACHE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as CachedMessageRecord[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter(
        (item) =>
          item &&
          (item.role === "user" || item.role === "assistant") &&
          typeof item.content === "string" &&
          typeof item.timestamp === "number"
      )
      .slice(-MAX_CACHED_MESSAGES)
      .map((item) => ({
        id: item.id,
        role: item.role,
        content: item.content,
        timestamp: new Date(item.timestamp),
        structured: item.structured,
      }));
  } catch {
    return [];
  }
}

function persistCachedMessagesToStorage(messages: Message[]) {
  if (typeof window === "undefined") {
    return;
  }

  if (messages.length === 0) {
    window.localStorage.removeItem(CHAT_HISTORY_CACHE_KEY);
    return;
  }

  const serialized: CachedMessageRecord[] = messages
    .slice(-MAX_CACHED_MESSAGES)
    .map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      timestamp: message.timestamp.getTime(),
      structured: message.structured,
    }));

  window.localStorage.setItem(CHAT_HISTORY_CACHE_KEY, JSON.stringify(serialized));
}

function readCachedRecommendationRecords(): CachedRecommendationRecord[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(CHAT_RECOMMENDATION_CACHE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as CachedRecommendationRecord[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (item) =>
        item &&
        typeof item.timestamp === "number" &&
        item.structured?.type === "recommendation"
    );
  } catch {
    return [];
  }
}

function persistRecommendationToStorage(structured: StructuredResponse) {
  if (typeof window === "undefined") {
    return;
  }

  if (structured.type !== "recommendation" || !structured.recommendations?.length) {
    return;
  }

  const existing = readCachedRecommendationRecords();
  const nextRecords = [
    ...existing,
    {
      timestamp: Date.now(),
      structured,
    },
  ].slice(-MAX_CACHED_RECOMMENDATIONS);

  window.localStorage.setItem(
    CHAT_RECOMMENDATION_CACHE_KEY,
    JSON.stringify(nextRecords)
  );
}

function readLatestCachedRecommendation(): StructuredResponse | null {
  const existing = readCachedRecommendationRecords();
  if (existing.length === 0) {
    return null;
  }

  return existing[existing.length - 1].structured;
}

function readStoredBookingState(): FDBookingState | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.sessionStorage.getItem(BOOKING_STATE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as FDBookingState;
  } catch {
    return null;
  }
}

type ChatMode = (typeof CHAT_MODES)[number]["key"];

type VoiceState = "idle" | "listening" | "thinking" | "speaking";

type SpeechRecognitionInstance = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
  onspeechstart?: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort?: () => void;
};

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function toBookingLanguage(language: Language): BookingLanguage {
  if (language === "hi") {
    return "hindi";
  }

  if (language === "mr") {
    return "marathi";
  }

  if (language === "gu") {
    return "gujarati";
  }

  if (language === "ta") {
    return "tamil";
  }

  if (language === "bho") {
    return "bhojpuri";
  }

  if (language === "hinglish") {
    return "hinglish";
  }

  return "english";
}

function toSpeechRecognitionLocale(language: Language): string {
  if (language === "en") return "en-IN";
  if (language === "mr") return "mr-IN";
  if (language === "gu") return "gu-IN";
  if (language === "ta") return "ta-IN";
  if (language === "bho") return "hi-IN";
  if (language === "hinglish") return "hi-IN";
  return "hi-IN";
}

function toVoiceRecognitionLocale(language: Language): string {
  if (language === "en" || language === "hinglish") {
    return "hi-IN";
  }

  return toSpeechRecognitionLocale(language);
}

export function ChatContainer() {
  const [messages, setMessages] = useState<Message[]>(() =>
    readCachedMessagesFromStorage()
  );
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [responseMode, setResponseMode] = useState<"detailed" | "simple">("detailed");

  // Resizable sidebar state
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const isResizing = useRef(false);

  const startResizing = useCallback((e: React.MouseEvent) => {
    isResizing.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  const stopResizing = useCallback(() => {
    isResizing.current = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);

  const resize = useCallback((e: MouseEvent) => {
    if (isResizing.current) {
      setSidebarWidth((prev) => {
        // e.movementX is negative when moving left (expanding right sidebar)
        const newWidth = prev - e.movementX;
        if (newWidth < 260) return 260; // Min width
        if (newWidth > 500) return 500; // Max width
        return newWidth;
      });
    }
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);

  const [isVoiceModeOn, setIsVoiceModeOn] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [voiceTranscript, setVoiceTranscript] = useState<string | null>(null);
  const [voiceReply, setVoiceReply] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [isVoiceSupported, setIsVoiceSupported] = useState(true);
  const [activeMode, setActiveMode] = useState<ChatMode>("ask");
  const [showModeActions, setShowModeActions] = useState(true);
  const [bookingState, setBookingState] = useState<FDBookingState | null>(() =>
    readStoredBookingState()
  );
  const isOnline = useOnlineStatus();
  const { language, setLanguage } = useLanguage();
  const sendDebounceRef = useRef<{ text: string; at: number }>({
    text: "",
    at: 0,
  });
  const inputValueRef = useRef(inputValue);
  const voiceStateRef = useRef<VoiceState>("idle");
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const isListeningRef = useRef(false);
  const autoPlayTriggeredRef = useRef(false);
  const voiceLocaleRef = useRef<string>(toVoiceRecognitionLocale(language));
  const text = pickLocalized(language, {
    en: {
      modeLabels: {
        ask: "Ask Anything",
        open: "Open FD",
        compare: "Compare",
        calculator: "Calculator",
      },
      modeToggle: {
        show: "Show actions",
        hide: "Hide actions",
      },
      openPrompt: "I want to open an FD",
      comparePrompt: "Compare FD options for my amount and tenure",
      continueFlow: "Let us continue your FD booking flow.",
      noAccountNote:
        "No problem. Open a savings account with KYC first, then continue this FD setup.",
      updatedBooking: "Updated your booking details. Continue from this step.",
      bookingUpdatedFallback: "Booking details updated successfully.",
      resumeFallback: "Do you want to continue your FD setup?",
      errorFallback:
        "⚠️ Something went wrong. Please try again.\n\nIf the issue continues, refresh the page.",
    },
    english: {
      modeLabels: {
        ask: "Ask Anything",
        open: "Open FD",
        compare: "Compare",
        calculator: "Calculator",
      },
      modeToggle: {
        show: "Show actions",
        hide: "Hide actions",
      },
      openPrompt: "I want to open an FD",
      comparePrompt: "Compare FD options for my amount and tenure",
      continueFlow: "Let us continue your FD booking flow.",
      noAccountNote:
        "No problem. Open a savings account with KYC first, then continue this FD setup.",
      updatedBooking: "Updated your booking details. Continue from this step.",
      bookingUpdatedFallback: "Booking details updated successfully.",
      resumeFallback: "Do you want to continue your FD setup?",
      errorFallback:
        "⚠️ Something went wrong. Please try again.\n\nIf the issue continues, refresh the page.",
    },
    hindi: {
      modeLabels: {
        ask: "कुछ भी पूछें",
        open: "FD खोलें",
        compare: "तुलना करें",
        calculator: "कैलकुलेटर",
      },
      modeToggle: {
        show: "एक्शन दिखाएं",
        hide: "एक्शन छुपाएं",
      },
      openPrompt: "मुझे FD खोलनी है",
      comparePrompt: "मेरी राशि और अवधि के लिए FD विकल्पों की तुलना करो",
      continueFlow: "आइए आपकी FD बुकिंग आगे बढ़ाते हैं।",
      noAccountNote:
        "कोई समस्या नहीं। पहले KYC के साथ बचत खाता खोलें, फिर FD सेटअप जारी रखें।",
      updatedBooking: "आपकी बुकिंग डिटेल्स अपडेट हो गई हैं। इसी स्टेप से जारी रखें।",
      bookingUpdatedFallback: "बुकिंग डिटेल्स सफलतापूर्वक अपडेट हुईं।",
      resumeFallback: "क्या आप अपनी FD सेटअप जारी रखना चाहते हैं?",
      errorFallback:
        "⚠️ कुछ गड़बड़ हुई है। कृपया दोबारा प्रयास करें।\n\nसमस्या बनी रहे तो पेज रिफ्रेश करें।",
    },
    hinglish: {
      modeLabels: {
        ask: "Ask Kuch Bhi",
        open: "Open FD",
        compare: "Compare",
        calculator: "Calculator",
      },
      modeToggle: {
        show: "Actions dikhao",
        hide: "Actions chhupao",
      },
      openPrompt: "Mujhe FD open karni hai",
      comparePrompt: "Mere amount aur tenure ke liye FD options compare karo",
      continueFlow: "Chaliye aapka FD booking flow continue karte hain.",
      noAccountNote:
        "Koi problem nahi. Pehle KYC ke sath savings account open karein, fir FD setup continue karein.",
      updatedBooking: "Aapki booking details update ho gayi hain. Isi step se continue karein.",
      bookingUpdatedFallback: "Booking details successfully update ho gayi.",
      resumeFallback: "Kya aap FD setup continue karna chahte hain?",
      errorFallback:
        "⚠️ Kuch galat ho gaya. Please dobara try karein.\n\nIssue rahe to page refresh karein.",
    },
    marathi: {
      modeLabels: {
        ask: "काहीही विचारा",
        open: "FD उघडा",
        compare: "तुलना",
        calculator: "कॅल्क्युलेटर",
      },
      modeToggle: {
        show: "अॅक्शन दाखवा",
        hide: "अॅक्शन लपवा",
      },
      openPrompt: "मला FD उघडायची आहे",
      comparePrompt: "माझ्या रकमे आणि कालावधीसाठी FD पर्यायांची तुलना करा",
      continueFlow: "चला, तुमचा FD बुकिंग फ्लो पुढे सुरू ठेवूया.",
      noAccountNote:
        "काही हरकत नाही. आधी KYC सह बचत खाते उघडा, मग FD सेटअप सुरू ठेवा.",
      updatedBooking: "तुमची बुकिंग माहिती अपडेट झाली आहे. याच स्टेपवरून पुढे जा.",
      bookingUpdatedFallback: "बुकिंग माहिती यशस्वीरीत्या अपडेट झाली.",
      resumeFallback: "तुम्हाला FD सेटअप सुरू ठेवायचा आहे का?",
      errorFallback:
        "⚠️ काहीतरी चूक झाली. कृपया पुन्हा प्रयत्न करा.\n\nसमस्या कायम राहिल्यास पेज रिफ्रेश करा.",
    },
    gujarati: {
      modeLabels: {
        ask: "કંઈપણ પૂછો",
        open: "FD ખોલો",
        compare: "તુલના",
        calculator: "કેલ્ક્યુલેટર",
      },
      modeToggle: {
        show: "એક્શન બતાવો",
        hide: "એક્શન છુપાવો",
      },
      openPrompt: "મને FD ખોલવી છે",
      comparePrompt: "મારી રકમ અને સમયગાળા માટે FD વિકલ્પોની તુલના કરો",
      continueFlow: "ચાલો, તમારો FD બુકિંગ ફ્લો આગળ વધારીએ.",
      noAccountNote:
        "કોઈ સમસ્યા નથી. પહેલા KYC સાથે સેવિંગ્સ એકાઉન્ટ ખોલો, પછી FD સેટઅપ ચાલુ રાખો.",
      updatedBooking: "તમારી બુકિંગ વિગતો અપડેટ થઈ ગઈ છે. આ જ સ્ટેપથી આગળ વધો.",
      bookingUpdatedFallback: "બુકિંગ વિગતો સફળતાપૂર્વક અપડેટ થઈ.",
      resumeFallback: "શું તમે તમારું FD સેટઅપ ચાલુ રાખવા માંગો છો?",
      errorFallback:
        "⚠️ કંઈક ખોટું થયું. કૃપા કરીને ફરી પ્રયાસ કરો.\n\nસમસ્યા ચાલુ રહે તો પેજ રિફ્રેશ કરો.",
    },
    tamil: {
      modeLabels: {
        ask: "எதையும் கேளுங்கள்",
        open: "FD திறக்க",
        compare: "ஒப்பிடு",
        calculator: "கணிப்பான்",
      },
      modeToggle: {
        show: "செயல்கள் காண்பிக்க",
        hide: "செயல்கள் மறைக்க",
      },
      openPrompt: "எனக்கு FD திறக்க வேண்டும்",
      comparePrompt: "என் தொகை மற்றும் காலத்திற்கு FD விருப்பங்களை ஒப்பிடுங்கள்",
      continueFlow: "உங்கள் FD பதிவு செயல்முறையை தொடரலாம்.",
      noAccountNote:
        "பிரச்சனை இல்லை. முதலில் KYC உடன் சேமிப்பு கணக்கு திறந்து, பிறகு FD அமைப்பை தொடருங்கள்.",
      updatedBooking: "உங்கள் பதிவு விவரங்கள் புதுப்பிக்கப்பட்டன. இதே படியில் தொடருங்கள்.",
      bookingUpdatedFallback: "பதிவு விவரங்கள் வெற்றிகரமாக புதுப்பிக்கப்பட்டன.",
      resumeFallback: "FD அமைப்பை தொடர விரும்புகிறீர்களா?",
      errorFallback:
        "⚠️ ஏதோ தவறு ஏற்பட்டது. தயவுசெய்து மீண்டும் முயற்சிக்கவும்.\n\nபிரச்சனை நீடித்தால் பக்கத்தை ரீஃப்ரெஷ் செய்யவும்.",
    },
    bhojpuri: {
      modeLabels: {
        ask: "कुछो पूछीं",
        open: "FD खोलीं",
        compare: "तुलना",
        calculator: "कैलकुलेटर",
      },
      modeToggle: {
        show: "एक्शन देखाईं",
        hide: "एक्शन छुपाईं",
      },
      openPrompt: "हमरा FD खोलल बा",
      comparePrompt: "हमार रकम आ अवधि खातिर FD विकल्प के तुलना करीं",
      continueFlow: "चलीं, तोहार FD बुकिंग फ्लो आगे बढ़ाईं।",
      noAccountNote:
        "कवनो दिक्कत नइखे। पहिले KYC के साथ बचत खाता खोलीं, फिन FD सेटअप जारी राखीं।",
      updatedBooking: "तोहार बुकिंग डिटेल अपडेट हो गइल बा। एही स्टेप से आगे बढ़ीं।",
      bookingUpdatedFallback: "बुकिंग डिटेल सफलतापूर्वक अपडेट हो गइल बा।",
      resumeFallback: "का रउआ आपन FD सेटअप जारी रखे चाहत बानी?",
      errorFallback:
        "⚠️ कुछ गड़बड़ हो गइल। कृपया फेर कोशिश करीं।\n\nसमस्या रहे त पेज रिफ्रेश करीं।",
    },
  });

  const voiceText = pickLocalized(language, {
    english: {
      useVoice: "Use voice (multilingual)",
      closeVoice: "Close voice",
      toggle: "Toggle voice mode",
      listening: "Listening",
      thinking: "Thinking",
      speaking: "Speaking",
      idle: "Voice idle",
      youSaid: "You",
      assistantSaid: "FD Advisor",
      unsupported: "Voice mode needs Chrome on desktop/mobile.",
      offline: "Voice mode needs internet.",
      error: "Voice input error. Tap again.",
    },
    hindi: {
      useVoice: "वॉइस का उपयोग (बहुभाषी)",
      closeVoice: "वॉइस बंद करें",
      toggle: "वॉइस मोड बदलें",
      listening: "सुन रहा है",
      thinking: "सोच रहा है",
      speaking: "बोल रहा है",
      idle: "वॉइस बंद",
      youSaid: "आप",
      assistantSaid: "FD Advisor",
      unsupported: "वॉइस मोड के लिए Chrome चाहिए।",
      offline: "वॉइस मोड के लिए इंटरनेट चाहिए।",
      error: "वॉइस इनपुट में समस्या। फिर टैप करें।",
    },
    hinglish: {
      useVoice: "Use voice (multilingual)",
      closeVoice: "Close voice",
      toggle: "Voice mode toggle",
      listening: "Sun raha hai",
      thinking: "Soch raha hai",
      speaking: "Bol raha hai",
      idle: "Voice idle",
      youSaid: "Aap",
      assistantSaid: "FD Advisor",
      unsupported: "Voice mode ke liye Chrome chahiye.",
      offline: "Voice mode ke liye internet chahiye.",
      error: "Voice input error. Dobara tap karein.",
    },
    marathi: {
      useVoice: "व्हॉईस वापरा (बहुभाषिक)",
      closeVoice: "व्हॉईस बंद करा",
      toggle: "व्हॉईस मोड बदला",
      listening: "ऐकत आहे",
      thinking: "विचार करत आहे",
      speaking: "बोलत आहे",
      idle: "व्हॉईस थांबले",
      youSaid: "तुम्ही",
      assistantSaid: "FD Advisor",
      unsupported: "व्हॉईस मोडसाठी Chrome हवा.",
      offline: "व्हॉईस मोडसाठी इंटरनेट हवा.",
      error: "व्हॉईस इनपुट त्रुटी. पुन्हा टॅप करा.",
    },
    gujarati: {
      useVoice: "વૉઇસ વાપરો (બહુભાષી)",
      closeVoice: "વૉઇસ બંધ કરો",
      toggle: "વૉઇસ મોડ બદલો",
      listening: "સાંભળે છે",
      thinking: "વિચાર કરે છે",
      speaking: "બોલે છે",
      idle: "વૉઇસ અટક્યું",
      youSaid: "તમે",
      assistantSaid: "FD Advisor",
      unsupported: "વૉઇસ મોડ માટે Chrome જરૂરી છે.",
      offline: "વૉઇસ મોડ માટે ઇન્ટરનેટ જરૂરી છે.",
      error: "વૉઇસ ઇનપુટ ભૂલ. ફરીથી ટૅપ કરો.",
    },
    tamil: {
      useVoice: "குரலை பயன்படுத்து (பல்மொழி)",
      closeVoice: "குரலை நிறுத்து",
      toggle: "குரல் முறையை மாற்று",
      listening: "கேட்கிறது",
      thinking: "யோசிக்கிறது",
      speaking: "பேசுகிறது",
      idle: "குரல் நிறுத்தம்",
      youSaid: "நீங்கள்",
      assistantSaid: "FD Advisor",
      unsupported: "குரல் முறைக்கு Chrome தேவை.",
      offline: "குரல் முறைக்கு இணையம் தேவை.",
      error: "குரல் உள்ளீட்டு பிழை. மீண்டும் தட்டவும்.",
    },
    bhojpuri: {
      useVoice: "वॉइस इस्तेमाल करीं (बहुभाषी)",
      closeVoice: "वॉइस बंद करीं",
      toggle: "वॉइस मोड बदलीं",
      listening: "सुनत बा",
      thinking: "सोचत बा",
      speaking: "बोलत बा",
      idle: "वॉइस ठहर गइल",
      youSaid: "रउआ",
      assistantSaid: "FD Advisor",
      unsupported: "वॉइस मोड खातिर Chrome चाहीं.",
      offline: "वॉइस मोड खातिर इंटरनेट चाहीं.",
      error: "वॉइस इनपुट में दिक्कत बा। फेर टॅप करीं.",
    },
  });

  useEffect(() => {
    voiceStateRef.current = voiceState;
  }, [voiceState]);

  useEffect(() => {
    inputValueRef.current = inputValue;
  }, [inputValue]);

  const voiceStatusLabel =
    voiceState === "listening"
      ? voiceText.listening
      : voiceState === "thinking"
        ? voiceText.thinking
        : voiceState === "speaking"
          ? voiceText.speaking
          : voiceText.idle;

  const voiceWaveTone =
    voiceState === "speaking"
      ? "bg-primary"
      : voiceState === "listening"
        ? "bg-chart-1"
        : voiceState === "thinking"
          ? "bg-amber-500"
          : "bg-muted-foreground/40";

  const voiceWaveAnimation =
    voiceState === "idle" ? "" : "animate-[voiceBar_1s_ease-in-out_infinite]";

  const offlineText = pickLocalized(language, {
    english: {
      banner:
        "You are offline. AI chat is paused, but cached guidance is still available.",
      cachedReply:
        "You are offline, so I am showing your last saved recommendation.",
      basicReply:
        "You are offline, so live AI chat is unavailable right now. Here are basic FD options from local data.",
      basicPoints: [
        "Higher rates are often from small finance banks; check your risk comfort.",
        "Pick tenure based on your liquidity needs, not only rate.",
        "Use DICGC-protected options for better deposit safety.",
      ],
      basicNextStep:
        "When internet is back, ask for a personalized plan with your exact amount and tenure.",
      defaultReason: "Suggested from locally cached FD data for offline use.",
    },
    hindi: {
      banner:
        "आप ऑफलाइन हैं। AI चैट रुकी हुई है, लेकिन सेव किया गया गाइडेंस उपलब्ध है।",
      cachedReply:
        "आप ऑफलाइन हैं, इसलिए मैं आपकी पिछली सेव की गई recommendation दिखा रहा हूं।",
      basicReply:
        "आप ऑफलाइन हैं, इसलिए अभी live AI चैट उपलब्ध नहीं है। नीचे local data से basic FD options दिए गए हैं।",
      basicPoints: [
        "अधिक रेट अक्सर small finance banks में मिलता है; अपना जोखिम स्तर देखें।",
        "सिर्फ रेट नहीं, जरूरत के हिसाब से tenure चुनें।",
        "बेहतर सुरक्षा के लिए DICGC-protected विकल्प चुनें।",
      ],
      basicNextStep:
        "इंटरनेट आते ही अपनी राशि और अवधि देकर personalized सुझाव लें।",
      defaultReason: "ऑफलाइन उपयोग के लिए local FD data से सुझाया गया विकल्प।",
    },
    hinglish: {
      banner:
        "Aap offline ho. AI chat pause hai, lekin saved guidance available hai.",
      cachedReply:
        "Aap offline ho, isliye main aapki last saved recommendation dikha raha hoon.",
      basicReply:
        "Aap offline ho, isliye live AI chat abhi available nahi hai. Yeh basic FD options local data se diye gaye hain.",
      basicPoints: [
        "Higher rates often small finance banks me milte hain; risk comfort check karo.",
        "Sirf rate nahi, liquidity need ke hisaab se tenure choose karo.",
        "Better safety ke liye DICGC-protected options prefer karo.",
      ],
      basicNextStep:
        "Internet wapas aate hi exact amount aur tenure dekar personalized suggestion lo.",
      defaultReason: "Offline use ke liye local FD data se suggest kiya gaya option.",
    },
  });

  const buildDefaultOfflineRecommendations = useCallback((): FDRecommendation[] => {
    return findBestFDs(100000, 12).map((option) => ({
      bank: option.bank,
      rate: option.rate,
      tenure: option.tenure,
      category: option.category,
      reason: offlineText.defaultReason,
    }));
  }, [offlineText.defaultReason]);

  const cacheRecommendationSnapshot = useCallback(
    (structured?: StructuredResponse) => {
      if (!structured) {
        return;
      }

      persistRecommendationToStorage(structured);
    },
    []
  );

  const stopVoiceListening = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) {
      return;
    }

    try {
      recognition.stop();
    } catch {
      // no-op
    }
    isListeningRef.current = false;
  }, []);

  const startVoiceListening = useCallback(() => {
    if (!isVoiceModeOn || !isOnline) {
      return;
    }

    if (inputValue.trim().length > 0 || isLoading) {
      return;
    }

    const recognition = recognitionRef.current;
    if (!recognition || isListeningRef.current) {
      return;
    }

    try {
      recognition.lang = voiceLocaleRef.current;
      recognition.start();
    } catch {
      // no-op
    }
  }, [inputValue, isLoading, isOnline, isVoiceModeOn]);

  const toggleVoiceMode = useCallback(() => {
    setIsVoiceModeOn((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          VOICE_MODE_STORAGE_KEY,
          next ? "on" : "off"
        );
      }

      if (!next) {
        stopVoiceListening();
        setVoiceState("idle");
        setVoiceError(null);
      }
      return next;
    });
  }, [stopVoiceListening]);

  const maybeAutoPlay = useCallback(
    (message: Message) => {
      if (!isVoiceModeOn) {
        return;
      }

      if (inputValue.trim().length > 0) {
        return;
      }

      if (isSpeechPlaying()) {
        return;
      }

      autoPlayTriggeredRef.current = true;
      setVoiceReply(message.structured?.explanation || message.content);
      setVoiceState("speaking");
      speakMessage(message, language, {
        interrupt: false,
        summaryOnly: true,
        maxSentences: 2,
        maxChars: 240,
      });
      startVoiceListening();
    },
    [inputValue, isVoiceModeOn, language, startVoiceListening]
  );

  const appendAssistantMessage = useCallback(
    (content: string, structured?: StructuredResponse) => {
      const assistantMessage: Message = {
        id: generateId(),
        role: "assistant",
        content,
        timestamp: new Date(),
        structured,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      maybeAutoPlay(assistantMessage);
    },
    [maybeAutoPlay]
  );

  const appendUserMessage = useCallback((content: string) => {
    const userMessage: Message = {
      id: generateId(),
      role: "user",
      content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
  }, []);

  const pushBookingCard = useCallback(
    (
      state: FDBookingState,
      options: { note?: string; reminder?: boolean; language?: BookingLanguage } = {}
    ) => {
      const structured = buildBookingStructuredResponse(state, options);
      appendAssistantMessage(
        structured.explanation || text.continueFlow,
        structured
      );
    },
    [appendAssistantMessage, text.continueFlow]
  );

  const handleBookingCommand = useCallback(
    (command: FDBookingActionCommand) => {
      const bookingLanguage = toBookingLanguage(language);
      const actionLabel = getBookingCommandLabel(command, bookingLanguage);
      if (actionLabel) {
        appendUserMessage(actionLabel);
      }

      const activeState = bookingState ?? createBookingState();

      if (command.type === "SAVE_GUIDE") {
        appendAssistantMessage(buildBookingGuideText(activeState, bookingLanguage));
        return;
      }

      const nextState = applyBookingCommand(activeState, command);
      setBookingState(nextState);

      const note =
        command.type === "SET_ACCOUNT_STATUS" &&
        command.accountStatus === "no-account"
          ? text.noAccountNote
          : undefined;

      pushBookingCard(nextState, { note, language: bookingLanguage });
    },
    [
      appendAssistantMessage,
      appendUserMessage,
      bookingState,
      pushBookingCard,
      text.noAccountNote,
      language,
    ]
  );

  const sendMessage = useCallback(
    async (rawInput: string) => {
      const trimmed = rawInput.trim();
      if (!trimmed) return;

      const now = Date.now();
      const normalized = trimmed.toLowerCase();
      if (
        normalized === sendDebounceRef.current.text &&
        now - sendDebounceRef.current.at < SEND_DEBOUNCE_MS
      ) {
        return;
      }
      sendDebounceRef.current = { text: normalized, at: now };

      const inputLanguage = detectMessageLanguage(trimmed, language);
      const inputBookingLanguage = toBookingLanguage(inputLanguage);

      if (typeof window !== "undefined") {
        const activity: LastChatActivity = {
          message: trimmed,
          timestamp: Date.now(),
        };
        window.sessionStorage.setItem(
          LAST_CHAT_ACTIVITY_KEY,
          JSON.stringify(activity)
        );
        dispatchSessionSync();
      }

      const bookingCommand = decodeBookingCommand(trimmed);
      if (bookingCommand) {
        handleBookingCommand(bookingCommand);
        return;
      }

      const userMessage: Message = {
        id: generateId(),
        role: "user",
        content: trimmed,
        timestamp: new Date(),
      };

      const currentBookingState = bookingState;
      const amountUpdate = extractAmountFromText(trimmed);
      const tenureUpdate = extractTenureFromText(trimmed);
      const bankUpdate = extractBankFromText(trimmed);
      const isComparison = isComparisonIntentMessage(trimmed);

      if (
        currentBookingState &&
        !isComparison &&
        (amountUpdate !== null || tenureUpdate !== null || bankUpdate !== null)
      ) {
        const updatedState = applyBookingTextUpdates(currentBookingState, {
          amount: amountUpdate ?? undefined,
          tenureMonths: tenureUpdate ?? undefined,
          bank: bankUpdate ?? undefined,
        });

        setBookingState(updatedState);

        const updatedStructured = buildBookingStructuredResponse(updatedState, {
          note: text.updatedBooking,
          language: inputBookingLanguage,
        });

        const bookingUpdateMessage: Message = {
          id: generateId(),
          role: "assistant",
          content:
            updatedStructured.explanation ||
            text.bookingUpdatedFallback,
          timestamp: new Date(),
          structured: updatedStructured,
        };

        setMessages((prev) => [
          ...prev,
          userMessage,
          bookingUpdateMessage,
        ]);

        maybeAutoPlay(bookingUpdateMessage);

        setInputValue("");
        return;
      }

      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);
      setInputValue("");

      if (!isOnline) {
        const cachedRecommendation = readLatestCachedRecommendation();
        const fallbackStructured: StructuredResponse =
          cachedRecommendation ??
          {
            type: "recommendation",
            explanation: offlineText.basicReply,
            recommendations: buildDefaultOfflineRecommendations(),
            points: offlineText.basicPoints,
            nextStep: offlineText.basicNextStep,
          };

        const offlineMessage: Message = {
          id: generateId(),
          role: "assistant",
          content:
            cachedRecommendation ? offlineText.cachedReply : offlineText.basicReply,
          timestamp: new Date(),
          structured: fallbackStructured,
        };

        setMessages((prev) => [...prev, offlineMessage]);

        cacheRecommendationSnapshot(fallbackStructured);
        maybeAutoPlay(offlineMessage);
        return;
      }

      setIsLoading(true);

      try {
        const history = messages.slice(-6).map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: trimmed,
            history,
            languagePreference: language,
            responseMode,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "API request failed");
        }

        const aiMessage: Message = {
          id: generateId(),
          role: "assistant",
          content: data.reply,
          timestamp: new Date(),
          structured: data.structured || undefined,
        };

        setMessages((prev) => [...prev, aiMessage]);
        cacheRecommendationSnapshot(data.structured || undefined);
        maybeAutoPlay(aiMessage);

        if (
          data.structured?.type === "booking_flow" &&
          data.structured.bookingFlow?.bookingState
        ) {
          setBookingState(data.structured.bookingFlow.bookingState);
        }
      } catch (error) {
        console.error("Chat error:", error);

        const errorMessage: Message = {
          id: generateId(),
          role: "assistant",
          content: text.errorFallback,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, errorMessage]);
        maybeAutoPlay(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [
      bookingState,
      handleBookingCommand,
      messages,
      isOnline,
      buildDefaultOfflineRecommendations,
      cacheRecommendationSnapshot,
      language,
      offlineText.basicNextStep,
      offlineText.basicPoints,
      offlineText.basicReply,
      offlineText.cachedReply,
      maybeAutoPlay,
      responseMode,
      text.bookingUpdatedFallback,
      text.errorFallback,
      text.resumeFallback,
      text.updatedBooking,
    ]
  );

  const sendMessageRef = useRef(sendMessage);

  useEffect(() => {
    sendMessageRef.current = sendMessage;
  }, [sendMessage]);

  useEffect(() => {
    if (!isVoiceModeOn) {
      stopVoiceListening();
      setVoiceState("idle");
      return;
    }

    if (!isOnline) {
      stopVoiceListening();
      setVoiceError(voiceText.offline);
      setVoiceState("idle");
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    const SpeechRecognitionConstructor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionConstructor) {
      setIsVoiceSupported(false);
      setVoiceError(voiceText.unsupported);
      setVoiceState("idle");
      return;
    }

    setIsVoiceSupported(true);
    setVoiceError(null);

    const recognition = new SpeechRecognitionConstructor() as SpeechRecognitionInstance;
    const initialLocale = toVoiceRecognitionLocale(language);
    voiceLocaleRef.current = initialLocale;
    recognition.lang = initialLocale;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      isListeningRef.current = true;
      if (voiceStateRef.current !== "speaking" && voiceStateRef.current !== "thinking") {
        setVoiceState("listening");
      }
    };

    recognition.onspeechstart = () => {
      if (voiceStateRef.current === "speaking") {
        stopSpeech();
        setVoiceState("listening");
      }
    };

    recognition.onresult = async (event: any) => {
      const transcript =
        event?.results?.[0]?.[0]?.transcript?.trim() ?? "";
      if (!transcript) {
        setVoiceState("listening");
        return;
      }

      const detectedLanguage = detectMessageLanguage(transcript, language);
      const nextLocale = toSpeechRecognitionLocale(detectedLanguage);
      voiceLocaleRef.current = nextLocale;
      recognition.lang = nextLocale;

      if (isLoading) {
        return;
      }

      setVoiceTranscript(transcript);
      setVoiceError(null);
      setVoiceState("thinking");
      autoPlayTriggeredRef.current = false;

      try {
        await sendMessageRef.current(transcript);
      } catch {
        setVoiceError(voiceText.error);
      }

      if (
        isVoiceModeOn &&
        !autoPlayTriggeredRef.current &&
        inputValueRef.current.trim().length === 0
      ) {
        setVoiceState("idle");
      }
    };

    recognition.onerror = () => {
      isListeningRef.current = false;
      setVoiceError(voiceText.error);
      setVoiceState("idle");
    };

    recognition.onend = () => {
      isListeningRef.current = false;
      if (isVoiceModeOn && voiceStateRef.current === "listening") {
        startVoiceListening();
      }
    };

    recognitionRef.current = recognition;
    startVoiceListening();

    return () => {
      recognition.onstart = null;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.onspeechstart = null;
      recognition.abort?.();
      recognitionRef.current = null;
    };
  }, [
    isVoiceModeOn,
    isOnline,
    isLoading,
    language,
    startVoiceListening,
    stopVoiceListening,
    voiceText.error,
    voiceText.offline,
    voiceText.unsupported,
  ]);

  useEffect(() => {
    if (!isVoiceModeOn) {
      return;
    }

    if (inputValue.trim().length > 0) {
      stopVoiceListening();
      setVoiceState("idle");
      return;
    }

    if (voiceStateRef.current === "thinking") {
      return;
    }

    if (voiceStateRef.current === "speaking") {
      return;
    }

    if (!isListeningRef.current && isOnline) {
      startVoiceListening();
    }
  }, [inputValue, isOnline, isVoiceModeOn, startVoiceListening, stopVoiceListening]);

  useEffect(() => {
    if (!isVoiceModeOn) {
      return;
    }

    return subscribeTtsState((messageId) => {
      if (!isVoiceModeOn) {
        return;
      }

      if (messageId) {
        setVoiceState("speaking");
        return;
      }

      if (voiceStateRef.current === "speaking") {
        setVoiceState("idle");
      }
    });
  }, [isVoiceModeOn]);

  const handleModeSelect = useCallback(
    (mode: ChatMode) => {
      setActiveMode(mode);

      if (isLoading) {
        return;
      }

      if (mode === "open") {
        sendMessage(text.openPrompt);
        return;
      }

      if (mode === "compare") {
        sendMessage(text.comparePrompt);
        return;
      }

      if (mode === "calculator") {
        setIsCalculatorOpen(true);
      }
    },
    [isLoading, sendMessage, text.comparePrompt, text.openPrompt]
  );

  const handleSend = useCallback((valueOverride?: string) => {
    if (isLoading) return;
    sendMessage(valueOverride ?? inputValue);
  }, [inputValue, isLoading, sendMessage]);

  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      if (isLoading) return;
      sendMessage(suggestion);
    },
    [isLoading, sendMessage]
  );

  // Phase 9: clickable actions auto-send as messages
  const handleActionClick = useCallback(
    (text: string) => {
      if (isLoading) return;
      sendMessage(text);
    },
    [isLoading, sendMessage]
  );

  // Phase 10: voice result → fill input for user to review/edit before sending
  const handleVoiceResult = useCallback(
    (text: string) => {
      if (isLoading) return;
      setInputValue(text);
    },
    [isLoading]
  );

  useEffect(() => {
    const onQuickAction = (event: Event) => {
      if (isLoading) {
        return;
      }

      const detail = (event as CustomEvent<ChatQuickActionDetail>).detail;
      if (!detail?.message) {
        return;
      }

      sendMessage(detail.message);
    };

    const onLanguageChange = (event: Event) => {
      const detail = (event as CustomEvent<ChatLanguageChangeDetail>).detail;
      if (!detail?.language) {
        return;
      }

      setLanguage(detail.language);
    };

    const onReset = () => {
      setMessages([]);
      setInputValue("");
      setIsLoading(false);
      setBookingState(null);

      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(BOOKING_STATE_KEY);
        window.sessionStorage.removeItem(LAST_CHAT_ACTIVITY_KEY);
        dispatchSessionSync();
      }
    };

    window.addEventListener(CHAT_QUICK_ACTION_EVENT, onQuickAction);
    window.addEventListener(CHAT_LANGUAGE_CHANGE_EVENT, onLanguageChange);
    window.addEventListener(CHAT_RESET_EVENT, onReset);

    return () => {
      window.removeEventListener(CHAT_QUICK_ACTION_EVENT, onQuickAction);
      window.removeEventListener(CHAT_LANGUAGE_CHANGE_EVENT, onLanguageChange);
      window.removeEventListener(CHAT_RESET_EVENT, onReset);
    };
  }, [isLoading, sendMessage, setLanguage]);

  useEffect(() => {
    const pendingAction = consumePendingChatAction();
    if (!pendingAction || isLoading) {
      return;
    }

    sendMessage(pendingAction);
  }, [isLoading, sendMessage]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedMode = window.localStorage.getItem(RESPONSE_MODE_STORAGE_KEY);
    if (storedMode === "simple" || storedMode === "detailed") {
      setResponseMode(storedMode);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const stored = window.localStorage.getItem(VOICE_MODE_STORAGE_KEY);
    if (stored === "on" || stored === "true" || stored === "1") {
      setIsVoiceModeOn(true);
      return;
    }

    if (stored === "off" || stored === "false" || stored === "0") {
      setIsVoiceModeOn(false);
    }
  }, []);

  const handleResponseModeChange = useCallback((mode: "simple" | "detailed") => {
    setResponseMode(mode);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(RESPONSE_MODE_STORAGE_KEY, mode);
    }
  }, []);

  useEffect(() => {
    persistCachedMessagesToStorage(messages);
  }, [messages]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (bookingState) {
      window.sessionStorage.setItem(BOOKING_STATE_KEY, JSON.stringify(bookingState));
      dispatchSessionSync();
      return;
    }

    window.sessionStorage.removeItem(BOOKING_STATE_KEY);
    dispatchSessionSync();
  }, [bookingState]);

  return (
    <div className="flex h-full min-h-0 bg-background">
      {/* ─── Main Chat Column ─── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {isVoiceModeOn ? (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="relative flex w-[min(90vw,520px)] flex-col items-center gap-4 rounded-3xl border border-white/10 bg-white/5 px-6 py-6 text-center shadow-2xl">
              <button
                type="button"
                onClick={toggleVoiceMode}
                aria-label={voiceText.closeVoice}
                className="absolute right-3 top-3 flex size-7 items-center justify-center rounded-full bg-white/10 text-white/80 transition hover:bg-white/20 hover:text-white"
              >
                <RiCloseLine className="size-4" />
              </button>
              <div className="flex items-end gap-2">
                {[0, 1, 2, 3, 4].map((index) => (
                  <span
                    key={`voice-overlay-wave-${index}`}
                    className={`h-12 w-3 rounded-full ${voiceWaveTone} ${voiceWaveAnimation}`}
                    style={{ animationDelay: `${index * 0.12}s` }}
                  />
                ))}
              </div>
              <p className="text-sm font-semibold text-white/90">{voiceStatusLabel}</p>
              {voiceTranscript ? (
                <p className="text-[0.8125rem] text-white/80">
                  {voiceText.youSaid}: {voiceTranscript}
                </p>
              ) : null}
              {voiceReply ? (
                <p className="text-[0.8125rem] text-white/70">
                  {voiceText.assistantSaid}: {voiceReply}
                </p>
              ) : null}
              {voiceError ? (
                <p className="text-[0.75rem] text-red-200">{voiceError}</p>
              ) : null}
              {!isVoiceSupported ? (
                <p className="text-[0.75rem] text-white/60">
                  {voiceText.unsupported}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
        {!isOnline ? (
          <div className="shrink-0 border-b border-amber-400/30 bg-amber-500/10 px-4 py-2 text-[0.75rem] font-medium text-amber-800 dark:text-amber-200 sm:px-6">
            {offlineText.banner}
          </div>
        ) : null}
        <div className="shrink-0 border-b border-border bg-card/40 px-4 py-2 sm:px-6">
          <div className="flex items-center justify-end md:hidden">
            <button
              type="button"
              onClick={() => setShowModeActions((prev) => !prev)}
              className="text-[0.6875rem] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {showModeActions ? text.modeToggle.hide : text.modeToggle.show}
            </button>
          </div>
          <div className="md:flex md:items-center md:justify-between md:gap-4">
            <div
              className={`${
                showModeActions
                  ? "mt-2 grid grid-cols-2 gap-2"
                  : "hidden"
              } md:mt-0 md:flex md:items-center md:gap-1.5 md:overflow-x-auto`}
              role="tablist"
              aria-label="Chat mode selection"
            >
              {CHAT_MODES.map((mode) => {
                const ModeIcon = {
                  ask: RiChat3Line,
                  open: RiMoneyDollarCircleLine,
                  compare: RiExchangeLine,
                  calculator: RiCalculatorLine,
                }[mode.key];
                return (
                  <button
                    key={mode.key}
                    type="button"
                    onClick={() => handleModeSelect(mode.key)}
                    role="tab"
                    aria-selected={activeMode === mode.key}
                    className={`flex w-full items-center justify-center gap-1.5 rounded-full border px-3 py-1.5 text-center text-[0.6875rem] font-medium leading-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 md:w-auto md:px-3 md:py-1 ${
                      activeMode === mode.key
                        ? "border-primary/70 bg-primary text-primary-foreground"
                        : "border-border bg-background/70 text-foreground/90 hover:border-primary/30 hover:text-foreground"
                    }`}
                  >
                    <ModeIcon className="hidden size-3.5 md:inline-block" />
                    {text.modeLabels[mode.key]}
                  </button>
                );
              })}
            </div>
            {/* Desktop-only response mode toggle */}
            <div className="hidden md:inline-flex md:shrink-0 md:items-center md:rounded-full md:border md:border-border md:bg-background/60 md:p-0.5">
              {(["detailed", "simple"] as const).map((mode) => (
                <button
                  key={`desktop-response-mode-${mode}`}
                  type="button"
                  onClick={() => handleResponseModeChange(mode)}
                  className={`rounded-full px-2.5 py-1 text-[0.6875rem] font-medium transition-colors ${
                    responseMode === mode
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {mode === "simple"
                    ? pickLocalized(language, {
                        english: "Simple", hindi: "सरल", hinglish: "Simple",
                        marathi: "सोपे", gujarati: "સરળ", tamil: "எளியது", bhojpuri: "सरल",
                      })
                    : pickLocalized(language, {
                        english: "Detailed", hindi: "विस्तृत", hinglish: "Detailed",
                        marathi: "तपशीलवार", gujarati: "વિગતવાર", tamil: "விரிவாக", bhojpuri: "विस्तार से",
                      })}
                </button>
              ))}
            </div>
          </div>
        </div>
        <ChatMessages
          messages={messages}
          isLoading={isLoading}
          onSuggestionClick={handleSuggestionClick}
          onActionClick={handleActionClick}
        />
        <ChatInput
          value={inputValue}
          onChange={setInputValue}
          onSend={handleSend}
          onVoiceResult={handleVoiceResult}
          responseMode={responseMode}
          onResponseModeChange={handleResponseModeChange}
          onCalculatorOpen={() => setIsCalculatorOpen(true)}
          isVoiceModeOn={isVoiceModeOn}
          onVoiceModeToggle={toggleVoiceMode}
          voiceModeLabel={voiceText.useVoice}
          voiceModeCloseLabel={voiceText.closeVoice}
          voiceModeAriaLabel={voiceText.toggle}
          isLoading={isLoading}
          isOffline={!isOnline}
          hasMessages={messages.length > 0}
        />
        <FDCalculatorModal
          isOpen={isCalculatorOpen}
          onClose={() => setIsCalculatorOpen(false)}
        />
      </div>

      {/* ─── Desktop Smart Insights Sidebar with Resizer ─── */}
      <div 
        className="hidden lg:flex shrink-0 relative"
        style={{ width: sidebarWidth }}
      >
        {/* Drag Handle */}
        <div
          onMouseDown={startResizing}
          className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-primary/20 active:bg-primary/40 transition-colors z-10"
        />
        
        <div className="flex-1 w-full overflow-hidden">
          <SmartInsightsSidebar
            onCalculatorOpen={() => setIsCalculatorOpen(true)}
            onSuggestionClick={handleSuggestionClick}
          />
        </div>
      </div>
    </div>
  );
}
