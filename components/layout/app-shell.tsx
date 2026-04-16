"use client";

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { ChatHeader } from "@/components/chat/chat-header";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { LANGUAGE_STORAGE_KEY, useLanguage, type Language } from "@/hooks/use-language";
import { OPEN_MOBILE_SIDEBAR_EVENT } from "@/lib/chat-events";
import { LANGUAGE_LABELS, LANGUAGE_SEQUENCE, pickLocalized } from "@/lib/i18n";

const LANGUAGE_ONBOARDING_SEEN_KEY = "fdadvisor:language-onboarding-seen";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { language, setLanguage } = useLanguage();
  const showLanguageOnboarding = useSyncExternalStore(
    () => () => {},
    () => {
      if (typeof window === "undefined") {
        return false;
      }

      const hasSeenOnboarding =
        window.localStorage.getItem(LANGUAGE_ONBOARDING_SEEN_KEY) === "1";
      const hasStoredLanguage = Boolean(
        window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
      );

      return !hasSeenOnboarding && !hasStoredLanguage;
    },
    () => false
  );
  const [selectedOnboardingLanguage, setSelectedOnboardingLanguage] =
    useState<Language>("en");
  const [hasCompletedLanguageOnboarding, setHasCompletedLanguageOnboarding] =
    useState(false);
  const shouldRenderLanguageOnboarding =
    showLanguageOnboarding && !hasCompletedLanguageOnboarding;

  const onboardingText = pickLocalized(selectedOnboardingLanguage, {
    english: {
      title: "Choose your language",
      description: "Pick the language you are most comfortable with. You can change this anytime from the header.",
      continue: "Continue",
    },
    hindi: {
      title: "अपनी भाषा चुनें",
      description: "जिस भाषा में आप सहज हैं, उसे चुनें। इसे बाद में भी बदला जा सकता है।",
      continue: "जारी रखें",
    },
    hinglish: {
      title: "Apni language choose karo",
      description: "Jo language me aap comfortable ho woh select karo. Baad me bhi change kar sakte ho.",
      continue: "Continue",
    },
  });

  useEffect(() => {
    const openSidebar = () => {
      setMobileOpen(true);
    };

    window.addEventListener(OPEN_MOBILE_SIDEBAR_EVENT, openSidebar);
    return () => {
      window.removeEventListener(OPEN_MOBILE_SIDEBAR_EVENT, openSidebar);
    };
  }, []);

  useEffect(() => {
    setSelectedOnboardingLanguage(language);
  }, [language]);

  const completeLanguageOnboarding = () => {
    setLanguage(selectedOnboardingLanguage);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(LANGUAGE_ONBOARDING_SEEN_KEY, "1");
    }

    setHasCompletedLanguageOnboarding(true);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#0F172A]">
      <div className="hidden h-full md:flex">
        <Sidebar collapsed={collapsed} onCollapsedChange={setCollapsed} />
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="border-none bg-transparent p-0 md:hidden">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation Menu</SheetTitle>
          </SheetHeader>
          <div className="h-full">
            <Sidebar
              collapsed={false}
              onCollapsedChange={setCollapsed}
              mobile
              onCloseMobile={() => setMobileOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>

      <main className="min-w-0 flex-1 overflow-hidden">
        <div className="flex h-full min-h-0 flex-col bg-background">
          <ChatHeader language={language} onLanguageChange={setLanguage} />
          <div className="min-h-0 flex-1 overflow-hidden">
            {children}
          </div>
        </div>
      </main>

      {shouldRenderLanguageOnboarding ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <Card
            role="dialog"
            aria-modal="true"
            aria-labelledby="language-onboarding-title"
            className="w-full max-w-md border border-border bg-card/95"
          >
            <CardHeader className="space-y-1">
              <CardTitle id="language-onboarding-title">{onboardingText.title}</CardTitle>
              <CardDescription>{onboardingText.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {LANGUAGE_SEQUENCE.map((langOption) => (
                  <Button
                    key={`language-onboarding-${langOption}`}
                    variant={
                      langOption === selectedOnboardingLanguage ? "default" : "outline"
                    }
                    className="justify-start"
                    onClick={() => setSelectedOnboardingLanguage(langOption)}
                  >
                    {LANGUAGE_LABELS[langOption]}
                  </Button>
                ))}
              </div>
              <Button
                variant="ghost"
                className="w-full"
                onClick={completeLanguageOnboarding}
              >
                {onboardingText.continue}
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
