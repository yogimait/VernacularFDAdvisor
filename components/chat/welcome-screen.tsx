import { RiRobot2Fill, RiBankLine, RiPercentLine, RiExchangeLine, RiQuestionLine } from "@remixicon/react";

interface WelcomeScreenProps {
  onSuggestionClick: (message: string) => void;
}

const suggestions = [
  {
    icon: RiQuestionLine,
    label: "FD kya hota hai?",
    description: "Learn the basics",
  },
  {
    icon: RiBankLine,
    label: "Best FD for ₹50,000?",
    description: "Get recommendations",
  },
  {
    icon: RiPercentLine,
    label: "Interest rates explained",
    description: "Understand returns",
  },
  {
    icon: RiExchangeLine,
    label: "Compare bank FDs",
    description: "Side-by-side analysis",
  },
];

export function WelcomeScreen({ onSuggestionClick }: WelcomeScreenProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-8">
      {/* Hero Section */}
      <div className="mb-8 flex flex-col items-center text-center animate-[fadeInUp_0.5s_ease-out_both]">
        <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-primary/15 text-primary">
          <RiRobot2Fill className="size-8" />
        </div>
        <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground">
          Namaste! 🙏
        </h2>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground leading-relaxed">
          I&apos;m your AI Financial Advisor. Ask me anything about Fixed
          Deposits — in Hindi, English, or Hinglish.
        </p>
      </div>

      {/* Suggestion Chips */}
      <div className="grid w-full max-w-md grid-cols-1 gap-2.5 sm:grid-cols-2 animate-[fadeInUp_0.5s_ease-out_0.15s_both]">
        {suggestions.map((s) => (
          <button
            key={s.label}
            onClick={() => onSuggestionClick(s.label)}
            className="group flex items-center gap-3 rounded-xl border border-border bg-card/60 px-4 py-3 text-left transition-all duration-200 hover:border-primary/40 hover:bg-primary/5 active:scale-[0.98]"
          >
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
              <s.icon className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[0.8125rem] font-medium text-foreground truncate">
                {s.label}
              </p>
              <p className="text-[0.6875rem] text-muted-foreground">
                {s.description}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
