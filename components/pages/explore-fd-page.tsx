"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import {
  RiArrowRightLine,
  RiCloseLine,
  RiFilter3Line,
  RiShieldCheckLine,
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
import { FD_DATA } from "@/lib/fd-data";
import { calculateFD } from "@/lib/fd-calculator";
import type { FDOption } from "@/types/chat";
import { openChatWithMessage } from "@/lib/chat-navigation";
import { useLanguage } from "@/hooks/use-language";
import { pickLocalized } from "@/lib/i18n";

type RiskLevel = "all" | "safe" | "balanced" | "high-return";
type BankType = "all" | "government" | "public" | "private" | "small-finance";
type SortType = "highest-return" | "safest" | "short-term" | "long-term";

const TENURE_FILTERS = ["any", "6", "12", "24", "36", "60"] as const;

function getRiskLevel(option: FDOption): RiskLevel {
  if (option.category === "government" || option.category === "public") {
    return "safe";
  }

  if (option.category === "private") {
    return "balanced";
  }

  return "high-return";
}

function getSafetyScore(option: FDOption): number {
  if (option.category === "government") return 0;
  if (option.category === "public") return 1;
  if (option.category === "private") return 2;
  return 3;
}

export function ExploreFDPage() {
  const router = useRouter();
  const amountMin = 10000;
  const amountMax = 1000000;
  const { language } = useLanguage();
  const text = pickLocalized(language, {
    english: {
      title: "Explore FD Options",
      description: "Browse fixed deposit cards using filters, sorting, and quick actions.",
      aiShortcutTitle: "Not sure what to choose?",
      aiShortcutDescription: "Use filters or let AI guide you in 1 minute.",
      askAiRecommendation: "Ask AI for recommendation",
      amount: "Amount",
      duration: "Duration",
      anyDuration: "Any duration",
      riskLevel: "Risk Level",
      bankType: "Bank Type",
      sortBy: "Sort By",
      all: "All",
      safe: "Safe",
      balanced: "Balanced",
      highReturn: "High Return",
      government: "Government",
      public: "Public",
      private: "Private",
      smallFinance: "Small Finance",
      highestReturn: "Highest return",
      safest: "Safest",
      shortTerm: "Short-term",
      longTerm: "Long-term",
      bank: "bank",
      tenure: "Tenure",
      months: "months",
      minAmount: "Min amount",
      maturityEstimate: "Maturity estimate",
      protectedLabel: "DICGC Protected",
      openFd: "Open FD",
      compare: "Compare",
      noCards: "No FD cards match your filters. Try increasing amount or changing bank type.",
      closeDetails: "Close details",
      atRate: "at",
      bankTypeLabel: "Bank type",
      minimumAmount: "Minimum amount",
      projectedMaturity: "Projected maturity on",
      compareBank: "Compare Bank",
      close: "Close",
      quickInsights: "Easy Summary",
      eligibleCards: "Eligible cards",
      avgRate: "Avg rate",
      bestRate: "Best rate",
      rateByTenure: "Average return by tenure",
      projectionByTenure: "Projection by tenure",
      maturityView: "Maturity",
      interestView: "Interest",
      basedOnAmount: "Based on your amount",
      noVisualData: "No visual data for current filters.",
    },
    hindi: {
      title: "FD विकल्प खोजें",
      description: "फिल्टर, सॉर्ट और क्विक एक्शन से FD कार्ड देखें।",
      aiShortcutTitle: "समझ नहीं आ रहा क्या चुनें?",
      aiShortcutDescription: "फिल्टर इस्तेमाल करें या AI से 1 मिनट में गाइड लें।",
      askAiRecommendation: "AI से सुझाव लें",
      amount: "राशि",
      duration: "अवधि",
      anyDuration: "कोई भी अवधि",
      riskLevel: "जोखिम स्तर",
      bankType: "बैंक प्रकार",
      sortBy: "क्रमबद्ध करें",
      all: "सभी",
      safe: "सुरक्षित",
      balanced: "संतुलित",
      highReturn: "उच्च रिटर्न",
      government: "सरकारी",
      public: "पब्लिक",
      private: "प्राइवेट",
      smallFinance: "स्मॉल फाइनेंस",
      highestReturn: "सबसे ज्यादा रिटर्न",
      safest: "सबसे सुरक्षित",
      shortTerm: "शॉर्ट टर्म",
      longTerm: "लॉन्ग टर्म",
      bank: "बैंक",
      tenure: "अवधि",
      months: "महीने",
      minAmount: "न्यूनतम राशि",
      maturityEstimate: "मैच्योरिटी अनुमान",
      protectedLabel: "DICGC संरक्षित",
      openFd: "FD खोलें",
      compare: "तुलना",
      noCards: "इन फिल्टर्स पर कोई FD कार्ड नहीं मिला। राशि बढ़ाएं या बैंक प्रकार बदलें।",
      closeDetails: "विवरण बंद करें",
      atRate: "पर",
      bankTypeLabel: "बैंक प्रकार",
      minimumAmount: "न्यूनतम राशि",
      projectedMaturity: "इस राशि पर अनुमानित मैच्योरिटी",
      compareBank: "बैंक तुलना",
      close: "बंद करें",
      quickInsights: "आसान सारांश",
      eligibleCards: "उपलब्ध कार्ड",
      avgRate: "औसत रेट",
      bestRate: "सर्वश्रेष्ठ रेट",
      rateByTenure: "अवधि के अनुसार औसत रिटर्न",
      projectionByTenure: "अवधि के अनुसार अनुमान",
      maturityView: "मैच्योरिटी",
      interestView: "ब्याज",
      basedOnAmount: "आपकी राशि के आधार पर",
      noVisualData: "इन फिल्टर्स के लिए विजुअल डेटा उपलब्ध नहीं है।",
    },
    hinglish: {
      title: "Explore FD Options",
      description: "Filters, sorting aur quick actions ke saath FD cards browse karo.",
      aiShortcutTitle: "Samajh nahi aa raha kya choose karein?",
      aiShortcutDescription: "Filters use karo ya AI se 1 minute me guidance lo.",
      askAiRecommendation: "AI se recommendation lo",
      amount: "Amount",
      duration: "Duration",
      anyDuration: "Any duration",
      riskLevel: "Risk Level",
      bankType: "Bank Type",
      sortBy: "Sort By",
      all: "All",
      safe: "Safe",
      balanced: "Balanced",
      highReturn: "High Return",
      government: "Government",
      public: "Public",
      private: "Private",
      smallFinance: "Small Finance",
      highestReturn: "Highest return",
      safest: "Safest",
      shortTerm: "Short-term",
      longTerm: "Long-term",
      bank: "bank",
      tenure: "Tenure",
      months: "months",
      minAmount: "Min amount",
      maturityEstimate: "Maturity estimate",
      protectedLabel: "DICGC Protected",
      openFd: "Open FD",
      compare: "Compare",
      noCards: "Aapke filters ke liye koi FD card nahi mila. Amount badhao ya bank type badlo.",
      closeDetails: "Details close",
      atRate: "at",
      bankTypeLabel: "Bank type",
      minimumAmount: "Minimum amount",
      projectedMaturity: "Projected maturity on",
      compareBank: "Compare Bank",
      close: "Close",
      quickInsights: "Easy Summary",
      eligibleCards: "Eligible cards",
      avgRate: "Avg rate",
      bestRate: "Best rate",
      rateByTenure: "Average return by tenure",
      projectionByTenure: "Projection by tenure",
      maturityView: "Maturity",
      interestView: "Interest",
      basedOnAmount: "Based on your amount",
      noVisualData: "Current filters ke liye visual data available nahi hai.",
    },
    marathi: {
      title: "FD पर्याय शोधा",
      description: "फिल्टर, सॉर्टिंग आणि क्विक अ‍ॅक्शनने FD कार्ड्स पाहा.",
      aiShortcutTitle: "काय निवडायचे ते ठरत नाहीये?",
      aiShortcutDescription: "फिल्टर्स वापरा किंवा AI कडून 1 मिनिटात मार्गदर्शन घ्या.",
      askAiRecommendation: "AI शिफारस घ्या",
      amount: "रक्कम",
      duration: "कालावधी",
      anyDuration: "कोणताही कालावधी",
      riskLevel: "जोखीम पातळी",
      bankType: "बँक प्रकार",
      sortBy: "क्रम लावा",
      all: "सर्व",
      safe: "सुरक्षित",
      balanced: "समतोल",
      highReturn: "उच्च परतावा",
      government: "सरकारी",
      public: "पब्लिक",
      private: "प्रायव्हेट",
      smallFinance: "स्मॉल फायनान्स",
      highestReturn: "सर्वाधिक परतावा",
      safest: "सर्वात सुरक्षित",
      shortTerm: "अल्प कालावधी",
      longTerm: "दीर्घ कालावधी",
      bank: "बँक",
      tenure: "कालावधी",
      months: "महिने",
      minAmount: "किमान रक्कम",
      maturityEstimate: "मॅच्युरिटी अंदाज",
      protectedLabel: "DICGC संरक्षित",
      openFd: "FD उघडा",
      compare: "तुलना",
      noCards: "तुमच्या फिल्टर्ससाठी कोणतेही FD कार्ड मिळाले नाही. रक्कम वाढवा किंवा बँक प्रकार बदला.",
      closeDetails: "तपशील बंद करा",
      atRate: "दर",
      bankTypeLabel: "बँक प्रकार",
      minimumAmount: "किमान रक्कम",
      projectedMaturity: "या रकमेवरील अंदाजित मॅच्युरिटी",
      compareBank: "बँक तुलना",
      close: "बंद",
      quickInsights: "क्विक इनसाइट्स",
      eligibleCards: "पात्र कार्ड्स",
      avgRate: "सरासरी दर",
      bestRate: "सर्वोत्तम दर",
      rateByTenure: "कालावधीनुसार दर",
      projectionByTenure: "कालावधीनुसार अंदाज",
      maturityView: "मॅच्युरिटी",
      interestView: "व्याज",
      basedOnAmount: "रकमेच्या आधारे",
      noVisualData: "सध्याच्या फिल्टर्ससाठी व्हिज्युअल डेटा उपलब्ध नाही.",
    },
    gujarati: {
      title: "FD વિકલ્પો શોધો",
      description: "ફિલ્ટર, સોર્ટિંગ અને ક્વિક એક્શન સાથે FD કાર્ડ્સ બ્રાઉઝ કરો.",
      aiShortcutTitle: "શું પસંદ કરવું તે સમજાતું નથી?",
      aiShortcutDescription: "ફિલ્ટર્સ ઉપયોગ કરો અથવા AI પાસેથી 1 મિનિટમાં માર્ગદર્શન લો.",
      askAiRecommendation: "AI ભલામણ મેળવો",
      amount: "રકમ",
      duration: "અવધિ",
      anyDuration: "કોઈપણ અવધિ",
      riskLevel: "જોખમ સ્તર",
      bankType: "બેંક પ્રકાર",
      sortBy: "ક્રમ પ્રમાણે",
      all: "બધું",
      safe: "સુરક્ષિત",
      balanced: "સંતુલિત",
      highReturn: "ઊંચો રિટર્ન",
      government: "સરકારી",
      public: "પબ્લિક",
      private: "પ્રાઇવેટ",
      smallFinance: "સ્મોલ ફાઇનાન્સ",
      highestReturn: "સૌથી ઊંચો રિટર્ન",
      safest: "સૌથી સુરક્ષિત",
      shortTerm: "ટૂંકા ગાળાનો",
      longTerm: "લાંબા ગાળાનો",
      bank: "બેંક",
      tenure: "અવધિ",
      months: "મહિના",
      minAmount: "ન્યૂનતમ રકમ",
      maturityEstimate: "મેચ્યોરિટી અંદાજ",
      protectedLabel: "DICGC સુરક્ષિત",
      openFd: "FD ખોલો",
      compare: "તુલના",
      noCards: "આ ફિલ્ટર માટે કોઈ FD કાર્ડ મળ્યું નથી. રકમ વધારો અથવા બેંક પ્રકાર બદલો.",
      closeDetails: "વિગતો બંધ કરો",
      atRate: "દરે",
      bankTypeLabel: "બેંક પ્રકાર",
      minimumAmount: "ન્યૂનતમ રકમ",
      projectedMaturity: "આ રકમ પર અનુમાનિત મેચ્યોરિટી",
      compareBank: "બેંક તુલના",
      close: "બંધ",
      quickInsights: "ઝડપી ઇન્સાઇટ્સ",
      eligibleCards: "પાત્ર કાર્ડ્સ",
      avgRate: "સરેરાશ દર",
      bestRate: "શ્રેષ્ઠ દર",
      rateByTenure: "અવધિ પ્રમાણે દર",
      projectionByTenure: "અવધિ પ્રમાણે અંદાજ",
      maturityView: "મેચ્યોરિટી",
      interestView: "વ્યાજ",
      basedOnAmount: "રકમના આધારે",
      noVisualData: "હાલના ફિલ્ટર્સ માટે વિઝ્યુઅલ ડેટા ઉપલબ્ધ નથી.",
    },
    tamil: {
      title: "FD விருப்பங்களை ஆராயுங்கள்",
      description: "வடிகட்டி, வரிசைப்படுத்தல் மற்றும் விரைவு செயல்களுடன் FD கார்டுகளை பார்க்கவும்.",
      aiShortcutTitle: "எதை தேர்வு செய்வது தெரியவில்லையா?",
      aiShortcutDescription: "வடிகட்டிகளை பயன்படுத்துங்கள் அல்லது AI வழிகாட்டலை 1 நிமிடத்தில் பெறுங்கள்.",
      askAiRecommendation: "AI பரிந்துரை பெறுங்கள்",
      amount: "தொகை",
      duration: "காலம்",
      anyDuration: "எந்த காலமும்",
      riskLevel: "ஆபத்து நிலை",
      bankType: "வங்கி வகை",
      sortBy: "வரிசைப்படுத்து",
      all: "அனைத்தும்",
      safe: "பாதுகாப்பானது",
      balanced: "சமநிலை",
      highReturn: "அதிக வருமானம்",
      government: "அரசு",
      public: "பொது",
      private: "தனியார்",
      smallFinance: "சிறு நிதி",
      highestReturn: "அதிகபட்ச வருமானம்",
      safest: "மிகவும் பாதுகாப்பானது",
      shortTerm: "குறுகிய கால",
      longTerm: "நீண்ட கால",
      bank: "வங்கி",
      tenure: "கால அவதி",
      months: "மாதங்கள்",
      minAmount: "குறைந்தபட்ச தொகை",
      maturityEstimate: "முதிர்வு மதிப்பீடு",
      protectedLabel: "DICGC பாதுகாப்பு",
      openFd: "FD திறக்கவும்",
      compare: "ஒப்பிடு",
      noCards: "உங்கள் வடிகட்டலுக்கு ஏற்ற FD கார்டுகள் இல்லை. தொகையை அதிகரிக்கவும் அல்லது வங்கி வகையை மாற்றவும்.",
      closeDetails: "விவரங்கள் மூடு",
      atRate: "விகிதத்தில்",
      bankTypeLabel: "வங்கி வகை",
      minimumAmount: "குறைந்தபட்ச தொகை",
      projectedMaturity: "இந்த தொகைக்கான மதிப்பிடப்பட்ட முதிர்வு",
      compareBank: "வங்கி ஒப்பீடு",
      close: "மூடு",
      quickInsights: "விரைவு குறிப்புகள்",
      eligibleCards: "தகுதி கார்டுகள்",
      avgRate: "சராசரி விகிதம்",
      bestRate: "சிறந்த விகிதம்",
      rateByTenure: "காலஅவதியின்படி விகிதம்",
      projectionByTenure: "காலஅவதியின்படி மதிப்பீடு",
      maturityView: "முதிர்வு",
      interestView: "வட்டி",
      basedOnAmount: "தொகையை அடிப்படையாகக் கொண்டு",
      noVisualData: "தற்போதைய வடிகட்டலுக்கு காட்சி தரவு இல்லை.",
    },
    bhojpuri: {
      title: "FD विकल्प खोजीं",
      description: "फिल्टर, सॉर्टिंग आ क्विक एक्शन से FD कार्ड देखीं।",
      aiShortcutTitle: "का चुनीं, ई समझ ना आवत बा?",
      aiShortcutDescription: "फिल्टर इस्तेमाल करीं या AI से 1 मिनट में मार्गदर्शन लीं।",
      askAiRecommendation: "AI से सुझाव लीं",
      amount: "राशि",
      duration: "अवधि",
      anyDuration: "कवनो अवधि",
      riskLevel: "जोखिम स्तर",
      bankType: "बैंक प्रकार",
      sortBy: "छांटें",
      all: "सब",
      safe: "सुरक्षित",
      balanced: "संतुलित",
      highReturn: "जादा रिटर्न",
      government: "सरकारी",
      public: "पब्लिक",
      private: "प्राइवेट",
      smallFinance: "स्मॉल फाइनेंस",
      highestReturn: "सबसे जादा रिटर्न",
      safest: "सबसे सुरक्षित",
      shortTerm: "छोट अवधि",
      longTerm: "लमहर अवधि",
      bank: "बैंक",
      tenure: "अवधि",
      months: "महीना",
      minAmount: "न्यूनतम राशि",
      maturityEstimate: "मैच्योरिटी अनुमान",
      protectedLabel: "DICGC सुरक्षित",
      openFd: "FD खोलीं",
      compare: "तुलना करीं",
      noCards: "एह फिल्टर पर कवनो FD कार्ड नइखे मिलल। राशि बढ़ाईं या बैंक प्रकार बदलीं।",
      closeDetails: "विवरण बंद करीं",
      atRate: "दर पर",
      bankTypeLabel: "बैंक प्रकार",
      minimumAmount: "न्यूनतम राशि",
      projectedMaturity: "एह राशि पर अनुमानित मैच्योरिटी",
      compareBank: "बैंक तुलना",
      close: "बंद करीं",
      quickInsights: "क्विक इनसाइट्स",
      eligibleCards: "पात्र कार्ड",
      avgRate: "औसत दर",
      bestRate: "सबसे बढ़िया दर",
      rateByTenure: "अवधि अनुसार दर",
      projectionByTenure: "अवधि अनुसार अनुमान",
      maturityView: "मैच्योरिटी",
      interestView: "ब्याज",
      basedOnAmount: "राशि के आधार पर",
      noVisualData: "मौजूदा फिल्टर खातिर विजुअल डेटा उपलब्ध नइखे।",
    },
  });

  const categoryLabel = (category: FDOption["category"]): string => {
    if (category === "small-finance") return text.smallFinance;
    if (category === "government") return text.government;
    if (category === "private") return text.private;
    return text.public;
  };
  const [amount, setAmount] = useState(100000);
  const [tenureFilter, setTenureFilter] = useState<(typeof TENURE_FILTERS)[number]>("12");
  const [riskLevel, setRiskLevel] = useState<RiskLevel>("all");
  const [bankType, setBankType] = useState<BankType>("all");
  const [sortBy, setSortBy] = useState<SortType>("highest-return");
  const [selectedCard, setSelectedCard] = useState<FDOption | null>(null);
  const amountProgress = ((amount - amountMin) / (amountMax - amountMin)) * 100;
  const filterSelectClassName =
    "fd-filter-select h-8 w-full rounded-md border border-input bg-input/20 px-2 text-xs text-foreground";
  const filterOptionClassName = "bg-popover text-popover-foreground";

  const insightOptions = useMemo(() => {
    let options = FD_DATA.filter((option) => amount >= option.minAmount);

    if (bankType !== "all") {
      options = options.filter((option) => option.category === bankType);
    }

    if (riskLevel !== "all") {
      options = options.filter((option) => getRiskLevel(option) === riskLevel);
    }

    return options;
  }, [amount, bankType, riskLevel]);

  const tenureInsights = useMemo(() => {
    const groupedByTenure = new Map<number, FDOption[]>();

    for (const option of insightOptions) {
      const bucket = groupedByTenure.get(option.tenure) ?? [];
      bucket.push(option);
      groupedByTenure.set(option.tenure, bucket);
    }

    return Array.from(groupedByTenure.entries())
      .sort(([a], [b]) => a - b)
      .map(([tenure, options]) => {
        const avgRate = options.reduce((sum, option) => sum + option.rate, 0) / options.length;
        const maturity = calculateFD(amount, avgRate, tenure, "quarterly").maturityAmount;

        return {
          tenure,
          avgRate,
          maturity,
          interest: maturity - amount,
        };
      });
  }, [insightOptions, amount]);

  const bestRate = useMemo(() => {
    if (tenureInsights.length === 0) {
      return 0;
    }

    return Math.max(...tenureInsights.map((item) => item.avgRate));
  }, [tenureInsights]);

  const avgRate = useMemo(() => {
    if (tenureInsights.length === 0) {
      return 0;
    }

    return (
      tenureInsights.reduce((sum, item) => sum + item.avgRate, 0) / tenureInsights.length
    );
  }, [tenureInsights]);

  const maxRate = Math.max(bestRate, 1);

  const filteredOptions = useMemo(() => {
    const requiredTenure = tenureFilter === "any" ? null : Number(tenureFilter);

    let options = FD_DATA.filter((option) => amount >= option.minAmount);

    if (requiredTenure) {
      options = options.filter((option) => option.tenure === requiredTenure);
    }

    if (bankType !== "all") {
      options = options.filter((option) => option.category === bankType);
    }

    if (riskLevel !== "all") {
      options = options.filter((option) => getRiskLevel(option) === riskLevel);
    }

    const sorted = [...options];

    if (sortBy === "highest-return") {
      sorted.sort((a, b) => b.rate - a.rate);
    } else if (sortBy === "safest") {
      sorted.sort((a, b) => getSafetyScore(a) - getSafetyScore(b) || b.rate - a.rate);
    } else if (sortBy === "short-term") {
      sorted.sort((a, b) => a.tenure - b.tenure || b.rate - a.rate);
    } else {
      sorted.sort((a, b) => b.tenure - a.tenure || b.rate - a.rate);
    }

    return sorted;
  }, [amount, tenureFilter, riskLevel, bankType, sortBy]);

  const aiRecommendationPrompt = pickLocalized(language, {
    english: "Suggest the best FD option for me",
    hindi: "मेरे लिए सबसे अच्छा FD विकल्प सुझाओ",
    hinglish: "Mere liye best FD option suggest karo",
    marathi: "माझ्यासाठी सर्वोत्तम FD पर्याय सुचवा",
    gujarati: "મારા માટે શ્રેષ્ઠ FD વિકલ્પ સૂચવો",
    tamil: "எனக்கான சிறந்த FD விருப்பத்தை பரிந்துரையுங்கள்",
    bhojpuri: "हमरा खातिर सबसे बढ़िया FD विकल्प सुझाईं",
  });

  return (
    <div className="h-full min-h-0 overflow-y-auto bg-background">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 pb-6 pt-8 sm:px-6">
        <Card className="border border-primary/30 bg-primary/5">
          <CardContent className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">{text.aiShortcutTitle}</p>
              <p className="text-xs text-muted-foreground">{text.aiShortcutDescription}</p>
            </div>
            <Button
              className="shrink-0"
              onClick={() =>
                openChatWithMessage(
                  router,
                  aiRecommendationPrompt
                )
              }
            >
              {text.askAiRecommendation}
            </Button>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RiFilter3Line className="size-4 text-primary" />
              {text.title}
            </CardTitle>
            <CardDescription>
              {text.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
            <div>
              <p className="mb-1 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">
                {text.amount}: Rs {amount.toLocaleString("en-IN")}
              </p>
              <input
                type="range"
                min={amountMin}
                max={amountMax}
                step={5000}
                value={amount}
                onChange={(event) => setAmount(Number(event.target.value))}
                className="fd-range-slider w-full"
                style={{ "--range-progress": `${amountProgress}%` } as CSSProperties}
              />
            </div>

            <div>
              <p className="mb-1 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">
                {text.duration}
              </p>
              <select
                value={tenureFilter}
                onChange={(event) =>
                  setTenureFilter(event.target.value as (typeof TENURE_FILTERS)[number])
                }
                className={filterSelectClassName}
              >
                {TENURE_FILTERS.map((months) => (
                  <option key={months} value={months} className={filterOptionClassName}>
                    {months === "any" ? text.anyDuration : `${months} ${text.months}`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <p className="mb-1 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">
                {text.riskLevel}
              </p>
              <select
                value={riskLevel}
                onChange={(event) => setRiskLevel(event.target.value as RiskLevel)}
                className={filterSelectClassName}
              >
                <option value="all" className={filterOptionClassName}>{text.all}</option>
                <option value="safe" className={filterOptionClassName}>{text.safe}</option>
                <option value="balanced" className={filterOptionClassName}>{text.balanced}</option>
                <option value="high-return" className={filterOptionClassName}>{text.highReturn}</option>
              </select>
            </div>

            <div>
              <p className="mb-1 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">
                {text.bankType}
              </p>
              <select
                value={bankType}
                onChange={(event) => setBankType(event.target.value as BankType)}
                className={filterSelectClassName}
              >
                <option value="all" className={filterOptionClassName}>{text.all}</option>
                <option value="government" className={filterOptionClassName}>{text.government}</option>
                <option value="public" className={filterOptionClassName}>{text.public}</option>
                <option value="private" className={filterOptionClassName}>{text.private}</option>
                <option value="small-finance" className={filterOptionClassName}>{text.smallFinance}</option>
              </select>
            </div>

            <div>
              <p className="mb-1 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">
                {text.sortBy}
              </p>
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as SortType)}
                className={filterSelectClassName}
              >
                <option value="highest-return" className={filterOptionClassName}>{text.highestReturn}</option>
                <option value="safest" className={filterOptionClassName}>{text.safest}</option>
                <option value="short-term" className={filterOptionClassName}>{text.shortTerm}</option>
                <option value="long-term" className={filterOptionClassName}>{text.longTerm}</option>
              </select>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{text.quickInsights}</CardTitle>
            <CardDescription>
              {text.basedOnAmount}: Rs {amount.toLocaleString("en-IN")}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <div className="rounded-md border border-border bg-background/70 px-3 py-2">
                <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">
                  {text.eligibleCards}
                </p>
                <p className="mt-1 text-base font-semibold text-foreground">{filteredOptions.length}</p>
              </div>
              <div className="rounded-md border border-border bg-background/70 px-3 py-2">
                <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">
                  {text.avgRate}
                </p>
                <p className="mt-1 text-base font-semibold text-foreground">{avgRate.toFixed(2)}%</p>
              </div>
              <div className="rounded-md border border-border bg-background/70 px-3 py-2">
                <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">
                  {text.bestRate}
                </p>
                <p className="mt-1 text-base font-semibold text-foreground">{bestRate.toFixed(2)}%</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">
                {text.rateByTenure}
              </p>
              {tenureInsights.length === 0 ? (
                <p className="text-xs text-muted-foreground">{text.noVisualData}</p>
              ) : (
                <div className="space-y-2">
                  {tenureInsights.map((item) => (
                    <div key={`rate-${item.tenure}`} className="space-y-1">
                      <div className="flex items-center justify-between text-[0.6875rem]">
                        <span className="text-muted-foreground">{item.tenure} {text.months}</span>
                        <span className="font-medium text-foreground">{item.avgRate.toFixed(2)}%</span>
                      </div>
                      <Progress
                        value={(item.avgRate / maxRate) * 100}
                        className="h-1.5"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filteredOptions.map((option) => {
            const projection = calculateFD(amount, option.rate, option.tenure, "quarterly");

            return (
              <Card
                key={`${option.bank}-${option.tenure}-${option.rate}`}
                className="cursor-pointer border border-border bg-card/70"
                onClick={() => setSelectedCard(option)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-sm">{option.bank}</CardTitle>
                      <CardDescription>{categoryLabel(option.category)} {text.bank}</CardDescription>
                    </div>
                    <Badge>{option.rate}%</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-1 text-[0.75rem] text-muted-foreground">
                  <p>{text.tenure}: {option.tenure} {text.months}</p>
                  <p>{text.minAmount}: Rs {option.minAmount.toLocaleString("en-IN")}</p>
                  <p>{text.maturityEstimate}: Rs {projection.maturityAmount.toLocaleString("en-IN")}</p>
                  <div className="pt-1">
                    <Badge variant="outline" className="gap-1">
                      <RiShieldCheckLine className="size-3" />
                      {text.protectedLabel}
                    </Badge>
                  </div>
                </CardContent>
                <CardFooter className="gap-2 pt-0">
                  <Button
                    variant="outline"
                    onClick={(event) => {
                      event.stopPropagation();
                      openChatWithMessage(
                        router,
                        language === "hi"
                          ? `मुझे ${option.bank} में Rs ${amount} के साथ ${option.tenure} महीनों के लिए FD खोलनी है`
                          : language === "mr"
                            ? `मला ${option.bank} मध्ये Rs ${amount} रक्कमेसह ${option.tenure} महिन्यांसाठी FD उघडायची आहे`
                            : language === "gu"
                              ? `મારે ${option.bank}માં Rs ${amount} સાથે ${option.tenure} મહિના માટે FD ખોલવી છે`
                              : language === "ta"
                                ? `${option.bank} வங்கியில் Rs ${amount} தொகையுடன் ${option.tenure} மாதங்களுக்கு FD திறக்க வேண்டும்`
                                : language === "bho"
                                  ? `हमके ${option.bank} में Rs ${amount} से ${option.tenure} महीना खातिर FD खोलल बा`
                          : language === "hinglish"
                            ? `Mujhe ${option.bank} me Rs ${amount} amount ke saath ${option.tenure} months ke liye FD open karni hai`
                            : `I want to open FD in ${option.bank} for ${option.tenure} months with amount Rs ${amount}`
                      );
                    }}
                  >
                    {text.openFd}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={(event) => {
                      event.stopPropagation();
                      router.push(`/compare?banks=${encodeURIComponent(option.bank)}`);
                    }}
                  >
                    {text.compare}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {filteredOptions.length === 0 && (
          <Card className="border border-border bg-card/70">
            <CardContent className="pt-4 text-xs text-muted-foreground">
              {text.noCards}
            </CardContent>
          </Card>
        )}
      </div>

      {selectedCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-lg rounded-lg border border-border bg-card p-4">
            <div className="mb-3 flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">{selectedCard.bank}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedCard.tenure} {text.months} {text.atRate} {selectedCard.rate}% p.a.
                </p>
              </div>
              <button
                onClick={() => setSelectedCard(null)}
                className="rounded-md border border-border p-1 text-muted-foreground hover:text-foreground"
                aria-label={text.closeDetails}
              >
                <RiCloseLine className="size-4" />
              </button>
            </div>

            <div className="space-y-1 text-xs text-muted-foreground">
              <p>{text.bankTypeLabel}: {categoryLabel(selectedCard.category)}</p>
              <p>{text.minimumAmount}: Rs {selectedCard.minAmount.toLocaleString("en-IN")}</p>
              <p>
                {text.projectedMaturity} Rs {amount.toLocaleString("en-IN")}: Rs {calculateFD(amount, selectedCard.rate, selectedCard.tenure).maturityAmount.toLocaleString("en-IN")}
              </p>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                onClick={() =>
                  openChatWithMessage(
                    router,
                    language === "hi"
                      ? `मुझे ${selectedCard.bank} में Rs ${amount} के साथ ${selectedCard.tenure} महीनों के लिए FD खोलनी है`
                      : language === "mr"
                        ? `मला ${selectedCard.bank} मध्ये Rs ${amount} रक्कमेसह ${selectedCard.tenure} महिन्यांसाठी FD उघडायची आहे`
                        : language === "gu"
                          ? `મારે ${selectedCard.bank}માં Rs ${amount} સાથે ${selectedCard.tenure} મહિના માટે FD ખોલવી છે`
                          : language === "ta"
                            ? `${selectedCard.bank} வங்கியில் Rs ${amount} தொகையுடன் ${selectedCard.tenure} மாதங்களுக்கு FD திறக்க வேண்டும்`
                            : language === "bho"
                              ? `हमके ${selectedCard.bank} में Rs ${amount} से ${selectedCard.tenure} महीना खातिर FD खोलल बा`
                      : language === "hinglish"
                        ? `Mujhe ${selectedCard.bank} me Rs ${amount} amount ke saath ${selectedCard.tenure} months ke liye FD open karni hai`
                        : `I want to open FD in ${selectedCard.bank} for ${selectedCard.tenure} months with amount Rs ${amount}`
                  )
                }
              >
                {text.openFd}
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  router.push(`/compare?banks=${encodeURIComponent(selectedCard.bank)}`)
                }
              >
                {text.compareBank}
              </Button>
              <Button variant="outline" onClick={() => setSelectedCard(null)} className="gap-1">
                {text.close}
                <RiArrowRightLine className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
