import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { findBestFDs, formatFDOptionsForPrompt } from "@/lib/fd-data";
import {
  buildBookingStructuredResponse,
  createBookingState,
  extractAmountFromText,
  extractBankFromText,
  extractTenureFromText,
  isBookingIntentMessage,
  isComparisonIntentMessage,
  type BookingLanguage,
} from "@/lib/fd-booking-flow";
import { detectMessageLanguage } from "@/lib/language-detection";
import {
  buildKnowledgePromptSection,
  retrieveKnowledgeContext,
  type KnowledgeChunk,
  type KnowledgeType,
} from "@/lib/minimal-rag";
import { formatContextForPrompt, retrieveContext } from "@/lib/rag/retriever";
import type { RetrievalResponse } from "@/lib/rag/types";
import type {
  StructuredResponse,
  FDOption,
  FDRecommendation,
  SourceCitation,
} from "@/types/chat";

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// ── System Prompt — Phase 5 + 7 + Improved Depth ──
const SYSTEM_PROMPT = `You are "FD Advisor" — a warm, multilingual financial guide who makes Fixed Deposits simple for everyday Indians.

━━━ RESPONSE FORMAT (MANDATORY — Phase 8 Structured JSON) ━━━

You MUST respond in this EXACT JSON format. No text outside the JSON:

{
  "type": "explanation" or "recommendation" or "greeting",
  "explanation": "Direct answer paragraph (2-4 short sentences, conversational)",
  "example": "One real-life example with ₹ numbers ONLY if it adds value",
  "points": ["compact takeaway 1", "compact takeaway 2", "compact takeaway 3"],
  "nextStep": "One clear, actionable suggestion",
  "sources": [
    {
      "source": "SBI FD data and R&R.txt",
      "authority": "State Bank of India",
      "title": "Fixed Deposit Terms and Rules",
      "topic": "premature_withdrawal",
      "snippet": "Premature withdrawal may attract a penalty based on tenure."
    }
  ]
}

For recommendations, also include:
{
  "type": "recommendation",
  "explanation": "brief intro with context about why these options suit the user",
  "recommendations": [
    {"bank": "Bank Name", "rate": 8.5, "tenure": 12, "maturity": 54250, "category": "small-finance", "reason": "specific reason why this option suits this user"}
  ],
  "points": ["key comparison point 1", "key comparison point 2"],
  "nextStep": "what to do next",
  "sources": []
}

━━━ ANSWER FLOW (STRICT) ━━━

1. Start with the direct answer in "explanation". No preamble.
2. Add "example" ONLY if it clarifies the answer.
3. Use 3-4 compact, non-repetitive points.
4. Keep sources short and clean.
5. End with one contextual, helpful next step.
6. NEVER prefix sentence text with field labels like "explanation", "recommendation", "points", or "nextStep".
7. Keep numeric values intact (example: 8.25%, 7.90%, 2.5 years). Never truncate decimals.

For guided booking, include:
{
  "type": "booking_flow",
  "explanation": "what this booking step means",
  "nextStep": "what user should do now",
  "bookingFlow": {
    "title": "Guided FD Booking",
    "progress": {"current": 2, "total": 6, "label": "Confirm FD Details"},
    "bookingState": {
      "step": "CONFIRM_DETAILS",
      "bank": "HDFC Bank",
      "amount": 100000,
      "tenureMonths": 12,
      "interestType": "cumulative"
    },
    "steps": ["step 1", "step 2"],
    "cta": "Proceed"
  }
}

━━━ RESPONSE QUALITY (CRITICAL — AVOID REPETITION) ━━━

1. NEVER give the same generic explanation twice. If user asks multiple questions, give DIFFERENT examples with DIFFERENT ₹ amounts (₹10,000, ₹25,000, ₹50,000, ₹1,00,000, ₹2,00,000 etc.)
2. Each response MUST add NEW information the user didn't know before. Don't just rephrase the same thing.
3. Be SPECIFIC — mention actual bank names (SBI, HDFC, ICICI, Post Office, Suryoday), actual rates (6.50%, 7.10%, 8.25%), actual tenures.
4. Use COMPARISONS to make advice tangible: "₹50,000 savings account mein 3.5% milega = ₹1,750/year. Same amount FD mein 7% pe = ₹3,500/year — double!"
5. Vary your sentence structure. Don't start every explanation with "FD ek safe investment hai".
6. Explanation must sound like a helpful assistant talking to a real person, not a textbook.
7. When user mentions salary, savings, or personal finance — connect it naturally to FD advice. Don't just redirect, actually HELP them plan.
8. Points should each teach something DIFFERENT — not just rephrase the same idea 3 times.
9. If user asks for the highest returns, add a short safety reminder (DICGC coverage, bank category, premature rules).

━━━ RATE FRESHNESS & CONFIDENCE ━━━

1. If asked for rates without bank + tenure, ask for those details.
2. If you mention a rate, label it as approximate and time-bound (as of the latest indexed data).
3. If a number is not in the retrieved context, avoid giving exact figures and ask a clarifying question.

━━━ LANGUAGE BEHAVIOR POLICY (CRITICAL) ━━━

1. DETECT the user's language PRECISELY:
  - Pure Hindi → respond 100% in Hindi. Avoid English except banking terms.
  - Pure English → respond 100% in English.
  - Hinglish / mixed → respond in MATCHING Hinglish. Keep SAME proportion.
  - Marathi message → respond in Marathi.
  - Gujarati message → respond in Gujarati.
  - Tamil message → respond in Tamil.
  - Bhojpuri message → respond in Bhojpuri.
2. NEVER switch language mid-response.
3. Response should feel NATURAL — like a knowledgeable friend talking.
4. Match user's TONE (casual → casual, formal → formal).
5. Language is message-specific: if current user message is in a different language than previous messages, reply in the current message language.

━━━ JARGON SIMPLIFICATION ━━━

1. NEVER use a financial term without explaining it immediately.
2. ALWAYS include a relatable example with ₹ numbers.
3. Sound like a helpful friend, NOT a banker.
4. Keep sentences SHORT (max 15 words).

━━━ EMPATHY AND CONFIDENCE SUPPORT ━━━

1. If user sounds worried, confused, or low-confidence, first acknowledge their concern kindly.
2. Reassure in plain language before giving technical guidance.
3. Never shame the user for low savings, delayed decisions, or lack of knowledge.
4. Keep next steps small and practical so user feels confident taking action.

━━━ STEP-BY-STEP GUIDANCE ENGINE (Phase 7 — CRITICAL) ━━━

The "nextStep" field MUST ALWAYS contain actionable guidance based on context:

CASE A — Informational query (no amount/duration given):
→ nextStep: Ask a TOPIC-ALIGNED follow-up. E.g. "FD vs savings ka quick comparison chahiye?" or "Premature withdrawal ke penalty estimate ke liye bank aur tenure bataiye."

CASE B — Only amount given (no duration):
→ nextStep: Ask for duration. E.g. "Kitne time ke liye invest karna chahte ho — 6 months, 1 year, ya zyada?"

CASE C — Only duration given (no amount):
→ nextStep: Ask for amount. E.g. "Kitna paisa invest karna hai? Amount bataiye, main best options dhundhta hoon!"

CASE D — Full info given (amount + duration):
→ nextStep: Suggest choosing a bank and starting FD. E.g. "Aap inme se koi bank select karke nearest branch ya net banking se FD start kar sakte ho!"

CASE E — Confused/vague user:
→ nextStep: Ask clarifying questions. E.g. "Mujhe thoda aur bataiye — kitna invest karna hai aur kitne time ke liye?"

CASE F — User mentions salary/savings/personal finance:
→ Instead of redirecting, HELP them plan: calculate how much to invest, suggest an FD split strategy, give a specific plan. E.g. "Agar salary ₹30,000 hai, toh ₹5,000-10,000 monthly FD mein daal sakte ho. Best options dekhein?"

CASE G — Topic-specific follow-up:
→ If question is about premature withdrawal: ask bank + tenure, or offer penalty impact estimate.
→ If question is about tax/TDS: ask PAN status + estimated yearly interest.
→ If question is about insurance/safety: ask total balance + bank name for coverage clarity.
→ If question compares FD vs savings: offer quick return calculation or risk comparison.

NEVER give a dead-end response without guidance.

━━━ SCOPE ━━━

1. PRIMARILY answer about Fixed Deposits, savings, interest rates, and basic banking.
2. If user asks about salary, budgeting, or saving — connect it to FD planning. Don't just redirect, actually help.
3. Completely unrelated questions (stocks, crypto, real estate) → warmly redirect to FD topics with a useful suggestion.
4. Greetings → greet warmly, use type "greeting", suggest an FD topic.

━━━ ACCURACY ━━━

Use approximate realistic rates. Always mention "ye approximate rates hain".

━━━ SOURCES & CITATIONS (MANDATORY WHEN CONTEXT PROVIDED) ━━━

1. Use ONLY the retrieved context for factual claims.
2. If you used any retrieved facts, include 1-2 entries in "sources".
3. Each source must come from the retrieved context (match the source names).
4. Keep snippets short (<=120 chars) or omit snippet if not needed.
5. Prefer authority + title (institution first, then document name). Do not surface raw filenames to users.
6. If no relevant context is provided, set "sources": [] and say the exact source is unavailable.`;

