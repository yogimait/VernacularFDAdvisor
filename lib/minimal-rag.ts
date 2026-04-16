import { promises as fs } from "fs";
import path from "path";
import bankFdInfo from "@/fd-info/bank-fd-info.json";
import userFdData from "@/fd-info/user-fd-data.json";
import yearlyData from "@/fd-info/yearly-data.json";

export type KnowledgeType =
  | "fd_basics"
  | "fd_rates"
  | "tax"
  | "rural"
  | "banking"
  | "market"
  | "user_context";

export interface KnowledgeChunkMetadata {
  type: KnowledgeType;
  topic: string;
  language: "general";
  source: string;
  keywords: string[];
}

export interface KnowledgeChunk {
  id: string;
  content: string;
  metadata: KnowledgeChunkMetadata;
  wordCount: number;
}

export interface RetrieveKnowledgeOptions {
  limit?: number;
  preferredType?: KnowledgeType;
  retrievalQuery?: string;
}

export interface KnowledgeRetrievalResult {
  detectedType: KnowledgeType;
  normalizedQuery: string;
  chunks: KnowledgeChunk[];
}

interface TextSourceDefinition {
  fileName: string;
  type: KnowledgeType;
  topic: string;
  keywords: string[];
}

interface BankFdSchemeRecord {
  tenor?: string;
  general_interest_rate_pa?: string;
  senior_citizen_interest_rate_pa?: string;
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

interface UserFdDataPayload {
  indian_fd_user_demographics_2024?: {
    user_tenor_preferences?: Array<{
      tenor_bucket?: string;
      number_of_accounts_thousands?: number;
      amount_outstanding_cr?: number;
      popularity_rank?: number;
    }>;
    deposits_by_population_group?: Array<{
      region_type?: string;
      number_of_accounts_thousands?: number;
      amount_outstanding_cr?: number;
    }>;
    user_business_logic_limits?: {
      dicgc_insurance_safety_limit_inr?: number;
      tax_saving_fd_max_investment_inr?: number;
      tax_saving_fd_lock_in_years?: number;
      tds_tax_rules_fy_2025_26?: {
        tds_exemption_limit_regular_citizen_inr?: number;
        tds_exemption_limit_senior_citizen_inr?: number;
        tds_rate_with_pan_card_percent?: number;
        tds_rate_without_pan_card_percent?: number;
      };
    };
  };
}

interface YearlyDataPayload {
  yearly_fd_macro_data?: {
    yearly_records?: Array<{
      financial_year?: string;
      user_term_deposits?: {
        total_accounts_thousands?: number;
        total_amount_cr?: number;
      };
      bank_population_group_deposits?: {
        rural_accounts_thousands?: number;
        rural_amount_cr?: number;
        urban_accounts_thousands?: number;
        urban_amount_cr?: number;
      };
      dicgc_insurance_scheme?: {
        fully_protected_accounts_lakh?: number;
        insured_deposits_cr?: number;
      };
      average_bank_scheme_rates_pa?: {
        term_deposits_1_to_3_years?: string;
        term_deposits_3_to_5_years?: string;
      };
    }>;
  };
}

const TEXT_SOURCES: TextSourceDefinition[] = [
  {
    fileName: "fd-basics.txt",
    type: "fd_basics",
    topic: "fd_concepts",
    keywords: ["fixed deposit", "maturity", "interest", "tenure", "premature"],
  },
  {
    fileName: "tax-rules.txt",
    type: "tax",
    topic: "fd_taxation",
    keywords: ["tax", "tds", "deduction", "pan", "tax-saving"],
  },
  {
    fileName: "bank-info.txt",
    type: "banking",
    topic: "banking_concepts",
    keywords: ["bank", "savings account", "loan", "retail bank", "investment bank"],
  },
  {
    fileName: "banks-fd.txt",
    type: "fd_rates",
    topic: "bank_fd_rates",
    keywords: ["fd rates", "bank comparison", "senior citizen", "tenor"],
  },
  {
    fileName: "rural-fd.txt",
    type: "rural",
    topic: "rural_fd_access",
    keywords: ["rural", "digital banking", "connectivity", "fraud", "financial inclusion"],
  },
  {
    fileName: "multilingual-issue.txt",
    type: "user_context",
    topic: "multilingual_support",
    keywords: ["multilingual", "regional language", "voice", "code-mix", "inclusion"],
  },
  {
    fileName: "fd-info.txt",
    type: "market",
    topic: "macro_finance_context",
    keywords: ["market", "inflation", "interest rates", "ai", "wealth management"],
  },
];

const TYPE_KEYWORDS: Record<KnowledgeType, string[]> = {
  fd_basics: [
    "fixed deposit",
    "fd",
    "maturity",
    "interest",
    "tenure",
    "premature",
    "penalty",
    "safe",
  ],
  fd_rates: [
    "rate",
    "rates",
    "best",
    "highest",
    "compare",
    "bank",
    "tenure",
    "months",
    "sbi",
    "hdfc",
    "icici",
    "yes bank",
    "suryoday",
    "kotak",
    "post office",
    "unity",
    "utkarsh",
  ],
  tax: [
    "tax",
    "tds",
    "80c",
    "deduction",
    "pan",
    "tax-saving",
    "tax saver",
    "income tax",
    "form 15g",
    "form 15h",
    "senior citizen",
  ],
  rural: [
    "rural",
    "village",
    "connectivity",
    "digital literacy",
    "fraud",
    "regional",
    "offline",
  ],
  banking: [
    "banking",
    "bank",
    "savings account",
    "current account",
    "credit union",
    "investment bank",
    "central bank",
    "loan",
    "kyc",
  ],
  market: [
    "inflation",
    "global",
    "market",
    "geopolitical",
    "debt",
    "economy",
    "interest cycle",
    "ai integration",
  ],
  user_context: [
    "user",
    "demographics",
    "insurance",
    "dicgc",
    "trend",
    "yearly",
    "rural accounts",
    "urban accounts",
  ],
};

const QUERY_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bfd\b/gi, "fixed deposit"],
  [/\bbyaaj\b/gi, "interest"],
  [/\bsudh\b/gi, "interest"],
  [/\bkar\b/gi, "tax"],
  [/\bkitna\b/gi, "how much"],
  [/\bsuraksha\b/gi, "safety"],
  [/\bbest\b/gi, "best"],
  [/\bkitne time\b/gi, "tenure"],
  [/\blakh\b/gi, "100000"],
  [/\bcrore\b/gi, "10000000"],
];

const STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "is",
  "are",
  "was",
  "were",
  "and",
  "or",
  "for",
  "to",
  "of",
  "in",
  "on",
  "with",
  "at",
  "as",
  "by",
  "from",
  "be",
  "this",
  "that",
  "it",
  "about",
  "into",
  "your",
  "you",
  "me",
  "my",
  "do",
  "does",
  "can",
  "should",
  "will",
  "please",
  "tell",
  "explain",
]);

let knowledgeCache: Promise<KnowledgeChunk[]> | null = null;

function normalizeWhitespace(value: string): string {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/\t/g, " ")
    .replace(/[ \u00A0]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function countWords(text: string): number {
  const cleaned = text.trim();
  if (!cleaned) {
    return 0;
  }

  return cleaned.split(/\s+/).length;
}

function splitLongParagraph(paragraph: string, maxWords: number): string[] {
  const sentenceParts = paragraph
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (sentenceParts.length <= 1) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    const chunks: string[] = [];

    for (let index = 0; index < words.length; index += maxWords) {
      chunks.push(words.slice(index, index + maxWords).join(" "));
    }

    return chunks;
  }

  const chunks: string[] = [];
  let buffer: string[] = [];
  let bufferWords = 0;

  for (const sentence of sentenceParts) {
    const sentenceWords = countWords(sentence);
    if (bufferWords + sentenceWords > maxWords && buffer.length > 0) {
      chunks.push(buffer.join(" ").trim());
      buffer = [sentence];
      bufferWords = sentenceWords;
      continue;
    }

    buffer.push(sentence);
    bufferWords += sentenceWords;
  }

  if (buffer.length > 0) {
    chunks.push(buffer.join(" ").trim());
  }

  return chunks;
}

