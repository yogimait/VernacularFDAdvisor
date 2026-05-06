"use client";

import { useState, useMemo } from "react";
import {
  RiShieldCheckLine,
  RiStarLine,
  RiTimeLine,
  RiPercentLine,
  RiBankLine,
  RiArrowRightLine,
  RiCalculatorLine,
  RiSparklingLine,
} from "@remixicon/react";
import { useLanguage } from "@/hooks/use-language";
import { pickLocalized } from "@/lib/i18n";
import { findBestFDs } from "@/lib/fd-data";

// ─── Types ───────────────────────────────────────────────────────

interface SmartInsightsSidebarProps {
  onCalculatorOpen: () => void;
  onSuggestionClick?: (message: string) => void;
}

const TENURE_OPTIONS = [
  { label: "6 Months", months: 6 },
  { label: "12 Months", months: 12 },
  { label: "24 Months", months: 24 },
  { label: "36 Months", months: 36 },
] as const;

// ─── Component ───────────────────────────────────────────────────

export function SmartInsightsSidebar({
  onCalculatorOpen,
  onSuggestionClick,
}: SmartInsightsSidebarProps) {
  const { language } = useLanguage();
  const [calcAmount, setCalcAmount] = useState(50000);
  const [calcTenure, setCalcTenure] = useState(12);

  const text = pickLocalized(language, {
    english: {
      smartInsights: "Smart Insights",
      bestOption: "Best Option for You",
      basedOnQuery: "Based on your query",
      safeChoice: "Safe Choice",
      viewDetails: "View Details",
      quickCalculator: "Quick Calculator",
      amount: "Amount",
      tenure: "Tenure",
      estMaturity: "Est. Maturity",
      openCalculator: "Open Calculator",
      whyTitle: "Why this FD?",
      benefitTrust: "Strong brand trust",
      benefitTrustDesc: "High safety perception",
      benefitRate: "Competitive interest rates",
      benefitTenure: "Flexible tenure options",
      benefitTenureDesc: "From 7 days to 10 years",
      benefitOnline: "Easy online & offline process",
      benefitOnlineDesc: "Hassle-free experience",
    },
    hindi: {
      smartInsights: "स्मार्ट इनसाइट्स",
      bestOption: "आपके लिए बेहतरीन विकल्प",
      basedOnQuery: "आपकी खोज के आधार पर",
      safeChoice: "सुरक्षित विकल्प",
      viewDetails: "विवरण देखें",
      quickCalculator: "क्विक कैलकुलेटर",
      amount: "राशि",
      tenure: "अवधि",
      estMaturity: "अनु. परिपक्वता",
      openCalculator: "कैलकुलेटर खोलें",
      whyTitle: "यह FD क्यों?",
      benefitTrust: "मजबूत ब्रांड विश्वास",
      benefitTrustDesc: "उच्च सुरक्षा धारणा",
      benefitRate: "प्रतिस्पर्धी ब्याज दरें",
      benefitTenure: "लचीले अवधि विकल्प",
      benefitTenureDesc: "7 दिन से 10 वर्ष तक",
      benefitOnline: "आसान ऑनलाइन और ऑफलाइन प्रक्रिया",
      benefitOnlineDesc: "परेशानी मुक्त अनुभव",
    },
    hinglish: {
      smartInsights: "Smart Insights",
      bestOption: "Aapke liye best option",
      basedOnQuery: "Aapki query ke basis pe",
      safeChoice: "Safe Choice",
      viewDetails: "Details dekhein",
      quickCalculator: "Quick Calculator",
      amount: "Amount",
      tenure: "Tenure",
      estMaturity: "Est. Maturity",
      openCalculator: "Calculator Open",
      whyTitle: "Ye FD kyun?",
      benefitTrust: "Strong brand trust",
      benefitTrustDesc: "High safety perception",
      benefitRate: "Competitive interest rates",
      benefitTenure: "Flexible tenure options",
      benefitTenureDesc: "7 din se 10 saal tak",
      benefitOnline: "Easy online & offline process",
      benefitOnlineDesc: "Hassle-free experience",
    },
    marathi: {
      smartInsights: "स्मार्ट इनसाइट्स",
      bestOption: "तुमच्यासाठी सर्वोत्तम पर्याय",
      basedOnQuery: "तुमच्या शोधावर आधारित",
      safeChoice: "सुरक्षित पर्याय",
      viewDetails: "तपशील पहा",
      quickCalculator: "क्विक कॅल्क्युलेटर",
      amount: "रक्कम",
      tenure: "कालावधी",
      estMaturity: "अंदाजे परिपक्वता",
      openCalculator: "कॅल्क्युलेटर उघडा",
      whyTitle: "ही FD का?",
      benefitTrust: "मजबूत ब्रँड विश्वास",
      benefitTrustDesc: "उच्च सुरक्षा धारणा",
      benefitRate: "स्पर्धात्मक व्याजदर",
      benefitTenure: "लवचिक कालावधी पर्याय",
      benefitTenureDesc: "7 दिवसांपासून 10 वर्षांपर्यंत",
      benefitOnline: "सोपी ऑनलाइन व ऑफलाइन प्रक्रिया",
      benefitOnlineDesc: "त्रासमुक्त अनुभव",
    },
    gujarati: {
      smartInsights: "સ્માર્ટ ઇનસાઇટ્સ",
      bestOption: "તમારા માટે શ્રેષ્ઠ વિકલ્પ",
      basedOnQuery: "તમારી શોધ પર આધારિત",
      safeChoice: "સલામત પસંદગી",
      viewDetails: "વિગતો જુઓ",
      quickCalculator: "ક્વિક કેલ્ક્યુલેટર",
      amount: "રકમ",
      tenure: "સમયગાળો",
      estMaturity: "અંદાજિત પરિપક્વતા",
      openCalculator: "કેલ્ક્યુલેટર ખોલો",
      whyTitle: "આ FD કેમ?",
      benefitTrust: "મજબૂત બ્રાન્ડ વિશ્વાસ",
      benefitTrustDesc: "ઉચ્ચ સલામતી ધારણા",
      benefitRate: "સ્પર્ધાત્મક વ્યાજ દર",
      benefitTenure: "લવચીક સમયગાળો",
      benefitTenureDesc: "7 દિવસથી 10 વર્ષ",
      benefitOnline: "સરળ ઓનલાઇન અને ઓફલાઇન પ્રક્રિયા",
      benefitOnlineDesc: "મુશ્કેલી-મુક્ત અનુભવ",
    },
    tamil: {
      smartInsights: "ஸ்மார்ட் நுண்ணறிவுகள்",
      bestOption: "உங்களுக்கான சிறந்த விருப்பம்",
      basedOnQuery: "உங்கள் கேள்வியின் அடிப்படையில்",
      safeChoice: "பாதுகாப்பான தேர்வு",
      viewDetails: "விவரங்களைக் காணவும்",
      quickCalculator: "விரைவு கணிப்பான்",
      amount: "தொகை",
      tenure: "காலம்",
      estMaturity: "மதிப்பிடப்பட்ட முதிர்வு",
      openCalculator: "கணிப்பானைத் திறக்க",
      whyTitle: "ஏன் இந்த FD?",
      benefitTrust: "வலுவான பிராண்ட் நம்பகத்தன்மை",
      benefitTrustDesc: "உயர் பாதுகாப்பு கருத்து",
      benefitRate: "போட்டி வட்டி விகிதங்கள்",
      benefitTenure: "நெகிழ்வான காலம்",
      benefitTenureDesc: "7 நாட்கள் முதல் 10 ஆண்டுகள் வரை",
      benefitOnline: "எளிய ஆன்லைன் & ஆஃப்லைன் செயல்முறை",
      benefitOnlineDesc: "தொந்தரவு இல்லாத அனுபவம்",
    },
    bhojpuri: {
      smartInsights: "स्मार्ट इनसाइट्स",
      bestOption: "रउरा खातिर बेहतरीन विकल्प",
      basedOnQuery: "रउरा खोज के आधार पर",
      safeChoice: "सुरक्षित विकल्प",
      viewDetails: "विवरण देखीं",
      quickCalculator: "क्विक कैलकुलेटर",
      amount: "रकम",
      tenure: "अवधि",
      estMaturity: "अनु. परिपक्वता",
      openCalculator: "कैलकुलेटर खोलीं",
      whyTitle: "ई FD काहे?",
      benefitTrust: "मजबूत ब्रांड भरोसा",
      benefitTrustDesc: "बढ़िया सुरक्षा धारणा",
      benefitRate: "प्रतिस्पर्धी ब्याज दर",
      benefitTenure: "लचीला अवधि विकल्प",
      benefitTenureDesc: "7 दिन से 10 साल तक",
      benefitOnline: "आसान ऑनलाइन आ ऑफलाइन प्रक्रिया",
      benefitOnlineDesc: "परेशानी मुक्त अनुभव",
    },
  });

  // Get the best FD option for the calculator amount/tenure
  const bestFDs = useMemo(() => findBestFDs(calcAmount, calcTenure), [calcAmount, calcTenure]);
  const topFD = bestFDs[0] ?? null;

  // Estimate maturity (simple interest approximation)
  const estimatedMaturity = useMemo(() => {
    if (!topFD) return 0;
    return Math.round(calcAmount * (1 + (topFD.rate / 100) * (calcTenure / 12)));
  }, [topFD, calcAmount, calcTenure]);

  // Rate range string
  const rateRange = useMemo(() => {
    if (bestFDs.length === 0) return "—";
    const rates = bestFDs.map((fd) => fd.rate);
    const min = Math.min(...rates);
    const max = Math.max(...rates);
    return min === max ? `${max}% p.a.` : `${min}% – ${max}% p.a.`;
  }, [bestFDs]);

  // Why-FD benefits
  const benefits = useMemo(
    () => [
      {
        icon: RiShieldCheckLine,
        title: text.benefitTrust,
        description: text.benefitTrustDesc,
      },
      {
        icon: RiPercentLine,
        title: text.benefitRate,
        description: rateRange + " range",
      },
      {
        icon: RiTimeLine,
        title: text.benefitTenure,
        description: text.benefitTenureDesc,
      },
      {
        icon: RiBankLine,
        title: text.benefitOnline,
        description: text.benefitOnlineDesc,
      },
    ],
    [text, rateRange]
  );

  return (
    <aside className="flex h-full flex-col overflow-y-auto border-l border-border bg-card/30 backdrop-blur-sm">
      {/* ─── Header ─── */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <RiSparklingLine className="size-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">{text.smartInsights}</h2>
      </div>

      <div className="flex flex-col gap-4 p-4">
        {/* ─── Best Option Card ─── */}
        {topFD && (
          <div className="rounded-xl border border-border bg-card/60 p-3.5">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[0.6875rem] font-medium text-muted-foreground">
                <RiStarLine className="mr-1 inline size-3 text-amber-500" />
                {text.bestOption}
              </p>
            </div>
            <p className="text-[0.625rem] text-muted-foreground/70">{text.basedOnQuery}</p>

            <div className="mt-3 flex items-center gap-2.5">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <RiBankLine className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {topFD.bank.replace(/ \(.*\)$/, "")} FD
                  </p>
                  <span className="shrink-0 rounded-full bg-chart-1/15 px-2 py-0.5 text-[0.5625rem] font-semibold text-chart-1">
                    {text.safeChoice}
                  </span>
                </div>
                <p className="text-[0.75rem] text-muted-foreground">
                  {rateRange}
                </p>
                <p className="text-[0.6875rem] text-muted-foreground/70">
                  {calcTenure < 12
                    ? `${calcTenure} Month`
                    : `${calcTenure / 12} Year`}{" "}
                  Tenure
                </p>
                <p className="text-[0.625rem] text-muted-foreground/60">
                  DICGC Insured up to ₹5 Lakh
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                onSuggestionClick?.(
                  `Tell me about ${topFD.bank.replace(/ \(.*\)$/, "")} FD rates and benefits`
                )
              }
              className="mt-3 flex w-full items-center justify-between rounded-lg border border-border bg-background/50 px-3 py-2 text-[0.75rem] font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5"
            >
              {text.viewDetails}
              <RiArrowRightLine className="size-3.5 text-muted-foreground" />
            </button>
          </div>
        )}

        {/* ─── Quick Calculator ─── */}
        <div className="rounded-xl border border-border bg-card/60 p-3.5">
          <div className="mb-3 flex items-center gap-2">
            <RiCalculatorLine className="size-3.5 text-primary" />
            <p className="text-[0.8125rem] font-semibold text-foreground">
              {text.quickCalculator}
            </p>
          </div>

          {/* Amount */}
          <div className="mb-2.5">
            <label className="mb-1 block text-[0.625rem] font-medium uppercase tracking-wider text-muted-foreground">
              {text.amount}
            </label>
            <div className="flex items-center gap-1 rounded-lg border border-border bg-background/60 px-3 py-1.5">
              <span className="text-[0.75rem] text-muted-foreground">₹</span>
              <input
                type="text"
                value={calcAmount.toLocaleString("en-IN")}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9]/g, "");
                  const num = parseInt(raw, 10);
                  if (!isNaN(num) && num >= 0) setCalcAmount(num);
                }}
                className="w-full bg-transparent text-right text-sm font-semibold text-foreground outline-none"
              />
            </div>
          </div>

          {/* Tenure */}
          <div className="mb-2.5">
            <label className="mb-1 block text-[0.625rem] font-medium uppercase tracking-wider text-muted-foreground">
              {text.tenure}
            </label>
            <select
              value={calcTenure}
              onChange={(e) => setCalcTenure(Number(e.target.value))}
              className="w-full rounded-lg border border-border bg-background/60 px-3 py-1.5 text-sm text-foreground outline-none"
            >
              {TENURE_OPTIONS.map((opt) => (
                <option key={opt.months} value={opt.months}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Estimated Maturity */}
          <div className="flex items-center justify-between rounded-lg bg-primary/5 px-3 py-2">
            <span className="text-[0.6875rem] text-muted-foreground">{text.estMaturity}</span>
            <span className="text-sm font-bold text-chart-1">
              ₹ {estimatedMaturity.toLocaleString("en-IN")}
            </span>
          </div>

          <button
            type="button"
            onClick={onCalculatorOpen}
            className="mt-2.5 flex w-full items-center justify-between rounded-lg border border-border bg-background/50 px-3 py-2 text-[0.75rem] font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5"
          >
            {text.openCalculator}
            <RiArrowRightLine className="size-3.5 text-muted-foreground" />
          </button>
        </div>

        {/* ─── Why This FD ─── */}
        {topFD && (
          <div className="rounded-xl border border-border bg-card/60 p-3.5">
            <div className="mb-3 flex items-center gap-2">
              <RiSparklingLine className="size-3.5 text-primary" />
              <p className="text-[0.8125rem] font-semibold text-foreground">
                {text.whyTitle}
              </p>
            </div>

            <div className="space-y-3">
              {benefits.map((benefit, i) => (
                <div key={`benefit-${i}`} className="flex items-start gap-2.5">
                  <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <benefit.icon className="size-3" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[0.75rem] font-medium text-foreground">
                      {benefit.title}
                    </p>
                    <p className="text-[0.625rem] text-muted-foreground">
                      {benefit.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
