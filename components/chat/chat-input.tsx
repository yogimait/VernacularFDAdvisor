"use client";

import { useRef, useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  RiSendPlaneFill,
  RiMicLine,
  RiStopCircleLine,
  RiLoader4Line,
  RiCalculatorLine,
  RiMoneyDollarCircleLine,
  RiLightbulbLine,
  RiBarChartBoxLine,
} from "@remixicon/react";
import { useVoiceRecorder } from "@/hooks/use-voice-recorder";
import { useLanguage } from "@/hooks/use-language";
import { pickLocalized, type LocalizedValues } from "@/lib/i18n";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onVoiceResult: (text: string) => void;
  responseMode: "simple" | "detailed";
  onResponseModeChange: (mode: "simple" | "detailed") => void;
  onCalculatorOpen: () => void;
  isLoading: boolean;
  hasMessages: boolean;
}

interface QuickAction {
  icon: typeof RiMoneyDollarCircleLine;
  labels: LocalizedValues<string>;
  prompts: LocalizedValues<string>;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    icon: RiMoneyDollarCircleLine,
    labels: {
      english: "Invest 50k",
      hindi: "50k निवेश",
      hinglish: "Invest 50k",
      marathi: "50k गुंतवा",
      gujarati: "50k રોકાણ",
      tamil: "50k முதலீடு",
      bhojpuri: "50k निवेश",
    },
    prompts: {
      english: "I have 50,000. Show me the best FD options",
      hindi: "मेरे पास 50,000 हैं, सबसे अच्छे FD विकल्प बताओ",
      hinglish: "Mere paas 50,000 hai, best FD options batao",
      marathi: "माझ्याकडे 50,000 आहेत. सर्वोत्तम FD पर्याय दाखवा",
      gujarati: "મારા પાસે 50,000 છે. શ્રેષ્ઠ FD વિકલ્પ બતાવો",
      tamil: "என்னிடம் 50,000 உள்ளது. சிறந்த FD விருப்பங்களை காட்டுங்கள்",
      bhojpuri: "हमरा पास 50,000 बा, बढ़िया FD विकल्प बताईं",
    },
  },
  {
    icon: RiBarChartBoxLine,
    labels: {
      english: "Best FD",
      hindi: "बेहतरीन FD",
      hinglish: "Best FD",
      marathi: "सर्वोत्तम FD",
      gujarati: "શ્રેષ્ઠ FD",
      tamil: "சிறந்த FD",
      bhojpuri: "बेहतरीन FD",
    },
    prompts: {
      english: "Best FD options for 1 year?",
      hindi: "1 साल के लिए सबसे अच्छे FD विकल्प?",
      hinglish: "1 year ke liye best FD options?",
      marathi: "1 वर्षासाठी सर्वोत्तम FD पर्याय कोणते?",
      gujarati: "1 વર્ષ માટે શ્રેષ્ઠ FD વિકલ્પ કયા છે?",
      tamil: "1 ஆண்டுக்கான சிறந்த FD விருப்பங்கள் என்ன?",
      bhojpuri: "1 साल खातिर सबसे बढ़िया FD विकल्प का बा?",
    },
  },
  {
    icon: RiLightbulbLine,
    labels: {
      english: "Explain FD",
      hindi: "FD समझाएं",
      hinglish: "Explain FD",
      marathi: "FD समजवा",
      gujarati: "FD સમજાવો",
      tamil: "FD விளக்கம்",
      bhojpuri: "FD समझाईं",
    },
    prompts: {
      english: "What is FD? Explain in simple words",
      hindi: "FD क्या होता है? आसान शब्दों में समझाओ",
      hinglish: "FD kya hota hai? Simple me samjhao",
      marathi: "FD म्हणजे काय? सोप्या भाषेत समजवा",
      gujarati: "FD શું છે? સરળ ભાષામાં સમજાવો",
      tamil: "FD என்றால் என்ன? எளிய முறையில் விளக்கவும்",
      bhojpuri: "FD का होला? आसान तरीका से समझाईं",
    },
  },
];

