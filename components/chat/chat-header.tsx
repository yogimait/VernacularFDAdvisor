"use client";

import { RiRobot2Fill, RiSunLine, RiMoonClearLine, RiGlobalLine } from "@remixicon/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import type { Language } from "@/hooks/use-language";

interface ChatHeaderProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
}

const LANG_LABELS: Record<Language, string> = {
  auto: "Auto",
  english: "EN",
  hindi: "हिं",
  hinglish: "Mix",
};

const LANG_CYCLE: Language[] = ["auto", "english", "hindi", "hinglish"];

export function ChatHeader({ language, onLanguageChange }: ChatHeaderProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  const cycleLanguage = () => {
    const currentIndex = LANG_CYCLE.indexOf(language);
    const nextIndex = (currentIndex + 1) % LANG_CYCLE.length;
    onLanguageChange(LANG_CYCLE[nextIndex]);
  };

  return (
    <header className="flex items-center gap-3 border-b border-border bg-card/80 px-4 py-3 backdrop-blur-md sm:px-6">
      {/* Logo / Avatar */}
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
        <RiRobot2Fill className="size-5" />
      </div>

      {/* Title + Subtitle */}
      <div className="min-w-0 flex-1">
        <h1 className="font-heading text-sm font-semibold tracking-tight text-foreground">
          FD Advisor
        </h1>
        <p className="truncate text-[0.6875rem] text-muted-foreground">
          Your Multilingual Financial Guide
        </p>
      </div>

      {/* Status Indicator */}
      <Badge variant="outline" className="hidden gap-1.5 sm:flex">
        <span className="size-1.5 rounded-full bg-chart-1 animate-pulse" />
        Online
      </Badge>

      {/* Language Switch */}
      <Button
        variant="outline"
        size="sm"
        onClick={cycleLanguage}
        className="shrink-0 gap-1 text-[0.6875rem] h-8 px-2"
        aria-label="Switch language"
        id="language-switch"
      >
        <RiGlobalLine className="size-3.5" />
        {LANG_LABELS[language]}
      </Button>

      {/* Dark/Light Mode Toggle */}
      {mounted && (
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          id="theme-toggle"
          className="shrink-0"
        >
          {resolvedTheme === "dark" ? (
            <RiSunLine className="size-4" />
          ) : (
            <RiMoonClearLine className="size-4" />
          )}
        </Button>
      )}
    </header>
  );
}
