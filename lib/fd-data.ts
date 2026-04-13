import type { FDOption } from "@/types/chat";

/**
 * Static FD dataset — realistic Indian bank rates (April 2026 approx.)
 * Covers major banks, small finance banks, and post office.
 */
export const FD_DATA: FDOption[] = [
  // ── Large Public Sector Banks ──
  {
    bank: "SBI (State Bank of India)",
    rate: 6.8,
    tenure: 12,
    minAmount: 1000,
    category: "public",
  },
  {
    bank: "SBI (State Bank of India)",
    rate: 7.0,
    tenure: 24,
    minAmount: 1000,
    category: "public",
  },
  {
    bank: "SBI (State Bank of India)",
    rate: 6.5,
    tenure: 36,
    minAmount: 1000,
    category: "public",
  },

  // ── Large Private Banks ──
  {
    bank: "HDFC Bank",
    rate: 7.25,
    tenure: 12,
    minAmount: 5000,
    category: "private",
  },
  {
    bank: "HDFC Bank",
    rate: 7.1,
    tenure: 24,
    minAmount: 5000,
    category: "private",
  },
  {
    bank: "ICICI Bank",
    rate: 7.1,
    tenure: 12,
    minAmount: 10000,
    category: "private",
  },
  {
    bank: "ICICI Bank",
    rate: 7.0,
    tenure: 24,
    minAmount: 10000,
    category: "private",
  },
  {
    bank: "Axis Bank",
    rate: 7.15,
    tenure: 12,
    minAmount: 5000,
    category: "private",
  },

  // ── Small Finance Banks (higher rates, higher risk) ──
  {
    bank: "Suryoday Small Finance Bank",
    rate: 8.5,
    tenure: 12,
    minAmount: 5000,
    category: "small-finance",
  },
  {
    bank: "Suryoday Small Finance Bank",
    rate: 8.25,
    tenure: 24,
    minAmount: 5000,
    category: "small-finance",
  },
  {
    bank: "Unity Small Finance Bank",
    rate: 8.25,
    tenure: 12,
    minAmount: 5000,
    category: "small-finance",
  },
  {
    bank: "Unity Small Finance Bank",
    rate: 8.0,
    tenure: 24,
    minAmount: 5000,
    category: "small-finance",
  },
  {
    bank: "Utkarsh Small Finance Bank",
    rate: 8.3,
    tenure: 12,
    minAmount: 1000,
    category: "small-finance",
  },

  // ── Post Office ──
  {
    bank: "Post Office FD",
    rate: 7.5,
    tenure: 12,
    minAmount: 1000,
    category: "government",
  },
  {
    bank: "Post Office FD",
    rate: 7.5,
    tenure: 24,
    minAmount: 1000,
    category: "government",
  },
  {
    bank: "Post Office FD",
    rate: 7.5,
    tenure: 36,
    minAmount: 1000,
    category: "government",
  },
];

/**
 * Finds best FD options matching user criteria.
 * Returns top 3 sorted by interest rate (highest first).
 */
export function findBestFDs(
  amount?: number,
  tenureMonths?: number
): FDOption[] {
  let filtered = [...FD_DATA];

  // Filter by minimum amount
  if (amount && amount > 0) {
    filtered = filtered.filter((fd) => amount >= fd.minAmount);
  }

  // Filter by tenure (allow ±6 month tolerance for flexible matching)
  if (tenureMonths && tenureMonths > 0) {
    filtered = filtered.filter(
      (fd) =>
        fd.tenure >= tenureMonths - 6 && fd.tenure <= tenureMonths + 6
    );
  }

  // If no tenure filter, show 12-month options by default
  if (!tenureMonths) {
    filtered = filtered.filter((fd) => fd.tenure === 12);
  }

  // Sort by rate descending, take top 3
  return filtered.sort((a, b) => b.rate - a.rate).slice(0, 3);
}

/**
 * Formats matched FD options into a readable string for the LLM.
 */
export function formatFDOptionsForPrompt(
  options: FDOption[],
  amount?: number,
  tenure?: number
): string {
  if (options.length === 0) {
    return "No matching FD options found for the given criteria.";
  }

  let result = `FD RECOMMENDATIONS (based on`;
  if (amount) result += ` ₹${amount.toLocaleString("en-IN")}`;
  if (tenure) result += ` for ${tenure} months`;
  result += `):\n\n`;

  options.forEach((fd, i) => {
    const maturity =
      amount && amount > 0
        ? Math.round(amount * (1 + fd.rate / 100 * (fd.tenure / 12)))
        : null;

    result += `Option ${i + 1}: ${fd.bank}\n`;
    result += `  Rate: ${fd.rate}% p.a.\n`;
    result += `  Tenure: ${fd.tenure} months\n`;
    result += `  Min Amount: ₹${fd.minAmount.toLocaleString("en-IN")}\n`;
    result += `  Category: ${fd.category}\n`;
    if (maturity) {
      result += `  Approx Maturity: ₹${maturity.toLocaleString("en-IN")}\n`;
    }
    result += `\n`;
  });

  return result;
}