function chunkTextByWords(
  text: string,
  minWords = 90,
  maxWords = 260
): string[] {
  const paragraphs = normalizeWhitespace(text)
    .split(/\n\n+/)
    .map((paragraph) =>
      paragraph
        .replace(/^[-*]\s+/gm, "")
        .replace(/^\d+\.\s+/gm, "")
        .trim()
    )
    .filter(Boolean);

  const chunks: string[] = [];
  let buffer = "";
  let bufferWords = 0;

  const flushBuffer = () => {
    if (!buffer.trim()) {
      return;
    }

    chunks.push(buffer.trim());
    buffer = "";
    bufferWords = 0;
  };

  for (const paragraph of paragraphs) {
    const paragraphWords = countWords(paragraph);

    const segments =
      paragraphWords > maxWords ? splitLongParagraph(paragraph, maxWords) : [paragraph];

    for (const segment of segments) {
      const segmentWords = countWords(segment);

      if (bufferWords + segmentWords > maxWords && bufferWords >= minWords) {
        flushBuffer();
      }

      if (!buffer) {
        buffer = segment;
        bufferWords = segmentWords;
      } else {
        buffer = `${buffer}\n\n${segment}`;
        bufferWords += segmentWords;
      }

      if (bufferWords >= maxWords) {
        flushBuffer();
      }
    }
  }

  flushBuffer();

  if (chunks.length > 1) {
    const lastChunk = chunks[chunks.length - 1];
    if (countWords(lastChunk) < minWords) {
      chunks[chunks.length - 2] = `${chunks[chunks.length - 2]}\n\n${lastChunk}`;
      chunks.pop();
    }
  }

  return chunks;
}

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function inferTopic(type: KnowledgeType, fallback: string, content: string): string {
  const text = content.toLowerCase();

  if (type === "tax") {
    if (text.includes("tds")) return "tds_rules";
    if (text.includes("80c")) return "tax_saving_fd";
    return fallback;
  }

  if (type === "fd_basics") {
    if (text.includes("premature")) return "premature_withdrawal";
    if (text.includes("compounding")) return "compounding";
    return fallback;
  }

  if (type === "fd_rates") {
    if (text.includes("senior")) return "senior_citizen_rates";
    if (text.includes("small finance")) return "small_finance_rates";
    return fallback;
  }

  if (type === "rural") {
    if (text.includes("connectivity")) return "connectivity_barriers";
    if (text.includes("fraud")) return "fraud_trust_barriers";
    return fallback;
  }

  if (type === "user_context") {
    if (text.includes("multilingual") || text.includes("regional language")) {
      return "multilingual_access";
    }
    return fallback;
  }

  return fallback;
}

