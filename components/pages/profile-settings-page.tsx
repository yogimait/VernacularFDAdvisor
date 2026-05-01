"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import {
  RiCheckboxBlankCircleLine,
  RiCheckboxCircleLine,
  RiDeleteBinLine,
  RiLogoutBoxRLine,
  RiUser3Line,
} from "@remixicon/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useLanguage } from "@/hooks/use-language";
import { useSessionStorageValue } from "@/hooks/use-session-storage-value";
import { LANGUAGE_LABELS, LANGUAGE_SEQUENCE, pickLocalized } from "@/lib/i18n";
import {
  applyFontScale,
  normalizeFontScale,
  FONT_SCALE_STORAGE_KEY,
  type FontScaleOption,
} from "@/lib/font-scale";
import {
  BOOKING_STATE_KEY,
  LAST_CHAT_ACTIVITY_KEY,
  PENDING_QUICK_ACTION_KEY,
  dispatchChatReset,
  dispatchSessionSync,
  type LastChatActivity,
} from "@/lib/chat-events";
import type { FDBookingState } from "@/types/chat";

const PROFILE_NAME_KEY = "fdadvisor:profile-name";
const PROFILE_EMAIL_KEY = "fdadvisor:profile-email";

export function ProfileSettingsPage() {
  const { language, setLanguage } = useLanguage();
  const { resolvedTheme, setTheme } = useTheme();
  const text = pickLocalized(language, {
    english: {
      profile: "Profile",
      description: "Manage your preferences and account settings.",
      name: "Name",
      email: "Email",
      saveProfile: "Save Profile",
      profileSaved: "Profile preferences saved.",
      preferences: "Preferences",
      language: "Language",
      theme: "Theme",
      toggleTheme: "Toggle Theme",
      fontSize: "Font size",
      fontSizeOptions: {
        small: "Small",
        default: "Default",
        large: "Large",
        extraLarge: "Extra large",
      },
      fdHistory: "FD History (Preview)",
      activeBooking: "Active booking",
      bankNotSelected: "Bank not selected",
      noActiveBooking: "No active booking yet.",
      lastChatMessage: "Last chat message",
      noChatHistory: "No chat history in this session.",
      comingNext: "Saved banks and booking history coming next",
      actions: "Actions",
      resetChat: "Reset Chat",
      logout: "Logout",
      chatResetDone: "Chat reset completed.",
      signedOut: "Signed out from local profile.",
      fdReadiness: "FD Readiness",
      fdReadinessHint: "Tick these basics before opening a new FD.",
      goalDefined: "Goal and time horizon defined",
      emergencyFund: "Emergency fund in place",
      kycReady: "KYC and account ready",
      nomineeAdded: "Nominee decision ready",
      readinessProgress: "Readiness progress",
    },
    hindi: {
      profile: "प्रोफाइल",
      description: "अपनी पसंद और अकाउंट सेटिंग्स मैनेज करें।",
      name: "नाम",
      email: "ईमेल",
      saveProfile: "प्रोफाइल सेव करें",
      profileSaved: "प्रोफाइल सेटिंग्स सेव हो गईं।",
      preferences: "प्राथमिकताएं",
      language: "भाषा",
      theme: "थीम",
      toggleTheme: "थीम बदलें",
      fontSize: "फॉन्ट साइज़",
      fontSizeOptions: {
        small: "छोटा",
        default: "डिफ़ॉल्ट",
        large: "बड़ा",
        extraLarge: "बहुत बड़ा",
      },
      fdHistory: "FD इतिहास (प्रीव्यू)",
      activeBooking: "सक्रिय बुकिंग",
      bankNotSelected: "बैंक चयनित नहीं",
      noActiveBooking: "अभी कोई सक्रिय बुकिंग नहीं।",
      lastChatMessage: "पिछला चैट संदेश",
      noChatHistory: "इस सेशन में कोई चैट इतिहास नहीं।",
      comingNext: "सेव्ड बैंक और बुकिंग हिस्ट्री अगले अपडेट में",
      actions: "एक्शन",
      resetChat: "चैट रीसेट",
      logout: "लॉगआउट",
      chatResetDone: "चैट रीसेट हो गया।",
      signedOut: "लोकल प्रोफाइल से साइन आउट हो गया।",
      fdReadiness: "FD तैयारी",
      fdReadinessHint: "नई FD खोलने से पहले ये बेसिक्स टिक करें।",
      goalDefined: "लक्ष्य और समय अवधि तय है",
      emergencyFund: "इमरजेंसी फंड तैयार है",
      kycReady: "KYC और बैंक खाता तैयार है",
      nomineeAdded: "नॉमिनी निर्णय तैयार है",
      readinessProgress: "तैयारी प्रगति",
    },
    hinglish: {
      profile: "Profile",
      description: "Apni preferences aur account settings manage karo.",
      name: "Name",
      email: "Email",
      saveProfile: "Profile Save",
      profileSaved: "Profile preferences save ho gayi.",
      preferences: "Preferences",
      language: "Language",
      theme: "Theme",
      toggleTheme: "Theme Toggle",
      fontSize: "Font size",
      fontSizeOptions: {
        small: "Small",
        default: "Default",
        large: "Large",
        extraLarge: "Extra large",
      },
      fdHistory: "FD History (Preview)",
      activeBooking: "Active booking",
      bankNotSelected: "Bank select nahi",
      noActiveBooking: "Abhi active booking nahi hai.",
      lastChatMessage: "Last chat message",
      noChatHistory: "Is session me chat history nahi hai.",
      comingNext: "Saved banks aur booking history next update me",
      actions: "Actions",
      resetChat: "Reset Chat",
      logout: "Logout",
      chatResetDone: "Chat reset complete.",
      signedOut: "Local profile se sign out ho gaya.",
      fdReadiness: "FD Readiness",
      fdReadinessHint: "New FD open karne se pehle ye basics tick karo.",
      goalDefined: "Goal aur time horizon defined",
      emergencyFund: "Emergency fund ready",
      kycReady: "KYC aur account ready",
      nomineeAdded: "Nominee decision ready",
      readinessProgress: "Readiness progress",
    },
    marathi: {
      profile: "प्रोफाइल",
      description: "तुमच्या पसंती आणि अकाउंट सेटिंग्स व्यवस्थापित करा.",
      name: "नाव",
      email: "ईमेल",
      saveProfile: "प्रोफाइल जतन करा",
      profileSaved: "प्रोफाइल सेटिंग्ज जतन झाल्या.",
      preferences: "प्राधान्ये",
      language: "भाषा",
      theme: "थीम",
      toggleTheme: "थीम बदला",
      fontSize: "फॉन्ट आकार",
      fontSizeOptions: {
        small: "लहान",
        default: "डीफॉल्ट",
        large: "मोठा",
        extraLarge: "खूप मोठा",
      },
      fdHistory: "FD इतिहास (पूर्वावलोकन)",
      activeBooking: "सक्रिय बुकिंग",
      bankNotSelected: "बँक निवडलेली नाही",
      noActiveBooking: "अजून सक्रिय बुकिंग नाही.",
      lastChatMessage: "शेवटचा चॅट संदेश",
      noChatHistory: "या सेशनमध्ये चॅट इतिहास नाही.",
      comingNext: "सेव्ह केलेले बँक आणि बुकिंग इतिहास पुढील अपडेटमध्ये",
      actions: "कृती",
      resetChat: "चॅट रीसेट",
      logout: "लॉगआउट",
      chatResetDone: "चॅट रीसेट पूर्ण झाले.",
      signedOut: "लोकल प्रोफाइलमधून साइन आउट झाले.",
      fdReadiness: "FD तयारी",
      fdReadinessHint: "नवीन FD उघडण्यापूर्वी हे बेसिक्स टिक करा.",
      goalDefined: "ध्येय आणि कालावधी ठरलेला आहे",
      emergencyFund: "इमर्जन्सी फंड तयार आहे",
      kycReady: "KYC आणि खाते तयार आहे",
      nomineeAdded: "नॉमिनी निर्णय तयार आहे",
      readinessProgress: "तयारी प्रगती",
    },
    gujarati: {
      profile: "પ્રોફાઇલ",
      description: "તમારી પસંદગીઓ અને અકાઉન્ટ સેટિંગ્સ મેનેજ કરો.",
      name: "નામ",
      email: "ઇમેઇલ",
      saveProfile: "પ્રોફાઇલ સેવ કરો",
      profileSaved: "પ્રોફાઇલ સેટિંગ્સ સેવ થઈ ગઈ.",
      preferences: "પસંદગીઓ",
      language: "ભાષા",
      theme: "થીમ",
      toggleTheme: "થીમ બદલો",
      fontSize: "ફૉન્ટ કદ",
      fontSizeOptions: {
        small: "નાનું",
        default: "ડિફોલ્ટ",
        large: "મોટું",
        extraLarge: "ખૂબ મોટું",
      },
      fdHistory: "FD ઇતિહાસ (પૂર્વદર્શન)",
      activeBooking: "સક્રિય બુકિંગ",
      bankNotSelected: "બેંક પસંદ નથી",
      noActiveBooking: "હજુ સુધી સક્રિય બુકિંગ નથી.",
      lastChatMessage: "છેલ્લો ચેટ સંદેશ",
      noChatHistory: "આ સેશનમાં ચેટ ઇતિહાસ નથી.",
      comingNext: "સેવ કરેલી બેન્ક અને બુકિંગ ઇતિહાસ આગામી અપડેટમાં",
      actions: "ક્રિયાઓ",
      resetChat: "ચેટ રીસેટ",
      logout: "લૉગઆઉટ",
      chatResetDone: "ચેટ રીસેટ પૂર્ણ થયું.",
      signedOut: "લોકલ પ્રોફાઇલમાંથી સાઇન આઉટ થયું.",
      fdReadiness: "FD તૈયારી",
      fdReadinessHint: "નવી FD ખોલતા પહેલા આ મૂળભૂત મુદ્દા ટિક કરો.",
      goalDefined: "લક્ષ્ય અને સમયગાળો નક્કી છે",
      emergencyFund: "ઇમર્જન્સી ફંડ તૈયાર છે",
      kycReady: "KYC અને એકાઉન્ટ તૈયાર છે",
      nomineeAdded: "નૉમિની નિર્ણય તૈયાર છે",
      readinessProgress: "તૈયારી પ્રગતિ",
    },
    tamil: {
      profile: "சுயவிவரம்",
      description: "உங்கள் விருப்பங்கள் மற்றும் கணக்கு அமைப்புகளை நிர்வகிக்கவும்.",
      name: "பெயர்",
      email: "மின்னஞ்சல்",
      saveProfile: "சுயவிவரத்தை சேமிக்கவும்",
      profileSaved: "சுயவிவர அமைப்புகள் சேமிக்கப்பட்டது.",
      preferences: "விருப்பங்கள்",
      language: "மொழி",
      theme: "தீம்",
      toggleTheme: "தீமை மாற்று",
      fontSize: "எழுத்துரு அளவு",
      fontSizeOptions: {
        small: "சிறியது",
        default: "இயல்புநிலை",
        large: "பெரியது",
        extraLarge: "மிக பெரியது",
      },
      fdHistory: "FD வரலாறு (முன்னோட்டம்)",
      activeBooking: "செயலில் உள்ள பதிவு",
      bankNotSelected: "வங்கி தேர்ந்தெடுக்கப்படவில்லை",
      noActiveBooking: "இன்னும் செயலில் பதிவு இல்லை.",
      lastChatMessage: "கடைசி உரையாடல் செய்தி",
      noChatHistory: "இந்த அமர்வில் உரையாடல் வரலாறு இல்லை.",
      comingNext: "சேமிக்கப்பட்ட வங்கிகள் மற்றும் பதிவு வரலாறு அடுத்த புதுப்பிப்பில்",
      actions: "செயல்கள்",
      resetChat: "உரையாடலை மீட்டமை",
      logout: "வெளியேறு",
      chatResetDone: "உரையாடல் மீட்டமைப்பு முடிந்தது.",
      signedOut: "உள்ளூர் சுயவிவரத்திலிருந்து வெளியேறப்பட்டது.",
      fdReadiness: "FD தயார்நிலை",
      fdReadinessHint: "புதிய FD திறக்கும் முன் இந்த அடிப்படைகளை சரிபார்க்கவும்.",
      goalDefined: "இலக்கு மற்றும் காலஅளவு தீர்மானிக்கப்பட்டது",
      emergencyFund: "அவசர நிதி தயார்",
      kycReady: "KYC மற்றும் கணக்கு தயார்",
      nomineeAdded: "நாமினி முடிவு தயார்",
      readinessProgress: "தயார்நிலை முன்னேற்றம்",
    },
    bhojpuri: {
      profile: "प्रोफाइल",
      description: "अपन पसंद आ अकाउंट सेटिंग्स मैनेज करीं।",
      name: "नाम",
      email: "ईमेल",
      saveProfile: "प्रोफाइल सेव करीं",
      profileSaved: "प्रोफाइल सेटिंग्स सेव हो गइल।",
      preferences: "पसंद",
      language: "भाषा",
      theme: "थीम",
      toggleTheme: "थीम बदलीं",
      fontSize: "फॉन्ट साइज",
      fontSizeOptions: {
        small: "छोट",
        default: "डिफॉल्ट",
        large: "बड़",
        extraLarge: "बहुते बड़",
      },
      fdHistory: "FD इतिहास (प्रीव्यू)",
      activeBooking: "सक्रिय बुकिंग",
      bankNotSelected: "बैंक चयन ना भइल",
      noActiveBooking: "अभी ले सक्रिय बुकिंग नइखे।",
      lastChatMessage: "पिछला चैट संदेश",
      noChatHistory: "एह सेशन में चैट इतिहास नइखे।",
      comingNext: "सेव बैंक आ बुकिंग हिस्ट्री अगिला अपडेट में",
      actions: "एक्शन",
      resetChat: "चैट रीसेट",
      logout: "लॉगआउट",
      chatResetDone: "चैट रीसेट पूरा भइल।",
      signedOut: "लोकल प्रोफाइल से साइन आउट हो गइल।",
      fdReadiness: "FD तैयारी",
      fdReadinessHint: "नई FD खोले से पहिले ई बेसिक चीज टिक करीं।",
      goalDefined: "लक्ष्य आ समय अवधि तय बा",
      emergencyFund: "इमरजेंसी फंड तैयार बा",
      kycReady: "KYC आ खाता तैयार बा",
      nomineeAdded: "नॉमिनी निर्णय तैयार बा",
      readinessProgress: "तैयारी प्रगति",
    },
  });

  const [name, setName] = useState("Guest User");
  const [email, setEmail] = useState("guest@fdadvisor.app");
  const [status, setStatus] = useState("");
  const [fontScale, setFontScale] = useState<FontScaleOption>("default");
  const [readiness, setReadiness] = useState({
    goalDefined: false,
    emergencyFund: false,
    kycReady: false,
    nomineeAdded: false,
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const stored = window.localStorage.getItem(FONT_SCALE_STORAGE_KEY);
    const normalized = normalizeFontScale(stored);
    setFontScale(normalized);
    applyFontScale(normalized);
  }, []);

  const readinessItems = [
    { key: "goalDefined", label: text.goalDefined },
    { key: "emergencyFund", label: text.emergencyFund },
    { key: "kycReady", label: text.kycReady },
    { key: "nomineeAdded", label: text.nomineeAdded },
  ] as const;

  const fontSizeOptions: Array<{ value: FontScaleOption; label: string }> = [
    { value: "sm", label: text.fontSizeOptions.small },
    { value: "default", label: text.fontSizeOptions.default },
    { value: "lg", label: text.fontSizeOptions.large },
    { value: "xl", label: text.fontSizeOptions.extraLarge },
  ];

  const completedReadiness = readinessItems.filter((item) => readiness[item.key]).length;
  const readinessPercent = Math.round(
    (completedReadiness / readinessItems.length) * 100
  );

  const handleFontScaleChange = (next: FontScaleOption) => {
    setFontScale(next);

    if (typeof window !== "undefined") {
      if (next === "default") {
        window.localStorage.removeItem(FONT_SCALE_STORAGE_KEY);
      } else {
        window.localStorage.setItem(FONT_SCALE_STORAGE_KEY, next);
      }
    }

    applyFontScale(next);
  };

  const bookingState = useSessionStorageValue<FDBookingState | null>(
    BOOKING_STATE_KEY,
    (raw) => JSON.parse(raw) as FDBookingState,
    null
  );

  const lastChat = useSessionStorageValue<LastChatActivity | null>(
    LAST_CHAT_ACTIVITY_KEY,
    (raw) => JSON.parse(raw) as LastChatActivity,
    null
  );

  return (
    <div className="h-full min-h-0 overflow-y-auto bg-background">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 pb-6 pt-8 sm:px-6">
        <Card className="border border-border bg-card/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RiUser3Line className="size-4 text-primary" />
              {text.profile}
            </CardTitle>
            <CardDescription>{text.description}</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <p className="mb-1 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">
                {text.name}
              </p>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="h-8 w-full rounded-md border border-input bg-input/20 px-2 text-xs"
              />
            </div>

            <div>
              <p className="mb-1 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">
                {text.email}
              </p>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-8 w-full rounded-md border border-input bg-input/20 px-2 text-xs"
              />
            </div>
          </CardContent>
          <CardFooter className="pt-0">
            <Button
              variant="outline"
              onClick={() => {
                if (typeof window === "undefined") {
                  return;
                }

                window.localStorage.setItem(PROFILE_NAME_KEY, name);
                window.localStorage.setItem(PROFILE_EMAIL_KEY, email);
                setStatus(text.profileSaved);
              }}
            >
              {text.saveProfile}
            </Button>
          </CardFooter>
        </Card>

        <Card className="border border-border bg-card/70">
          <CardHeader>
            <CardTitle className="text-sm">{text.preferences}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground">{text.language}:</span>
              {LANGUAGE_SEQUENCE.map((option) => (
                <button
                  key={option}
                  onClick={() => setLanguage(option)}
                  className={`rounded-lg border px-2.5 py-0.5 text-[0.6875rem] ${
                    language === option
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border bg-background/70 text-muted-foreground"
                  }`}
                >
                  {LANGUAGE_LABELS[option]}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground">{text.theme}:</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              >
                {text.toggleTheme} ({resolvedTheme ?? "system"})
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground">{text.fontSize}:</span>
              {fontSizeOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleFontScaleChange(option.value)}
                  className={`rounded-lg border px-2.5 py-0.5 text-[0.6875rem] ${
                    fontScale === option.value
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border bg-background/70 text-muted-foreground"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card/70">
          <CardHeader>
            <CardTitle className="text-sm">{text.fdHistory}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-muted-foreground">
            {bookingState ? (
              <p>
                {text.activeBooking}: {bookingState.bank ?? text.bankNotSelected} | step {bookingState.step}
              </p>
            ) : (
              <p>{text.noActiveBooking}</p>
            )}

            {lastChat ? (
              <p>{text.lastChatMessage}: {lastChat.message}</p>
            ) : (
              <p>{text.noChatHistory}</p>
            )}

            <Badge variant="outline">{text.comingNext}</Badge>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{text.fdReadiness}</CardTitle>
            <CardDescription>{text.fdReadinessHint}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="mb-1 flex items-center justify-between text-[0.6875rem]">
                <span className="font-semibold uppercase tracking-wider text-muted-foreground">
                  {text.readinessProgress}
                </span>
                <span className="font-medium text-foreground">{readinessPercent}%</span>
              </div>
              <Progress value={readinessPercent} className="h-2" />
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {readinessItems.map((item) => (
                <button
                  key={item.key}
                  onClick={() =>
                    setReadiness((prev) => ({
                      ...prev,
                      [item.key]: !prev[item.key],
                    }))
                  }
                  className={`flex items-center gap-2 rounded-md border px-3 py-2 text-left text-xs transition-colors ${
                    readiness[item.key]
                      ? "border-primary/40 bg-primary/10 text-foreground"
                      : "border-border bg-background/70 text-muted-foreground"
                  }`}
                >
                  {readiness[item.key] ? (
                    <RiCheckboxCircleLine className="size-4 text-primary" />
                  ) : (
                    <RiCheckboxBlankCircleLine className="size-4" />
                  )}
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card/70">
          <CardHeader>
            <CardTitle className="text-sm">{text.actions}</CardTitle>
          </CardHeader>
          <CardFooter className="flex flex-wrap gap-2 pt-0">
            <Button
              variant="outline"
              className="gap-1"
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.sessionStorage.removeItem(PENDING_QUICK_ACTION_KEY);
                  window.sessionStorage.removeItem(BOOKING_STATE_KEY);
                  window.sessionStorage.removeItem(LAST_CHAT_ACTIVITY_KEY);
                }

                dispatchChatReset();
                dispatchSessionSync();
                setStatus(text.chatResetDone);
              }}
            >
              <RiDeleteBinLine className="size-3.5" />
              {text.resetChat}
            </Button>

            <Button
              variant="outline"
              className="gap-1"
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.localStorage.removeItem(PROFILE_NAME_KEY);
                  window.localStorage.removeItem(PROFILE_EMAIL_KEY);
                }

                setName("Guest User");
                setEmail("guest@fdadvisor.app");
                setLanguage("en");
                setStatus(text.signedOut);
              }}
            >
              <RiLogoutBoxRLine className="size-3.5" />
              {text.logout}
            </Button>
          </CardFooter>
        </Card>

        {status && (
          <Card className="border border-primary/25 bg-primary/5">
            <CardContent className="pt-4 text-xs text-primary">{status}</CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