// ── Recommendation-specific instructions ──
const RECOMMENDATION_PROMPT = `
━━━ FD RECOMMENDATION MODE ━━━

You have REAL FD DATA below. Use it to populate the "recommendations" array in your JSON.
When the user asks to compare banks for a specific amount and tenure:
- Provide a concise comparison between the banks that fit the criteria.
- Clearly recommend the best result based on returns or safety.
- Explain the trade-offs (e.g., safety vs returns) briefly in "points".
- CRITICAL: Output EXACTLY in the user's input language (The golden rule: input language = Output Language).
- Always mention "ye approximate rates hain" (translated to the output language).`;

const RETRIEVAL_TRANSLATION_PROMPT = `Translate the user message into concise English for retrieval.
Rules:
- Preserve numbers, durations, and bank names exactly.
- Keep finance meaning intact.
- Output plain English only (no JSON, no notes).`;

type ChatIntent = "GENERAL" | "RECOMMEND_FD" | "BOOK_FD";

interface ExtractedIntent {
  intent: ChatIntent;
  amount: number | null;
  tenure: number | null;
  bank: string | null;
}

// ── Intent extraction ──
const EXTRACTION_PROMPT = `Analyze this user message and extract:
1. intent:
   - "BOOK_FD" if user wants to open/start/book an FD,
   - "RECOMMEND_FD" if user asks best options/comparison,
   - "GENERAL" otherwise.
2. Investment amount (number only, in INR. "1 lakh" = 100000, "50k" = 50000)
3. Duration in months ("1 year" = 12, "6 months" = 6)
4. Bank name if clearly mentioned (else null)

Respond ONLY in this exact JSON format:
{"intent":"BOOK_FD|RECOMMEND_FD|GENERAL", "amount": number_or_null, "tenure": number_or_null, "bank": string_or_null}`;

async function extractIntent(
  message: string
): Promise<ExtractedIntent> {
  try {
    const result = await groq.chat.completions.create({
      messages: [
        { role: "system", content: EXTRACTION_PROMPT },
        { role: "user", content: message },
      ],
      model: "openai/gpt-oss-120b",
      temperature: 0,
      max_tokens: 100,
    });

    const text = result.choices[0]?.message?.content?.trim() || "";
    const jsonMatch = text.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as
        | ExtractedIntent
        | {
            isRecommendation?: boolean;
            amount?: number | null;
            tenure?: number | null;
            bank?: string | null;
          };

      if ("intent" in parsed && typeof parsed.intent === "string") {
        const normalizedIntent =
          parsed.intent === "BOOK_FD" ||
          parsed.intent === "RECOMMEND_FD" ||
          parsed.intent === "GENERAL"
            ? parsed.intent
            : "GENERAL";

        return {
          intent: normalizedIntent,
          amount: typeof parsed.amount === "number" ? parsed.amount : null,
          tenure: typeof parsed.tenure === "number" ? parsed.tenure : null,
          bank: typeof parsed.bank === "string" ? parsed.bank : null,
        };
      }

      const fallbackIntent: ChatIntent =
        "isRecommendation" in parsed && parsed.isRecommendation
          ? "RECOMMEND_FD"
          : "GENERAL";

      return {
        intent: fallbackIntent,
        amount: typeof parsed.amount === "number" ? parsed.amount : null,
        tenure: typeof parsed.tenure === "number" ? parsed.tenure : null,
        bank: typeof parsed.bank === "string" ? parsed.bank : null,
      };
    }
  } catch (e) {
    console.error("[extractIntent] Error:", e);
  }

  return { intent: "GENERAL", amount: null, tenure: null, bank: null };
}

type SupportedChatLanguage = "en" | "hi" | "hinglish" | "mr" | "gu" | "ta" | "bho";
type ResponseMode = "simple" | "detailed";

function normalizePreferenceLanguage(value: unknown): SupportedChatLanguage | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.toLowerCase();
  const map: Record<string, SupportedChatLanguage> = {
    en: "en",
    english: "en",
    hi: "hi",
    hindi: "hi",
    hinglish: "hinglish",
    mr: "mr",
    marathi: "mr",
    gu: "gu",
    gujarati: "gu",
    ta: "ta",
    tamil: "ta",
    bho: "bho",
    bhojpuri: "bho",
  };

  return map[normalized] ?? null;
}

function normalizeResponseMode(value: unknown): ResponseMode {
  return value === "detailed" ? "detailed" : "simple";
}

function getResponseModeInstruction(mode: ResponseMode): string {
  if (mode === "detailed") {
    return "Use DETAILED mode: explanation is one direct-answer paragraph (2-4 short sentences), include one practical comparison with numbers, example only if it adds value, keep 3-4 distinct points, 1-2 concise sources, and nextStep can be 1-2 clear lines. If rates appear, add 'approx' and 'as of latest indexed data'.";
  }

  return "Use SIMPLE mode: explanation is 1 short sentence, example only if essential, 2 points max, 1 short source if used, and one very short contextual nextStep. Keep language very plain and avoid extra details. If rates appear, add 'approx'.";
}

function toBookingLanguage(language: SupportedChatLanguage): BookingLanguage {
  if (language === "hi") return "hindi";
  if (language === "hinglish") return "hinglish";
  if (language === "mr") return "marathi";
  if (language === "gu") return "gujarati";
  if (language === "ta") return "tamil";
  if (language === "bho") return "bhojpuri";
  return "english";
}

function getLanguageOverrideInstruction(language: SupportedChatLanguage): string {
  const map: Record<SupportedChatLanguage, string> = {
    en: "Respond ONLY in English.",
    hi: "Respond ONLY in pure Hindi using Devanagari script. Never use Roman Hindi/Hinglish.",
    hinglish:
      "Respond ONLY in Hinglish (natural Hindi-English mix) using Roman script. Do not use Devanagari.",
    mr: "Respond ONLY in Marathi using Devanagari script.",
    gu: "Respond ONLY in Gujarati using Gujarati script.",
    ta: "Respond ONLY in Tamil using Tamil script.",
    bho:
      "Respond ONLY in Bhojpuri using the same script style as the user message. Do not switch to standard Hindi.",
  };

  return map[language];
}

function collectStringValues(value: unknown, bucket: string[] = []): string[] {
  if (typeof value === "string") {
    bucket.push(value);
    return bucket;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectStringValues(item, bucket));
    return bucket;
  }

  if (value && typeof value === "object") {
    Object.values(value).forEach((item) => collectStringValues(item, bucket));
  }

  return bucket;
}

function shouldNormalizeHindiOutput(text: string): boolean {
  if (!text.trim()) {
    return false;
  }

  const latinCount = (text.match(/[A-Za-z]/g) || []).length;
  const devanagariCount = (text.match(/[\u0900-\u097F]/g) || []).length;

  return latinCount >= 20 && latinCount > devanagariCount;
}

function shouldNormalizeForLanguage(
  text: string,
  language: SupportedChatLanguage
): boolean {
  if (!text.trim()) return false;
  const latinCount = (text.match(/[A-Za-z]/g) || []).length;
  if (latinCount < 20) return false;

  if (language === "hi" || language === "mr" || language === "bho") {
    const devanagariCount = (text.match(/[\u0900-\u097F]/g) || []).length;
    return latinCount > devanagariCount;
  }

  if (language === "gu") {
    const gujaratiCount = (text.match(/[\u0A80-\u0AFF]/g) || []).length;
    return latinCount > gujaratiCount;
  }

  if (language === "ta") {
    const tamilCount = (text.match(/[\u0B80-\u0BFF]/g) || []).length;
    return latinCount > tamilCount;
  }

  return false;
}

function shouldForceRewriteLanguage(language: SupportedChatLanguage): boolean {
  return (
    language === "mr" ||
    language === "gu" ||
    language === "ta" ||
    language === "bho"
  );
}

