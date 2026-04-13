"use client";

import { useState, useCallback } from "react";
import { ChatHeader } from "./chat-header";
import { ChatMessages } from "./chat-messages";
import { ChatInput } from "./chat-input";
import { FDCalculatorModal } from "./fd-calculator-modal";
import { useLanguage } from "@/hooks/use-language";
import type { Message } from "@/types/chat";

const ERROR_FALLBACK =
  "⚠️ Something went wrong. Please try again.\n\nAgar problem bani rahe toh page refresh karein.";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function ChatContainer() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const { language, setLanguage } = useLanguage();

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      const userMessage: Message = {
        id: generateId(),
        role: "user",
        content: trimmed,
        timestamp: new Date(),
      };

      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);
      setInputValue("");
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
            languagePreference: language !== "auto" ? language : undefined,
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
      } catch (error) {
        console.error("Chat error:", error);

        const errorMessage: Message = {
          id: generateId(),
          role: "assistant",
          content: ERROR_FALLBACK,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    },
    [messages, language]
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
    [isLoading, sendMessage]
  );

  return (
    <div className="flex h-svh flex-col bg-background">
      <ChatHeader language={language} onLanguageChange={setLanguage} />
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
