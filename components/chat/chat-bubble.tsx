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
import { FDBookingCard } from "./fd-booking-card";
import { encodeBookingCommand } from "@/lib/fd-booking-flow";
import { useLanguage } from "@/hooks/use-language";
import { pickLocalized } from "@/lib/i18n";

interface ChatBubbleProps {
  message: Message;
  onActionClick?: (text: string) => void;
}

const TOPIC_LABELS: Record<string, string> = {
  fd_basics: "FD Basics",
  fd_rates: "FD Rates",
  fd_vs_rd_vs_savings: "FD vs RD vs Savings",
  deposit_insurance: "Deposit Insurance",
  premature_withdrawal: "Premature Withdrawal",
  taxation: "Tax and TDS",
  savings_account: "Savings Account",
  banking_ombudsman: "Banking Ombudsman",
  senior_citizen_benefits: "Senior Citizen Benefits",
  quarterly_payout: "Monthly and Quarterly Payouts",
  rural_banking: "Rural Banking",
};

const TOPIC_ACRONYMS = new Set(["FD", "RD", "RBI", "SEBI", "DICGC", "KYC", "TDS", "NRI"]);

function formatTopicLabel(topic?: string): string | null {
  if (!topic) return null;
  const key = topic.toLowerCase();
  if (TOPIC_LABELS[key]) {
    return TOPIC_LABELS[key];
  }

  const label = key.replace(/[_-]+/g, " ").trim();
  if (!label) return null;

  return label
    .split(" ")
    .map((word) => {
      const upper = word.toUpperCase();
      if (TOPIC_ACRONYMS.has(upper)) {
        return upper;
      }
      return word[0]?.toUpperCase() + word.slice(1);
    })
    .join(" ");
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
  const { language } = useLanguage();
  const text = pickLocalized(language, {
    english: {
      explanation: "Explanation",
      example: "Example",
      recommendations: "Recommendations",
      tapToBook: "Tap to start guided booking",
      keyPoints: "Key Points",
      nextStep: "Next Step",
      sources: "Sources",
      confidenceHigh: "High confidence",
      confidenceMedium: "Medium confidence",
      confidenceLow: "Low confidence",
      viewSnippet: "View snippet",
      readSource: "Read source",
    },
    hindi: {
      explanation: "समझाइश",
      example: "उदाहरण",
      recommendations: "सुझाव",
      tapToBook: "गाइडेड बुकिंग शुरू करने के लिए टैप करें",
      keyPoints: "मुख्य बिंदु",
      nextStep: "अगला कदम",
      sources: "स्रोत",
      confidenceHigh: "उच्च भरोसा",
      confidenceMedium: "मध्यम भरोसा",
      confidenceLow: "कम भरोसा",
      viewSnippet: "Snippet देखें",
      readSource: "स्रोत पढ़ें",
    },
    hinglish: {
      explanation: "Explanation",
      example: "Example",
      recommendations: "Recommendations",
      tapToBook: "Guided booking start karne ke liye tap karein",
      keyPoints: "Key Points",
      nextStep: "Next Step",
      sources: "Sources",
      confidenceHigh: "High confidence",
      confidenceMedium: "Medium confidence",
      confidenceLow: "Low confidence",
      viewSnippet: "Snippet dekho",
      readSource: "Source padho",
    },
    marathi: {
      explanation: "स्पष्टीकरण",
      example: "उदाहरण",
      recommendations: "शिफारसी",
      tapToBook: "Guided booking सुरू करण्यासाठी टॅप करा",
      keyPoints: "मुख्य मुद्दे",
      nextStep: "पुढचा टप्पा",
      sources: "स्रोत",
      confidenceHigh: "उच्च विश्वास",
      confidenceMedium: "मध्यम विश्वास",
      confidenceLow: "कमी विश्वास",
      viewSnippet: "Snippet पहा",
      readSource: "स्रोत वाचा",
    },
    gujarati: {
      explanation: "સમજૂતી",
      example: "ઉદાહરણ",
      recommendations: "ભલામણો",
      tapToBook: "Guided booking શરૂ કરવા માટે ટેપ કરો",
      keyPoints: "મુખ્ય મુદ્દાઓ",
      nextStep: "આગલું પગલું",
      sources: "સ્ત્રોતો",
      confidenceHigh: "ઉચ્ચ વિશ્વાસ",
      confidenceMedium: "મધ્યમ વિશ્વાસ",
      confidenceLow: "ઓછો વિશ્વાસ",
      viewSnippet: "Snippet જુઓ",
      readSource: "સ્ત્રોત વાંચો",
    },
    tamil: {
      explanation: "விளக்கம்",
      example: "உதாரணம்",
      recommendations: "பரிந்துரைகள்",
      tapToBook: "Guided booking தொடங்க தட்டவும்",
      keyPoints: "முக்கிய குறிப்புகள்",
      nextStep: "அடுத்த படி",
      sources: "ஆதாரங்கள்",
      confidenceHigh: "உயர் நம்பிக்கை",
      confidenceMedium: "மிதமான நம்பிக்கை",
      confidenceLow: "குறைந்த நம்பிக்கை",
      viewSnippet: "Snippet பார்க்க",
      readSource: "ஆதாரத்தை படிக்க",
    },
    bhojpuri: {
      explanation: "समझावन",
      example: "उदाहरण",
      recommendations: "सुझाव",
      tapToBook: "Guided booking शुरू करे खातिर टैप करीं",
      keyPoints: "मुख्य बिंदु",
      nextStep: "अगिला कदम",
      sources: "स्रोत",
      confidenceHigh: "उच्च भरोसा",
      confidenceMedium: "मध्यम भरोसा",
      confidenceLow: "कम भरोसा",
      viewSnippet: "Snippet देखीं",
      readSource: "स्रोत पढ़ीं",
    },
  });

  if (data.type === "booking_flow" && data.bookingFlow) {
    return <FDBookingCard flow={data.bookingFlow} onActionClick={onActionClick} />;
  }

  return (
    <div className="space-y-2">
      {/* Explanation */}
      {data.explanation && (
        <div>
          <p className="mb-0.5 text-[0.6875rem] font-medium text-muted-foreground">
            {text.explanation}
          </p>
          <p className="text-[0.875rem] leading-relaxed text-foreground">
            {data.explanation}
          </p>
        </div>
      )}

      {/* Example */}
      {data.example && (
        <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
          <p className="mb-0.5 text-[0.6875rem] font-medium text-muted-foreground">
            {text.example}
          </p>
          <p className="text-[0.8125rem] leading-relaxed text-foreground">
            {data.example}
          </p>
        </div>
      )}

      {/* Clickable Recommendation Cards (Phase 9) */}
      {data.recommendations && data.recommendations.length > 0 && (
        <div className="space-y-2">
          <p className="text-[0.6875rem] font-medium text-muted-foreground">
            {text.recommendations}
          </p>
          {data.recommendations.map((rec, i) => (
            <button
              key={i}
              onClick={() =>
                onActionClick?.(
                  encodeBookingCommand({
                    type: "START_FROM_RECOMMENDATION",
                    bank: rec.bank,
                    tenureMonths: rec.tenure,
                  })
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
                <p className="mt-1 text-[0.6875rem] font-medium text-primary/80">
                  {text.tapToBook}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Key Points */}
      {data.points && data.points.length > 0 && (
        <div>
          <p className="mb-0.5 text-[0.6875rem] font-medium text-muted-foreground">
            {text.keyPoints}
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

      {/* Sources */}
      {data.sources && data.sources.length > 0 && (
        <div>
          <p className="mb-0.5 text-[0.6875rem] font-medium text-muted-foreground">
            {text.sources}
          </p>
          <ul className="space-y-1">
            {data.sources.map((source, i) => (
              <li key={i} className="text-[0.8125rem] leading-relaxed">
                <div className="font-medium text-foreground">
                  {source.authority ?? source.source ?? "Source"}
                </div>
                {(source.title || source.topic) && (
                  <div className="text-[0.75rem] text-muted-foreground">
                    {source.title ?? formatTopicLabel(source.topic ?? undefined)}
                  </div>
                )}
                {source.confidence && (
                  <div className="mt-0.5 text-[0.6875rem] text-muted-foreground">
                    {source.confidence === "high"
                      ? text.confidenceHigh
                      : source.confidence === "medium"
                        ? text.confidenceMedium
                        : text.confidenceLow}
                  </div>
                )}
                {source.snippet ? (
                  <details className="mt-0.5 text-[0.75rem] text-muted-foreground">
                    <summary className="cursor-pointer text-[0.6875rem] text-primary/70">
                      {text.viewSnippet}
                    </summary>
                    <p className="mt-1">"{source.snippet}"</p>
                  </details>
                ) : null}
                {source.url ? (
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-0.5 inline-flex text-[0.6875rem] text-primary/70 hover:text-primary"
                  >
                    {text.readSource}
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Clickable Next Step (Phase 9) */}
      {data.nextStep && (
        <button
          onClick={() => onActionClick?.(data.nextStep!)}
          className="flex w-full items-start gap-2 rounded-lg border border-primary/20 bg-primary/10 px-3 py-2 text-left transition-all duration-200 hover:bg-primary/15 hover:border-primary/30 active:scale-[0.98] group"
        >
          <RiArrowRightLine className="size-4 shrink-0 text-primary mt-0.5 transition-transform group-hover:translate-x-0.5" />
          <div>
            <p className="mb-0.5 text-[0.6875rem] font-medium text-primary">
              {text.nextStep}
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
  const { language } = useLanguage();
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);
  const text = pickLocalized(language, {
    english: { thanks: "Thanks!", improve: "Noted, will improve!", helpful: "Helpful", notHelpful: "Not helpful" },
    hindi: { thanks: "धन्यवाद!", improve: "नोट किया, बेहतर करेंगे!", helpful: "उपयोगी", notHelpful: "उपयोगी नहीं" },
    hinglish: { thanks: "Thanks!", improve: "Noted, improve karenge!", helpful: "Helpful", notHelpful: "Helpful nahi" },
    marathi: { thanks: "धन्यवाद!", improve: "नोंद घेतली, सुधारतो!", helpful: "उपयुक्त", notHelpful: "उपयुक्त नाही" },
    gujarati: { thanks: "આભાર!", improve: "નોંધ લીધી, સુધારશું!", helpful: "ઉપયોગી", notHelpful: "ઉપયોગી નથી" },
    tamil: { thanks: "நன்றி!", improve: "குறிப்பு எடுத்தோம், மேம்படுத்துகிறோம்!", helpful: "பயனுள்ளது", notHelpful: "பயனில்லை" },
    bhojpuri: { thanks: "धन्यवाद!", improve: "नोट कर लिहनी, सुधारब!", helpful: "काम के", notHelpful: "काम के ना" },
  });

  if (feedback) {
    return (
      <span className="text-[0.625rem] text-muted-foreground">
        {feedback === "up" ? `👍 ${text.thanks}` : text.improve}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-0.5">
      <button
        onClick={() => setFeedback("up")}
        className="rounded p-0.5 text-muted-foreground/50 transition-colors hover:text-chart-1 hover:bg-chart-1/10"
        aria-label={text.helpful}
      >
        <RiThumbUpLine className="size-3" />
      </button>
      <button
        onClick={() => setFeedback("down")}
        className="rounded p-0.5 text-muted-foreground/50 transition-colors hover:text-destructive hover:bg-destructive/10"
        aria-label={text.notHelpful}
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