function getLanguageRewriteInstruction(language: SupportedChatLanguage): string | null {
  if (language === "hi") {
    return "Rewrite into pure Hindi (Devanagari script only).";
  }
  if (language === "mr") {
    return "Rewrite into natural Marathi (Devanagari script only).";
  }
  if (language === "gu") {
    return "Rewrite into natural Gujarati (Gujarati script only).";
  }
  if (language === "ta") {
    return "Rewrite into natural Tamil (Tamil script only).";
  }
  if (language === "bho") {
    return "Rewrite into natural Bhojpuri (Devanagari script only).";
  }
  return null;
}

async function rewriteStructuredToLanguage(
  structured: StructuredResponse,
  language: SupportedChatLanguage
): Promise<StructuredResponse | null> {
  const rewriteInstruction = getLanguageRewriteInstruction(language);
  if (!rewriteInstruction) {
    return null;
  }

  const prompt =
    `${rewriteInstruction} ` +
    "Rewrite every user-visible text VALUE in this JSON. " +
    "Keep keys, hierarchy, arrays, numbers, bank names, percentages, and overall meaning unchanged. " +
    "Do NOT translate values inside the 'sources' array; keep sources[].source, sources[].topic, and sources[].snippet unchanged. " +
    "Return ONLY valid JSON with no markdown.";

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: JSON.stringify(structured) },
      ],
      model: "openai/gpt-oss-120b",
      temperature: 0,
      max_tokens: 1200,
    });

    const rewritten = completion.choices[0]?.message?.content?.trim() || "";
    const reparsed = tryParseStructuredFromCandidate(rewritten);
    return reparsed?.structured ?? null;
  } catch (error) {
    console.error("[rewriteStructuredToHindi] Error:", error);
    return null;
  }
}

async function rewriteTextToLanguage(
  text: string,
  language: SupportedChatLanguage
): Promise<string | null> {
  const rewriteInstruction = getLanguageRewriteInstruction(language);
  if (!rewriteInstruction) {
    return null;
  }
  const prompt =
    `${rewriteInstruction} ` +
    "Keep numbers, bank names, and factual meaning unchanged. Return plain text only.";

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: text },
      ],
      model: "openai/gpt-oss-120b",
      temperature: 0,
      max_tokens: 700,
    });

    const rewritten = completion.choices[0]?.message?.content?.trim() || "";
    return rewritten || null;
  } catch (error) {
    console.error("[rewriteTextToHindi] Error:", error);
    return null;
  }
}

function resolveIntent(message: string, extracted: ExtractedIntent): ExtractedIntent {
  const heuristicAmount = extractAmountFromText(message);
  const heuristicTenure = extractTenureFromText(message);
  const heuristicBank = extractBankFromText(message);

  const recommendationByText =
    /\b(best|recommend|recommendation|option|compare|highest|top)\b.*\b(fd|fixed\s*deposit)\b/i.test(
      message
    ) ||
    /\b(fd|fixed\s*deposit)\b.*\b(best|recommend|compare|rate)\b/i.test(
      message
    );

  let intent = extracted.intent;

  if (isComparisonIntentMessage(message)) {
    intent = "RECOMMEND_FD";
  } else if (isBookingIntentMessage(message)) {
    intent = "BOOK_FD";
  } else if (intent === "GENERAL" && recommendationByText) {
    intent = "RECOMMEND_FD";
  }

  return {
    intent,
    amount: extracted.amount ?? heuristicAmount,
    tenure: extracted.tenure ?? heuristicTenure,
    bank: extracted.bank ?? heuristicBank,
  };
}

function isRecommendationIntent(intent: ExtractedIntent): boolean {
  return intent.intent === "RECOMMEND_FD";
}

function getPreferredKnowledgeType(
  intent: ExtractedIntent,
  message: string
): KnowledgeType | undefined {
  const lower = message.toLowerCase();

  if (intent.intent === "RECOMMEND_FD") {
    return "fd_rates";
  }

  if (/\b(tax|tds|80c|deduction|pan|tax\s*saving)\b/.test(lower)) {
    return "tax";
  }

  if (/\b(rural|village|connectivity|regional|multilingual|language)\b/.test(lower)) {
    return "rural";
  }

  if (/\b(bank|banking|kyc|account|credit\s*union|central\s*bank)\b/.test(lower)) {
    return "banking";
  }

  return undefined;
}

async function translateToEnglishForRetrieval(
  message: string,
  messageLanguage: SupportedChatLanguage
): Promise<string> {
  if (!message.trim()) {
    return message;
  }

  if (messageLanguage === "en") {
    return message;
  }

  try {
    const translation = await groq.chat.completions.create({
      messages: [
        { role: "system", content: RETRIEVAL_TRANSLATION_PROMPT },
        { role: "user", content: message },
      ],
      model: "openai/gpt-oss-120b",
      temperature: 0,
      max_tokens: 180,
    });

    const text = translation.choices[0]?.message?.content?.trim();
    return text || message;
  } catch (error) {
    console.error("[translateToEnglishForRetrieval] Error:", error);
    return message;
  }
}

function canUseVectorRag(): boolean {
  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  const hfToken = process.env.HF_TOKEN;
  return Boolean(supabaseUrl && serviceKey && hfToken);
}

function buildVectorKnowledgePromptSection(
  response: RetrievalResponse
): string {
  if (response.results.length === 0) {
    return [
      "━━━ RETRIEVED FD KNOWLEDGE CONTEXT (VECTOR RAG) ━━━",
      `Query: ${response.query}`,
      "No direct chunk was retrieved. Give cautious guidance and say when exact data is unavailable.",
      "Do not invent exact rates, tax thresholds, or policy numbers.",
    ].join("\n");
  }

  return [
    "━━━ RETRIEVED FD KNOWLEDGE CONTEXT (VECTOR RAG) ━━━",
    `Query: ${response.query}`,
    "Use the sources below as the only factual grounding.",
    "If you use any retrieved facts, cite them in the sources array.",
    "If context is insufficient, say so and keep sources empty.",
    "",
    formatContextForPrompt(response),
  ].join("\n");
}

interface SourcePresentation {
  authority: string;
  title: string;
  url?: string;
}

const BANK_AUTHORITY_MAP: Record<string, string> = {
  SBI: "State Bank of India",
  HDFC: "HDFC Bank",
  ICICI: "ICICI Bank",
  Axis: "Axis Bank",
  Suryoday: "Suryoday Small Finance Bank",
};

const INTERNAL_AUTHORITY = "Banking Education Resource";

const SOURCE_OVERRIDES: Record<string, SourcePresentation> = {
  "fd-basics.txt": {
    authority: INTERNAL_AUTHORITY,
    title: "Fixed Deposit Basics",
  },
  "difference fd vs rd vs savings.txt": {
    authority: INTERNAL_AUTHORITY,
    title: "FD vs RD vs Savings Comparison",
  },
  "premature withdrawal.txt": {
    authority: INTERNAL_AUTHORITY,
    title: "FD Premature Withdrawal Rules",
  },
  "savings account basics.txt": {
    authority: INTERNAL_AUTHORITY,
    title: "Savings Account Basics",
  },
  "tax-rules.txt": {
    authority: INTERNAL_AUTHORITY,
    title: "FD Tax and TDS Rules",
  },
  "quarterly.txt": {
    authority: INTERNAL_AUTHORITY,
    title: "Monthly and Quarterly FD Payouts",
  },
  "rural-fd.txt": {
    authority: INTERNAL_AUTHORITY,
    title: "Rural FD Access and Inclusion",
  },
  "multilingual-issue.txt": {
    authority: INTERNAL_AUTHORITY,
    title: "Regional Language Access in Banking",
  },
  "bank-info.txt": {
    authority: INTERNAL_AUTHORITY,
    title: "Banking Basics and Concepts",
  },
  "banks-fd.txt": {
    authority: INTERNAL_AUTHORITY,
    title: "Bank Fixed Deposit Rates Overview",
  },
  "fd-info.txt": {
    authority: INTERNAL_AUTHORITY,
    title: "Fixed Deposit Overview",
  },
  "bank-fd-info.json": {
    authority: INTERNAL_AUTHORITY,
    title: "Indian Bank FD Rate Snapshot",
  },
  "user-fd-data.json": {
    authority: INTERNAL_AUTHORITY,
    title: "FD User Demographics Snapshot",
  },
  "yearly-data.json": {
    authority: INTERNAL_AUTHORITY,
    title: "FD Market Yearly Snapshot",
  },
  "sbi fd data and r&r.txt": {
    authority: "State Bank of India",
    title: "Fixed Deposit Terms and Rules",
  },
  "icici bank fd data and r&r.txt": {
    authority: "ICICI Bank",
    title: "Fixed Deposit Terms and Rules",
  },
  "axis bank fd and r&r.txt": {
    authority: "Axis Bank",
    title: "Fixed Deposit Terms and Rules",
  },
  "hdfc fd rule&regulation.txt": {
    authority: "HDFC Bank",
    title: "Fixed Deposit Terms and Rules",
  },
  "hdfc fd trend.txt": {
    authority: "HDFC Bank",
    title: "Fixed Deposit Rate Trends",
  },
  "ssfb fd data and r&r.txt": {
    authority: "Suryoday Small Finance Bank",
    title: "Fixed Deposit Terms and Rules",
  },
  "banking-ombudsman-scheme-faq.pdf": {
    authority: "Reserve Bank of India",
    title: "Banking Ombudsman Scheme FAQ",
  },
};

