"use client";

import { useEffect, useRef } from "react";
import { ChatBubble } from "./chat-bubble";
import { TypingIndicator } from "./typing-indicator";
import { WelcomeScreen } from "./welcome-screen";
import type { Message } from "@/types/chat";

interface ChatMessagesProps {
  messages: Message[];
  isLoading: boolean;
  onSuggestionClick: (message: string) => void;
  onActionClick: (text: string) => void;
}

export function ChatMessages({
  messages,
  isLoading,
  onSuggestionClick,
  onActionClick,
}: ChatMessagesProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  if (messages.length === 0) {
    return <WelcomeScreen onSuggestionClick={onSuggestionClick} />;
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0">
      <div className="flex flex-col gap-4 px-4 py-4 sm:px-6">
        {messages.map((message) => (
          <ChatBubble
            key={message.id}
            message={message}
            onActionClick={onActionClick}
          />
        ))}

        {isLoading && <TypingIndicator />}

        <div ref={bottomRef} aria-hidden="true" />
      </div>
    </div>
  );
}
