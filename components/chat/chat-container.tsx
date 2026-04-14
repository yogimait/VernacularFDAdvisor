"use client";

import { useState, useCallback, useEffect } from "react";
import { ChatMessages } from "./chat-messages";
import { ChatInput } from "./chat-input";
import { FDCalculatorModal } from "./fd-calculator-modal";
import { useLanguage, type Language } from "@/hooks/use-language";
import { pickLocalized } from "@/lib/i18n";
import { detectMessageLanguage } from "@/lib/language-detection";
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
  type BookingLanguage,
  type FDBookingActionCommand,
} from "@/lib/fd-booking-flow";
import type {
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

type ChatMode = (typeof CHAT_MODES)[number]["key"];

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

export function ChatContainer() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [activeMode, setActiveMode] = useState<ChatMode>("ask");
  const [bookingState, setBookingState] = useState<FDBookingState | null>(null);
  const { language, setLanguage } = useLanguage();
  const text = pickLocalized(language, {
    en: {
      modeLabels: {
        ask: "Ask Anything",
        open: "Open FD",
        compare: "Compare",
        calculator: "Calculator",
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
    },
    []
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

      if (
        currentBookingState &&
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

        setMessages((prev) => [
          ...prev,
          userMessage,
          {
            id: generateId(),
            role: "assistant",
            content:
              updatedStructured.explanation ||
              text.bookingUpdatedFallback,
            timestamp: new Date(),
            structured: updatedStructured,
          },
        ]);

        setInputValue("");
        return;
      }

      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);
      setInputValue("");
      setIsLoading(true);

      const shouldPromptResume =
        !!currentBookingState && !isBookingRelatedMessage(trimmed);

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

        if (
          data.structured?.type === "booking_flow" &&
          data.structured.bookingFlow?.bookingState
        ) {
          setBookingState(data.structured.bookingFlow.bookingState);
        } else if (currentBookingState && shouldPromptResume) {
          const reminderStructured = buildBookingStructuredResponse(
            currentBookingState,
            { reminder: true, language: inputBookingLanguage }
          );

          setMessages((prev) => [
            ...prev,
            {
              id: generateId(),
              role: "assistant",
              content:
                reminderStructured.explanation ||
                text.resumeFallback,
              timestamp: new Date(),
              structured: reminderStructured,
            },
          ]);
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
      } finally {
        setIsLoading(false);
      }
    },
    [
      bookingState,
      handleBookingCommand,
      messages,
      language,
      text.bookingUpdatedFallback,
      text.errorFallback,
      text.resumeFallback,
      text.updatedBooking,
    ]
  );

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

  const handleSend = useCallback(() => {
    if (isLoading) return;
    sendMessage(inputValue);
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

    if (bookingState) {
      window.sessionStorage.setItem(BOOKING_STATE_KEY, JSON.stringify(bookingState));
      dispatchSessionSync();
      return;
    }

    window.sessionStorage.removeItem(BOOKING_STATE_KEY);
    dispatchSessionSync();
  }, [bookingState]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="shrink-0 border-b border-border bg-card/40 px-4 py-2 sm:px-6">
        <div className="flex items-center gap-1.5 overflow-x-auto" role="tablist" aria-label="Chat mode selection">
          {CHAT_MODES.map((mode) => (
            <button
              key={mode.key}
              type="button"
              onClick={() => handleModeSelect(mode.key)}
              role="tab"
              aria-selected={activeMode === mode.key}
              className={`rounded-full border px-3 py-1 text-[0.6875rem] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 ${
                activeMode === mode.key
                  ? "border-primary/70 bg-primary text-primary-foreground"
                  : "border-border bg-background/70 text-foreground/90 hover:border-primary/30 hover:text-foreground"
              }`}
            >
              {text.modeLabels[mode.key]}
            </button>
          ))}
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
        onCalculatorOpen={() => setIsCalculatorOpen(true)}
        isLoading={isLoading}
        hasMessages={messages.length > 0}
      />
      <FDCalculatorModal
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
      />
    </div>
  );
}