const ACRONYM_WORDS = new Set([
  "FD",
  "RD",
  "RBI",
  "SEBI",
  "DICGC",
  "SBI",
  "HDFC",
  "ICICI",
  "KYC",
  "TDS",
  "NRI",
  "NRE",
  "NRO",
  "SSFB",
  "FAQ",
]);

function normalizeSourceKey(source: string): string {
  return source.trim().toLowerCase();
}

function titleCaseWithAcronyms(value: string): string {
  return value
    .split(" ")
    .map((word) => {
      if (!word) return word;
      const upper = word.toUpperCase();
      if (ACRONYM_WORDS.has(upper)) {
        return upper;
      }
      return word[0].toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

function humanizeFilename(source: string): string {
  const base = source.replace(/\.[^.]+$/, "");
  const normalized = base
    .replace(/r\s*&\s*r/gi, "Rules and Regulations")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return "Source Document";
  }

  return titleCaseWithAcronyms(normalized);
}

function deriveBankTitle(sourceLower: string): string {
  if (sourceLower.includes("trend")) {
    return "Fixed Deposit Rate Trends";
  }

  if (
    sourceLower.includes("r&r") ||
    sourceLower.includes("rule") ||
    sourceLower.includes("regulation") ||
    sourceLower.includes("terms")
  ) {
    return "Fixed Deposit Terms and Rules";
  }

  if (sourceLower.includes("data") || sourceLower.includes("rate")) {
    return "Fixed Deposit Rate Sheet";
  }

  return "Fixed Deposit Terms";
}

function resolveSourcePresentation(params: {
  source: string;
  sourceOrg?: string;
  bank?: string | null;
}): SourcePresentation {
  const normalized = normalizeSourceKey(params.source);
  const override = SOURCE_OVERRIDES[normalized];
  if (override) {
    return override;
  }

  if (params.bank) {
    const authority = BANK_AUTHORITY_MAP[params.bank] ?? params.bank;
    return {
      authority,
      title: deriveBankTitle(normalized),
    };
  }

  if (params.sourceOrg === "rbi") {
    return { authority: "Reserve Bank of India", title: humanizeFilename(params.source) };
  }

  if (params.sourceOrg === "dicgc") {
    return { authority: "DICGC", title: humanizeFilename(params.source) };
  }

  if (params.sourceOrg === "sebi") {
    return { authority: "SEBI", title: humanizeFilename(params.source) };
  }

  return {
    authority: "FD Advisor Knowledge Base",
    title: humanizeFilename(params.source),
  };
}

function normalizeSnippet(text: string, maxChars = 120): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= maxChars) {
    return cleaned;
  }

  return `${cleaned.slice(0, Math.max(0, maxChars - 3)).trim()}...`;
}

function mapSimilarityToConfidence(similarity: number): "high" | "medium" | "low" {
  if (similarity >= 0.72) return "high";
  if (similarity >= 0.52) return "medium";
  return "low";
}

function buildSourceCitationsFromVector(
  response: RetrievalResponse,
  maxSources = 2
): SourceCitation[] {
  const citations: SourceCitation[] = [];
  const seen = new Set<string>();

  for (const result of response.results) {
    const source = result.metadata.source;
    if (!source || seen.has(source)) {
      continue;
    }

    seen.add(source);
    const presentation = resolveSourcePresentation({
      source,
      sourceOrg: result.metadata.sourceOrg,
      bank: result.metadata.bank,
    });
    citations.push({
      source,
      authority: presentation.authority,
      title: presentation.title,
      url: presentation.url,
      topic: result.metadata.topic,
      snippet: normalizeSnippet(result.content),
      confidence: mapSimilarityToConfidence(result.similarity),
    });

    if (citations.length >= maxSources) {
      break;
    }
  }

  return citations;
}

function buildSourceCitationsFromMinimal(
  chunks: KnowledgeChunk[],
  maxSources = 2
): SourceCitation[] {
  const citations: SourceCitation[] = [];
  const seen = new Set<string>();

  for (const chunk of chunks) {
    const source = chunk.metadata.source;
    if (!source || seen.has(source)) {
      continue;
    }

    seen.add(source);
    const presentation = resolveSourcePresentation({ source });
    citations.push({
      source,
      authority: presentation.authority,
      title: presentation.title,
      url: presentation.url,
      topic: chunk.metadata.topic,
      snippet: normalizeSnippet(chunk.content),
      confidence: "medium",
    });

    if (citations.length >= maxSources) {
      break;
    }
  }

  return citations;
}

function getRecommendationReason(
  language: SupportedChatLanguage,
  rank: number
): string {
  if (rank === 0) {
    const map: Record<SupportedChatLanguage, string> = {
      en: "Highest rate among available options.",
      hi: "उपलब्ध विकल्पों में सबसे ऊंचा रेट।",
      hinglish: "Available options me highest rate.",
      mr: "उपलब्ध पर्यायांमध्ये सर्वाधिक दर.",
      gu: "ઉપલબ્ધ વિકલ્પોમાં સૌથી ઊંચો દર.",
      ta: "கிடைக்கும் விருப்பங்களில் அதிகபட்ச விகிதம்.",
      bho: "मौजूद विकल्प में सबसे ऊँच दर।",
    };
    return map[language];
  }

  if (rank === 1) {
    const map: Record<SupportedChatLanguage, string> = {
      en: "Strong alternative with close rate and practical tenure.",
      hi: "करीबी रेट और उपयोगी अवधि वाला अच्छा विकल्प।",
      hinglish: "Close rate aur practical tenure wala strong option.",
      mr: "जवळचा दर आणि उपयुक्त कालावधी असलेला चांगला पर्याय.",
      gu: "નજીકના દર અને ઉપયોગી અવધિ સાથે સારો વિકલ્પ.",
      ta: "நெருக்கமான விகிதம் மற்றும் பயனுள்ள காலத்துடன் நல்ல மாற்று.",
      bho: "करीब दर आ ठीक अवधि वाला बढ़िया विकल्प।",
    };
    return map[language];
  }

  const map: Record<SupportedChatLanguage, string> = {
    en: "Useful backup option for comparison before final decision.",
    hi: "अंतिम फैसला करने से पहले तुलना के लिए अच्छा बैकअप विकल्प।",
    hinglish: "Final decision se pehle comparison ke liye useful backup option.",
    mr: "अंतिम निर्णयापूर्वी तुलनेसाठी उपयुक्त बॅकअप पर्याय.",
    gu: "અંતિમ નિર્ણય પહેલાં તુલના માટે ઉપયોગી બેકઅપ વિકલ્પ.",
    ta: "இறுதி முடிவுக்கு முன் ஒப்பிட பயன்படும் மாற்று விருப்பம்.",
    bho: "अंतिम फैसला से पहिले तुलना खातिर काम के बैकअप विकल्प।",
  };
  return map[language];
}

