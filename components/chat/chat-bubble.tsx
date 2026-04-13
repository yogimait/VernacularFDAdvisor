import { cn } from "@/lib/utils";
import {
  RiRobot2Fill,
  RiBankLine,
  RiArrowRightLine,
  RiThumbUpLine,
  RiThumbDownLine,
} from "@remixicon/react";
import type { Message, StructuredResponse } from "@/types/chat";
import { useState } from "react";

interface ChatBubbleProps {
  message: Message;
  onActionClick?: (text: string) => void;
}

// ── Fallback: render raw text with basic markdown formatting ──
function formatRawContent(text: string) {
  const lines = text.split("\n");

  return lines.map((line, i) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    const formattedParts = parts.map((part, j) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={j} className="font-semibold text-foreground">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });

    const isSectionHeader = /^[💡📌📊➡️🏦⚠️]/.test(line.trim());
    const isBullet = /^\s*[•\-]\s/.test(line);

    if (line.trim() === "") return <br key={i} />;

    if (isSectionHeader) {
      return (
        <p
          key={i}
          className="mt-3 mb-1 text-[0.8125rem] font-semibold first:mt-0"
        >
          {formattedParts}
        </p>
      );
    }

    if (isBullet) {
      return (
        <p
          key={i}
          className="pl-1 text-[0.8125rem] leading-relaxed text-muted-foreground"
        >
          {formattedParts}
        </p>
      );
    }

    return (
      <p key={i} className="text-[0.8125rem] leading-relaxed">
        {formattedParts}
      </p>
    );
  });
}

// ── Phase 8+9: Rich structured card with clickable elements ──
function StructuredCard({
  data,
  onActionClick,
}: {
  data: StructuredResponse;
  onActionClick?: (text: string) => void;
}) {
  return (
    <div className="space-y-3">
      {/* Explanation */}
      {data.explanation && (
        <div>
          <p className="mb-1 text-[0.6875rem] font-semibold uppercase tracking-wider text-primary">
            💡 Explanation
          </p>
          <p className="text-[0.8125rem] leading-relaxed text-card-foreground">
            {data.explanation}
          </p>
        </div>
      )}

      {/* Example */}
      {data.example && (
        <div className="rounded-lg bg-primary/5 border border-primary/10 px-3 py-2.5">
          <p className="mb-0.5 text-[0.6875rem] font-semibold uppercase tracking-wider text-primary">
            📌 Example
          </p>
          <p className="text-[0.8125rem] leading-relaxed text-card-foreground">
            {data.example}
          </p>
        </div>
      )}

      {/* Clickable Recommendation Cards (Phase 9) */}
      {data.recommendations && data.recommendations.length > 0 && (
        <div className="space-y-2">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-primary">
            🏦 Recommendations
          </p>
          {data.recommendations.map((rec, i) => (
            <button
              key={i}
              onClick={() =>
                onActionClick?.(
                  `Tell me more about ${rec.bank} FD at ${rec.rate}%`
                )
              }
              className="flex w-full items-start gap-3 rounded-lg border border-border bg-background/50 px-3 py-2.5 text-left transition-all duration-200 hover:border-primary/40 hover:bg-primary/5 active:scale-[0.98] group"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-chart-1/15 text-chart-1 mt-0.5 transition-colors group-hover:bg-chart-1/25">
                <RiBankLine className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-[0.8125rem] font-semibold text-foreground truncate">
                    {rec.bank}
                  </p>
                  <span className="shrink-0 rounded-md bg-chart-1/15 px-1.5 py-0.5 text-[0.6875rem] font-bold text-chart-1">
                    {rec.rate}%
                  </span>
                </div>
                <p className="text-[0.6875rem] text-muted-foreground">
                  {rec.tenure} months
                  {rec.maturity
                    ? ` • Maturity: ₹${rec.maturity.toLocaleString("en-IN")}`
                    : ""}
                </p>
                {rec.reason && (
                  <p className="mt-1 text-[0.75rem] text-muted-foreground leading-snug">
                    {rec.reason}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Key Points */}
      {data.points && data.points.length > 0 && (
        <div>
          <p className="mb-1 text-[0.6875rem] font-semibold uppercase tracking-wider text-primary">
            📊 Key Points
          </p>
          <ul className="space-y-0.5">
            {data.points.map((point, i) => (
              <li
                key={i}
                className="flex items-start gap-1.5 text-[0.8125rem] leading-relaxed text-muted-foreground"
              >
                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-muted-foreground/50" />
                {point}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Clickable Next Step (Phase 9) */}
      {data.nextStep && (
        <button
          onClick={() => onActionClick?.(data.nextStep!)}
          className="flex w-full items-start gap-2 rounded-lg bg-primary/10 border border-primary/20 px-3 py-2.5 text-left transition-all duration-200 hover:bg-primary/15 hover:border-primary/30 active:scale-[0.98] group"
        >
          <RiArrowRightLine className="size-4 shrink-0 text-primary mt-0.5 transition-transform group-hover:translate-x-0.5" />
          <div>
            <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-primary mb-0.5">
              Next Step
            </p>
            <p className="text-[0.8125rem] leading-relaxed text-foreground">
              {data.nextStep}
            </p>
          </div>
        </button>
      )}
    </div>
  );
}

// ── Feedback buttons (Phase 10 UX) ──
function FeedbackButtons() {
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);

  if (feedback) {
    return (
      <span className="text-[0.625rem] text-muted-foreground">
        {feedback === "up" ? "👍 Thanks!" : "Noted, will improve!"}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-0.5">
      <button
        onClick={() => setFeedback("up")}
        className="rounded p-0.5 text-muted-foreground/50 transition-colors hover:text-chart-1 hover:bg-chart-1/10"
        aria-label="Helpful"
      >
        <RiThumbUpLine className="size-3" />
      </button>
      <button
        onClick={() => setFeedback("down")}
        className="rounded p-0.5 text-muted-foreground/50 transition-colors hover:text-destructive hover:bg-destructive/10"
        aria-label="Not helpful"
      >
        <RiThumbDownLine className="size-3" />
      </button>
    </div>
  );
}

export function ChatBubble({ message, onActionClick }: ChatBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex w-full animate-[fadeInUp_0.3s_ease-out_both] gap-3",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {/* Avatar — only for assistant */}
      {!isUser && (
        <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary mt-1">
          <RiRobot2Fill className="size-3.5" />
        </div>
      )}

      {/* Message Content */}
      {isUser ? (
        <div className="max-w-[80%] rounded-xl rounded-br-sm bg-primary px-3.5 py-2.5 text-[0.8125rem] leading-relaxed text-primary-foreground sm:max-w-[70%]">
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
          <time className="mt-1 block text-[0.625rem] text-primary-foreground/60">
            {message.timestamp.toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            })}
          </time>
        </div>
      ) : (
        <div className="max-w-[90%] rounded-xl border border-border bg-card px-4 py-3.5 text-card-foreground sm:max-w-[75%]">
          {message.structured ? (
            <StructuredCard
              data={message.structured}
              onActionClick={onActionClick}
            />
          ) : (
            <div className="space-y-0.5">
              {formatRawContent(message.content)}
            </div>
          )}

          {/* Footer: timestamp + feedback */}
          <div className="mt-2 flex items-center justify-between">
            <time className="text-[0.625rem] text-muted-foreground">
              {message.timestamp.toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              })}
            </time>
            <FeedbackButtons />
          </div>
        </div>
      )}
    </div>
  );
}
