"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RiCloseLine, RiCalculatorLine } from "@remixicon/react";
import { calculateFD } from "@/lib/fd-calculator";

interface FDCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FDCalculatorModal({ isOpen, onClose }: FDCalculatorModalProps) {
  const [amount, setAmount] = useState("");
  const [rate, setRate] = useState("");
  const [tenure, setTenure] = useState("");
  const [result, setResult] = useState<{
    maturity: number;
    interest: number;
  } | null>(null);

  const handleCalculate = () => {
    const p = parseFloat(amount);
    const r = parseFloat(rate);
    const t = parseInt(tenure);

    if (!p || !r || !t || p <= 0 || r <= 0 || t <= 0) return;

    const res = calculateFD(p, r, t, "quarterly");
    setResult({ maturity: res.maturityAmount, interest: res.interestEarned });
  };

  const handleReset = () => {
    setAmount("");
    setRate("");
    setTenure("");
    setResult(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-2xl animate-[fadeInUp_0.2s_ease-out_both]">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <RiCalculatorLine className="size-4" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">
              FD Calculator
            </h3>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <RiCloseLine className="size-4" />
          </Button>
        </div>

        {/* Inputs */}
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-[0.6875rem] font-medium text-muted-foreground uppercase tracking-wider">
              Amount (₹)
            </label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="50000"
              className="text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-[0.6875rem] font-medium text-muted-foreground uppercase tracking-wider">
              Interest Rate (% p.a.)
            </label>
            <Input
              type="number"
              step="0.1"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              placeholder="7.5"
              className="text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-[0.6875rem] font-medium text-muted-foreground uppercase tracking-wider">
              Tenure (months)
            </label>
            <Input
              type="number"
              value={tenure}
              onChange={(e) => setTenure(e.target.value)}
              placeholder="12"
              className="text-sm"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 flex gap-2">
          <Button onClick={handleCalculate} className="flex-1" size="sm">
            Calculate
          </Button>
          <Button
            onClick={handleReset}
            variant="outline"
            size="sm"
            className="shrink-0"
          >
            Reset
          </Button>
        </div>

        {/* Result */}
        {result && (
          <div className="mt-4 rounded-xl border border-chart-1/20 bg-chart-1/5 p-3.5 animate-[fadeInUp_0.2s_ease-out_both]">
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-[0.6875rem] font-medium text-muted-foreground uppercase tracking-wider">
                Maturity Amount
              </span>
              <span className="text-lg font-bold text-chart-1">
                ₹{result.maturity.toLocaleString("en-IN")}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-[0.6875rem] font-medium text-muted-foreground uppercase tracking-wider">
                Interest Earned
              </span>
              <span className="text-sm font-semibold text-foreground">
                ₹{result.interest.toLocaleString("en-IN")}
              </span>
            </div>
            <p className="mt-2 text-[0.625rem] text-muted-foreground">
              * Quarterly compounding. Approximate values.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
