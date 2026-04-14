"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { RiSaveLine, RiScales3Line } from "@remixicon/react";
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
import { openChatWithMessage } from "@/lib/chat-navigation";
import { useLanguage } from "@/hooks/use-language";
import { pickLocalized } from "@/lib/i18n";

interface BankSummary {
  bank: string;
  rate: number;
  safety: string;
  appUx: string;
  minAmount: number;
  bestTenure: number;
}

function safetyLabel(bank: string): string {
  if (bank.includes("Post Office")) return "Very High";
  if (bank.includes("SBI")) return "High";
  if (bank.includes("HDFC") || bank.includes("ICICI") || bank.includes("Axis")) {
    return "Balanced";
  }
  return "Moderate";
}

function appUxLabel(bank: string): string {
  if (bank.includes("HDFC") || bank.includes("ICICI")) return "Strong";
  if (bank.includes("Axis") || bank.includes("SBI")) return "Good";
  if (bank.includes("Post Office")) return "Basic";
  return "Average";
}

function summarizeBank(bank: string): BankSummary {
  const rows = FD_DATA.filter((option) => option.bank === bank);
  const bestRateRow = rows.reduce((best, current) =>
    current.rate > best.rate ? current : best
  );

  const minAmount = rows.reduce(
    (lowest, current) => (current.minAmount < lowest ? current.minAmount : lowest),
    rows[0].minAmount
  );

  return {
    bank,
    rate: bestRateRow.rate,
    safety: safetyLabel(bank),
    appUx: appUxLabel(bank),
    minAmount,
    bestTenure: bestRateRow.tenure,
  };
}

function nearestTenureOption(bank: string, tenureMonths: number) {
  const rows = FD_DATA.filter((option) => option.bank === bank);

  return rows.reduce((closest, current) => {
    const currentDiff = Math.abs(current.tenure - tenureMonths);
    const closestDiff = Math.abs(closest.tenure - tenureMonths);
    return currentDiff < closestDiff ? current : closest;
  });
}

