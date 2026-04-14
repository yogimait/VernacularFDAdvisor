"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ChatHeader } from "@/components/chat/chat-header";
import { Sidebar } from "@/components/layout/sidebar";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useLanguage } from "@/hooks/use-language";
import { OPEN_MOBILE_SIDEBAR_EVENT } from "@/lib/chat-events";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { language, setLanguage } = useLanguage();

  useEffect(() => {
    const openSidebar = () => {
      setMobileOpen(true);
    };

    window.addEventListener(OPEN_MOBILE_SIDEBAR_EVENT, openSidebar);
    return () => {
      window.removeEventListener(OPEN_MOBILE_SIDEBAR_EVENT, openSidebar);
    };
  }, []);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#0F172A]">
      <div className="hidden h-full md:flex">
        <Sidebar collapsed={collapsed} onCollapsedChange={setCollapsed} />
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="border-none bg-transparent p-0 md:hidden">
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
    </div>
  );
}
