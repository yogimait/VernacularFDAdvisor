"use client";

import { useEffect, useState, useSyncExternalStore, type ComponentType, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  RiBankLine,
  RiCalculatorLine,
  RiChat3Line,
  RiCloseLine,
  RiHomeLine,
  RiMenuLine,
  RiMoneyDollarCircleLine,
  RiUserLine,
} from "@remixicon/react";
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
import { LANGUAGE_STORAGE_KEY, useLanguage, type Language } from "@/hooks/use-language";
import { LANGUAGE_LABELS, LANGUAGE_SEQUENCE, pickLocalized, type LocalizedValues } from "@/lib/i18n";
import {
  applyFontScale,
  normalizeFontScale,
  FONT_SCALE_STORAGE_KEY,
} from "@/lib/font-scale";
import { cn } from "@/lib/utils";

const LANGUAGE_ONBOARDING_SEEN_KEY = "fdadvisor:language-onboarding-seen";

interface MobileNavItem {
  route: string;
  labels: LocalizedValues<string>;
  icon: ComponentType<{ className?: string }>;
}

const MOBILE_NAV_ITEMS: MobileNavItem[] = [
  {
    route: "/",
    icon: RiHomeLine,
    labels: {
      english: "Home",
      hindi: "होम",
      hinglish: "Home",
      marathi: "मुख्यपृष्ठ",
      gujarati: "હોમ",
      tamil: "முகப்பு",
      bhojpuri: "होम",
    },
  },
  {
    route: "/chat",
    icon: RiChat3Line,
    labels: {
      english: "Chat",
      hindi: "चैट",
      hinglish: "Chat",
      marathi: "चॅट",
      gujarati: "ચેટ",
      tamil: "அரட்டை",
      bhojpuri: "चैट",
    },
  },
  {
    route: "/profile",
    icon: RiUserLine,
    labels: {
      english: "Profile",
      hindi: "प्रोफाइल",
      hinglish: "Profile",
      marathi: "प्रोफाइल",
      gujarati: "પ્રોફાઇલ",
      tamil: "சுயவிவரம்",
      bhojpuri: "प्रोफाइल",
    },
  },
];

