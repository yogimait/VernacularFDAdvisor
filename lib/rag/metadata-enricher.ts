/**
 * Metadata Enricher Module
 *
 * Attaches rich, searchable metadata to every chunk using a
 * 3-layer hybrid topic detection approach:
 *   Layer 1: Heading context (strongest signal)
 *   Layer 2: Filename clues
 *   Layer 3: Keyword scan (fallback)
 *
 * Also handles bank detection with the same hybrid priority.
 */

import type {
  ChunkTopic,
  BankName,
  DocumentCategory,
  SourceOrg,
  ChunkMetadata,
} from "./types";

// ─── Heading-to-Topic Mapping (Layer 1) ──────────────────────────

/**
 * Map heading text patterns to topics.
 * This is the strongest signal — if a chunk falls under a known heading,
 * we use it directly without keyword guessing.
 */
const HEADING_TOPIC_MAP: Array<[RegExp, ChunkTopic]> = [
  // Interest rates headings
  [/interest\s+rate/i, "interest_rates"],
  [/current\s+.*rate/i, "interest_rates"],
  [/rate\s+structure/i, "interest_rates"],
  [/fd\s+interest/i, "interest_rates"],
  [/rates?\s+for\s+(regular|general|senior)/i, "interest_rates"],
  [/bulk\s+deposit/i, "interest_rates"],

  // Premature withdrawal
  [/premature\s+(withdrawal|closure)/i, "premature_withdrawal"],
  [/early\s+closure/i, "premature_withdrawal"],
  [/penalty/i, "premature_withdrawal"],

  // Taxation
  [/tax(ation)?\s*(and|&)?\s*tds/i, "taxation"],
  [/tds\s*(regulation|rule|threshold)/i, "taxation"],
  [/80c/i, "taxation"],
  [/tax\s+sav(ing|er)/i, "taxation"],
  [/form\s+(15g|15h|121)/i, "taxation"],

  // Insurance / DICGC
  [/deposit\s+insurance/i, "deposit_insurance"],
  [/dicgc/i, "deposit_insurance"],
  [/insurance\s+(coverage|scheme|limit)/i, "deposit_insurance"],

  // Senior citizen
  [/senior\s+citizen/i, "senior_citizen_benefits"],
  [/super\s+senior/i, "senior_citizen_benefits"],

  // KYC / Documentation
  [/kyc/i, "kyc_documentation"],
  [/eligibility\s*(and)?\s*document/i, "kyc_documentation"],
  [/document\s+require/i, "kyc_documentation"],

  // NRI
  [/nri/i, "nri_deposits"],
  [/nre\s*(and|&|\/)?\s*nro/i, "nri_deposits"],
  [/non.?resident/i, "nri_deposits"],
  [/offshore/i, "nri_deposits"],

  // Liquidity facilities
  [/sweep/i, "liquidity_facilities"],
  [/loan\s+against/i, "liquidity_facilities"],
  [/overdraft/i, "liquidity_facilities"],
  [/flexi/i, "liquidity_facilities"],
  [/liquidity/i, "liquidity_facilities"],

  // FD Basics
  [/what\s+is\s+fd/i, "fd_basics"],
  [/fixed\s+deposit\s+(basics?|overview)/i, "fd_basics"],
  [/fd\s+basics/i, "fd_basics"],

  // FD Schemes
  [/special(ized|ised)?\s+.*scheme/i, "fd_schemes"],
  [/fd\s+(scheme|variant|product)/i, "fd_schemes"],
  [/auto\s+fixed\s+deposit/i, "fd_schemes"],

  // Savings account
  [/savings?\s+account/i, "savings_account"],

  // Fraud
  [/fraud/i, "fraud_awareness"],

  // Investor education
  [/investor\s+(awareness|education)/i, "investor_education"],
  [/financial\s+education/i, "investor_education"],

  // Ombudsman
  [/ombudsman/i, "banking_ombudsman"],

  // Eligibility
  [/eligibility/i, "eligibility"],

  // Interest calculation
  [/interest\s+calculation/i, "interest_rates"],
  [/interest\s+payout/i, "quarterly_payout"],
  [/payout\s*(regulation|rule|option)/i, "quarterly_payout"],

  // Deposit policy
  [/deposit\s+policy/i, "deposit_policy"],

  // General banking
  [/banking\s+basics/i, "general_banking"],
  [/core\s+.*feature/i, "fd_schemes"],

  // Account opening / limits
  [/account\s+opening/i, "eligibility"],
  [/deposit\s+limit/i, "eligibility"],
];