export function ChatInput({
  value,
  onChange,
  onSend,
  onVoiceResult,
  responseMode,
  onResponseModeChange,
  onCalculatorOpen,
  isLoading,
  hasMessages,
}: ChatInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const { language } = useLanguage();
  const text = pickLocalized(language, {
    en: {
      quickCalculator: "Calculator",
      voiceFailed: "Voice input failed. Try again.",
      micDenied: "Mic access denied.",
      recordingHint: "Recording... click mic to stop",
      transcribing: "Transcribing...",
      listening: "Listening...",
      askPlaceholder: "Ask about Fixed Deposits...",
      stopRecording: "Stop recording",
      startVoiceInput: "Start voice input",
      fdCalculator: "FD Calculator",
      sendMessage: "Send message",
    },
    english: {
      quickCalculator: "Calculator",
      voiceFailed: "Voice input failed. Try again.",
      micDenied: "Mic access denied.",
      recordingHint: "Recording... click mic to stop",
      transcribing: "Transcribing...",
      listening: "Listening...",
      askPlaceholder: "Ask about Fixed Deposits...",
      stopRecording: "Stop recording",
      startVoiceInput: "Start voice input",
      fdCalculator: "FD Calculator",
      sendMessage: "Send message",
    },
    hindi: {
      quickCalculator: "कैलकुलेटर",
      voiceFailed: "वॉइस इनपुट फेल हुआ। फिर से कोशिश करें।",
      micDenied: "माइक की अनुमति नहीं मिली।",
      recordingHint: "रिकॉर्डिंग चल रही है... रोकने के लिए माइक दबाएं",
      transcribing: "ट्रांसक्राइब हो रहा है...",
      listening: "सुन रहा है...",
      askPlaceholder: "Fixed Deposit के बारे में पूछें...",
      stopRecording: "रिकॉर्डिंग रोकें",
      startVoiceInput: "वॉइस इनपुट शुरू करें",
      fdCalculator: "FD कैलकुलेटर",
      sendMessage: "मैसेज भेजें",
    },
    hinglish: {
      quickCalculator: "Calculator",
      voiceFailed: "Voice input fail ho gaya. Dobara try karein.",
      micDenied: "Mic access deny ho gaya.",
      recordingHint: "Recording chal rahi hai... stop ke liye mic dabayein",
      transcribing: "Transcribing...",
      listening: "Listening...",
      askPlaceholder: "Fixed Deposit ke baare me poochhein...",
      stopRecording: "Recording stop",
      startVoiceInput: "Voice input start",
      fdCalculator: "FD Calculator",
      sendMessage: "Message bhejein",
    },
    marathi: {
      quickCalculator: "कॅल्क्युलेटर",
      voiceFailed: "व्हॉइस इनपुट फेल झाला. पुन्हा प्रयत्न करा.",
      micDenied: "माइक परवानगी नाकारली गेली.",
      recordingHint: "रेकॉर्डिंग सुरू आहे... थांबवण्यासाठी माइक दाबा",
      transcribing: "ट्रान्सक्राइब होत आहे...",
      listening: "ऐकत आहे...",
      askPlaceholder: "Fixed Deposits बद्दल विचारा...",
      stopRecording: "रेकॉर्डिंग थांबवा",
      startVoiceInput: "व्हॉइस इनपुट सुरू करा",
      fdCalculator: "FD कॅल्क्युलेटर",
      sendMessage: "मेसेज पाठवा",
    },
    gujarati: {
      quickCalculator: "કેલ્ક્યુલેટર",
      voiceFailed: "વૉઇસ ઇનપુટ નિષ્ફળ. ફરી પ્રયાસ કરો.",
      micDenied: "માઇક પરમિશન મળ્યું નથી.",
      recordingHint: "રેકોર્ડિંગ ચાલુ છે... બંધ કરવા માઇક દબાવો",
      transcribing: "ટ્રાન્સક્રાઇબ થઈ રહ્યું છે...",
      listening: "સાંભળે છે...",
      askPlaceholder: "Fixed Deposit વિશે પૂછો...",
      stopRecording: "રેકોર્ડિંગ બંધ કરો",
      startVoiceInput: "વૉઇસ ઇનપુટ શરૂ કરો",
      fdCalculator: "FD કેલ્ક્યુલેટર",
      sendMessage: "સંદેશ મોકલો",
    },
    tamil: {
      quickCalculator: "கணிப்பான்",
      voiceFailed: "குரல் உள்ளீடு தோல்வி. மீண்டும் முயற்சிக்கவும்.",
      micDenied: "மைக் அனுமதி மறுக்கப்பட்டது.",
      recordingHint: "பதிவு நடைபெறுகிறது... நிறுத்த மைக் அழுத்தவும்",
      transcribing: "உரை மாற்றம் நடைபெறுகிறது...",
      listening: "கேட்கிறது...",
      askPlaceholder: "Fixed Deposit பற்றி கேளுங்கள்...",
      stopRecording: "பதிவு நிறுத்து",
      startVoiceInput: "குரல் உள்ளீடு தொடங்கு",
      fdCalculator: "FD கணிப்பான்",
      sendMessage: "செய்தி அனுப்பு",
    },
    bhojpuri: {
      quickCalculator: "कैलकुलेटर",
      voiceFailed: "वॉइस इनपुट फेल हो गइल। फेर कोशिश करीं।",
      micDenied: "माइक परमिशन ना मिलल।",
      recordingHint: "रिकॉर्डिंग चालू बा... रोके खातिर माइक दबाईं",
      transcribing: "ट्रांसक्राइब होत बा...",
      listening: "सुनत बा...",
      askPlaceholder: "Fixed Deposit के बारे में पूछीं...",
      stopRecording: "रिकॉर्डिंग रोकीं",
      startVoiceInput: "वॉइस इनपुट शुरू करीं",
      fdCalculator: "FD कैलकुलेटर",
      sendMessage: "मैसेज भेजीं",
    },
  });
  const modeText = pickLocalized(language, {
    english: {
      responseStyle: "Response style",
      simpleMode: "Simple",
      detailedMode: "Detailed",
    },
    hindi: {
      responseStyle: "जवाब शैली",
      simpleMode: "सरल",
      detailedMode: "विस्तृत",
    },
    hinglish: {
      responseStyle: "Response style",
      simpleMode: "Simple",
      detailedMode: "Detailed",
    },
  });

  const {
    isRecording,
    isTranscribing,
    startRecording,
    stopRecording,
    cancelRecording,
  } = useVoiceRecorder();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const handleMicClick = useCallback(async () => {
    setVoiceError(null);

    if (isRecording) {
      try {
        const text = await stopRecording();
        if (text) {
          onVoiceResult(text);
        }
      } catch (err) {
        console.error("Voice error:", err);
        setVoiceError(text.voiceFailed);
        cancelRecording();
      }
    } else {
      try {
        await startRecording();
      } catch {
        setVoiceError(text.micDenied);
      }
    }
  }, [
    cancelRecording,
    isRecording,
    onVoiceResult,
    startRecording,
    stopRecording,
    text.micDenied,
    text.voiceFailed,
  ]);

  const isDisabled = isLoading || isTranscribing;

  return (
    <div className="shrink-0 border-t border-border bg-card/60 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md sm:px-6">
      <div className="mx-auto mb-2 flex max-w-3xl items-center justify-between gap-2">
        <p className="text-[0.6875rem] font-medium text-muted-foreground">{modeText.responseStyle}</p>
        <div className="inline-flex rounded-full border border-border bg-background/60 p-0.5">
          {(["simple", "detailed"] as const).map((mode) => (
            <button
              key={`response-mode-${mode}`}
              type="button"
              onClick={() => onResponseModeChange(mode)}
              className={`rounded-full px-2.5 py-1 text-[0.6875rem] font-medium transition-colors ${
                responseMode === mode
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {mode === "simple" ? modeText.simpleMode : modeText.detailedMode}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Action Chips — shown when no messages yet */}
      {!hasMessages && (
        <div className="mx-auto mb-2.5 flex max-w-3xl items-center gap-1.5 overflow-x-auto pb-1">
          {QUICK_ACTIONS.map((action, index) => (
            <button
              key={`${index}-${pickLocalized("en", action.labels)}`}
              onClick={() => onVoiceResult(pickLocalized(language, action.prompts))}
              disabled={isDisabled}
              className="shrink-0 rounded-full border border-border bg-background/60 px-3 py-1.5 text-[0.6875rem] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-50"
            >
              {pickLocalized(language, action.labels)}
            </button>
          ))}
          <button
            onClick={onCalculatorOpen}
            disabled={isDisabled}
            className="shrink-0 rounded-full border border-border bg-background/60 px-3 py-1.5 text-[0.6875rem] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-50 flex items-center gap-1"
          >
            <RiCalculatorLine className="size-3" />
            {text.quickCalculator}
          </button>
        </div>
      )}

      {/* Voice error */}
      {voiceError && (
        <p className="mx-auto mb-1.5 max-w-3xl text-[0.6875rem] text-destructive">
          {voiceError}
        </p>
      )}

      {/* Recording indicator */}
      {isRecording && (
        <div className="mx-auto mb-2 flex max-w-3xl items-center gap-2">
          <span className="size-2 rounded-full bg-destructive animate-pulse" />
          <span className="text-[0.75rem] text-destructive font-medium">
            {text.recordingHint}
          </span>
        </div>
      )}

      {/* Input bar */}
      <div className="mx-auto flex max-w-3xl items-center gap-2">
        {/* Mic Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleMicClick}
          disabled={isDisabled}
          className={`shrink-0 ${isRecording ? "text-destructive hover:text-destructive" : ""}`}
          aria-label={isRecording ? text.stopRecording : text.startVoiceInput}
          id="voice-input-button"
        >
          {isTranscribing ? (
            <RiLoader4Line className="size-4 animate-spin" />
          ) : isRecording ? (
            <RiStopCircleLine className="size-4" />
          ) : (
            <RiMicLine className="size-4" />
          )}
        </Button>

        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isTranscribing
              ? text.transcribing
              : isRecording
                ? text.listening
                : text.askPlaceholder
          }
          disabled={isDisabled}
          className="flex-1 bg-background/60 text-[0.8125rem] placeholder:text-muted-foreground/60"
          autoComplete="off"
          id="chat-input"
        />

        {/* Calculator button (inline on desktop) */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onCalculatorOpen}
          className="shrink-0 hidden sm:flex"
          aria-label={text.fdCalculator}
          id="calculator-button"
        >
          <RiCalculatorLine className="size-4" />
        </Button>

        <Button
          onClick={onSend}
          disabled={isDisabled || !value.trim()}
          size="icon"
          className="shrink-0"
          id="chat-send-button"
          aria-label={text.sendMessage}
        >
          <RiSendPlaneFill className="size-4" />
        </Button>
      </div>
    </div>
  );
}
