import type { Language } from "@/hooks/use-language";

export const CHAT_QUICK_ACTION_EVENT = "fdadvisor:quick-action";
export const CHAT_LANGUAGE_CHANGE_EVENT = "fdadvisor:language-change";
export const CHAT_RESET_EVENT = "fdadvisor:chat-reset";
export const OPEN_MOBILE_SIDEBAR_EVENT = "fdadvisor:open-mobile-sidebar";
export const SESSION_SYNC_EVENT = "fdadvisor:session-sync";

export const PENDING_QUICK_ACTION_KEY = "fdadvisor:pending-quick-action";
export const BOOKING_STATE_KEY = "fdadvisor:booking-state";
export const LAST_CHAT_ACTIVITY_KEY = "fdadvisor:last-chat-activity";
export const LAST_CALC_ACTIVITY_KEY = "fdadvisor:last-calc-activity";

export interface ChatQuickActionDetail {
  message: string;
}

export interface ChatLanguageChangeDetail {
  language: Language;
}

export interface LastChatActivity {
  message: string;
  timestamp: number;
}

export interface LastCalculationActivity {
  principal: number;
  tenureMonths: number;
  rate: number;
  maturityAmount: number;
  timestamp: number;
}

export function dispatchChatQuickAction(message: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<ChatQuickActionDetail>(CHAT_QUICK_ACTION_EVENT, {
      detail: { message },
    })
  );
}

export function dispatchChatLanguageChange(language: Language) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<ChatLanguageChangeDetail>(CHAT_LANGUAGE_CHANGE_EVENT, {
      detail: { language },
    })
  );
}

export function dispatchOpenMobileSidebar() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(OPEN_MOBILE_SIDEBAR_EVENT));
}

export function dispatchChatReset() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(CHAT_RESET_EVENT));
}

export function dispatchSessionSync() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(SESSION_SYNC_EVENT));
}

export function queuePendingChatAction(message: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(PENDING_QUICK_ACTION_KEY, message);
  dispatchSessionSync();
}

export function consumePendingChatAction(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const pending = window.sessionStorage.getItem(PENDING_QUICK_ACTION_KEY);
  if (!pending) {
    return null;
  }

  window.sessionStorage.removeItem(PENDING_QUICK_ACTION_KEY);
  dispatchSessionSync();
  return pending;
}
