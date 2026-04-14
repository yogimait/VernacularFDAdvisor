"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  encodeBookingCommand,
  formatCurrencyINR,
  type FDBookingActionCommand,
} from "@/lib/fd-booking-flow";
import { useLanguage } from "@/hooks/use-language";
import { pickLocalized } from "@/lib/i18n";
import type {
  BookingInterestType,
  BookingMethod,
  FDBookingFlow,
} from "@/types/chat";

interface FDBookingCardProps {
  flow: FDBookingFlow;
  onActionClick?: (text: string) => void;
}

const TENURE_PRESETS = [6, 12, 24, 36, 60];

export function FDBookingCard({ flow, onActionClick }: FDBookingCardProps) {
  const { language } = useLanguage();
  const text = pickLocalized(language, {
    english: {
      step: "Step",
      chooseBank: "Choose a bank to begin guided FD booking.",
      bank: "Bank",
      notSelected: "Not selected",
      amount: "Amount (Rs)",
      tenureMonths: "Tenure (months)",
      interestPayout: "Interest Payout Type",
      cumulative: "Cumulative",
      nonCumulative: "Non-cumulative",
      estimate: "Estimate",
      approxRate: "Approx rate",
      estimatedMaturity: "Estimated maturity",
      estimatedYearlyPayout: "Estimated yearly payout",
      confirmFdDetails: "Confirm FD Details",
      accountKyc: "You need an active bank account and completed KYC before booking.",
      hasAccount: "I have account and KYC",
      noAccount: "I do not have account",
      chooseMethod: "Choose your preferred booking method.",
      netBanking: "Net Banking",
      mobileApp: "Mobile App",
      branchVisit: "Branch Visit",
      netBankingDesc: "Fastest if you already use internet banking",
      mobileAppDesc: "Useful if you prefer phone-based booking",
      branchVisitDesc: "Best if you want in-person support",
      actionGuide: "Action Guide",
      method: "Method",
      continueFinal: "Continue to Final Summary",
      changeAmountDuration: "Change Amount or Duration",
      finalSummary: "Final Summary",
      type: "Type",
      saveGuide: "Save this guide",
      changeDuration: "Change duration",
      compareBanks: "Compare banks",
      startAgain: "Start again",
      next: "Next",
    },
    hindi: {
      step: "स्टेप",
      chooseBank: "गाइडेड FD बुकिंग शुरू करने के लिए बैंक चुनें।",
      bank: "बैंक",
      notSelected: "चयन नहीं हुआ",
      amount: "राशि (रु)",
      tenureMonths: "अवधि (महीने)",
      interestPayout: "ब्याज भुगतान प्रकार",
      cumulative: "क्यूम्यूलेटिव",
      nonCumulative: "नॉन-क्यूम्यूलेटिव",
      estimate: "अनुमान",
      approxRate: "अनुमानित रेट",
      estimatedMaturity: "अनुमानित मैच्योरिटी",
      estimatedYearlyPayout: "अनुमानित वार्षिक भुगतान",
      confirmFdDetails: "FD विवरण पुष्टि करें",
      accountKyc: "बुकिंग से पहले सक्रिय बैंक खाता और KYC जरूरी है।",
      hasAccount: "मेरे पास खाता और KYC है",
      noAccount: "मेरे पास खाता नहीं है",
      chooseMethod: "अपना पसंदीदा बुकिंग तरीका चुनें।",
      netBanking: "नेट बैंकिंग",
      mobileApp: "मोबाइल ऐप",
      branchVisit: "ब्रांच विजिट",
      netBankingDesc: "यदि आप इंटरनेट बैंकिंग उपयोग करते हैं तो सबसे तेज",
      mobileAppDesc: "यदि आप मोबाइल से बुकिंग पसंद करते हैं",
      branchVisitDesc: "यदि आप व्यक्तिगत सहायता चाहते हैं तो बेहतर",
      actionGuide: "एक्शन गाइड",
      method: "तरीका",
      continueFinal: "फाइनल सारांश पर जाएं",
      changeAmountDuration: "राशि या अवधि बदलें",
      finalSummary: "फाइनल सारांश",
      type: "प्रकार",
      saveGuide: "यह गाइड सेव करें",
      changeDuration: "अवधि बदलें",
      compareBanks: "बैंक तुलना",
      startAgain: "फिर से शुरू करें",
      next: "अगला",
    },
    hinglish: {
      step: "Step",
      chooseBank: "Guided FD booking start karne ke liye bank choose karo.",
      bank: "Bank",
      notSelected: "Select nahi hua",
      amount: "Amount (Rs)",
      tenureMonths: "Tenure (months)",
      interestPayout: "Interest Payout Type",
      cumulative: "Cumulative",
      nonCumulative: "Non-cumulative",
      estimate: "Estimate",
      approxRate: "Approx rate",
      estimatedMaturity: "Estimated maturity",
      estimatedYearlyPayout: "Estimated yearly payout",
      confirmFdDetails: "FD details confirm karo",
      accountKyc: "Booking se pehle active bank account aur KYC zaroori hai.",
      hasAccount: "Mere paas account aur KYC hai",
      noAccount: "Mere paas account nahi hai",
      chooseMethod: "Apna preferred booking method choose karo.",
      netBanking: "Net Banking",
      mobileApp: "Mobile App",
      branchVisit: "Branch Visit",
      netBankingDesc: "Agar internet banking use karte ho to fastest",
      mobileAppDesc: "Agar phone based booking pasand ho",
      branchVisitDesc: "Agar in-person support chahiye to best",
      actionGuide: "Action Guide",
      method: "Method",
      continueFinal: "Final summary par continue karo",
      changeAmountDuration: "Amount ya duration badlo",
      finalSummary: "Final Summary",
      type: "Type",
      saveGuide: "Is guide ko save karo",
      changeDuration: "Duration badlo",
      compareBanks: "Banks compare karo",
      startAgain: "Start again",
      next: "Next",
    },
  });

  const formatMethod = (method: BookingMethod): string => {
    if (method === "net-banking") return text.netBanking;
    if (method === "mobile-app") return text.mobileApp;
    return text.branchVisit;
  };

  const formatInterestType = (type: BookingInterestType): string => {
    return type === "cumulative" ? text.cumulative : text.nonCumulative;
  };

  const methodOptions = (): Array<{ key: BookingMethod; label: string; description: string }> => {
    return [
      {
        key: "net-banking",
        label: text.netBanking,
        description: text.netBankingDesc,
      },
      {
        key: "mobile-app",
        label: text.mobileApp,
        description: text.mobileAppDesc,
      },
      {
        key: "branch-visit",
        label: text.branchVisit,
        description: text.branchVisitDesc,
      },
    ];
  };

  const { bookingState } = flow;
  const [amountInput, setAmountInput] = useState(String(bookingState.amount));
  const [tenureInput, setTenureInput] = useState(String(bookingState.tenureMonths));
  const [interestType, setInterestType] = useState<BookingInterestType>(
    bookingState.interestType
  );

  const parsedAmount = useMemo(() => {
    const value = Number(amountInput.replace(/[^\d]/g, ""));
    return Number.isFinite(value) ? value : 0;
  }, [amountInput]);

  const parsedTenure = useMemo(() => {
    const value = Number(tenureInput.replace(/[^\d]/g, ""));
    return Number.isFinite(value) ? value : 0;
  }, [tenureInput]);

  const completionPercent = Math.round(
    (flow.progress.current / flow.progress.total) * 100
  );

  const emitCommand = (command: FDBookingActionCommand) => {
    onActionClick?.(encodeBookingCommand(command));
  };

  const handleSuggestionClick = (suggestion: string) => {
    const normalized = suggestion.trim().toLowerCase();

    if (normalized === "change duration") {
      emitCommand({ type: "EDIT_DETAILS" });
      return;
    }

    if (normalized === "start again") {
      emitCommand({ type: "RESTART" });
      return;
    }

    if (normalized === "continue fd setup") {
      emitCommand({ type: "RESUME" });
      return;
    }

    if (normalized === "compare banks") {
      onActionClick?.("Compare FD options for my amount and tenure");
      return;
    }

    onActionClick?.(suggestion);
  };

  const displaySuggestionLabel = (suggestion: string): string => {
    const normalized = suggestion.trim().toLowerCase();

    if (normalized === "change duration") {
      return text.changeDuration;
    }

    if (normalized === "start again") {
      return text.startAgain;
    }

    if (normalized === "continue fd setup") {
      return pickLocalized(language, {
        english: "Continue FD setup",
        hindi: "FD सेटअप जारी रखें",
        hinglish: "Continue FD setup",
      });
    }

    if (normalized === "compare banks") {
      return text.compareBanks;
    }

    return suggestion;
  };

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border bg-background/60 px-3 py-2.5">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-primary">
            {text.step} {flow.progress.current}/{flow.progress.total} - {flow.progress.label}
          </p>
          <span className="text-[0.6875rem] font-semibold text-muted-foreground">
            {completionPercent}%
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${completionPercent}%` }}
          />
        </div>
        {flow.subtitle && (
          <p className="mt-2 text-[0.75rem] leading-relaxed text-muted-foreground">
            {flow.subtitle}
          </p>
        )}
      </div>

      {bookingState.step === "SELECT_BANK" && (
        <div className="space-y-2">
          <p className="text-[0.8125rem] leading-relaxed text-card-foreground">
            {text.chooseBank}
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {(flow.bankOptions ?? []).map((bank) => (
              <button
                key={bank}
                onClick={() => emitCommand({ type: "SELECT_BANK", bank })}
                className="rounded-lg border border-border bg-background/60 px-3 py-2 text-left text-[0.75rem] font-medium transition-colors hover:border-primary/40 hover:bg-primary/5"
              >
                {bank}
              </button>
            ))}
          </div>
        </div>
      )}

      {bookingState.step === "CONFIRM_DETAILS" && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div>
              <p className="mb-1 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">
                {text.bank}
              </p>
              <p className="rounded-md border border-border bg-muted/30 px-2 py-1.5 text-[0.75rem] font-medium text-foreground">
                {bookingState.bank ?? text.notSelected}
              </p>
            </div>
            <div>
              <p className="mb-1 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">
                {text.amount}
              </p>
              <Input
                value={amountInput}
                onChange={(event) => setAmountInput(event.target.value)}
                inputMode="numeric"
                placeholder="100000"
                className="h-8 text-[0.75rem]"
              />
            </div>
          </div>

          <div>
            <p className="mb-1 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">
              {text.tenureMonths}
            </p>
            <Input
              value={tenureInput}
              onChange={(event) => setTenureInput(event.target.value)}
              inputMode="numeric"
              placeholder="12"
              className="h-8 text-[0.75rem]"
            />
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {TENURE_PRESETS.map((months) => (
                <button
                  key={months}
                  onClick={() => setTenureInput(String(months))}
                  className="rounded-full border border-border bg-background/70 px-2 py-0.5 text-[0.6875rem] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                >
                  {months}M
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">
              {text.interestPayout}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(["cumulative", "non-cumulative"] as BookingInterestType[]).map(
                (type) => (
                  <button
                    key={type}
                    onClick={() => setInterestType(type)}
                    className={`rounded-md border px-2 py-1.5 text-[0.75rem] font-medium transition-colors ${
                      interestType === type
                        ? "border-primary/50 bg-primary/10 text-primary"
                        : "border-border bg-background/70 text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    {formatInterestType(type)}
                  </button>
                )
              )}
            </div>
          </div>

          <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2">
            <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-primary">
              {text.estimate}
            </p>
            <p className="text-[0.75rem] text-foreground">
              {text.approxRate}: {flow.estimatedRate ?? "-"}% p.a.
            </p>
            {flow.estimatedMaturity && (
              <p className="text-[0.75rem] text-foreground">
                {text.estimatedMaturity}: Rs {formatCurrencyINR(flow.estimatedMaturity)}
              </p>
            )}
            {flow.estimatedYearlyPayout && (
              <p className="text-[0.75rem] text-foreground">
                {text.estimatedYearlyPayout}: Rs {formatCurrencyINR(flow.estimatedYearlyPayout)}
              </p>
            )}
          </div>

          <Button
            onClick={() =>
              emitCommand({
                type: "CONFIRM_DETAILS",
                amount: parsedAmount,
                tenureMonths: parsedTenure,
                interestType,
              })
            }
            disabled={parsedAmount < 1000 || parsedTenure < 1}
            className="w-full"
          >
            {text.confirmFdDetails}
          </Button>
        </div>
      )}

      {bookingState.step === "ACCOUNT_CHECK" && (
        <div className="space-y-2">
          <p className="text-[0.8125rem] leading-relaxed text-card-foreground">
            {text.accountKyc}
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button
              variant="outline"
              className="h-auto justify-start px-3 py-2 text-left"
              onClick={() =>
                emitCommand({
                  type: "SET_ACCOUNT_STATUS",
                  accountStatus: "has-account",
                })
              }
            >
              {text.hasAccount}
            </Button>
            <Button
              variant="outline"
              className="h-auto justify-start px-3 py-2 text-left"
              onClick={() =>
                emitCommand({
                  type: "SET_ACCOUNT_STATUS",
                  accountStatus: "no-account",
                })
              }
            >
              {text.noAccount}
            </Button>
          </div>
        </div>
      )}

      {bookingState.step === "METHOD_SELECTION" && (
        <div className="space-y-2">
          <p className="text-[0.8125rem] leading-relaxed text-card-foreground">
            {text.chooseMethod}
          </p>
          <div className="space-y-2">
            {methodOptions().map((method) => (
              <button
                key={method.key}
                onClick={() =>
                  emitCommand({ type: "SET_METHOD", bookingMethod: method.key })
                }
                className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
              >
                <p className="text-[0.75rem] font-semibold text-foreground">
                  {method.label}
                </p>
                <p className="text-[0.6875rem] text-muted-foreground">
                  {method.description}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {bookingState.step === "EXECUTION_GUIDE" && (
        <div className="space-y-2.5">
          <div className="rounded-md border border-border bg-background/60 px-3 py-2.5">
            <p className="mb-1 text-[0.6875rem] font-semibold uppercase tracking-wider text-primary">
              {text.actionGuide} - {bookingState.bookingMethod ? formatMethod(bookingState.bookingMethod) : text.method}
            </p>
            <ol className="space-y-1.5">
              {(flow.steps ?? []).map((step, index) => (
                <li key={step} className="flex gap-2 text-[0.75rem] leading-relaxed text-foreground">
                  <span className="mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[0.625rem] font-semibold text-primary">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button onClick={() => emitCommand({ type: "PROCEED_TO_CONFIRMATION" })}>
              {text.continueFinal}
            </Button>
            <Button
              variant="outline"
              onClick={() => emitCommand({ type: "EDIT_DETAILS" })}
            >
              {text.changeAmountDuration}
            </Button>
          </div>
        </div>
      )}

      {bookingState.step === "FINAL_CONFIRMATION" && (
        <div className="space-y-2.5">
          <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2.5">
            <p className="mb-1 text-[0.6875rem] font-semibold uppercase tracking-wider text-primary">
              {text.finalSummary}
            </p>
            <ul className="space-y-1 text-[0.75rem] leading-relaxed text-foreground">
              <li>{text.bank}: {bookingState.bank ?? text.notSelected}</li>
              <li>{text.amount}: Rs {formatCurrencyINR(bookingState.amount)}</li>
              <li>{text.tenureMonths}: {bookingState.tenureMonths} months</li>
              <li>{text.type}: {formatInterestType(bookingState.interestType)}</li>
              <li>
                {text.method}: {bookingState.bookingMethod ? formatMethod(bookingState.bookingMethod) : text.notSelected}
              </li>
              <li>{text.approxRate}: {flow.estimatedRate ?? "-"}% p.a.</li>
              {flow.estimatedMaturity && (
                <li>
                  {text.estimatedMaturity}: Rs {formatCurrencyINR(flow.estimatedMaturity)}
                </li>
              )}
              {flow.estimatedYearlyPayout && (
                <li>
                  {text.estimatedYearlyPayout}: Rs {formatCurrencyINR(flow.estimatedYearlyPayout)}
                </li>
              )}
            </ul>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button
              variant="outline"
              onClick={() => emitCommand({ type: "SAVE_GUIDE" })}
            >
              {text.saveGuide}
            </Button>
            <Button
              variant="outline"
              onClick={() => emitCommand({ type: "EDIT_DETAILS" })}
            >
              {text.changeDuration}
            </Button>
            <Button
              variant="outline"
              onClick={() => onActionClick?.("Compare FD options for my amount and tenure")}
            >
              {text.compareBanks}
            </Button>
            <Button onClick={() => emitCommand({ type: "RESTART" })}>
              {text.startAgain}
            </Button>
          </div>
        </div>
      )}

      {flow.suggestions && flow.suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {flow.suggestions.map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => handleSuggestionClick(suggestion)}
              className="rounded-full border border-border bg-background/60 px-2.5 py-1 text-[0.6875rem] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            >
              {displaySuggestionLabel(suggestion)}
            </button>
          ))}
        </div>
      )}

      {flow.cta && (
        <p className="text-[0.75rem] leading-relaxed text-muted-foreground">
          {text.next}: {flow.cta}
        </p>
      )}
    </div>
  );
}
