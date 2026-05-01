"use client";

import { useSyncExternalStore } from "react";
import {
  RiRobot2Fill,
  RiSunLine,
  RiMoonClearLine,
  RiGlobalLine,
} from "@remixicon/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import type { Language } from "@/hooks/use-language";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { LANGUAGE_SEQUENCE, LANGUAGE_SHORT_LABELS, pickLocalized } from "@/lib/i18n";
import { InstallAppButton } from "@/components/pwa/install-app-button";

interface ChatHeaderProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
}

export function ChatHeader({ language, onLanguageChange }: ChatHeaderProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const isOnline = useOnlineStatus();
  const isHydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const text = pickLocalized(language, {
    english: {
      subtitle: "Your Multilingual Financial Guide",
      online: "Online",
      offline: "Offline",
      switchLanguage: "Switch language",
      openSidebar: "Open sidebar",
      toggleTheme: "Toggle theme",
    },
    hindi: {
      subtitle: "आपका बहुभाषी वित्तीय गाइड",
      online: "ऑनलाइन",
      offline: "ऑफलाइन",
      switchLanguage: "भाषा बदलें",
      openSidebar: "साइडबार खोलें",
      toggleTheme: "थीम बदलें",
    },
    hinglish: {
      subtitle: "Aapka multilingual financial guide",
      online: "Online",
      offline: "Offline",
      switchLanguage: "Language change",
      openSidebar: "Sidebar open",
      toggleTheme: "Theme toggle",
    },
    marathi: {
      subtitle: "तुमचा बहुभाषिक आर्थिक मार्गदर्शक",
      online: "ऑनलाइन",
      offline: "ऑफलाइन",
      switchLanguage: "भाषा बदला",
      openSidebar: "साइडबार उघडा",
      toggleTheme: "थीम बदला",
    },
    gujarati: {
      subtitle: "તમારો બહુભાષી આર્થિક માર્ગદર્શક",
      online: "ઓનલાઇન",
      offline: "ઓફલાઇન",
      switchLanguage: "ભાષા બદલો",
      openSidebar: "સાઇડબાર ખોલો",
      toggleTheme: "થીમ બદલો",
    },
    tamil: {
      subtitle: "உங்கள் பன்மொழி நிதி வழிகாட்டி",
      online: "ஆன்லைன்",
      offline: "ஆஃப்லைன்",
      switchLanguage: "மொழி மாற்று",
      openSidebar: "பக்கப்பட்டி திறக்க",
      toggleTheme: "தீம் மாற்று",
    },
    bhojpuri: {
      subtitle: "रउरा बहुभाषी आर्थिक मार्गदर्शक",
      online: "ऑनलाइन",
      offline: "ऑफलाइन",
      switchLanguage: "भाषा बदलीं",
      openSidebar: "साइडबार खोलीं",
      toggleTheme: "थीम बदलीं",
    },
  });

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  const cycleLanguage = () => {
    const currentIndex = LANGUAGE_SEQUENCE.indexOf(language);
    const nextIndex = (currentIndex + 1) % LANGUAGE_SEQUENCE.length;
    onLanguageChange(LANGUAGE_SEQUENCE[nextIndex]);
  };

  return (
    <header className="sticky top-0 z-30 flex w-full items-center gap-2 border-b border-border bg-card/90 px-4 py-2.5 backdrop-blur-md sm:px-6 md:static md:z-auto md:gap-3 md:py-3">

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
          {text.subtitle}
        </p>
      </div>

      {/* Status Indicator */}
      <Badge variant="outline" className="hidden gap-1.5 sm:flex">
        <span
          className={`size-1.5 rounded-full ${
            isOnline ? "bg-chart-1 animate-pulse" : "bg-destructive"
          }`}
        />
        {isOnline ? text.online : text.offline}
      </Badge>

      <InstallAppButton language={language} />

      {/* Language Switch */}
      <Button
        variant="outline"
        size="sm"
        onClick={cycleLanguage}
        className="shrink-0 gap-1 text-[0.6875rem] h-8 px-2"
        aria-label={text.switchLanguage}
        id="language-switch"
      >
        <RiGlobalLine className="size-3.5" />
        {LANGUAGE_SHORT_LABELS[language]}
      </Button>

      {/* Dark/Light Mode Toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleTheme}
        aria-label={text.toggleTheme}
        id="theme-toggle"
        className="shrink-0"
      >
        {isHydrated && resolvedTheme === "dark" ? (
          <RiSunLine className="size-4" />
        ) : (
          <RiMoonClearLine className="size-4" />
        )}
      </Button>
    </header>
  );
}