const MOBILE_MENU_ITEMS: MobileNavItem[] = [
  {
    route: "/explore",
    icon: RiBankLine,
    labels: {
      english: "Explore FD",
      hindi: "FD खोजें",
      hinglish: "Explore FD",
      marathi: "FD शोधा",
      gujarati: "FD શોધો",
      tamil: "FD ஆய்வு",
      bhojpuri: "FD खोजीं",
    },
  },
  {
    route: "/open-fd",
    icon: RiMoneyDollarCircleLine,
    labels: {
      english: "Open FD",
      hindi: "FD खोलें",
      hinglish: "Open FD",
      marathi: "FD उघडा",
      gujarati: "FD ખોલો",
      tamil: "FD திறக்க",
      bhojpuri: "FD खोलीं",
    },
  },
  {
    route: "/compare",
    icon: RiBankLine,
    labels: {
      english: "Compare",
      hindi: "तुलना",
      hinglish: "Compare",
      marathi: "तुलना",
      gujarati: "તુલના",
      tamil: "ஒப்பிடு",
      bhojpuri: "तुलना",
    },
  },
  {
    route: "/calculator",
    icon: RiCalculatorLine,
    labels: {
      english: "Calculator",
      hindi: "कैलकुलेटर",
      hinglish: "Calculator",
      marathi: "कॅल्क्युलेटर",
      gujarati: "કેલ્ક્યુલેટર",
      tamil: "கணிப்பான்",
      bhojpuri: "कैलकुलेटर",
    },
  },
];

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
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
  const activePath = pathname || "/";
  const isChatPage = activePath === "/chat" || activePath.startsWith("/chat/");
  const menuText = pickLocalized(language, {
    english: {
      open: "Open menu",
      close: "Close menu",
    },
    hindi: {
      open: "मेन्यू खोलें",
      close: "मेन्यू बंद करें",
    },
    hinglish: {
      open: "Menu kholo",
      close: "Menu band karo",
    },
    marathi: {
      open: "मेन्यू उघडा",
      close: "मेन्यू बंद करा",
    },
    gujarati: {
      open: "મેનુ ખોલો",
      close: "મેનુ બંધ કરો",
    },
    tamil: {
      open: "மெனுவை திறக்க",
      close: "மெனுவை மூட",
    },
    bhojpuri: {
      open: "मेनू खोलीं",
      close: "मेनू बंद करीं",
    },
  });

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
    marathi: {
      title: "तुमची भाषा निवडा",
      description: "ज्या भाषेत तुम्ही अधिक सहज आहात ती निवडा. ही भाषा नंतर हेडरमधून बदलू शकता.",
      continue: "पुढे चालू ठेवा",
    },
    gujarati: {
      title: "તમારી ભાષા પસંદ કરો",
      description: "જે ભાષામાં તમે વધુ આરામદાયક હો તે પસંદ કરો. તમે આને પછી હેડર પરથી બદલી શકો છો.",
      continue: "આગળ વધો",
    },
    tamil: {
      title: "உங்கள் மொழியைத் தேர்வுசெய்க",
      description: "நீங்கள் வசதியாக இருக்கும் மொழியைத் தேர்வுசெய்க. இதை பின்னர் தலைப்பில் இருந்து மாற்றலாம்.",
      continue: "தொடரவும்",
    },
    bhojpuri: {
      title: "अपन भाषा चुनीं",
      description: "जे भाषा में रउरा सभसे सहज बानी, उहे चुनीं। एहके बाद में हेडर से बदल सकतानी।",
      continue: "आगे बढ़ीं",
    },
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const stored = window.localStorage.getItem(FONT_SCALE_STORAGE_KEY);
    applyFontScale(normalizeFontScale(stored));
  }, []);

  useEffect(() => {
    setSelectedOnboardingLanguage(language);
  }, [language]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const completeLanguageOnboarding = () => {
    setLanguage(selectedOnboardingLanguage);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(LANGUAGE_ONBOARDING_SEEN_KEY, "1");
    }

    setHasCompletedLanguageOnboarding(true);
  };

  const navigateTo = (route: string) => {
    router.push(route);
    setMobileMenuOpen(false);
  };

  const handleMobileNavigate = (route: string) => {
    router.push(route);
    setMobileMenuOpen(false);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#0F172A]">
      <div className="hidden h-full md:flex">
        <Sidebar collapsed={collapsed} onCollapsedChange={setCollapsed} />
      </div>

      <main className="min-w-0 flex-1 overflow-hidden">
        <div className="flex h-full min-h-0 flex-col bg-background">
          <ChatHeader language={language} onLanguageChange={setLanguage} />
          <div className="min-h-0 flex-1 overflow-hidden pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
            {children}
          </div>
        </div>
      </main>

      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 h-[calc(4rem+env(safe-area-inset-bottom))] border-t border-border bg-card/90 backdrop-blur-md md:hidden"
      >
        <div className="mx-auto flex h-full max-w-lg items-center justify-around gap-2 px-3 pb-[env(safe-area-inset-bottom)] pt-2">
          {MOBILE_NAV_ITEMS.map((item) => {
            const label = pickLocalized(language, item.labels);
            const isActive =
              item.route === "/"
                ? activePath === "/"
                : activePath === item.route || activePath.startsWith(`${item.route}/`);

            return (
              <button
                key={item.route}
                type="button"
                onClick={() => navigateTo(item.route)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-[0.6875rem] font-medium transition-colors",
                  isActive
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon className="size-5" />
                <span className="leading-none">{label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {!isChatPage ? (
        <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom)+0.75rem)] right-4 z-50 md:hidden">
          <div className="flex flex-col items-end gap-2">
            {mobileMenuOpen ? (
              <div className="w-56 rounded-2xl border border-border bg-card/95 p-2 shadow-xl backdrop-blur-md">
                {MOBILE_MENU_ITEMS.map((item) => {
                  const label = pickLocalized(language, item.labels);
                  const isActive =
                    item.route === "/"
                      ? activePath === "/"
                      : activePath === item.route || activePath.startsWith(`${item.route}/`);

                  return (
                    <button
                      key={item.route}
                      type="button"
                      onClick={() => handleMobileNavigate(item.route)}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[0.75rem] font-medium transition-colors",
                        isActive
                          ? "bg-primary/15 text-primary"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <item.icon className="size-4" />
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label={mobileMenuOpen ? menuText.close : menuText.open}
              aria-expanded={mobileMenuOpen}
              className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95"
            >
              {mobileMenuOpen ? (
                <RiCloseLine className="size-5" />
              ) : (
                <RiMenuLine className="size-5" />
              )}
            </button>
          </div>
        </div>
      ) : null}

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