function tokenize(text: string): string[] {
  const normalized = text.toLowerCase().replace(/[^a-z0-9\s-]/g, " ");
  const raw = normalized.split(/\s+/).filter(Boolean);

  return raw.filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

function normalizeQueryToEnglish(query: string): string {
  let normalized = query;

  for (const [pattern, replacement] of QUERY_REPLACEMENTS) {
    normalized = normalized.replace(pattern, replacement);
  }

  return normalizeWhitespace(normalized);
}

function detectKnowledgeType(
  query: string,
  preferredType?: KnowledgeType
): KnowledgeType {
  const lowerQuery = query.toLowerCase();
  let winner: KnowledgeType = preferredType ?? "fd_basics";
  let winnerScore = preferredType ? 2 : 0;

  const allTypes = Object.keys(TYPE_KEYWORDS) as KnowledgeType[];

  for (const type of allTypes) {
    const keywords = TYPE_KEYWORDS[type];
    let score = type === preferredType ? 2 : 0;

    for (const keyword of keywords) {
      if (lowerQuery.includes(keyword)) {
        score += keyword.includes(" ") ? 3 : 2;
      }
    }

    if (score > winnerScore) {
      winner = type;
      winnerScore = score;
    }
  }

  return winner;
}

function buildChunkFromText(
  source: TextSourceDefinition,
  content: string,
  index: number
): KnowledgeChunk {
  const topic = inferTopic(source.type, source.topic, content);

  return {
    id: `${source.fileName}:${index + 1}`,
    content,
    wordCount: countWords(content),
    metadata: {
      type: source.type,
      topic,
      language: "general",
      source: source.fileName,
      keywords: source.keywords,
    },
  };
}

async function loadTextSourceChunks(source: TextSourceDefinition): Promise<KnowledgeChunk[]> {
  const filePath = path.join(process.cwd(), "fd-info", source.fileName);
  const raw = await fs.readFile(filePath, "utf8");
  const chunks = chunkTextByWords(raw);

  return chunks.map((chunk, index) => buildChunkFromText(source, chunk, index));
}

function buildBankRateChunks(): KnowledgeChunk[] {
  const payload = bankFdInfo as BankFdInfoPayload;
  const records = payload.indian_bank_fd_schemes ?? [];
  const chunks: KnowledgeChunk[] = [];

  records.forEach((record, index) => {
    if (!record.bank_name) {
      return;
    }

    const schemeLines = (record.schemes ?? [])
      .slice(0, 4)
      .map((scheme) => {
        const tenor = scheme.tenor ?? "tenure not specified";
        const generalRate = scheme.general_interest_rate_pa ?? "not specified";
        const seniorRate = scheme.senior_citizen_interest_rate_pa ?? "not specified";
        return `${tenor}: general ${generalRate}, senior ${seniorRate}.`;
      })
      .join(" ");

    const content = normalizeWhitespace(
      `${record.bank_name} (${record.institution_type ?? "bank"}) FD scheme summary. ` +
        `${schemeLines} Deposit band: ${record.deposit_amount_limit ?? "retail"}.`
    );

    chunks.push({
      id: `bank-fd-info:${index + 1}`,
      content,
      wordCount: countWords(content),
      metadata: {
        type: "fd_rates",
        topic: `rates_${toSlug(record.bank_name)}`,
        language: "general",
        source: "bank-fd-info.json",
        keywords: ["fd rates", "bank rates", "senior citizen", "tenure"],
      },
    });
  });

  return chunks;
}

function buildUserDemographicChunks(): KnowledgeChunk[] {
  const payload = userFdData as UserFdDataPayload;
  const root = payload.indian_fd_user_demographics_2024;
  if (!root) {
    return [];
  }

  const tenorLines = (root.user_tenor_preferences ?? [])
    .slice(0, 6)
    .map((bucket) => {
      return `${bucket.tenor_bucket}: accounts ${bucket.number_of_accounts_thousands ?? 0} thousand, amount ${bucket.amount_outstanding_cr ?? 0} crore, rank ${bucket.popularity_rank ?? "n/a"}.`;
    })
    .join(" ");

  const populationLines = (root.deposits_by_population_group ?? [])
    .slice(0, 4)
    .map((bucket) => {
      return `${bucket.region_type}: accounts ${bucket.number_of_accounts_thousands ?? 0} thousand, amount ${bucket.amount_outstanding_cr ?? 0} crore.`;
    })
    .join(" ");

  const tds = root.user_business_logic_limits?.tds_tax_rules_fy_2025_26;
  const limits = root.user_business_logic_limits;

  const businessRules = normalizeWhitespace(
    `Policy references: DICGC safety limit INR ${limits?.dicgc_insurance_safety_limit_inr ?? 0}. ` +
      `Tax saving FD max INR ${limits?.tax_saving_fd_max_investment_inr ?? 0} with lock-in ${limits?.tax_saving_fd_lock_in_years ?? 0} years. ` +
      `TDS FY 2025-26: regular exemption INR ${tds?.tds_exemption_limit_regular_citizen_inr ?? 0}, senior exemption INR ${tds?.tds_exemption_limit_senior_citizen_inr ?? 0}, with PAN ${tds?.tds_rate_with_pan_card_percent ?? 0}%, without PAN ${tds?.tds_rate_without_pan_card_percent ?? 0}%.`
  );

  return [
    {
      id: "user-fd-data:tenor-preferences",
      content: normalizeWhitespace(
        `Indian FD user tenor preference snapshot. ${tenorLines}`
      ),
      wordCount: countWords(tenorLines),
      metadata: {
        type: "user_context",
        topic: "tenor_preferences",
        language: "general",
        source: "user-fd-data.json",
        keywords: ["tenor", "popular duration", "user behavior", "fd trend"],
      },
    },
    {
      id: "user-fd-data:population-groups",
      content: normalizeWhitespace(
        `Deposit distribution by region. ${populationLines}`
      ),
      wordCount: countWords(populationLines),
      metadata: {
        type: "user_context",
        topic: "regional_deposit_distribution",
        language: "general",
        source: "user-fd-data.json",
        keywords: ["rural", "urban", "semi urban", "deposits"],
      },
    },
    {
      id: "user-fd-data:policy-limits",
      content: businessRules,
      wordCount: countWords(businessRules),
      metadata: {
        type: "tax",
        topic: "fd_policy_limits",
        language: "general",
        source: "user-fd-data.json",
        keywords: ["tds", "dicgc", "tax saving", "limit", "pan"],
      },
    },
  ];
}

function buildYearlyMacroChunks(): KnowledgeChunk[] {
  const payload = yearlyData as YearlyDataPayload;
  const records = payload.yearly_fd_macro_data?.yearly_records ?? [];
  if (records.length === 0) {
    return [];
  }

  const lines = records
    .map((record) => {
      const year = record.financial_year ?? "unknown";
      const amount = record.user_term_deposits?.total_amount_cr ?? 0;
      const accounts = record.user_term_deposits?.total_accounts_thousands ?? 0;
      const ruralAmount = record.bank_population_group_deposits?.rural_amount_cr ?? 0;
      const urbanAmount = record.bank_population_group_deposits?.urban_amount_cr ?? 0;
      const rate1 = record.average_bank_scheme_rates_pa?.term_deposits_1_to_3_years ?? "n/a";
      const rate2 = record.average_bank_scheme_rates_pa?.term_deposits_3_to_5_years ?? "n/a";

      return `${year}: deposits ${amount} crore across ${accounts} thousand accounts. Rural amount ${ruralAmount} crore, urban amount ${urbanAmount} crore. Average rates 1-3 years ${rate1}, 3-5 years ${rate2}.`;
    })
    .join(" ");

  const insured = records
    .map((record) => {
      const year = record.financial_year ?? "unknown";
      const protectedAccounts =
        record.dicgc_insurance_scheme?.fully_protected_accounts_lakh ?? 0;
      const insuredDeposits = record.dicgc_insurance_scheme?.insured_deposits_cr ?? 0;
      return `${year}: DICGC protected accounts ${protectedAccounts} lakh, insured deposits ${insuredDeposits} crore.`;
    })
    .join(" ");

  return [
    {
      id: "yearly-data:macro-trends",
      content: normalizeWhitespace(`Yearly FD macro trend summary. ${lines}`),
      wordCount: countWords(lines),
      metadata: {
        type: "market",
        topic: "yearly_fd_trends",
        language: "general",
        source: "yearly-data.json",
        keywords: ["yearly", "fd growth", "interest trend", "macro"],
      },
    },
    {
      id: "yearly-data:insurance",
      content: normalizeWhitespace(`Yearly DICGC insurance snapshot. ${insured}`),
      wordCount: countWords(insured),
      metadata: {
        type: "user_context",
        topic: "deposit_insurance_trend",
        language: "general",
        source: "yearly-data.json",
        keywords: ["dicgc", "insurance", "protected accounts", "insured deposits"],
      },
    },
  ];
}

async function buildKnowledgeBase(): Promise<KnowledgeChunk[]> {
  const textChunksNested = await Promise.all(TEXT_SOURCES.map(loadTextSourceChunks));
  const textChunks = textChunksNested.flat();

  const jsonChunks = [
    ...buildBankRateChunks(),
    ...buildUserDemographicChunks(),
    ...buildYearlyMacroChunks(),
  ];

  return [...textChunks, ...jsonChunks];
}

async function getKnowledgeBase(): Promise<KnowledgeChunk[]> {
  if (!knowledgeCache) {
    knowledgeCache = buildKnowledgeBase();
  }

  return knowledgeCache;
}

function computeChunkScore(
  chunk: KnowledgeChunk,
  queryTokens: string[],
  detectedType: KnowledgeType,
  preferredType?: KnowledgeType
): number {
  let score = 0;

  if (chunk.metadata.type === detectedType) {
    score += 8;
  }

  if (preferredType && chunk.metadata.type === preferredType) {
    score += 5;
  }

  const chunkTokenSet = new Set(tokenize(`${chunk.metadata.topic} ${chunk.content}`));
  for (const token of queryTokens) {
    if (chunkTokenSet.has(token)) {
      score += 2;
    }
  }

  const queryAsText = queryTokens.join(" ").trim();
  if (queryAsText && chunk.content.toLowerCase().includes(queryAsText)) {
    score += 3;
  }

  for (const keyword of chunk.metadata.keywords) {
    if (queryAsText.includes(keyword.toLowerCase())) {
      score += 2;
    }
  }

  return score;
}

export async function retrieveKnowledgeContext(
  userMessage: string,
  options: RetrieveKnowledgeOptions = {}
): Promise<KnowledgeRetrievalResult> {
  const limit = options.limit ?? 3;
  const englishQuery = normalizeQueryToEnglish(options.retrievalQuery ?? userMessage);
  const detectedType = detectKnowledgeType(englishQuery, options.preferredType);
  const knowledgeBase = await getKnowledgeBase();

  const queryTokens = tokenize(englishQuery);

  const ranked = knowledgeBase
    .map((chunk) => ({
      chunk,
      score: computeChunkScore(chunk, queryTokens, detectedType, options.preferredType),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.chunk);

  return {
    detectedType,
    normalizedQuery: englishQuery,
    chunks: ranked,
  };
}

export function buildKnowledgePromptSection(result: KnowledgeRetrievalResult): string {
  if (result.chunks.length === 0) {
    return [
      "━━━ RETRIEVED FD KNOWLEDGE CONTEXT (MINIMAL RAG) ━━━",
      `Retrieval query (English): ${result.normalizedQuery}`,
      `Detected context type: ${result.detectedType}`,
      "No direct chunk was retrieved. Give cautious general guidance and clearly say when exact data is unavailable.",
      "Do not invent exact rates, tax thresholds, or policy numbers.",
    ].join("\n");
  }

  const chunkText = result.chunks
    .map((chunk, index) => {
      return [
        `[Chunk ${index + 1}]`,
        `type: ${chunk.metadata.type}`,
        `topic: ${chunk.metadata.topic}`,
        `source: ${chunk.metadata.source}`,
        `content: ${chunk.content}`,
      ].join("\n");
    })
    .join("\n\n");

  return [
    "━━━ RETRIEVED FD KNOWLEDGE CONTEXT (MINIMAL RAG) ━━━",
    `Retrieval query (English): ${result.normalizedQuery}`,
    `Detected context type: ${result.detectedType}`,
    "Use the retrieved chunks below as primary factual grounding.",
    "For factual claims (tax, rates, definitions), stay inside this context.",
    "If context is insufficient, acknowledge the limitation and provide safe generic guidance.",
    "",
    chunkText,
  ].join("\n");
}
