import type { FDOption } from "@/types/chat";
import bankFdInfo from "@/fd-info/bank-fd-info.json";

/**
 * Static fallback FD dataset for resilience.
 * Primary source now comes from fd-info/bank-fd-info.json.
 */
const FALLBACK_FD_DATA: FDOption[] = [
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

interface BankFdSchemeRecord {
  tenor?: string;
  general_interest_rate_pa?: string;
}

interface BankFdInstitutionRecord {
  institution_type?: string;
  bank_name?: string;
  deposit_amount_limit?: string;
  schemes?: BankFdSchemeRecord[];
}

interface BankFdInfoPayload {
  indian_bank_fd_schemes?: BankFdInstitutionRecord[];
}

function parseFirstRate(rateText: string | undefined): number | null {
  if (!rateText) {
    return null;
  }

  const match = rateText.match(/(\d+(?:\.\d+)?)/);
  if (!match) {
    return null;
  }

  const rate = Number(match[1]);
  return Number.isFinite(rate) ? rate : null;
}

function parseRepresentativeTenureMonths(tenorText: string | undefined): number {
  if (!tenorText) {
    return 12;
  }

  const text = tenorText.toLowerCase();

  const candidates: Array<{ index: number; months: number }> = [];

  for (const match of text.matchAll(/(\d+(?:\.\d+)?)\s*year/g)) {
    candidates.push({ index: match.index ?? 0, months: Number(match[1]) * 12 });
  }

  for (const match of text.matchAll(/(\d+(?:\.\d+)?)\s*month/g)) {
    candidates.push({ index: match.index ?? 0, months: Number(match[1]) });
  }

  for (const match of text.matchAll(/(\d+(?:\.\d+)?)\s*day/g)) {
    candidates.push({ index: match.index ?? 0, months: Number(match[1]) / 30 });
  }

  if (candidates.length > 0) {
    candidates.sort((a, b) => a.index - b.index);
    return Math.max(1, Math.round(candidates[0].months));
  }

  if (/tax[-\s]*saving|tax[-\s]*saver/.test(text)) {
    return 60;
  }

  if (/standard/.test(text)) {
    return 24;
  }

  return 12;
}

function toCategory(
  institutionType: string | undefined,
  bankName: string
): FDOption["category"] {
  const signal = `${institutionType ?? ""} ${bankName}`.toLowerCase();

  if (signal.includes("post office")) {
    return "government";
  }

  if (signal.includes("small finance")) {
    return "small-finance";
  }

  if (signal.includes("public sector") || signal.includes("state bank")) {
    return "public";
  }

  if (signal.includes("government")) {
    return "government";
  }

  return "private";
}

function inferMinAmount(
  category: FDOption["category"],
  depositLimitText: string | undefined
): number {
  const text = (depositLimitText ?? "").toLowerCase();

  if (text.includes("below rs 3 crore") || text.includes("retail deposits")) {
    return category === "public" || category === "government" ? 1000 : 5000;
  }

  if (category === "government" || category === "public") {
    return 1000;
  }

  if (category === "small-finance") {
    return 5000;
  }

  return 10000;
}

function buildFDDataFromJson(): FDOption[] {
  const payload = bankFdInfo as BankFdInfoPayload;
  const records = payload.indian_bank_fd_schemes ?? [];

  const mapped: FDOption[] = [];

  for (const record of records) {
    const bankName = record.bank_name?.trim();
    if (!bankName) {
      continue;
    }

    const category = toCategory(record.institution_type, bankName);
    const minAmount = inferMinAmount(category, record.deposit_amount_limit);

    for (const scheme of record.schemes ?? []) {
      const rate = parseFirstRate(scheme.general_interest_rate_pa);
      if (rate === null) {
        continue;
      }

      mapped.push({
        bank: bankName,
        rate,
        tenure: parseRepresentativeTenureMonths(scheme.tenor),
        minAmount,
        category,
      });
    }
  }

  const merged = [...mapped, ...FALLBACK_FD_DATA];
  const seen = new Set<string>();
  const deduped: FDOption[] = [];

  for (const item of merged) {
    const key = `${item.bank.toLowerCase()}|${item.tenure}|${item.rate}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(item);
  }

  return deduped;
}

export const FD_DATA: FDOption[] = buildFDDataFromJson();

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

  let result = `FD RECOMMENDATIONS (source: fd-info/bank-fd-info.json, based on`;
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