// ─── Filename-to-Topic Mapping (Layer 2) ──────────────────────────

/**
 * Default topic inferred from filename when heading context is absent.
 */
const FILENAME_TOPIC_MAP: Array<[RegExp, ChunkTopic]> = [
  [/tax[- ]?rules/i, "taxation"],
  [/premature[- ]?withdrawal/i, "premature_withdrawal"],
  [/fd[- ]?basics/i, "fd_basics"],
  [/savings[- ]?account/i, "savings_account"],
  [/difference.*fd.*rd.*savings/i, "fd_vs_rd_vs_savings"],
  [/quarterly/i, "quarterly_payout"],
  [/rural/i, "rural_banking"],
  [/multilingual/i, "multilingual_access"],
  [/bank[- ]?info/i, "general_banking"],
  [/banks[- ]?fd/i, "interest_rates"],
  [/fd[- ]?info/i, "fd_basics"],
  [/DICGC/i, "deposit_insurance"],
  [/ombudsman/i, "banking_ombudsman"],
  [/fraud/i, "fraud_awareness"],
  [/KYC/i, "kyc_documentation"],
  [/investor[- ]?awareness/i, "investor_education"],
  [/financial[- ]?education/i, "investor_education"],
  [/deposit[- ]?policy/i, "deposit_policy"],
  [/terms?\s*(and|&)\s*conditions/i, "fd_schemes"],
  [/r&r|rule|regulation/i, "fd_schemes"],
  [/trend/i, "interest_rates"],
];

// ─── Keyword-to-Topic Mapping (Layer 3 — Fallback) ───────────────

/**
 * Keyword scan used only when layers 1-2 don't produce a match.
 * Each entry: [keywords to look for, resulting topic, minimum matches needed]
 */
const KEYWORD_TOPIC_MAP: Array<{
  keywords: string[];
  topic: ChunkTopic;
  minMatches: number;
}> = [
  {
    keywords: ["interest rate", "% p.a", "per annum", "rate of interest"],
    topic: "interest_rates",
    minMatches: 1,
  },
  {
    keywords: ["premature", "penalty", "early closure", "break", "pre-mature"],
    topic: "premature_withdrawal",
    minMatches: 2,
  },
  {
    keywords: ["tax", "tds", "80c", "form 15g", "form 15h", "form 121", "taxable"],
    topic: "taxation",
    minMatches: 2,
  },
  {
    keywords: ["dicgc", "deposit insurance", "₹5 lakh", "insured", "insurance"],
    topic: "deposit_insurance",
    minMatches: 2,
  },
  {
    keywords: ["senior citizen", "60+", "aged 60", "super senior", "additional premium"],
    topic: "senior_citizen_benefits",
    minMatches: 1,
  },
  {
    keywords: ["kyc", "aadhaar", "pan card", "identity proof", "address proof"],
    topic: "kyc_documentation",
    minMatches: 2,
  },
  {
    keywords: ["nri", "nre", "nro", "fcnr", "non-resident", "repatriable"],
    topic: "nri_deposits",
    minMatches: 2,
  },
  {
    keywords: ["sweep", "loan against", "overdraft", "flexi", "credit card against fd"],
    topic: "liquidity_facilities",
    minMatches: 1,
  },
  {
    keywords: ["savings account", "demand deposit", "on-demand"],
    topic: "savings_account",
    minMatches: 1,
  },
  {
    keywords: ["fraud", "scam", "phishing", "cyber"],
    topic: "fraud_awareness",
    minMatches: 1,
  },
  {
    keywords: ["monthly payout", "quarterly payout", "non-cumulative", "regular income"],
    topic: "quarterly_payout",
    minMatches: 1,
  },
  {
    keywords: ["rural", "village", "financial inclusion", "unbanked"],
    topic: "rural_banking",
    minMatches: 1,
  },
];