export function CompareBanksPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { language } = useLanguage();
  const text = pickLocalized(language, {
    english: {
      title: "Compare Banks",
      description: "Pick banks and see the difference in one simple view.",
      feature: "Feature",
      best: "Best",
      rate: "Rate",
      safety: "Safety",
      appUx: "App UX",
      minAmount: "Min Amount",
      bestTenure: "Best Tenure",
      months: "months",
      openFd: "Open FD",
      save: "Save",
      savedMessage: "Comparison saved in browser.",
      visualCompare: "Visual Compare",
      metricHint: "Pick one metric to quickly see which bank leads.",
      metricRate: "Highest rate",
      metricMinAmount: "Lowest min amount",
      metricBestTenure: "Shortest best tenure",
      maturitySimulator: "Maturity Simulator",
      maturitySimulatorHint: "Move amount and tenure. Bigger bar means more final money.",
      compareAmount: "Compare amount",
      compareTenure: "Compare tenure",
      maturityAtTenure: "Maturity at selected tenure",
    },
    hindi: {
      title: "बैंक तुलना",
      description: "बैंक चुनें और फर्क को एक आसान व्यू में देखें।",
      feature: "फीचर",
      best: "सर्वश्रेष्ठ",
      rate: "रेट",
      safety: "सुरक्षा",
      appUx: "ऐप अनुभव",
      minAmount: "न्यूनतम राशि",
      bestTenure: "सर्वश्रेष्ठ अवधि",
      months: "महीने",
      openFd: "FD खोलें",
      save: "सेव",
      savedMessage: "तुलना ब्राउज़र में सेव हो गई।",
      visualCompare: "विजुअल तुलना",
      metricHint: "एक मेट्रिक चुनें और जल्दी देखें कौन सा बैंक बेहतर है।",
      metricRate: "सबसे ऊंचा रेट",
      metricMinAmount: "सबसे कम न्यूनतम राशि",
      metricBestTenure: "सबसे छोटी सर्वश्रेष्ठ अवधि",
      maturitySimulator: "मैच्योरिटी सिम्युलेटर",
      maturitySimulatorHint: "राशि और अवधि बदलें। बड़ी बार मतलब ज्यादा अंतिम रकम।",
      compareAmount: "तुलना राशि",
      compareTenure: "तुलना अवधि",
      maturityAtTenure: "चयनित अवधि पर मैच्योरिटी",
    },
    hinglish: {
      title: "Compare Banks",
      description: "Banks select karo aur difference ek simple view me dekho.",
      feature: "Feature",
      best: "Best",
      rate: "Rate",
      safety: "Safety",
      appUx: "App UX",
      minAmount: "Min Amount",
      bestTenure: "Best Tenure",
      months: "months",
      openFd: "Open FD",
      save: "Save",
      savedMessage: "Comparison browser me save ho gaya.",
      visualCompare: "Visual Compare",
      metricHint: "Ek metric choose karo aur jaldi dekho kaunsa bank lead kar raha hai.",
      metricRate: "Highest rate",
      metricMinAmount: "Lowest min amount",
      metricBestTenure: "Shortest best tenure",
      maturitySimulator: "Maturity Simulator",
      maturitySimulatorHint: "Amount aur tenure badlo. Badi bar ka matlab zyada final paisa.",
      compareAmount: "Compare amount",
      compareTenure: "Compare tenure",
      maturityAtTenure: "Selected tenure par maturity",
    },
    marathi: {
      title: "बँक तुलना",
      description: "अनेक बँका निवडा आणि FD ची प्रमुख वैशिष्ट्ये एकत्र तुलना करा.",
      feature: "वैशिष्ट्य",
      best: "सर्वोत्तम",
      rate: "दर",
      safety: "सुरक्षा",
      appUx: "ॲप अनुभव",
      minAmount: "किमान रक्कम",
      bestTenure: "सर्वोत्तम कालावधी",
      months: "महिने",
      openFd: "FD उघडा",
      save: "जतन करा",
      savedMessage: "तुलना ब्राउझरमध्ये जतन झाली.",
      visualCompare: "दृश्य तुलना",
      metricHint: "एक मेट्रिक निवडा आणि कोणती बँक आघाडीवर आहे ते पटकन पाहा.",
      metricRate: "सर्वाधिक दर",
      metricMinAmount: "सर्वात कमी किमान रक्कम",
      metricBestTenure: "सर्वात लहान सर्वोत्तम कालावधी",
      maturitySimulator: "मॅच्युरिटी सिम्युलेटर",
      maturitySimulatorHint: "रक्कम आणि कालावधी बदलून अंदाजित मॅच्युरिटीची तुलना करा.",
      compareAmount: "तुलना रक्कम",
      compareTenure: "तुलना कालावधी",
      maturityAtTenure: "निवडलेल्या कालावधीवरील मॅच्युरिटी",
    },
    gujarati: {
      title: "બેંક તુલના",
      description: "ઘણી બેન્ક પસંદ કરો અને FD ની મુખ્ય સુવિધાઓ બાજુબાજુમાં તુલના કરો.",
      feature: "સુવિધા",
      best: "શ્રેષ્ઠ",
      rate: "દર",
      safety: "સુરક્ષા",
      appUx: "એપ અનુભવ",
      minAmount: "ન્યૂનતમ રકમ",
      bestTenure: "શ્રેષ્ઠ અવધિ",
      months: "મહિના",
      openFd: "FD ખોલો",
      save: "સેવ",
      savedMessage: "તુલના બ્રાઉઝરમાં સેવ થઈ ગઈ.",
      visualCompare: "વિઝ્યુઅલ તુલના",
      metricHint: "એક મેટ્રિક પસંદ કરો અને કઈ બેંક આગળ છે તે ઝડપથી જુઓ.",
      metricRate: "સૌથી ઊંચો દર",
      metricMinAmount: "સૌથી ઓછું ન્યૂનતમ",
      metricBestTenure: "સૌથી ટૂંકી શ્રેષ્ઠ અવધિ",
      maturitySimulator: "મેચ્યોરિટી સિમ્યુલેટર",
      maturitySimulatorHint: "રકમ અને અવધિ બદલીને અંદાજિત મેચ્યોરિટી તુલના કરો.",
      compareAmount: "તુલના રકમ",
      compareTenure: "તુલના અવધિ",
      maturityAtTenure: "પસંદ કરેલી અવધિ પર મેચ્યોરિટી",
    },
    tamil: {
      title: "வங்கி ஒப்பீடு",
      description: "பல வங்கிகளை தேர்ந்தெடுத்து FD அம்சங்களை பக்கப்பக்கமாக ஒப்பிடுங்கள்.",
      feature: "அம்சம்",
      best: "சிறந்தது",
      rate: "விகிதம்",
      safety: "பாதுகாப்பு",
      appUx: "ஆப் அனுபவம்",
      minAmount: "குறைந்தபட்ச தொகை",
      bestTenure: "சிறந்த காலம்",
      months: "மாதங்கள்",
      openFd: "FD திறக்கவும்",
      save: "சேமிக்கவும்",
      savedMessage: "ஒப்பீடு உலாவியில் சேமிக்கப்பட்டது.",
      visualCompare: "காட்சி ஒப்பீடு",
      metricHint: "ஒரு அளவுகோலை தேர்ந்தெடுத்து எந்த வங்கி முன்னிலையில் உள்ளது என்பதை விரைவாக பாருங்கள்.",
      metricRate: "அதிகபட்ச விகிதம்",
      metricMinAmount: "குறைந்த குறைந்தபட்ச தொகை",
      metricBestTenure: "குறைந்த சிறந்த காலம்",
      maturitySimulator: "முதிர்வு ஒப்பீட்டான்",
      maturitySimulatorHint: "தொகை மற்றும் காலத்தை மாற்றி கணிக்கப்பட்ட முதிர்வை ஒப்பிடுங்கள்.",
      compareAmount: "ஒப்பீட்டு தொகை",
      compareTenure: "ஒப்பீட்டு காலம்",
      maturityAtTenure: "தேர்ந்தெடுத்த காலத்தில் முதிர்வு",
    },
    bhojpuri: {
      title: "बैंक तुलना",
      description: "कई बैंक चुनीं आ FD के जरूरी फीचर के साथ-साथ तुलना करीं।",
      feature: "फीचर",
      best: "सबसे बढ़िया",
      rate: "दर",
      safety: "सुरक्षा",
      appUx: "ऐप अनुभव",
      minAmount: "न्यूनतम राशि",
      bestTenure: "सबसे बढ़िया अवधि",
      months: "महीना",
      openFd: "FD खोलीं",
      save: "सेव करीं",
      savedMessage: "तुलना ब्राउजर में सेव हो गइल।",
      visualCompare: "विजुअल तुलना",
      metricHint: "एक मेट्रिक चुनीं आ देखीं कवन बैंक आगे बा।",
      metricRate: "सबसे ऊँच दर",
      metricMinAmount: "सबसे कम न्यूनतम राशि",
      metricBestTenure: "सबसे छोट बढ़िया अवधि",
      maturitySimulator: "मैच्योरिटी सिम्युलेटर",
      maturitySimulatorHint: "राशि आ अवधि बदल के अनुमानित मैच्योरिटी तुलना करीं।",
      compareAmount: "तुलना राशि",
      compareTenure: "तुलना अवधि",
      maturityAtTenure: "चुनल अवधि पर मैच्योरिटी",
    },
  });

  const allBanks = useMemo(() => Array.from(new Set(FD_DATA.map((row) => row.bank))), []);
  const preferredBank = searchParams.get("banks");

  const [selectedBanks, setSelectedBanks] = useState<string[]>(() => {
    if (preferredBank && allBanks.includes(preferredBank)) {
      return [preferredBank, ...allBanks.filter((bank) => bank !== preferredBank).slice(0, 2)];
    }

    return allBanks.slice(0, 3);
  });

  const [savedMessage, setSavedMessage] = useState<string>("");
  const [scenarioAmount, setScenarioAmount] = useState(100000);
  const [scenarioTenure, setScenarioTenure] = useState(12);

  const scenarioAmountMin = 10000;
  const scenarioAmountMax = 1000000;
  const scenarioAmountProgress =
    ((scenarioAmount - scenarioAmountMin) / (scenarioAmountMax - scenarioAmountMin)) * 100;
  const filterSelectClassName =
    "fd-filter-select h-8 w-full rounded-md border border-input bg-input/20 px-2 text-xs text-foreground";

  const summaries = useMemo(() => {
    return selectedBanks.map((bank) => summarizeBank(bank));
  }, [selectedBanks]);

  const scenarioRows = useMemo(() => {
    return selectedBanks.map((bank) => {
      const option = nearestTenureOption(bank, scenarioTenure);
      const maturity = calculateFD(
        scenarioAmount,
        option.rate,
        scenarioTenure,
        "quarterly"
      ).maturityAmount;

      return {
        bank,
        rate: option.rate,
        maturity,
      };
    }).sort((a, b) => b.maturity - a.maturity);
  }, [selectedBanks, scenarioAmount, scenarioTenure]);

  const maxScenarioMaturity = Math.max(
    ...scenarioRows.map((row) => row.maturity),
    1
  );

  const bestBank = useMemo(() => {
    if (summaries.length === 0) {
      return null;
    }

    return summaries.reduce((best, current) => (current.rate > best.rate ? current : best));
  }, [summaries]);

  const toggleBank = (bank: string) => {
    setSelectedBanks((prev) => {
      if (prev.includes(bank)) {
        if (prev.length === 1) {
          return prev;
        }

        return prev.filter((item) => item !== bank);
      }

      return [...prev, bank].slice(0, 4);
    });
  };

  const localizedSafety = (value: string): string => {
    if (language === "en") return value;
    if (language === "hi") {
      if (value === "Very High") return "बहुत उच्च";
      if (value === "High") return "उच्च";
      if (value === "Balanced") return "संतुलित";
      if (value === "Moderate") return "मध्यम";
      return value;
    }
    if (language === "mr") {
      if (value === "Very High") return "खूप उच्च";
      if (value === "High") return "उच्च";
      if (value === "Balanced") return "समतोल";
      if (value === "Moderate") return "मध्यम";
      return value;
    }
    if (language === "gu") {
      if (value === "Very High") return "ખૂબ ઊંચું";
      if (value === "High") return "ઉંચું";
      if (value === "Balanced") return "સંતુલિત";
      if (value === "Moderate") return "મધ્યમ";
      return value;
    }
    if (language === "ta") {
      if (value === "Very High") return "மிக உயர்ந்தது";
      if (value === "High") return "உயர்";
      if (value === "Balanced") return "சமநிலை";
      if (value === "Moderate") return "மிதமான";
      return value;
    }
    if (language === "bho") {
      if (value === "Very High") return "बहुत ऊँच";
      if (value === "High") return "ऊँच";
      if (value === "Balanced") return "संतुलित";
      if (value === "Moderate") return "मध्यम";
      return value;
    }
    if (language === "hinglish") {
      if (value === "Very High") return "Bahut High";
      if (value === "High") return "High";
      if (value === "Balanced") return "Balanced";
      if (value === "Moderate") return "Moderate";
    }
    return value;
  };

  const localizedAppUx = (value: string): string => {
    if (language === "en") return value;
    if (language === "hi") {
      if (value === "Strong") return "मजबूत";
      if (value === "Good") return "अच्छा";
      if (value === "Basic") return "बेसिक";
      if (value === "Average") return "औसत";
      return value;
    }
    if (language === "mr") {
      if (value === "Strong") return "मजबूत";
      if (value === "Good") return "चांगला";
      if (value === "Basic") return "मूलभूत";
      if (value === "Average") return "सरासरी";
      return value;
    }
    if (language === "gu") {
      if (value === "Strong") return "મજબૂત";
      if (value === "Good") return "સારો";
      if (value === "Basic") return "મૂળભૂત";
      if (value === "Average") return "સરેરાશ";
      return value;
    }
    if (language === "ta") {
      if (value === "Strong") return "வலுவான";
      if (value === "Good") return "நல்லது";
      if (value === "Basic") return "அடிப்படை";
      if (value === "Average") return "சராசரி";
      return value;
    }
    if (language === "bho") {
      if (value === "Strong") return "मजबूत";
      if (value === "Good") return "ठीक";
      if (value === "Basic") return "बेसिक";
      if (value === "Average") return "औसत";
      return value;
    }
    if (language === "hinglish") {
      if (value === "Strong") return "Strong";
      if (value === "Good") return "Good";
      if (value === "Basic") return "Basic";
      if (value === "Average") return "Average";
    }
    return value;
  };

  return (
    <div className="h-full min-h-0 overflow-y-auto bg-background">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 pb-6 pt-8 sm:px-6">
        <Card className="border border-border bg-card/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RiScales3Line className="size-4 text-primary" />
              {text.title}
            </CardTitle>
            <CardDescription>
              {text.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {allBanks.map((bank) => {
              const active = selectedBanks.includes(bank);
              return (
                <button
                  key={bank}
                  onClick={() => toggleBank(bank)}
                  className={`rounded-full border px-3 py-1 text-[0.6875rem] font-medium transition-colors ${
                    active
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border bg-background/70 text-muted-foreground"
                  }`}
                >
                  {bank}
                </button>
              );
            })}
          </CardContent>
        </Card>

        <Card className="border border-border bg-card/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{text.maturitySimulator}</CardTitle>
            <CardDescription>{text.maturitySimulatorHint}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr,220px]">
              <div>
                <p className="mb-1 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">
                  {text.compareAmount}: Rs {scenarioAmount.toLocaleString("en-IN")}
                </p>
                <input
                  type="range"
                  min={scenarioAmountMin}
                  max={scenarioAmountMax}
                  step={5000}
                  value={scenarioAmount}
                  onChange={(event) => setScenarioAmount(Number(event.target.value))}
                  className="fd-range-slider w-full"
                  style={{ "--range-progress": `${scenarioAmountProgress}%` } as CSSProperties}
                />
              </div>

              <div>
                <p className="mb-1 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">
                  {text.compareTenure}
                </p>
                <select
                  value={String(scenarioTenure)}
                  onChange={(event) => setScenarioTenure(Number(event.target.value))}
                  className={filterSelectClassName}
                >
                  {[6, 12, 24, 36, 60].map((months) => (
                    <option key={months} value={months} className="bg-popover text-popover-foreground">
                      {months} {text.months}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">
                {text.maturityAtTenure}
              </p>
              {scenarioRows.map((row) => (
                <div key={`scenario-${row.bank}`} className="space-y-1">
                  <div className="flex items-center justify-between text-[0.6875rem]">
                    <span className="text-muted-foreground">{row.bank}</span>
                    <span className="font-medium text-foreground">
                      Rs {row.maturity.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <Progress
                    value={(row.maturity / maxScenarioMaturity) * 100}
                    className="h-1.5"
                  />
                  <p className="text-[0.625rem] text-muted-foreground">{row.rate}% p.a.</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card/70">
          <CardContent className="overflow-x-auto pt-4">
            <table className="w-full min-w-[760px] border-collapse text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-3 py-2 text-left font-semibold text-muted-foreground">{text.feature}</th>
                  {summaries.map((summary) => (
                    <th
                      key={summary.bank}
                      className={`px-3 py-2 text-left font-semibold ${
                        bestBank?.bank === summary.bank
                          ? "bg-primary/10 text-primary"
                          : "text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {summary.bank}
                        {bestBank?.bank === summary.bank && (
                          <Badge variant="outline">{text.best}</Badge>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/70">
                  <td className="px-3 py-2 text-muted-foreground">{text.rate}</td>
                  {summaries.map((summary) => (
                    <td key={summary.bank} className="px-3 py-2 text-foreground">
                      {summary.rate}%
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-border/70">
                  <td className="px-3 py-2 text-muted-foreground">{text.safety}</td>
                  {summaries.map((summary) => (
                    <td key={summary.bank} className="px-3 py-2 text-foreground">
                      {localizedSafety(summary.safety)}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-border/70">
                  <td className="px-3 py-2 text-muted-foreground">{text.appUx}</td>
                  {summaries.map((summary) => (
                    <td key={summary.bank} className="px-3 py-2 text-foreground">
                      {localizedAppUx(summary.appUx)}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-border/70">
                  <td className="px-3 py-2 text-muted-foreground">{text.minAmount}</td>
                  {summaries.map((summary) => (
                    <td key={summary.bank} className="px-3 py-2 text-foreground">
                      Rs {summary.minAmount.toLocaleString("en-IN")}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="px-3 py-2 text-muted-foreground">{text.bestTenure}</td>
                  {summaries.map((summary) => (
                    <td key={summary.bank} className="px-3 py-2 text-foreground">
                      {summary.bestTenure} {text.months}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </CardContent>
          <CardFooter className="flex flex-wrap gap-2 pt-0">
            <Button
              onClick={() => {
                if (!bestBank) return;
                openChatWithMessage(
                  router,
                  language === "hi"
                    ? `मुझे ${bestBank.bank} में ${bestBank.rate}% पर FD खोलनी है`
                    : language === "mr"
                      ? `मला ${bestBank.bank} मध्ये ${bestBank.rate}% दराने FD उघडायची आहे`
                      : language === "gu"
                        ? `મારે ${bestBank.bank}માં ${bestBank.rate}% દરે FD ખોલવી છે`
                        : language === "ta"
                          ? `எனக்கு ${bestBank.bank} வங்கியில் ${bestBank.rate}% விகிதத்தில் FD திறக்க வேண்டும்`
                          : language === "bho"
                            ? `हमके ${bestBank.bank} में ${bestBank.rate}% पर FD खोलल बा`
                            : language === "hinglish"
                              ? `Mujhe ${bestBank.bank} me ${bestBank.rate}% par FD open karni hai`
                              : `I want to open FD in ${bestBank.bank} at ${bestBank.rate}%`
                );
              }}
              disabled={!bestBank}
            >
              {text.openFd}
            </Button>
            <Button
              variant="outline"
              className="gap-1"
              onClick={() => {
                if (typeof window === "undefined") {
                  return;
                }

                window.localStorage.setItem(
                  "fdadvisor:saved-comparison",
                  JSON.stringify({ selectedBanks, timestamp: Date.now() })
                );
                setSavedMessage(text.savedMessage);
              }}
            >
              <RiSaveLine className="size-3.5" />
              {text.save}
            </Button>
          </CardFooter>
        </Card>

        {savedMessage && (
          <Card className="border border-primary/25 bg-primary/5">
            <CardContent className="pt-4 text-xs text-primary">{savedMessage}</CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