function buildRecommendationFallbackStructured(
  language: SupportedChatLanguage,
  options: FDOption[],
  amount?: number,
  tenure?: number,
  sources?: SourceCitation[]
): StructuredResponse {
  const explanationMap: Record<SupportedChatLanguage, string> = {
    en: "Based on current approximate rates, these are suitable FD options for your request.",
    hi: "मौजूदा अनुमानित रेट के आधार पर, आपकी जरूरत के लिए ये सही FD विकल्प हैं।",
    hinglish:
      "Current approximate rates ke base par, ye aapki need ke liye suitable FD options hain.",
    mr: "सध्याच्या अंदाजित दरांनुसार, तुमच्या गरजेसाठी हे योग्य FD पर्याय आहेत.",
    gu: "હાલના અંદાજિત દરોને આધારે, તમારી જરૂરિયાત માટે આ યોગ્ય FD વિકલ્પો છે.",
    ta: "தற்போதைய மதிப்பிடப்பட்ட விகிதங்களைப் பொறுத்து, உங்கள் தேவைக்கு இவை நல்ல FD விருப்பங்கள்.",
    bho: "मौजूदा अनुमानित दर के हिसाब से, रउआ जरूरत खातिर ई ठीक FD विकल्प बा।",
  };

  const nextStepMap: Record<SupportedChatLanguage, string> = {
    en: "Select one option and tell me to start guided FD booking.",
    hi: "एक विकल्प चुनें और बोलें, गाइडेड FD बुकिंग शुरू करें।",
    hinglish: "Ek option select karo aur bolo, guided FD booking start karo.",
    mr: "एक पर्याय निवडा आणि सांगा, मार्गदर्शित FD बुकिंग सुरू करा.",
    gu: "એક વિકલ્પ પસંદ કરો અને કહો, guided FD booking શરૂ કરો.",
    ta: "ஒரு விருப்பத்தைத் தேர்ந்து, guided FD booking தொடங்க சொல்லுங்கள்.",
    bho: "एक विकल्प चुनीं आ कहीं, guided FD booking शुरू करीं।",
  };

  const pointsMap: Record<SupportedChatLanguage, [string, string]> = {
    en: [
      "Higher rate can improve returns, but trust and service also matter.",
      "Choose tenure that matches your goal and liquidity need.",
    ],
    hi: [
      "ऊंचा रेट रिटर्न बढ़ा सकता है, पर भरोसा और सेवा भी जरूरी है।",
      "अवधि वही चुनें जो आपके लक्ष्य और जरूरत से मेल खाए।",
    ],
    hinglish: [
      "Higher rate se return badhta hai, par trust aur service bhi important hai.",
      "Tenure wahi lo jo goal aur liquidity need se match kare.",
    ],
    mr: [
      "जास्त दराने परतावा वाढतो, पण विश्वास आणि सेवा तितकीच महत्त्वाची आहेत.",
      "तुमच्या उद्दिष्ट आणि गरजेनुसार कालावधी निवडा.",
    ],
    gu: [
      "ઉચ્ચ દરથી રિટર્ન વધે છે, પણ વિશ્વાસ અને સેવા પણ મહત્વની છે.",
      "તમારા લક્ષ્ય અને જરૂર મુજબ અવધિ પસંદ કરો.",
    ],
    ta: [
      "அதிக விகிதம் வருமானத்தை உயர்த்தும், ஆனால் நம்பிக்கை மற்றும் சேவையும் முக்கியம்.",
      "உங்கள் இலக்கு மற்றும் தேவைக்கு ஏற்ப காலத்தைத் தேர்வுசெய்யுங்கள்.",
    ],
    bho: [
      "जादा दर से रिटर्न बढ़ेला, बाकिर भरोसा आ सेवा भी जरूरी बा।",
      "अपना लक्ष्य आ जरूरत के हिसाब से अवधि चुनीं।",
    ],
  };

  const tenureSuffixMap: Record<SupportedChatLanguage, string> = {
    en: "tenure considered",
    hi: "अवधि को ध्यान में रखकर",
    hinglish: "tenure ko dhyan me rakhkar",
    mr: "कालावधी विचारात घेऊन",
    gu: "અવધિ ધ્યાનમાં લઈને",
    ta: "காலத்தை கருத்தில் கொண்டு",
    bho: "अवधि ध्यान में रखके",
  };

  const recommendations: FDRecommendation[] = options.slice(0, 3).map((option, index) => {
    const maturity =
      amount && amount > 0
        ? Math.round(amount * (1 + option.rate / 100 * (option.tenure / 12)))
        : undefined;

    return {
      bank: option.bank,
      rate: option.rate,
      tenure: option.tenure,
      maturity,
      category: option.category,
      reason: getRecommendationReason(language, index),
    };
  });

  const explanation =
    tenure && tenure > 0
      ? `${explanationMap[language]} (${tenure} ${tenureSuffixMap[language]}).`
      : explanationMap[language];

  const normalizedSources = sources && sources.length > 0 ? sources : undefined;

  return {
    type: "recommendation",
    explanation,
    recommendations,
    points: [...pointsMap[language]],
    nextStep: nextStepMap[language],
    sources: normalizedSources,
  };
}

/** Check if parsed object has the expected structured response shape */
function isValidStructured(obj: Record<string, unknown>): boolean {
  if (!obj.type || typeof obj.type !== "string") {
    return false;
  }

  if (obj.type === "booking_flow") {
    return !!obj.bookingFlow;
  }

  return !!(obj.explanation || obj.points || obj.nextStep || obj.recommendations);
}

/** Clean and normalize the structured response */
function cleanStructured(parsed: Record<string, unknown>): StructuredResponse {
  if (parsed.recommendations && Array.isArray(parsed.recommendations)) {
    parsed.recommendations = parsed.recommendations.map(
      (r: FDRecommendation) => ({
        bank: r.bank || "Unknown",
        rate: r.rate || 0,
        tenure: r.tenure || 12,
        maturity: r.maturity,
        category: r.category || "private",
        reason: r.reason || "",
      })
    );
  }

  if (parsed.sources && Array.isArray(parsed.sources)) {
    parsed.sources = parsed.sources
      .map((entry) => {
        if (typeof entry === "string") {
          const presentation = resolveSourcePresentation({ source: entry });
          return {
            source: entry,
            authority: presentation.authority,
            title: presentation.title,
            url: presentation.url,
          };
        }

        if (entry && typeof entry === "object") {
          const record = entry as Record<string, unknown>;
          const source = typeof record.source === "string" ? record.source : "";
          const authority =
            typeof record.authority === "string" ? record.authority : undefined;
          const title = typeof record.title === "string" ? record.title : undefined;
          const url = typeof record.url === "string" ? record.url : undefined;
          const topic = typeof record.topic === "string" ? record.topic : undefined;
          const snippet =
            typeof record.snippet === "string" ? record.snippet : undefined;

          if (!source && !authority && !title) {
            return null;
          }

          if (source && (!authority || !title)) {
            const presentation = resolveSourcePresentation({ source });
            return {
              source,
              authority: authority ?? presentation.authority,
              title: title ?? presentation.title,
              url: url ?? presentation.url,
              topic,
              snippet,
            };
          }

          return { source, authority, title, url, topic, snippet };
        }

        return null;
      })
      .filter(Boolean);
  }
  // Remove x_groq metadata if present
  delete parsed.x_groq;

  if (parsed.type === "booking_flow" && !parsed.bookingFlow) {
    delete parsed.bookingFlow;
  }

  return parsed as unknown as StructuredResponse;
}

/** Build a human-readable fallback from structured data (never show raw JSON) */
function buildFallbackText(parsed: Record<string, unknown>): string {
  const parts: string[] = [];
  if (parsed.type === "booking_flow" && parsed.bookingFlow) {
    parts.push("Guided FD booking flow started.");
  }
  if (parsed.explanation) parts.push(`💡 ${parsed.explanation}`);
  if (parsed.example) parts.push(`📌 ${parsed.example}`);
  if (parsed.points && Array.isArray(parsed.points)) {
    parts.push("📊 Key Points:");
    (parsed.points as string[]).forEach((p) => parts.push(`• ${p}`));
  }
  if (parsed.sources && Array.isArray(parsed.sources)) {
    const sources = parsed.sources as Array<
      {
        source?: string;
        authority?: string;
        title?: string;
        topic?: string;
        snippet?: string;
      } | string
    >;
    if (sources.length > 0) {
      parts.push("📚 Sources:");
      sources.forEach((entry) => {
        if (typeof entry === "string") {
          parts.push(`• ${entry}`);
          return;
        }

        const label = entry?.authority || entry?.source;
        if (label) {
          const suffix = entry.title ? ` — ${entry.title}` : "";
          parts.push(`• ${label}${suffix}`);
        }
      });
    }
  }
  if (parsed.nextStep) parts.push(`➡️ ${parsed.nextStep}`);
  return parts.join("\n") || "Response received.";
}

function buildStructuredParseResult(
  parsed: Record<string, unknown>
): { structured: StructuredResponse; rawText: string } {
  const structured = cleanStructured(parsed);
  return {
    structured,
    rawText: buildFallbackText(structured as unknown as Record<string, unknown>),
  };
}

