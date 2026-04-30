"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RiCalculatorLine } from "@remixicon/react";
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
import { calculateFD } from "@/lib/fd-calculator";
import {
  LAST_CALC_ACTIVITY_KEY,
  dispatchSessionSync,
  type LastCalculationActivity,
} from "@/lib/chat-events";
import { openChatWithMessage } from "@/lib/chat-navigation";
import { useLanguage } from "@/hooks/use-language";
import { pickLocalized } from "@/lib/i18n";

const AMOUNT_PRESETS = [10000, 50000, 100000] as const;
const TENURE_PRESETS = [6, 12, 36] as const;

export function CalculatorToolPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const text = pickLocalized(language, {
    english: {
      title: "FD Return Calculator",
      description: "Estimate maturity, total interest, and compare tenures instantly.",
      amount: "Amount (Rs)",
      duration: "Duration (months)",
      interestRate: "Interest Rate (% p.a.)",
      compounding: "Compounding",
      monthly: "Monthly",
      quarterly: "Quarterly",
      yearly: "Yearly",
      result: "Result",
      principal: "Principal",
      maturity: "Maturity",
      interestEarned: "Interest earned",
      discussInChat: "Discuss in Chat",
      months: "months",
      visualCompare: "Visual Compare",
      byTenure: "By tenure",
      byRate: "By rate",
      visualHint: "Longer tenure usually means more final money.",
      maturityEstimate: "Maturity estimate",
      principalVsInterest: "Principal vs interest split",
      effectiveMonthlyGain: "Effective monthly gain",
      smartInsights: "Smart insights",
      trustLine:
        "Rates are indicative based on indexed data and may differ from live bank rates.",
    },
    hindi: {
      title: "FD कैलकुलेटर",
      description: "मैच्योरिटी और ब्याज जल्दी देखने के लिए आसान कैलकुलेटर।",
      amount: "राशि (रु)",
      duration: "अवधि (महीने)",
      interestRate: "ब्याज दर (% प्रति वर्ष)",
      compounding: "कंपाउंडिंग",
      monthly: "मासिक",
      quarterly: "त्रैमासिक",
      yearly: "वार्षिक",
      result: "परिणाम",
      principal: "मूलधन",
      maturity: "मैच्योरिटी",
      interestEarned: "कमाया गया ब्याज",
      discussInChat: "चैट में चर्चा करें",
      months: "महीने",
      visualCompare: "विजुअल तुलना",
      byTenure: "अवधि के अनुसार",
      byRate: "रेट के अनुसार",
      visualHint: "आमतौर पर लंबी अवधि में अंतिम रकम ज्यादा होती है।",
      maturityEstimate: "अनुमानित मैच्योरिटी",
      principalVsInterest: "मूलधन और ब्याज विभाजन",
    },
    hinglish: {
      title: "FD Calculator",
      description: "Simple calculator jisse maturity aur interest jaldi samajh aaye.",
      amount: "Amount (Rs)",
      duration: "Duration (months)",
      interestRate: "Interest Rate (% p.a.)",
      compounding: "Compounding",
      monthly: "Monthly",
      quarterly: "Quarterly",
      yearly: "Yearly",
      result: "Result",
      principal: "Principal",
      maturity: "Maturity",
      interestEarned: "Interest earned",
      discussInChat: "Chat me discuss karo",
      months: "months",
      visualCompare: "Visual Compare",
      byTenure: "By tenure",
      byRate: "By rate",
      visualHint: "Lamba tenure ho to final paisa usually zyada hota hai.",
      maturityEstimate: "Maturity estimate",
      principalVsInterest: "Principal vs interest split",
    },
    marathi: {
      title: "FD कॅल्क्युलेटर",
      description: "प्रिसेट्स आणि कंपाउंडिंग पर्यायांसह जलद कॅल्क्युलेटर.",
      amount: "रक्कम (रु)",
      duration: "कालावधी (महिने)",
      interestRate: "व्याजदर (% प्रति वर्ष)",
      compounding: "कंपाउंडिंग",
      monthly: "मासिक",
      quarterly: "तिमाही",
      yearly: "वार्षिक",
      result: "निकाल",
      principal: "मूलधन",
      maturity: "मॅच्युरिटी",
      interestEarned: "मिळालेले व्याज",
      discussInChat: "चॅटमध्ये चर्चा करा",
      months: "महिने",
      visualCompare: "व्हिज्युअल तुलना",
      byTenure: "कालावधीनुसार",
      byRate: "दरानुसार",
      visualHint: "निकाल पटकन तुलना करण्यासाठी मोड बदला.",
      maturityEstimate: "मॅच्युरिटी अंदाज",
      principalVsInterest: "मूलधन विरुद्ध व्याज विभाजन",
    },
    gujarati: {
      title: "FD કેલ્ક્યુલેટર",
      description: "પ્રિસેટ અને કમ્પાઉન્ડિંગ વિકલ્પો સાથે ઝડપી કેલ્ક્યુલેટર.",
      amount: "રકમ (રૂ)",
      duration: "અવધિ (મહિના)",
      interestRate: "વ્યાજ દર (% પ્રતિ વર્ષ)",
      compounding: "કમ્પાઉન્ડિંગ",
      monthly: "માસિક",
      quarterly: "ત્રિમાસિક",
      yearly: "વાર્ષિક",
      result: "પરિણામ",
      principal: "મૂળ રકમ",
      maturity: "મેચ્યોરિટી",
      interestEarned: "કમાયેલ વ્યાજ",
      discussInChat: "ચેટમાં ચર્ચા કરો",
      months: "મહિના",
      visualCompare: "વિઝ્યુઅલ તુલના",
      byTenure: "અવધિ મુજબ",
      byRate: "દર મુજબ",
      visualHint: "ઝડપી તુલના માટે મોડ બદલો.",
      maturityEstimate: "મેચ્યોરિટી અંદાજ",
      principalVsInterest: "મૂળ રકમ સામે વ્યાજ વિભાજન",
    },
    tamil: {
      title: "FD கணிப்பான்",
      description: "முன்னமைப்புகள் மற்றும் கூட்டு வட்டி தேர்வுகளுடன் வேகமான கணிப்பான்.",
      amount: "தொகை (ரூ)",
      duration: "காலம் (மாதங்கள்)",
      interestRate: "வட்டி விகிதம் (% ஆண்டிற்கு)",
      compounding: "கூட்டு வட்டி",
      monthly: "மாதந்தோறும்",
      quarterly: "காலாண்டு",
      yearly: "வருடாந்திர",
      result: "முடிவு",
      principal: "முதல்தொகை",
      maturity: "முதிர்வு தொகை",
      interestEarned: "ஈட்டிய வட்டி",
      discussInChat: "அரட்டையில் விவாதிக்கவும்",
      months: "மாதங்கள்",
      visualCompare: "காட்சி ஒப்பீடு",
      byTenure: "காலஅவதியின்படி",
      byRate: "விகிதத்தின்படி",
      visualHint: "விளைவுகளை விரைவாக ஒப்பிட மோடை மாற்றவும்.",
      maturityEstimate: "முதிர்வு மதிப்பீடு",
      principalVsInterest: "முதல்தொகை vs வட்டி பகிர்வு",
    },
    bhojpuri: {
      title: "FD कैलकुलेटर",
      description: "प्रिसेट आ कंपाउंडिंग विकल्प के साथ तेज कैलकुलेटर।",
      amount: "राशि (रु)",
      duration: "अवधि (महीना)",
      interestRate: "ब्याज दर (% सालाना)",
      compounding: "कंपाउंडिंग",
      monthly: "मासिक",
      quarterly: "तिमाही",
      yearly: "सालाना",
      result: "परिणाम",
      principal: "मूलधन",
      maturity: "मैच्योरिटी",
      interestEarned: "कमाइल ब्याज",
      discussInChat: "चैट में चर्चा करीं",
      months: "महीना",
      visualCompare: "विजुअल तुलना",
      byTenure: "अवधि के हिसाब से",
      byRate: "रेट के हिसाब से",
      visualHint: "जल्दी तुलना खातिर मोड बदलीं।",
      maturityEstimate: "मैच्योरिटी अनुमान",
      principalVsInterest: "मूलधन बनाम ब्याज बंटवारा",
    },
  });
  const [principal, setPrincipal] = useState(100000);
  const [tenureMonths, setTenureMonths] = useState(12);
  const [rate, setRate] = useState(7.5);
  const [compounding, setCompounding] = useState<"monthly" | "quarterly" | "yearly">(
    "quarterly"
  );
  const filterSelectClassName =
    "fd-filter-select h-8 w-full rounded-md border border-input bg-input/20 px-2 text-xs text-foreground";

  const result = useMemo(
    () => calculateFD(principal, rate, tenureMonths, compounding),
    [principal, rate, tenureMonths, compounding]
  );

  const tenureSeries = useMemo(() => {
    return [6, 12, 24, 36, 60].map((months) => {
      const maturity = calculateFD(principal, rate, months, compounding).maturityAmount;
      return {
        key: `tenure-${months}`,
        label: `${months} ${text.months}`,
        value: maturity,
      };
    });
  }, [principal, rate, compounding, text.months]);
  const maxVisualValue = Math.max(...tenureSeries.map((item) => item.value), 1);
  const interestRatio = result.maturityAmount
    ? (result.interestEarned / result.maturityAmount) * 100
    : 0;

  const compoundingLabel =
    compounding === "monthly"
      ? text.monthly
      : compounding === "quarterly"
        ? text.quarterly
        : text.yearly;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const activity: LastCalculationActivity = {
      principal,
      tenureMonths,
      rate,
      maturityAmount: result.maturityAmount,
      timestamp: Date.now(),
    };

    window.sessionStorage.setItem(LAST_CALC_ACTIVITY_KEY, JSON.stringify(activity));
    dispatchSessionSync();
  }, [principal, tenureMonths, rate, result.maturityAmount]);

  return (
    <div className="h-full min-h-0 overflow-y-auto bg-background">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 pb-6 pt-8 sm:px-6">
        <Card className="border border-border bg-card/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RiCalculatorLine className="size-4 text-primary" />
              {text.title}
            </CardTitle>
            <CardDescription>
              {text.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <p className="mb-1 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">
                {text.amount}
              </p>
              <input
                type="number"
                min={1000}
                value={principal}
                onChange={(event) => setPrincipal(Number(event.target.value) || 0)}
                className="h-8 w-full rounded-md border border-input bg-input/20 px-2 text-xs"
              />
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {AMOUNT_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setPrincipal(preset)}
                    className="rounded-full border border-border bg-background/70 px-2 py-0.5 text-[0.6875rem] text-muted-foreground"
                  >
                    Rs {preset.toLocaleString("en-IN")}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-1 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">
                {text.duration}
              </p>
              <input
                type="number"
                min={1}
                value={tenureMonths}
                onChange={(event) => setTenureMonths(Number(event.target.value) || 0)}
                className="h-8 w-full rounded-md border border-input bg-input/20 px-2 text-xs"
              />
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {TENURE_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setTenureMonths(preset)}
                    className="rounded-full border border-border bg-background/70 px-2 py-0.5 text-[0.6875rem] text-muted-foreground"
                  >
                      {preset} {text.months}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-1 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">
                {text.interestRate}
              </p>
              <input
                type="number"
                min={1}
                max={15}
                step={0.1}
                value={rate}
                onChange={(event) => setRate(Number(event.target.value) || 0)}
                className="h-8 w-full rounded-md border border-input bg-input/20 px-2 text-xs"
              />
            </div>

            <div>
              <p className="mb-1 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">
                {text.compounding}
              </p>
              <select
                value={compounding}
                onChange={(event) =>
                  setCompounding(event.target.value as "monthly" | "quarterly" | "yearly")
                }
                className={filterSelectClassName}
              >
                <option value="monthly" className="bg-popover text-popover-foreground">{text.monthly}</option>
                <option value="quarterly" className="bg-popover text-popover-foreground">{text.quarterly}</option>
                <option value="yearly" className="bg-popover text-popover-foreground">{text.yearly}</option>
              </select>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{text.visualCompare}</CardTitle>
            <CardDescription>{text.visualHint}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              {tenureSeries.map((item) => (
                <div key={item.key} className="space-y-1">
                  <div className="flex items-center justify-between text-[0.6875rem]">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-medium text-foreground">
                      Rs {item.value.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <Progress
                    value={(item.value / maxVisualValue) * 100}
                    className="h-1.5"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card/70">
          <CardHeader>
            <CardTitle className="text-sm">{text.result}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-muted-foreground">
            <p>
              {text.principal}: <span className="font-semibold text-foreground">Rs {principal.toLocaleString("en-IN")}</span>
            </p>
            <p>
              {text.maturity}: <span className="font-semibold text-foreground">Rs {result.maturityAmount.toLocaleString("en-IN")}</span>
            </p>
            <p>
              {text.interestEarned}: <span className="font-semibold text-foreground">Rs {result.interestEarned.toLocaleString("en-IN")}</span>
            </p>
            <p>
              {text.effectiveMonthlyGain}: <span className="font-semibold text-foreground">Rs {Math.round(result.interestEarned / Math.max(tenureMonths, 1)).toLocaleString("en-IN")}</span>
            </p>
            <Badge variant="outline">{text.compounding}: {compoundingLabel}</Badge>
            <div className="pt-1">
              <p className="mb-1 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">
                {text.principalVsInterest}
              </p>
              <Progress
                value={Math.min(Math.max(interestRatio, 0), 100)}
                className="h-2"
              />
              <div className="mt-1 flex items-center justify-between text-[0.625rem] text-muted-foreground">
                <span>{text.principal}</span>
                <span>{text.interestEarned}</span>
              </div>
            </div>
            <div className="rounded-md border border-border bg-background/70 p-3">
              <p className="mb-1 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">
                {text.smartInsights}
              </p>
              <p>Extending tenure can increase total returns if rate stays similar.</p>
              <p>Quarterly compounding generally beats simple payout for growth goals.</p>
              <p>Compare with SBI/HDFC options to balance trust and return.</p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-wrap gap-2 pt-0">
            <Button
              variant="outline"
              onClick={() =>
                openChatWithMessage(
                  router,
                  language === "hi"
                    ? `Rs ${principal} के लिए ${tenureMonths} महीनों पर ${rate}% ${compounding} कंपाउंडिंग के साथ FD कैलकुलेशन समझाओ`
                    : language === "mr"
                      ? `Rs ${principal} साठी ${tenureMonths} महिन्यांसाठी ${rate}% ${compoundingLabel} कंपाउंडिंगसह FD कॅल्क्युलेशन समजवा`
                      : language === "gu"
                        ? `Rs ${principal} માટે ${tenureMonths} મહિનામાં ${rate}% ${compoundingLabel} કમ્પાઉન્ડિંગ સાથે FD ગણતરી સમજાવો`
                        : language === "ta"
                          ? `Rs ${principal}க்கு ${tenureMonths} மாதங்களுக்கு ${rate}% ${compoundingLabel} கூட்டு வட்டியுடன் FD கணக்கை விளக்கவும்`
                          : language === "bho"
                            ? `Rs ${principal} खातिर ${tenureMonths} महीना पर ${rate}% ${compoundingLabel} कंपाउंडिंग के साथ FD कैलकुलेशन समझाईं`
                    : language === "hinglish"
                      ? `Rs ${principal} ke liye ${tenureMonths} months par ${rate}% ${compounding} compounding ke saath FD calculation samjhao`
                      : `Calculate and explain FD for Rs ${principal}, ${tenureMonths} months at ${rate}% ${compounding} compounding`
                )
              }
            >
              {text.discussInChat}
            </Button>
          </CardFooter>
        </Card>
        <p className="text-xs text-muted-foreground">{text.trustLine}</p>
      </div>
    </div>
  );
}
