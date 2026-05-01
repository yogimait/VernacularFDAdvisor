"use client";

import { useCallback, useEffect, useState } from "react";
import { RiDownloadLine } from "@remixicon/react";
import { Button } from "@/components/ui/button";
import type { Language } from "@/hooks/use-language";
import { pickLocalized } from "@/lib/i18n";

interface InstallAppButtonProps {
  language: Language;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
}

function isStandaloneDisplayMode(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const navigatorWithStandalone = window.navigator as Navigator & {
    standalone?: boolean;
  };

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    navigatorWithStandalone.standalone === true
  );
}

export function InstallAppButton({ language }: InstallAppButtonProps) {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  const text = pickLocalized(language, {
    english: {
      installApp: "Install App",
      installing: "Installing...",
    },
    hindi: {
      installApp: "ऐप इंस्टॉल करें",
      installing: "इंस्टॉल हो रहा है...",
    },
    hinglish: {
      installApp: "App Install karo",
      installing: "Install ho raha hai...",
    },
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setIsInstalled(isStandaloneDisplayMode());

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const onAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener(
      "beforeinstallprompt",
      onBeforeInstallPrompt as EventListener
    );
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        onBeforeInstallPrompt as EventListener
      );
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  const handleInstallClick = useCallback(async () => {
    if (!deferredPrompt) {
      return;
    }

    setIsInstalling(true);

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;

      if (choice.outcome === "accepted") {
        setDeferredPrompt(null);
      }
    } finally {
      setIsInstalling(false);
    }
  }, [deferredPrompt]);

  if (isInstalled || !deferredPrompt) {
    return null;
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="h-8 shrink-0 gap-1.5 px-2 text-[0.6875rem] sm:px-3"
      onClick={handleInstallClick}
      disabled={isInstalling}
      aria-label={isInstalling ? text.installing : text.installApp}
    >
      <RiDownloadLine className="size-3.5" />
      <span className="hidden sm:inline">
        {isInstalling ? text.installing : text.installApp}
      </span>
    </Button>
  );
}