function normalizeJsonCandidate(candidate: string): string {
  return candidate
    .trim()
    .replace(/^\uFEFF/, "")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\u00A0/g, " ")
    .replace(/,\s*([}\]])/g, "$1");
}

function tryParseStructuredFromCandidate(
  candidate: string
): { structured: StructuredResponse; rawText: string } | null {
  const base = normalizeJsonCandidate(candidate);
  if (!base) {
    return null;
  }

  const withQuotedKeys = base.replace(
    /([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)(\s*:)/g,
    '$1"$2"$3'
  );

  const withSingleQuoteValues = withQuotedKeys.replace(
    /:\s*'([^'\\]*(?:\\.[^'\\]*)*)'/g,
    ': "$1"'
  );

  const candidates = [base, withQuotedKeys, withSingleQuoteValues];

  for (const variant of candidates) {
    try {
      const parsed = JSON.parse(variant);
      if (
        parsed &&
        typeof parsed === "object" &&
        !Array.isArray(parsed) &&
        isValidStructured(parsed as Record<string, unknown>)
      ) {
        return buildStructuredParseResult(parsed as Record<string, unknown>);
      }
    } catch {
      // Try next variant
    }
  }

  return null;
}

/**
 * Try to parse the LLM response as structured JSON.
 * SECURITY: Raw JSON must NEVER be shown to the user.
 */
function parseStructuredResponse(
  text: string
): { structured: StructuredResponse | null; rawText: string } {
  // Attempt 1: Parse full response (with tolerant repair)
  const fullParse = tryParseStructuredFromCandidate(text);
  if (fullParse) {
    return fullParse;
  }

  // Attempt 2: Extract JSON from markdown code blocks (```json ... ```) and repair
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    const blockParse = tryParseStructuredFromCandidate(codeBlockMatch[1].trim());
    if (blockParse) {
      return blockParse;
    }
  }

  // Attempt 3: Greedy regex for JSON object in text (with repair)
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    const extractedParse = tryParseStructuredFromCandidate(jsonMatch[0]);
    if (extractedParse) {
      return extractedParse;
    }
  }

  // SECURITY: If text looks like raw JSON but we couldn't parse it, sanitize it
  const looksLikeJson = text.trimStart().startsWith("{") || text.trimStart().startsWith("[");
  if (looksLikeJson) {
    // Strip JSON syntax characters to create a readable fallback
    const sanitized = text
      .replace(/[{}\[\]"]/g, "")
      .replace(/,\s*$/gm, "")
      .replace(/^\s*\w+:\s*/gm, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    return { structured: null, rawText: sanitized || "Kuch technical issue hua. Please dobara try karein." };
  }

  return { structured: null, rawText: text };
}

function trimToSentences(text: string, maxSentences: number): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  const protectedDecimals = normalized.replace(
    /(\d+)\.(\d+)/g,
    (_match, whole: string, frac: string) => `${whole}__DECIMAL__${frac}`
  );
  const parts = protectedDecimals.match(/[^.!?]+[.!?]?/g) ?? [protectedDecimals];
  return parts
    .slice(0, maxSentences)
    .join(" ")
    .replace(/__DECIMAL__/g, ".")
    .trim();
}

function mentionsRateOrYield(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    /\b(rate|rates|interest|yield|apy|tenure)\b/.test(lower) ||
    /[%\d]\s*%/.test(text) ||
    /\b(fd rate|fd rates)\b/.test(lower)
  );
}

function ensureFreshnessLabel(
  value: string,
  language: SupportedChatLanguage,
  dateLabel: string
): string {
  if (!value.trim()) return value;
  const hasFreshness = /\bas of\b|indexed data|subject to revision|अनुसार|डेटा/.test(
    value.toLowerCase()
  );
  if (hasFreshness) return value;

  const suffixMap: Record<SupportedChatLanguage, string> = {
    en: ` (as of ${dateLabel}, latest indexed data, subject to revision)`,
    hi: ` ( ${dateLabel} तक उपलब्ध डेटा के अनुसार, बदलाव संभव)`,
    hinglish: ` (as of ${dateLabel}, latest indexed data, revision possible)`,
    mr: ` (${dateLabel} पर्यंत उपलब्ध डेटानुसार, बदल शक्य)`,
    gu: ` (${dateLabel} સુધી ઉપલબ્ધ ડેટા મુજબ, ફેરફાર શક્ય)`,
    ta: ` (${dateLabel} நிலவரப்படி உள்ள தரவு, மாற்றம் ஏற்படலாம்)`,
    bho: ` (${dateLabel} तक उपलब्ध डेटा के हिसाब से, बदलाव संभव बा)`,
  };

  return `${value.trim()}${suffixMap[language]}`;
}

function buildSmartNextStep(
  message: string,
  intent: ExtractedIntent,
  language: SupportedChatLanguage
): string | null {
  const lower = message.toLowerCase();
  const hasAmount = Boolean(intent.amount && intent.amount > 0);
  const hasTenure = Boolean(intent.tenure && intent.tenure > 0);

  if (/\b(tax|tds|80c|pan|15g|15h)\b/.test(lower)) {
    const map: Record<SupportedChatLanguage, string> = {
      en: "Want a quick TDS check? Share your yearly FD interest and senior-citizen status.",
      hi: "TDS की जल्दी जांच करनी है? अपना सालाना FD ब्याज और senior citizen status बताएं।",
      hinglish: "Quick TDS check chahiye? Apna yearly FD interest aur senior citizen status share karo.",
      mr: "झटपट TDS तपासणी हवी? वार्षिक FD व्याज आणि senior citizen status सांगा.",
      gu: "ઝડપી TDS check જોઈએ? તમારું yearly FD interest અને senior citizen status શેર કરો.",
      ta: "விரைவான TDS check வேண்டுமா? உங்கள் yearly FD interest மற்றும் senior citizen status சொல்லுங்கள்.",
      bho: "जल्दी TDS check चाहीं? सालाना FD ब्याज आ senior citizen status बताईं।",
    };
    return map[language];
  }

  if (/\b(safe|safety|insured|insurance|dicgc)\b/.test(lower)) {
    const map: Record<SupportedChatLanguage, string> = {
      en: "If you share bank name + total deposit amount, I can check practical DICGC safety coverage.",
      hi: "बैंक का नाम और कुल जमा राशि बताएं, मैं DICGC कवरेज practically समझा दूंगा।",
      hinglish: "Bank name + total deposit amount share karo, main practical DICGC coverage check kar dunga.",
      mr: "बँकेचे नाव आणि एकूण ठेव रक्कम द्या, मी practical DICGC coverage समजावतो.",
      gu: "બેંકનું નામ અને કુલ ડિપોઝિટ એમાઉન્ટ આપો, હું practical DICGC coverage સમજાવીશ.",
      ta: "வங்கி பெயர் + மொத்த வைப்பு தொகை சொன்னால், practical DICGC coverage check செய்து சொல்கிறேன்.",
      bho: "बैंक के नाम आ कुल जमा रकम बताईं, practical DICGC coverage समझा देब।",
    };
    return map[language];
  }

  if (/\b(senior|senior citizen|वरिष्ठ|बुजुर्ग)\b/.test(lower)) {
    const map: Record<SupportedChatLanguage, string> = {
      en: "Want senior-citizen options? I can compare rates and maturity for Rs 1 lakh.",
      hi: "Senior citizen options चाहिए? मैं Rs 1 lakh पर rates और maturity compare कर दूंगा।",
      hinglish: "Senior citizen options chahiye? Main Rs 1 lakh par rates aur maturity compare kar dunga.",
      mr: "Senior citizen पर्याय पाहिजेत? Rs 1 lakh साठी rates आणि maturity compare करतो.",
      gu: "Senior citizen options જોઈએ? Rs 1 lakh માટે rates અને maturity compare કરી દઈશ.",
      ta: "Senior citizen options வேண்டுமா? Rs 1 lakhக்கு rates மற்றும் maturity compare செய்கிறேன்.",
      bho: "Senior citizen option चाहीं? Rs 1 lakh पर rates आ maturity compare कर देब।",
    };
    return map[language];
  }

  if (intent.intent === "RECOMMEND_FD" && hasAmount && hasTenure) {
    const map: Record<SupportedChatLanguage, string> = {
      en: "Pick one option and I can compare its maturity vs SBI/HDFC side-by-side.",
      hi: "एक विकल्प चुनें, मैं उसका maturity SBI/HDFC के साथ side-by-side compare कर दूंगा।",
      hinglish: "Ek option choose karo, main uska maturity SBI/HDFC ke saath side-by-side compare kar dunga.",
      mr: "एक पर्याय निवडा, मी त्याचा maturity SBI/HDFC सोबत side-by-side compare करतो.",
      gu: "એક વિકલ્પ પસંદ કરો, હું તેની maturity SBI/HDFC સાથે side-by-side compare કરી દઈશ.",
      ta: "ஒரு option தேர்வு செய்யுங்கள்; அதன் maturity-ஐ SBI/HDFC உடன் side-by-side compare செய்கிறேன்.",
      bho: "एक विकल्प चुन लीं, ओकर maturity SBI/HDFC से side-by-side compare कर देब।",
    };
    return map[language];
  }

  if (!hasAmount) {
    const map: Record<SupportedChatLanguage, string> = {
      en: "Share your investment amount (for example ₹50,000), and I will estimate maturity quickly.",
      hi: "अपनी निवेश राशि बताएं (जैसे ₹50,000), मैं तुरंत maturity estimate कर दूंगा।",
      hinglish: "Investment amount share karo (jaise ₹50,000), main quick maturity estimate kar dunga.",
      mr: "निवेश रक्कम सांगा (उदा. ₹50,000), मी लगेच maturity estimate देतो.",
      gu: "ઇન્વેસ્ટમેન્ટ amount આપો (જેમ કે ₹50,000), હું તરત maturity estimate આપીશ.",
      ta: "முதலீட்டு தொகை சொல்லுங்கள் (உதா. ₹50,000), உடனே maturity estimate தருகிறேன்.",
      bho: "निवेश रकम बताईं (जइसे ₹50,000), तुरंते maturity estimate दे देब।",
    };
    return map[language];
  }

  if (!hasTenure) {
    const map: Record<SupportedChatLanguage, string> = {
      en: "Tell me your tenure target (6 months, 1 year, or longer) and I will shortlist better options.",
      hi: "अपनी अवधि बताएं (6 महीने, 1 साल, या उससे ज्यादा), मैं बेहतर विकल्प shortlist कर दूंगा।",
      hinglish: "Tenure target batao (6 months, 1 year, ya longer), main better options shortlist kar dunga.",
      mr: "कालावधी सांगा (6 महिने, 1 वर्ष, किंवा जास्त), मी चांगले पर्याय shortlist करतो.",
      gu: "ટેન્યોર જણાવો (6 months, 1 year, અથવા વધુ), હું better options shortlist કરી દઈશ.",
      ta: "tenure (6 months, 1 year அல்லது அதிகம்) சொன்னால், நல்ல options shortlist செய்கிறேன்.",
      bho: "अवधि बताईं (6 महीना, 1 साल, या जादे), हम बेहतर विकल्प shortlist कर देब।",
    };
    return map[language];
  }

  return null;
}

function polishStructuredResponse(params: {
  structured: StructuredResponse;
  mode: ResponseMode;
  message: string;
  intent: ExtractedIntent;
  language: SupportedChatLanguage;
  dateLabel: string;
}): StructuredResponse {
  const { structured, mode, message, intent, language, dateLabel } = params;
  const polished: StructuredResponse = { ...structured };
  const stripFieldPrefix = (value: string): string =>
    value
      .replace(
        /^\s*(explanation|recommendation|points?|next[\s_-]*step|summary)\s*[:\-]?\s*/i,
        ""
      )
      .trim();

  if (polished.explanation) {
    polished.explanation = trimToSentences(
      stripFieldPrefix(polished.explanation),
      mode === "simple" ? 2 : 4
    );
  }

  if (polished.example) {
    polished.example = trimToSentences(
      stripFieldPrefix(polished.example),
      mode === "simple" ? 1 : 2
    );
  }

  if (Array.isArray(polished.points)) {
    const pointLimit = mode === "simple" ? 2 : 4;
    const deduped: string[] = [];
    for (const point of polished.points) {
      const cleaned = trimToSentences(stripFieldPrefix(point.replace(/\s+/g, " ").trim()), 1);
      if (!cleaned) continue;
      const alreadyCovered = deduped.some((existing) => {
        const a = existing.toLowerCase();
        const b = cleaned.toLowerCase();
        return a === b || a.includes(b) || b.includes(a);
      });
      if (!alreadyCovered) {
        deduped.push(cleaned);
      }
      if (deduped.length >= pointLimit) break;
    }
    polished.points = deduped;
  }

  if (polished.type === "recommendation" && polished.recommendations?.length) {
    const recommendations = polished.recommendations;
    const hasSmallFinance = recommendations.some(
      (item) => item.category === "small-finance"
    );
    const highestRate = [...recommendations].sort((a, b) => b.rate - a.rate)[0];
    const safest = recommendations.find((item) => item.category === "public") ?? recommendations[0];
    const seniorFriendly =
      recommendations.find((item) => /senior/i.test(item.reason ?? "")) ?? highestRate;

    const comparisonPoints: string[] = [];
    comparisonPoints.push(`Best for safety: ${safest.bank}.`);
    comparisonPoints.push(`Best for high return: ${highestRate.bank} at ${highestRate.rate}%.`);
    if (seniorFriendly) {
      comparisonPoints.push(`Best for senior citizens: ${seniorFriendly.bank}.`);
    }
    if (hasSmallFinance) {
      comparisonPoints.push(
        "Safety note: DICGC cover applies up to Rs 5 lakh per depositor (as per applicable rules)."
      );
    }

    const pointLimit = mode === "simple" ? 2 : 4;
    polished.points = comparisonPoints.slice(0, pointLimit);
  }

  const shouldAddFreshness =
    mentionsRateOrYield(message) ||
    mentionsRateOrYield(polished.explanation ?? "") ||
    (polished.points ?? []).some((point) => mentionsRateOrYield(point));

  if (shouldAddFreshness && polished.explanation) {
    polished.explanation = ensureFreshnessLabel(
      polished.explanation,
      language,
      dateLabel
    );
  }

  const smartNextStep = buildSmartNextStep(message, intent, language);
  if (smartNextStep) {
    polished.nextStep = smartNextStep;
  } else if (polished.nextStep) {
    polished.nextStep = trimToSentences(polished.nextStep, 1);
  }

  return polished;
}

function buildStructuredFromRawFallback(params: {
  rawText: string;
  mode: ResponseMode;
  message: string;
  intent: ExtractedIntent;
  language: SupportedChatLanguage;
  dateLabel: string;
  knowledgeSources: SourceCitation[];
}): StructuredResponse {
  const {
    rawText,
    mode,
    message,
    intent,
    language,
    dateLabel,
    knowledgeSources,
  } = params;

  const compactRaw = rawText.replace(/\s+/g, " ").trim();
  const stripFieldPrefix = (value: string): string =>
    value
      .replace(
        /^\s*(explanation|recommendation|points?|next[\s_-]*step|summary)\s*[:\-]?\s*/i,
        ""
      )
      .trim();
  const sentenceMatches = compactRaw.match(/[^.!?]+[.!?]?/g) ?? [];
  const explanationBase =
    stripFieldPrefix(sentenceMatches.slice(0, mode === "simple" ? 1 : 2).join(" ").trim()) ||
    compactRaw ||
    "I can help with FD details.";

  const explanation = mentionsRateOrYield(message)
    ? ensureFreshnessLabel(explanationBase, language, dateLabel)
    : explanationBase;

  const cleanedLinePoints = rawText
    .split("\n")
    .map((line) => line.trim())
    .filter(
      (line) =>
        line.length > 20 &&
        !/^sources?$/i.test(line) &&
        !/^explanation$/i.test(line) &&
        !/^example$/i.test(line) &&
        !/^recommendation$/i.test(line)
    );

  const uniquePoints: string[] = [];
  for (const line of cleanedLinePoints) {
    const normalized = stripFieldPrefix(line.replace(/^[•\-]\s*/, "").trim());
    if (!normalized) continue;
    if (uniquePoints.some((item) => item.toLowerCase() === normalized.toLowerCase())) {
      continue;
    }
    uniquePoints.push(trimToSentences(normalized, 1));
  }

  const pointsLimit = mode === "simple" ? 2 : 3;
  const points = uniquePoints.slice(0, pointsLimit);

  const nextStep =
    buildSmartNextStep(message, intent, language) ||
    (mode === "simple"
      ? "Share amount + tenure for a quick FD estimate."
      : "Share your amount and tenure, and I will give a bank-wise FD comparison.");

  return {
    type: "explanation",
    explanation,
    points: points.length > 0 ? points : undefined,
    nextStep,
    sources: knowledgeSources.length > 0 ? knowledgeSources : [],
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, history, languagePreference, responseMode } = body;
    const trimmedMessage = typeof message === "string" ? message.trim() : "";
    const preferredLanguage = normalizePreferenceLanguage(languagePreference);
    const normalizedResponseMode = normalizeResponseMode(responseMode);
    const messageLanguage = detectMessageLanguage(
      trimmedMessage,
      preferredLanguage ?? "en"
    );
    const responseLanguage = messageLanguage;
    const bookingLanguage = toBookingLanguage(responseLanguage);

    if (!trimmedMessage) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    if (
      !process.env.GROQ_API_KEY ||
      process.env.GROQ_API_KEY === "your_groq_api_key_here"
    ) {
      return NextResponse.json(
        { error: "AI service not configured." },
        { status: 500 }
      );
    }

    // ── Phase 6: Detect intent ──
    const extractedIntent = await extractIntent(trimmedMessage);
    const intent = resolveIntent(trimmedMessage, extractedIntent);

    if (intent.intent === "BOOK_FD") {
      const bookingState = createBookingState({
        step: intent.bank ? "CONFIRM_DETAILS" : "SELECT_BANK",
        bank: intent.bank ?? undefined,
        amount: intent.amount ?? undefined,
        tenureMonths: intent.tenure ?? undefined,
      });

      const bookingStructured = buildBookingStructuredResponse(bookingState, {
        language: bookingLanguage,
      });

      return NextResponse.json({
        reply:
          bookingStructured.explanation ||
          "Let us start your guided FD booking flow.",
        structured: bookingStructured,
      });
    }

    let knowledgeSection = "";
    let knowledgeSources: SourceCitation[] = [];

    if (canUseVectorRag()) {
      try {
        const vectorResponse = await retrieveContext(trimmedMessage, {
          topK: 4,
          similarityThreshold: 0.35,
        });

        knowledgeSection = buildVectorKnowledgePromptSection(vectorResponse);
        knowledgeSources = buildSourceCitationsFromVector(vectorResponse);
      } catch (error) {
        console.error("[vectorRag] Error:", error);
      }
    }

    if (!knowledgeSection) {
      const retrievalQuery = await translateToEnglishForRetrieval(
        trimmedMessage,
        messageLanguage
      );

      try {
        const knowledgeContext = await retrieveKnowledgeContext(trimmedMessage, {
          preferredType: getPreferredKnowledgeType(intent, retrievalQuery),
          retrievalQuery,
          limit: 3,
        });

        knowledgeSection = buildKnowledgePromptSection(knowledgeContext);
        knowledgeSources = buildSourceCitationsFromMinimal(knowledgeContext.chunks);
      } catch (error) {
        console.error("[retrieveKnowledgeContext] Error:", error);
        knowledgeSection =
          "━━━ RETRIEVED FD KNOWLEDGE CONTEXT (MINIMAL RAG) ━━━\n" +
          "Knowledge retrieval failed for this turn. Give cautious guidance and avoid making up exact factual values.";
        knowledgeSources = [];
      }
    }

    let systemContent = SYSTEM_PROMPT;
    systemContent += `\n\n${knowledgeSection}`;

    const dateLabel = new Intl.DateTimeFormat("en-IN", {
      month: "short",
      year: "numeric",
    }).format(new Date());
    systemContent +=
      `\n\n━━━ DATA FRESHNESS CONTEXT ━━━\n` +
      `Today: ${dateLabel}. If you mention rates or thresholds, say "as of ${dateLabel} (latest indexed data, subject to revision)".`;

    const langInstruction = getLanguageOverrideInstruction(responseLanguage);
    systemContent += `\n\n━━━ LANGUAGE OVERRIDE (CURRENT USER MESSAGE) ━━━\n${langInstruction} Follow the language of the CURRENT user message only. Ignore UI language selection for this rule.`;

    if (responseLanguage === "bho") {
      systemContent +=
        "\n\n━━━ BHOJPURI STRICT MODE ━━━\n" +
        "Use natural Bhojpuri style and grammar. Prefer words/forms like 'रउआ', 'हमनी', 'बा', 'बानी', 'कइसे'. " +
        "Avoid standard Hindi forms like 'आप', 'मैं', 'है', 'हैं' unless absolutely necessary for clarity.";
    }

    systemContent += `\n\n━━━ RESPONSE DETAIL OVERRIDE (CURRENT UI MODE) ━━━\n${getResponseModeInstruction(normalizedResponseMode)}`;

    let recommendationOptions: FDOption[] = [];

    if (isRecommendationIntent(intent)) {
      recommendationOptions = findBestFDs(
        intent.amount ?? undefined,
        intent.tenure ?? undefined
      );

      if (recommendationOptions.length > 0) {
        const fdDataStr = formatFDOptionsForPrompt(
          recommendationOptions,
          intent.amount ?? undefined,
          intent.tenure ?? undefined
        );
        systemContent += RECOMMENDATION_PROMPT + "\n\n" + fdDataStr;
      }
    }

    // Build messages
    const messages: {
      role: "system" | "user" | "assistant";
      content: string;
    }[] = [{ role: "system", content: systemContent }];

    if (Array.isArray(history)) {
      const recentHistory = history.slice(-6);
      for (const msg of recentHistory) {
        if (
          msg &&
          (msg.role === "user" || msg.role === "assistant") &&
          typeof msg.content === "string"
        ) {
          messages.push({ role: msg.role, content: msg.content });
        }
      }
    }

    messages.push({ role: "user", content: trimmedMessage });

    const chatCompletion = await groq.chat.completions.create({
      messages,
      model: "openai/gpt-oss-120b",
      temperature: 0.7,
      max_tokens: 1024,
    });

    const rawReply =
      chatCompletion.choices[0]?.message?.content?.trim() ||
      "Maaf kijiye, main abhi respond nahi kar pa raha. Please try again.";

    // ── Phase 8: Try parsing structured JSON ──
    const { structured, rawText } = parseStructuredResponse(rawReply);

    const fallbackRecommendationStructured =
      !structured && isRecommendationIntent(intent) && recommendationOptions.length > 0
        ? buildRecommendationFallbackStructured(
            responseLanguage,
            recommendationOptions,
            intent.amount ?? undefined,
            intent.tenure ?? undefined,
            knowledgeSources
          )
        : null;

    const rawFallbackStructured =
      !structured && !fallbackRecommendationStructured
        ? buildStructuredFromRawFallback({
            rawText,
            mode: normalizedResponseMode,
            message: trimmedMessage,
            intent,
            language: responseLanguage,
            dateLabel,
            knowledgeSources,
          })
        : null;

    const finalStructured =
      structured || fallbackRecommendationStructured || rawFallbackStructured || undefined;
    let finalOutputStructured = finalStructured
      ? polishStructuredResponse({
          structured: finalStructured,
          mode: normalizedResponseMode,
          message: trimmedMessage,
          intent,
          language: responseLanguage,
          dateLabel,
        })
      : undefined;
    let finalReply = finalOutputStructured?.explanation || rawText;

    if (
      responseLanguage === "hi" ||
      responseLanguage === "mr" ||
      responseLanguage === "gu" ||
      responseLanguage === "ta" ||
      responseLanguage === "bho"
    ) {
      const structuredText = finalOutputStructured
        ? collectStringValues(finalOutputStructured).join(" ")
        : finalReply;

      const needsNormalization =
        shouldForceRewriteLanguage(responseLanguage) ||
        (responseLanguage === "hi"
          ? shouldNormalizeHindiOutput(structuredText)
          : shouldNormalizeForLanguage(structuredText, responseLanguage));

      if (needsNormalization) {
        if (finalOutputStructured) {
          const rewrittenStructured = await rewriteStructuredToLanguage(
            finalOutputStructured,
            responseLanguage
          );
          if (rewrittenStructured) {
            finalOutputStructured = rewrittenStructured;
            finalReply = rewrittenStructured.explanation || finalReply;
          }
        } else {
          const rewrittenText = await rewriteTextToLanguage(
            finalReply,
            responseLanguage
          );
          if (rewrittenText) {
            finalReply = rewrittenText;
          }
        }
      }
    }

    if (
      finalOutputStructured &&
      finalOutputStructured.type !== "booking_flow" &&
      knowledgeSources.length > 0
    ) {
      finalOutputStructured = {
        ...finalOutputStructured,
        sources: knowledgeSources,
      };
    }

    return NextResponse.json({
      reply: finalReply,
      structured: finalOutputStructured,
    });
  } catch (error: unknown) {
    console.error("[/api/chat] Error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        error: "AI service encountered an error. Please try again.",
        details:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}
