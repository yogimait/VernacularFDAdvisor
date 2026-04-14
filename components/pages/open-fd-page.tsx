"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import {
  RiArrowLeftLine,
  RiArrowRightLine,
  RiBankLine,
  RiCheckboxCircleLine,
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
import { calculateFD } from "@/lib/fd-calculator";
import { FD_DATA } from "@/lib/fd-data";
import { openChatWithMessage } from "@/lib/chat-navigation";
import { useLanguage } from "@/hooks/use-language";
import { pickLocalized } from "@/lib/i18n";

const STEPS = ["Bank", "Amount", "Tenure", "Type", "Confirm"] as const;

function uniqueBanks(): string[] {
  return Array.from(new Set(FD_DATA.map((item) => item.bank)));
}

function nearestRate(bank: string, tenureMonths: number): number {
  const byBank = FD_DATA.filter((option) => option.bank === bank);
  const source = byBank.length > 0 ? byBank : FD_DATA;

  return source.reduce((closest, current) => {
    const currentDiff = Math.abs(current.tenure - tenureMonths);
    const closestDiff = Math.abs(closest.tenure - tenureMonths);
    return currentDiff < closestDiff ? current : closest;
  }).rate;
}

export function OpenFDPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const text = pickLocalized(language, {
    english: {
      title: "Open FD Flow",
      description: "Fill details and see your FD result instantly.",
      bookingDetails: "Booking Details",
      selectBank: "Select Bank",
      amount: "Amount (Rs)",
      duration: "Duration (months)",
      interestType: "Interest Type",
      cumulative: "Cumulative",
      nonCumulative: "Non-cumulative",
      startBooking: "Start Booking",
      liveCalculation: "Live Calculation",
      liveDescription: "Simple estimate from your selected bank and tenure.",
      rateUsed: "Rate used",
      principal: "Principal",
      maturity: "Maturity",
      interestEarned: "Interest earned",
      yearlyPayout: "Estimated yearly payout",
      step: "Step",
      continueInChat: "Continue in Chat",
      months: "months",
      stepLabels: ["Bank", "Amount", "Tenure", "Type", "Confirm"],
      rateScenario: "Rate scenario",
      conservative: "Conservative",
      expected: "Expected",
      optimistic: "Optimistic",
      growthTimeline: "Growth Timeline",
      growthTimelineHint: "See how your money grows month by month.",
      quickTenure: "Quick tenure",
    },
    hindi: {
      title: "FD खोलें फ्लो",
      description: "डिटेल भरें और तुरंत FD का परिणाम देखें।",
      bookingDetails: "बुकिंग विवरण",
      selectBank: "बैंक चुनें",
      amount: "राशि (रु)",
      duration: "अवधि (महीने)",
      interestType: "ब्याज प्रकार",
      cumulative: "क्यूम्यूलेटिव",
      nonCumulative: "नॉन-क्यूम्यूलेटिव",
      startBooking: "बुकिंग शुरू करें",
      liveCalculation: "लाइव कैलकुलेशन",
      liveDescription: "चुने हुए बैंक और अवधि से आसान अनुमान।",
      rateUsed: "प्रयुक्त रेट",
      principal: "मूलधन",
      maturity: "मैच्योरिटी",
      interestEarned: "कमाया गया ब्याज",
      yearlyPayout: "अनुमानित वार्षिक भुगतान",
      step: "स्टेप",
      continueInChat: "चैट में जारी रखें",
      months: "महीने",
      stepLabels: ["बैंक", "राशि", "अवधि", "प्रकार", "पुष्टि"],
      rateScenario: "रेट परिदृश्य",
      conservative: "सावधानी",
      expected: "अपेक्षित",
      optimistic: "आशावादी",
      growthTimeline: "ग्रोथ टाइमलाइन",
      growthTimelineHint: "हर चरण में आपकी रकम कैसे बढ़ती है, देखें।",
      quickTenure: "त्वरित अवधि",
    },
    hinglish: {
      title: "Open FD Flow",
      description: "Details bharo aur FD ka result turant dekho.",
      bookingDetails: "Booking Details",
      selectBank: "Select Bank",
      amount: "Amount (Rs)",
      duration: "Duration (months)",
      interestType: "Interest Type",
      cumulative: "Cumulative",
      nonCumulative: "Non-cumulative",
      startBooking: "Start Booking",
      liveCalculation: "Live Calculation",
      liveDescription: "Selected bank aur tenure se simple estimate.",
      rateUsed: "Rate used",
      principal: "Principal",
      maturity: "Maturity",
      interestEarned: "Interest earned",
      yearlyPayout: "Estimated yearly payout",
      step: "Step",
      continueInChat: "Chat me continue karo",
      months: "months",
      stepLabels: ["Bank", "Amount", "Tenure", "Type", "Confirm"],
      rateScenario: "Rate scenario",
      conservative: "Conservative",
      expected: "Expected",
      optimistic: "Optimistic",
      growthTimeline: "Growth Timeline",
      growthTimelineHint: "Har step me paisa kaise grow hota hai, dekho.",
      quickTenure: "Quick tenure",
    },
    marathi: {
      title: "FD उघडा फ्लो",
      description: "लाईव्ह मॅच्युरिटी प्रोजेक्शनसह संरचित बुकिंग फॉर्म.",
      bookingDetails: "बुकिंग तपशील",
      selectBank: "बँक निवडा",
      amount: "रक्कम (रु)",
      duration: "कालावधी (महिने)",
      interestType: "व्याज प्रकार",
      cumulative: "क्युम्युलेटिव्ह",
      nonCumulative: "नॉन-क्युम्युलेटिव्ह",
      startBooking: "बुकिंग सुरू करा",
      liveCalculation: "लाईव्ह कॅल्क्युलेशन",
      liveDescription: "निवडलेल्या बँक आणि कालावधीवर आधारित अंदाजित प्रोजेक्शन.",
      rateUsed: "वापरलेला दर",
      principal: "मूलधन",
      maturity: "मॅच्युरिटी",
      interestEarned: "मिळालेले व्याज",
      yearlyPayout: "अंदाजे वार्षिक पेआउट",
      step: "स्टेप",
      continueInChat: "चॅटमध्ये पुढे जा",
      months: "महिने",
      stepLabels: ["बँक", "रक्कम", "कालावधी", "प्रकार", "पुष्टी"],
      rateScenario: "दर परिदृश्य",
      conservative: "संयमी",
      expected: "अपेक्षित",
      optimistic: "आशावादी",
      growthTimeline: "वाढ टाइमलाइन",
      growthTimelineHint: "निवडलेल्या कालावधीत मूल्य कसे वाढते ते पहा.",
      quickTenure: "जलद कालावधी",
    },
    gujarati: {
      title: "FD ઓપન ફ્લો",
      description: "લાઇવ મેચ્યોરિટી પ્રોજેક્શન સાથે ગોઠવાયેલ બુકિંગ ફોર્મ.",
      bookingDetails: "બુકિંગ વિગતો",
      selectBank: "બેંક પસંદ કરો",
      amount: "રકમ (રૂ)",
      duration: "અવધિ (મહિના)",
      interestType: "વ્યાજ પ્રકાર",
      cumulative: "ક્યુમ્યુલેટિવ",
      nonCumulative: "નોન-ક્યુમ્યુલેટિવ",
      startBooking: "બુકિંગ શરૂ કરો",
      liveCalculation: "લાઇવ કેલ્ક્યુલેશન",
      liveDescription: "પસંદ કરેલી બેંક અને અવધિ આધારે અંદાજિત પ્રોજેક્શન.",
      rateUsed: "વપરાયેલ દર",
      principal: "મૂળ રકમ",
      maturity: "મેચ્યોરિટી",
      interestEarned: "કમાયેલ વ્યાજ",
      yearlyPayout: "અંદાજિત વાર્ષિક ચુકવણી",
      step: "સ્ટેપ",
      continueInChat: "ચેટમાં આગળ વધો",
      months: "મહિના",
      stepLabels: ["બેંક", "રકમ", "અવધિ", "પ્રકાર", "પુષ્ટિ"],
      rateScenario: "દર પરિસ્થિતિ",
      conservative: "સાવધાન",
      expected: "અપેક્ષિત",
      optimistic: "આશાવાદી",
      growthTimeline: "વૃદ્ધિ સમયરેખા",
      growthTimelineHint: "પસંદ કરેલી અવધિમાં મૂલ્ય કેવી રીતે વધે છે તે જુઓ.",
      quickTenure: "ઝડપી અવધિ",
    },
    tamil: {
      title: "FD திறப்பு நடைமுறை",
      description: "நேரடி முதிர்வு கணிப்புடன் கட்டமைக்கப்பட்ட பதிவு படிவம்.",
      bookingDetails: "பதிவு விவரங்கள்",
      selectBank: "வங்கியை தேர்ந்தெடுக்கவும்",
      amount: "தொகை (ரூ)",
      duration: "காலம் (மாதங்கள்)",
      interestType: "வட்டி வகை",
      cumulative: "கூட்டு",
      nonCumulative: "கூட்டல்லாத",
      startBooking: "பதிவு தொடங்கு",
      liveCalculation: "நேரடி கணக்கீடு",
      liveDescription: "தேர்ந்தெடுத்த வங்கி மற்றும் காலத்தை அடிப்படையாகக் கொண்ட மதிப்பீடு.",
      rateUsed: "பயன்பட்ட விகிதம்",
      principal: "முதல்தொகை",
      maturity: "முதிர்வு",
      interestEarned: "ஈட்டிய வட்டி",
      yearlyPayout: "மதிப்பிடப்பட்ட ஆண்டு செலுத்துதல்",
      step: "படி",
      continueInChat: "அரட்டையில் தொடரவும்",
      months: "மாதங்கள்",
      stepLabels: ["வங்கி", "தொகை", "காலம்", "வகை", "உறுதி"],
      rateScenario: "வட்டி நிலை",
      conservative: "எச்சரிக்கை",
      expected: "எதிர்பார்ப்பு",
      optimistic: "நம்பிக்கையுடன்",
      growthTimeline: "வளர்ச்சி காலவரிசை",
      growthTimelineHint: "தேர்ந்தெடுத்த காலத்தில் மதிப்பு எப்படி வளருகிறது என்பதைப் பாருங்கள்.",
      quickTenure: "விரைவு காலம்",
    },
    bhojpuri: {
      title: "FD खोलल फ्लो",
      description: "लाइव मैच्योरिटी प्रोजेक्शन के साथ सुसंगठित बुकिंग फॉर्म।",
      bookingDetails: "बुकिंग विवरण",
      selectBank: "बैंक चुनीं",
      amount: "राशि (रु)",
      duration: "अवधि (महीना)",
      interestType: "ब्याज प्रकार",
      cumulative: "क्यूम्यूलेटिव",
      nonCumulative: "नॉन-क्यूम्यूलेटिव",
      startBooking: "बुकिंग शुरू करीं",
      liveCalculation: "लाइव कैलकुलेशन",
      liveDescription: "चुनल बैंक आ अवधि के आधार पर अनुमानित प्रोजेक्शन।",
      rateUsed: "लागू दर",
      principal: "मूलधन",
      maturity: "मैच्योरिटी",
      interestEarned: "कमाइल ब्याज",
      yearlyPayout: "अनुमानित सालाना भुगतान",
      step: "स्टेप",
      continueInChat: "चैट में जारी रखीं",
      months: "महीना",
      stepLabels: ["बैंक", "राशि", "अवधि", "प्रकार", "पुष्टि"],
      rateScenario: "रेट परिदृश्य",
      conservative: "सावधान",
      expected: "अपेक्षित",
      optimistic: "आशावादी",
      growthTimeline: "ग्रोथ टाइमलाइन",
      growthTimelineHint: "चुनल अवधि में वैल्यू कइसे बढ़ेला, देखीं।",
      quickTenure: "फटाफट अवधि",
    },
  });
  const wizardText = pickLocalized(language, {
    english: {
      next: "Next",
      back: "Back",
      reviewDetails: "Review details",
      quickAmount: "Quick amount",
      bankHint: "Pick the bank where you want to open your FD.",
      amountHint: "Use slider or quick buttons to choose your deposit.",
      tenureHint: "Choose how long you can keep this amount parked.",
      typeHint: "Cumulative gives full amount at maturity. Non-cumulative pays interest regularly.",
      confirmHint: "Review your details once before starting booking.",
      stepHints: [
        "Start by selecting your preferred bank.",
        "Enter deposit amount in a way that feels comfortable.",
        "Choose FD duration based on your cash-flow need.",
        "Pick how you want to receive returns.",
        "Everything looks good. You can start booking now.",
      ],
    },
    hindi: {
      next: "आगे",
      back: "पीछे",
      reviewDetails: "विवरण देखें",
      quickAmount: "त्वरित राशि",
      bankHint: "जिस बैंक में FD खोलनी है, उसे चुनें।",
      amountHint: "राशि चुनने के लिए स्लाइडर या त्वरित बटन इस्तेमाल करें।",
      tenureHint: "अपनी जरूरत के हिसाब से अवधि चुनें।",
      typeHint: "क्यूम्यूलेटिव में रकम मैच्योरिटी पर मिलती है। नॉन-क्यूम्यूलेटिव में ब्याज समय-समय पर मिलता है।",
      confirmHint: "बुकिंग शुरू करने से पहले विवरण एक बार जांच लें।",
      stepHints: [
        "सबसे पहले अपना पसंदीदा बैंक चुनें।",
        "आराम से अपनी जमा राशि चुनें।",
        "अपनी जरूरत के अनुसार FD की अवधि तय करें।",
        "रिटर्न लेने का तरीका चुनें।",
        "सब सही है तो अब बुकिंग शुरू करें।",
      ],
    },
    hinglish: {
      next: "Next",
      back: "Back",
      reviewDetails: "Details review karo",
      quickAmount: "Quick amount",
      bankHint: "Jis bank me FD kholni hai woh select karo.",
      amountHint: "Deposit choose karne ke liye slider ya quick buttons use karo.",
      tenureHint: "Cash-flow need ke hisaab se duration choose karo.",
      typeHint: "Cumulative me total maturity par milta hai. Non-cumulative me interest regular milta hai.",
      confirmHint: "Booking start karne se pehle details ek baar check karo.",
      stepHints: [
        "Pehle apna preferred bank select karo.",
        "Comfortable amount enter karo.",
        "FD duration apni need ke hisaab se set karo.",
        "Return ka type choose karo.",
        "Sab ready hai, ab booking start kar sakte ho.",
      ],
    },
  });
  const banks = useMemo(() => uniqueBanks(), []);

  const [bank, setBank] = useState(banks[0] ?? "");
  const [amount, setAmount] = useState(100000);
  const [tenureMonths, setTenureMonths] = useState(12);
  const [currentStep, setCurrentStep] = useState(1);
  const [interestType, setInterestType] = useState<"cumulative" | "non-cumulative">(
    "cumulative"
  );

  const amountMin = 1000;
  const amountMax = 1000000;
  const clampedAmount = Math.min(Math.max(amount, amountMin), amountMax);
  const amountProgress = ((clampedAmount - amountMin) / (amountMax - amountMin)) * 100;
  const filterSelectClassName =
    "fd-filter-select h-8 w-full rounded-md border border-input bg-input/20 px-2 text-xs text-foreground";

  const rate = useMemo(() => nearestRate(bank, tenureMonths), [bank, tenureMonths]);
  const effectiveRate = rate;
  const projection = useMemo(
    () => calculateFD(amount, effectiveRate, tenureMonths, "quarterly"),
    [amount, effectiveRate, tenureMonths]
  );

  const yearlyPayout = Math.round((amount * effectiveRate) / 100);

  const growthPoints = useMemo(() => {
    const checkpoints = Array.from(
      new Set([
        Math.max(1, Math.round(tenureMonths * 0.25)),
        Math.max(1, Math.round(tenureMonths * 0.5)),
        Math.max(1, Math.round(tenureMonths * 0.75)),
        Math.max(1, tenureMonths),
      ])
    ).sort((a, b) => a - b);

    return checkpoints.map((months) => {
      const maturityAtPoint = calculateFD(
        amount,
        effectiveRate,
        months,
        "quarterly"
      ).maturityAmount;
      const value =
        interestType === "cumulative"
          ? maturityAtPoint
          : amount + Math.round((amount * effectiveRate * months) / 1200);

      return {
        months,
        value,
      };
    });
  }, [amount, effectiveRate, tenureMonths, interestType]);

  const maxGrowthValue = Math.max(...growthPoints.map((point) => point.value), 1);

  const canMoveNext = useMemo(() => {
    switch (currentStep) {
      case 1:
        return bank.trim().length > 0;
      case 2:
        return amount >= amountMin;
      case 3:
        return tenureMonths > 0;
      case 4:
        return Boolean(interestType);
      default:
        return true;
    }
  }, [amount, amountMin, bank, currentStep, interestType, tenureMonths]);

  function goNext(): void {
    if (!canMoveNext) {
      return;
    }

    setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
  }

  function goBack(): void {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  }

  function handleStartBooking(): void {
    openChatWithMessage(
      router,
      language === "hi"
        ? `मुझे ${bank} में Rs ${amount} राशि के साथ ${tenureMonths} महीनों के लिए ${interestType} प्रकार की FD खोलनी है`
        : language === "mr"
          ? `मला ${bank} मध्ये Rs ${amount} रक्कमेसह ${tenureMonths} महिन्यांसाठी ${interestType} प्रकारची FD उघडायची आहे`
          : language === "gu"
            ? `મને ${bank}માં Rs ${amount} રકમ સાથે ${tenureMonths} મહિનાં માટે ${interestType} પ્રકારની FD ખોલવી છે`
            : language === "ta"
              ? `எனக்கு ${bank} வங்கியில் Rs ${amount} தொகைக்கு ${tenureMonths} மாதங்களுக்கு ${interestType} வகை FD திறக்க வேண்டும்`
              : language === "bho"
                ? `हमके ${bank} में Rs ${amount} राशि से ${tenureMonths} महीना खातिर ${interestType} टाइप FD खोलल बा`
                : language === "hinglish"
                  ? `Mujhe ${bank} me Rs ${amount} amount ke saath ${tenureMonths} months ke liye ${interestType} type FD open karni hai`
                  : `I want to open FD in ${bank} with amount Rs ${amount}, duration ${tenureMonths} months, ${interestType} type`
    );
  }

  return (
    <div className="h-full min-h-0 overflow-y-auto bg-background">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 pb-6 pt-8 sm:px-6">
        <Card className="border border-border bg-card/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RiBankLine className="size-4 text-primary" />
              {text.title}
            </CardTitle>
            <CardDescription>
              {text.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {STEPS.map((step, index) => {
                const stepNumber = index + 1;
                const isDone = stepNumber < currentStep;
                const isCurrent = stepNumber === currentStep;
                return (
                  <div
                    key={step}
                    className={`rounded-md border px-2 py-1.5 text-center text-[0.6875rem] font-medium ${
                      isDone || isCurrent
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border bg-background/70 text-muted-foreground"
                    }`}
                  >
                    <span className="mr-1 font-semibold">{stepNumber}.</span>
                    {text.stepLabels[index]}
                  </div>
                );
              })}
            </div>
            <Progress value={(currentStep / STEPS.length) * 100} className="h-2" />
            <p className="text-xs text-muted-foreground">{wizardText.stepHints[currentStep - 1]}</p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr,0.8fr]">
          <Card className="border border-border bg-card/70">
            <CardHeader>
              <CardTitle className="text-sm">
                {text.step} {currentStep}: {text.stepLabels[currentStep - 1]}
              </CardTitle>
              <CardDescription>{wizardText.stepHints[currentStep - 1]}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {currentStep === 1 ? (
                <div>
                  <p className="mb-1 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">
                    {text.selectBank}
                  </p>
                  <select
                    value={bank}
                    onChange={(event) => setBank(event.target.value)}
                    className={filterSelectClassName}
                  >
                    {banks.map((option) => (
                      <option
                        key={option}
                        value={option}
                        className="bg-popover text-popover-foreground"
                      >
                        {option}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1.5 text-xs text-muted-foreground">{wizardText.bankHint}</p>
                </div>
              ) : null}

              {currentStep === 2 ? (
                <div>
                  <p className="mb-1 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">
                    {text.amount}
                  </p>
                  <input
                    type="number"
                    min={amountMin}
                    step={1000}
                    value={amount}
                    onChange={(event) => setAmount(Number(event.target.value) || 0)}
                    className="h-8 w-full rounded-md border border-input bg-input/20 px-2 text-xs"
                  />
                  <p className="mt-1.5 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">
                    {wizardText.quickAmount}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {[50000, 100000, 200000, 500000].map((quickAmount) => (
                      <button
                        key={`quick-amount-${quickAmount}`}
                        type="button"
                        onClick={() => setAmount(quickAmount)}
                        className={`rounded-full border px-2 py-0.5 text-[0.6875rem] transition-colors ${
                          amount === quickAmount
                            ? "border-primary/40 bg-primary/10 text-primary"
                            : "border-border bg-background/70 text-muted-foreground"
                        }`}
                      >
                        Rs {quickAmount.toLocaleString("en-IN")}
                      </button>
                    ))}
                  </div>
                  <input
                    type="range"
                    min={amountMin}
                    max={amountMax}
                    step={1000}
                    value={clampedAmount}
                    onChange={(event) => setAmount(Number(event.target.value))}
                    className="fd-range-slider mt-2 w-full"
                    style={{ "--range-progress": `${amountProgress}%` } as CSSProperties}
                  />
                  <p className="mt-1.5 text-xs text-muted-foreground">{wizardText.amountHint}</p>
                </div>
              ) : null}

              {currentStep === 3 ? (
                <div>
                  <p className="mb-1 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">
                    {text.duration}
                  </p>
                  <select
                    value={String(tenureMonths)}
                    onChange={(event) => setTenureMonths(Number(event.target.value))}
                    className={filterSelectClassName}
                  >
                    {[6, 12, 24, 36, 60].map((months) => (
                      <option
                        key={months}
                        value={months}
                        className="bg-popover text-popover-foreground"
                      >
                        {months} {text.months}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1.5 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">
                    {text.quickTenure}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {[6, 12, 24, 36, 60].map((months) => (
                      <button
                        key={`quick-tenure-${months}`}
                        type="button"
                        onClick={() => setTenureMonths(months)}
                        className={`rounded-full border px-2 py-0.5 text-[0.6875rem] transition-colors ${
                          tenureMonths === months
                            ? "border-primary/40 bg-primary/10 text-primary"
                            : "border-border bg-background/70 text-muted-foreground"
                        }`}
                      >
                        {months} {text.months}
                      </button>
                    ))}
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">{wizardText.tenureHint}</p>
                </div>
              ) : null}

              {currentStep === 4 ? (
                <div>
                  <p className="mb-1 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">
                    {text.interestType}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {(["cumulative", "non-cumulative"] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setInterestType(type)}
                        className={`rounded-md border px-2 py-1.5 text-xs font-medium transition-colors ${
                          interestType === type
                            ? "border-primary/40 bg-primary/10 text-primary"
                            : "border-border bg-background/70 text-muted-foreground"
                        }`}
                      >
                        {type === "cumulative" ? text.cumulative : text.nonCumulative}
                      </button>
                    ))}
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">{wizardText.typeHint}</p>
                </div>
              ) : null}

              {currentStep === 5 ? (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">{wizardText.confirmHint}</p>
                  <div className="space-y-1 rounded-md border border-border bg-background/70 p-3 text-xs">
                    <p className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">{text.selectBank}</span>
                      <span className="font-semibold text-foreground">{bank}</span>
                    </p>
                    <p className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">{text.amount}</span>
                      <span className="font-semibold text-foreground">Rs {amount.toLocaleString("en-IN")}</span>
                    </p>
                    <p className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">{text.duration}</span>
                      <span className="font-semibold text-foreground">{tenureMonths} {text.months}</span>
                    </p>
                    <p className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">{text.interestType}</span>
                      <span className="font-semibold text-foreground">
                        {interestType === "cumulative" ? text.cumulative : text.nonCumulative}
                      </span>
                    </p>
                    <p className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">{text.rateUsed}</span>
                      <span className="font-semibold text-foreground">{effectiveRate}% p.a.</span>
                    </p>
                    {interestType === "cumulative" ? (
                      <p className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">{text.maturity}</span>
                        <span className="font-semibold text-foreground">
                          Rs {projection.maturityAmount.toLocaleString("en-IN")}
                        </span>
                      </p>
                    ) : (
                      <p className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">{text.yearlyPayout}</span>
                        <span className="font-semibold text-foreground">
                          Rs {yearlyPayout.toLocaleString("en-IN")}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              ) : null}
            </CardContent>
            <CardFooter className="flex items-center justify-between gap-2">
              <Button variant="outline" onClick={goBack} disabled={currentStep === 1} className="gap-1">
                <RiArrowLeftLine className="size-3.5" />
                {wizardText.back}
              </Button>

              {currentStep < STEPS.length ? (
                <Button className="gap-1" onClick={goNext} disabled={!canMoveNext}>
                  {currentStep === STEPS.length - 1 ? wizardText.reviewDetails : wizardText.next}
                  <RiArrowRightLine className="size-3.5" />
                </Button>
              ) : (
                <Button className="gap-1" onClick={handleStartBooking}>
                  {text.startBooking}
                  <RiArrowRightLine className="size-3.5" />
                </Button>
              )}
            </CardFooter>
          </Card>

          <div className="space-y-4">
            <Card className="border border-border bg-card/70">
              <CardHeader>
                <CardTitle className="text-sm">{text.liveCalculation}</CardTitle>
                <CardDescription>
                  {text.liveDescription}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-xs text-muted-foreground">
                <p>
                  {text.rateUsed}: <span className="font-semibold text-foreground">{effectiveRate}% p.a.</span>
                </p>
                <p>
                  {text.principal}: <span className="font-semibold text-foreground">Rs {amount.toLocaleString("en-IN")}</span>
                </p>

                {interestType === "cumulative" ? (
                  <>
                    <p>
                      {text.maturity}: <span className="font-semibold text-foreground">Rs {projection.maturityAmount.toLocaleString("en-IN")}</span>
                    </p>
                    <p>
                      {text.interestEarned}: <span className="font-semibold text-foreground">Rs {projection.interestEarned.toLocaleString("en-IN")}</span>
                    </p>
                  </>
                ) : (
                  <p>
                    {text.yearlyPayout}: <span className="font-semibold text-foreground">Rs {yearlyPayout.toLocaleString("en-IN")}</span>
                  </p>
                )}

                <div className="pt-1">
                  <Badge variant="outline" className="gap-1">
                    <RiCheckboxCircleLine className="size-3" />
                    {text.step} {currentStep}/{STEPS.length}
                  </Badge>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" onClick={() => router.push("/chat")}>
                  {text.continueInChat}
                </Button>
              </CardFooter>
            </Card>

            <Card className="border border-border bg-card/70">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{text.growthTimeline}</CardTitle>
                <CardDescription>{text.growthTimelineHint}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {growthPoints.map((point) => (
                  <div key={`growth-${point.months}`} className="space-y-1">
                    <div className="flex items-center justify-between text-[0.6875rem]">
                      <span className="text-muted-foreground">{point.months} {text.months}</span>
                      <span className="font-medium text-foreground">Rs {point.value.toLocaleString("en-IN")}</span>
                    </div>
                    <Progress
                      value={(point.value / maxGrowthValue) * 100}
                      className="h-1.5"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
