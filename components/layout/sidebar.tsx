"use client";

import { useMemo, type ComponentType, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  RiBankLine,
  RiCalculatorLine,
  RiChat3Line,
  RiGlobalLine,
  RiHomeLine,
  RiMoneyDollarCircleLine,
  RiRobot2Line,
  RiUserLine,
} from "@remixicon/react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  dispatchChatLanguageChange,
} from "@/lib/chat-events";
import { useLanguage } from "@/hooks/use-language";
import {
  LANGUAGE_SEQUENCE,
  LANGUAGE_SHORT_LABELS,
  type LocalizedValues,
  pickLocalized,
} from "@/lib/i18n";

interface SidebarProps {
  collapsed: boolean;
  onCollapsedChange: (value: boolean) => void;
  mobile?: boolean;
  onCloseMobile?: () => void;
}

interface SidebarItem {
  labels: LocalizedValues<string>;
  route: string;
  icon: ComponentType<{ className?: string }>;
}

const NAV_ITEMS: SidebarItem[] = [
  {
    labels: {
      english: "Home",
      hindi: "होम",
      hinglish: "Home",
      marathi: "मुख्यपृष्ठ",
      gujarati: "હોમ",
      tamil: "முகப்பு",
      bhojpuri: "होम",
    },
    route: "/",
    icon: RiHomeLine,
  },
  {
    labels: {
      english: "Chat",
      hindi: "चैट",
      hinglish: "Chat",
      marathi: "चॅट",
      gujarati: "ચેટ",
      tamil: "அரட்டை",
      bhojpuri: "चैट",
    },
    route: "/chat",
    icon: RiChat3Line,
  },
  {
    labels: {
      english: "Explore FD",
      hindi: "FD खोजें",
      hinglish: "Explore FD",
      marathi: "FD शोधा",
      gujarati: "FD શોધો",
      tamil: "FD ஆய்வு",
      bhojpuri: "FD खोजीं",
    },
    route: "/explore",
    icon: RiBankLine,
  },
  {
    labels: {
      english: "Open FD",
      hindi: "FD खोलें",
      hinglish: "Open FD",
      marathi: "FD उघडा",
      gujarati: "FD ખોલો",
      tamil: "FD திறக்க",
      bhojpuri: "FD खोलीं",
    },
    route: "/open-fd",
    icon: RiMoneyDollarCircleLine,
  },
  {
    labels: {
      english: "Compare",
      hindi: "तुलना",
      hinglish: "Compare",
      marathi: "तुलना",
      gujarati: "તુલના",
      tamil: "ஒப்பிடு",
      bhojpuri: "तुलना",
    },
    route: "/compare",
    icon: RiBankLine,
  },
  {
    labels: {
      english: "Calculator",
      hindi: "कैलकुलेटर",
      hinglish: "Calculator",
      marathi: "कॅल्क्युलेटर",
      gujarati: "કેલ્ક્યુલેટર",
      tamil: "கணிப்பான்",
      bhojpuri: "कैलकुलेटर",
    },
    route: "/calculator",
    icon: RiCalculatorLine,
  },
  {
    labels: {
      english: "Profile",
      hindi: "प्रोफाइल",
      hinglish: "Profile",
      marathi: "प्रोफाइल",
      gujarati: "પ્રોફાઇલ",
      tamil: "சுயவிவரம்",
      bhojpuri: "प्रोफाइल",
    },
    route: "/profile",
    icon: RiUserLine,
  },
];