// ─── Bank Detection (Layer 2 — Content-based) ────────────────────

const CONTENT_BANK_MAP: Array<[RegExp, BankName]> = [
  [/\bState\s+Bank\s+of\s+India\b|\bSBI\b/i, "SBI"],
  [/\bHDFC\s+Bank\b/i, "HDFC"],
  [/\bICICI\s+Bank\b/i, "ICICI"],
  [/\bAxis\s+Bank\b/i, "Axis"],
  [/\bSuryoday\b|\bSSFB\b/i, "Suryoday"],
];

// ─── Hybrid Detection Functions ──────────────────────────────────

/**
 * Layer 1: Detect topic from the heading the chunk falls under.
 */
function topicFromHeading(headingContext: string | null): ChunkTopic | null {
  if (!headingContext) return null;

  for (const [pattern, topic] of HEADING_TOPIC_MAP) {
    if (pattern.test(headingContext)) {
      return topic;
    }
  }
  return null;
}

/**
 * Layer 2: Detect topic from the source filename.
 */
function topicFromFilename(source: string): ChunkTopic | null {
  for (const [pattern, topic] of FILENAME_TOPIC_MAP) {
    if (pattern.test(source)) {
      return topic;
    }
  }
  return null;
}

/**
 * Layer 3: Detect topic from chunk content via keyword scanning.
 */
function topicFromKeywords(content: string): ChunkTopic | null {
  const lower = content.toLowerCase();
  let bestTopic: ChunkTopic | null = null;
  let bestScore = 0;

  for (const entry of KEYWORD_TOPIC_MAP) {
    let matches = 0;
    for (const keyword of entry.keywords) {
      if (lower.includes(keyword.toLowerCase())) {
        matches++;
      }
    }
    if (matches >= entry.minMatches && matches > bestScore) {
      bestScore = matches;
      bestTopic = entry.topic;
    }
  }

  return bestTopic;
}

/**
 * Detect bank from chunk content (Layer 2 of bank detection).
 * Used when filename didn't reveal a bank.
 */
function detectBankFromContent(content: string): BankName {
  for (const [pattern, bank] of CONTENT_BANK_MAP) {
    if (pattern.test(content)) {
      return bank;
    }
  }
  return null;
}

// ─── Main Enrichment ─────────────────────────────────────────────

/**
 * Builds complete chunk metadata using the 3-layer hybrid approach.
 *
 * @param text - The chunk text content
 * @param headingContext - The heading this chunk falls under (if any)
 * @param source - Source filename
 * @param category - Document category
 * @param sourceOrg - Source organization
 * @param fileBank - Bank detected from filename (may be null)
 */
export function enrichMetadata(
  text: string,
  headingContext: string | null,
  source: string,
  category: DocumentCategory,
  sourceOrg: SourceOrg,
  fileBank: BankName,
  sourceId?: string
): ChunkMetadata {
  // Hybrid topic detection: heading → filename → keywords → fallback
  const topic =
    topicFromHeading(headingContext) ??
    topicFromFilename(source) ??
    topicFromKeywords(text) ??
    "general";

  // Hybrid bank detection: filename → content
  const bank = fileBank ?? detectBankFromContent(text);

  const words = text.trim().split(/\s+/);

  return {
    source,
    sourceId,
    category,
    sourceOrg,
    topic,
    bank,
    language: "english",
    headingContext,
    wordCount: words.length,
    charCount: text.length,
  };
}
