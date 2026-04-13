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

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onVoiceResult: (text: string) => void;
  onCalculatorOpen: () => void;
  isLoading: boolean;
  hasMessages: boolean;
}

const QUICK_ACTIONS = [
  { icon: RiMoneyDollarCircleLine, label: "💰 Invest 50k", prompt: "Mere paas 50,000 hai, best FD bataiye" },
  { icon: RiBarChartBoxLine, label: "📊 Best FD", prompt: "Best FD options for 1 year?" },
  { icon: RiLightbulbLine, label: "🧠 Explain FD", prompt: "FD kya hota hai? Simple me samjhao" },
];

export function ChatInput({
  value,
  onChange,
  onSend,
  onVoiceResult,
  onCalculatorOpen,
  isLoading,
  hasMessages,
}: ChatInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);

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
        setVoiceError("Voice input failed. Try again.");
        cancelRecording();
      }
    } else {
      try {
        await startRecording();
      } catch {
        setVoiceError("Mic access denied.");
      }
    }
  }, [isRecording, startRecording, stopRecording, cancelRecording, onVoiceResult]);

  const isDisabled = isLoading || isTranscribing;

  return (
    <div className="border-t border-border bg-card/60 backdrop-blur-md px-4 py-3 sm:px-6">
      {/* Quick Action Chips — shown when no messages yet */}
      {!hasMessages && (
        <div className="mx-auto mb-2.5 flex max-w-3xl items-center gap-1.5 overflow-x-auto pb-1">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.label}
              onClick={() => onVoiceResult(action.prompt)}
              disabled={isDisabled}
              className="shrink-0 rounded-full border border-border bg-background/60 px-3 py-1.5 text-[0.6875rem] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-50"
            >
              {action.label}
            </button>
          ))}
          <button
            onClick={onCalculatorOpen}
            disabled={isDisabled}
            className="shrink-0 rounded-full border border-border bg-background/60 px-3 py-1.5 text-[0.6875rem] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-50 flex items-center gap-1"
          >
            <RiCalculatorLine className="size-3" />
            Calculator
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
            Recording... click mic to stop
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
          aria-label={isRecording ? "Stop recording" : "Start voice input"}
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
              ? "Transcribing..."
              : isRecording
                ? "Listening..."
                : "Ask about Fixed Deposits..."
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
          aria-label="FD Calculator"
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
          aria-label="Send message"
        >
          <RiSendPlaneFill className="size-4" />
        </Button>
      </div>
    </div>
  );
}
