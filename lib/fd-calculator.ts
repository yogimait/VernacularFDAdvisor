/**
 * FD Calculator — Compound Interest Formula
 * A = P × (1 + r/n)^(n×t)
 *
 * P = principal, r = annual rate (decimal), n = compounding frequency, t = years
 */

export interface FDCalcResult {
  principal: number;
  rate: number;
  tenureMonths: number;
  maturityAmount: number;
  interestEarned: number;
  compounding: "quarterly" | "monthly" | "yearly";
}

export function calculateFD(
  principal: number,
  annualRate: number,
  tenureMonths: number,
  compounding: "quarterly" | "monthly" | "yearly" = "quarterly"
): FDCalcResult {
  const r = annualRate / 100;
  const t = tenureMonths / 12;

  // Compounding frequency
  const nMap = { monthly: 12, quarterly: 4, yearly: 1 };
  const n = nMap[compounding];

  const maturityAmount = Math.round(principal * Math.pow(1 + r / n, n * t));
  const interestEarned = maturityAmount - principal;

  return {
    principal,
    rate: annualRate,
    tenureMonths,
    maturityAmount,
    interestEarned,
    compounding,
  };
}