export function Sidebar({
  collapsed,
  onCollapsedChange,
  mobile = false,
  onCloseMobile,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { language, setLanguage } = useLanguage();

  const isCollapsed = mobile ? false : collapsed;

  const activePath = useMemo(() => pathname || "/", [pathname]);
  const text = pickLocalized(language, {
    english: {
      subtitle: "Fintech Assistant",
      switchLanguage: "Switch Language",
      language: "Language",
      toggleSidebar: "Toggle sidebar",
    },
    hindi: {
      subtitle: "फिनटेक असिस्टेंट",
      switchLanguage: "भाषा बदलें",
      language: "भाषा",
      toggleSidebar: "साइडबार टॉगल करें",
    },
    hinglish: {
      subtitle: "Fintech Assistant",
      switchLanguage: "Language change",
      language: "Language",
      toggleSidebar: "Sidebar toggle",
    },
    marathi: {
      subtitle: "फिनटेक सहाय्यक",
      switchLanguage: "भाषा बदला",
      language: "भाषा",
      toggleSidebar: "साइडबार टॉगल करा",
    },
    gujarati: {
      subtitle: "ફિનટેક સહાયક",
      switchLanguage: "ભાષા બદલો",
      language: "ભાષા",
      toggleSidebar: "સાઇડબાર ટૉગલ કરો",
    },
    tamil: {
      subtitle: "ஃபின்டெக் உதவியாளர்",
      switchLanguage: "மொழி மாற்று",
      language: "மொழி",
      toggleSidebar: "பக்கப்பட்டி மாற்று",
    },
    bhojpuri: {
      subtitle: "फिनटेक सहायक",
      switchLanguage: "भाषा बदलीं",
      language: "भाषा",
      toggleSidebar: "साइडबार टॉगल करीं",
    },
  });

  const navigateTo = (route: string) => {
    router.push(route);
    onCloseMobile?.();
  };

  const cycleLanguage = () => {
    const currentIndex = LANGUAGE_SEQUENCE.indexOf(language);
    const next =
      LANGUAGE_SEQUENCE[(currentIndex + 1) % LANGUAGE_SEQUENCE.length];

    setLanguage(next);

    dispatchChatLanguageChange(next);
  };

  const renderWithTooltip = (label: string, content: ReactNode) => {
    if (!isCollapsed) {
      return content;
    }

    return (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          {label}
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-slate-700/80 bg-[#111827] text-slate-100 transition-all duration-300 ease-in-out",
        isCollapsed ? "w-16" : "w-64",
        mobile && "w-72"
      )}
    >
      <div className="flex items-center gap-3 border-b border-slate-700/80 px-3 py-3">
        <button
          onClick={() => {
            if (mobile) {
              return;
            }
            onCollapsedChange(!collapsed);
          }}
          aria-label={text.toggleSidebar}
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/15 text-blue-300 transition-colors",
            mobile ? "cursor-default" : "hover:bg-blue-500/25"
          )}
        >
          <RiRobot2Line className="size-5" />
        </button>
        {!isCollapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">FD Advisor</p>
            <p className="truncate text-[0.6875rem] text-slate-400">{text.subtitle}</p>
          </div>
        )}
      </div>

      <nav className="space-y-1 px-2 py-3">
        {NAV_ITEMS.map((item) => {
          const label = pickLocalized(language, item.labels);
          const isActive =
            item.route === "/"
              ? activePath === "/"
              : activePath === item.route || activePath.startsWith(`${item.route}/`);

          const button = (
            <button
              key={item.route}
              onClick={() => navigateTo(item.route)}
              className={cn(
                "flex w-full items-center rounded-lg px-3 py-2 text-left text-sm transition-colors",
                isCollapsed ? "justify-center" : "gap-3",
                isActive
                  ? "bg-blue-500/15 text-blue-300"
                  : "text-slate-200 hover:bg-[#1F2937] hover:text-white"
              )}
            >
              <item.icon className="size-4 shrink-0" />
              {!isCollapsed && <span>{label}</span>}
            </button>
          );

          return <div key={item.route}>{renderWithTooltip(label, button)}</div>;
        })}
      </nav>

      <div className="mt-auto space-y-2 border-t border-slate-700/80 px-2 py-3">
        {renderWithTooltip(
          text.switchLanguage,
          <Button
            variant="ghost"
            onClick={cycleLanguage}
            className={cn(
              "w-full text-slate-200 hover:bg-[#1F2937] hover:text-white",
              isCollapsed ? "justify-center px-0" : "justify-start gap-2 px-3"
            )}
          >
            <RiGlobalLine className="size-4 shrink-0" />
            {!isCollapsed && (
              <span>
                {text.language}: {LANGUAGE_SHORT_LABELS[language]}
              </span>
            )}
          </Button>
        )}
      </div>
    </aside>
  );
}
