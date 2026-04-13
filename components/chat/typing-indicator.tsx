import { RiRobot2Fill } from "@remixicon/react";

const LOADING_TEXTS = [
  "Analyzing your query...",
  "Finding best options...",
  "Thinking...",
];

export function TypingIndicator() {
  // Pick a random contextual loading text
  const text =
    LOADING_TEXTS[Math.floor(Math.random() * LOADING_TEXTS.length)];

  return (
    <div className="flex w-full animate-[fadeInUp_0.3s_ease-out_both] gap-2.5">
      {/* Avatar */}
      <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary mt-0.5">
        <RiRobot2Fill className="size-3.5" />
      </div>

      {/* Typing bubble with contextual text */}
      <div className="rounded-xl rounded-bl-sm border border-border bg-card px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-primary animate-[typingBounce_1.4s_ease-in-out_infinite]" />
            <span className="size-1.5 rounded-full bg-primary animate-[typingBounce_1.4s_ease-in-out_0.2s_infinite]" />
            <span className="size-1.5 rounded-full bg-primary animate-[typingBounce_1.4s_ease-in-out_0.4s_infinite]" />
          </div>
          <span className="text-[0.6875rem] text-muted-foreground">
            {text}
          </span>
        </div>
      </div>
    </div>
  );
}
