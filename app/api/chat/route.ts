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
  type BookingLanguage,
} from "@/lib/fd-booking-flow";
import { detectMessageLanguage } from "@/lib/language-detection";
import {
  buildKnowledgePromptSection,
  retrieveKnowledgeContext,
  type KnowledgeType,
} from "@/lib/minimal-rag";
import type { StructuredResponse, FDOption, FDRecommendation } from "@/types/chat";

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
  "explanation": "2-4 sentences giving genuinely useful, specific information",
  "example": "One real-life example with ₹ numbers (vary the amounts each time!)",
  "points": ["point 1", "point 2", "point 3"],
  "nextStep": "One clear, actionable suggestion"
}

For recommendations, also include:
{
  "type": "recommendation",
  "explanation": "brief intro with context about why these options suit the user",
  "recommendations": [
    {"bank": "Bank Name", "rate": 8.5, "tenure": 12, "maturity": 54250, "category": "small-finance", "reason": "specific reason why this option suits this user"}
  ],
  "points": ["key comparison point 1", "key comparison point 2"],
  "nextStep": "what to do next"
}

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
6. When user mentions salary, savings, or personal finance — connect it naturally to FD advice. Don't just redirect, actually HELP them plan.
7. Points should each teach something DIFFERENT — not just rephrase the same idea 3 times.

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
→ nextStep: Ask if user wants FD recommendations. E.g. "Kya aap best FD options dekhna chahenge? Apna budget bataiye!"

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

NEVER give a dead-end response without guidance.

━━━ SCOPE ━━━

1. PRIMARILY answer about Fixed Deposits, savings, interest rates, and basic banking.
2. If user asks about salary, budgeting, or saving — connect it to FD planning. Don't just redirect, actually help.
3. Completely unrelated questions (stocks, crypto, real estate) → warmly redirect to FD topics with a useful suggestion.
4. Greetings → greet warmly, use type "greeting", suggest an FD topic.

━━━ ACCURACY ━━━

Use approximate realistic rates. Always mention "ye approximate rates hain".`;

// ── Recommendation-specific instructions ──
const RECOMMENDATION_PROMPT = `
━━━ FD RECOMMENDATION MODE ━━━

You have REAL FD DATA below. Use it to populate the "recommendations" array in your JSON.
- Include top 2-3 options as objects with bank, rate, tenure, maturity, category, reason.
- Explain trade-offs in "points" (safety vs returns).
- Always mention "ye approximate rates hain".`;

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
    return "Use DETAILED mode: explanation 3-4 short sentences, include one practical comparison with numbers, keep 3 distinct points, and nextStep can be 1-2 clear lines.";
  }

  return "Use SIMPLE mode: explanation in 1-2 short sentences, max 2 points, and one very short nextStep. Keep language very plain and avoid extra details.";
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

async function rewriteStructuredToHindi(
  structured: StructuredResponse
): Promise<StructuredResponse | null> {
  const prompt =
    "Rewrite every user-visible text VALUE in this JSON into pure Hindi (Devanagari script only). " +
    "Keep keys, hierarchy, arrays, numbers, bank names, percentages, and overall meaning unchanged. " +
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

async function rewriteTextToHindi(text: string): Promise<string | null> {
  const prompt =
    "Rewrite the following answer into pure Hindi (Devanagari script only). " +
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

  if (isBookingIntentMessage(message)) {
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
  tenure?: number
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

  return {
    type: "recommendation",
    explanation,
    recommendations,
    points: [...pointsMap[language]],
    nextStep: nextStepMap[language],
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

    const retrievalQuery = await translateToEnglishForRetrieval(
      trimmedMessage,
      messageLanguage
    );

    let knowledgeSection = "";
    try {
      const knowledgeContext = await retrieveKnowledgeContext(trimmedMessage, {
        preferredType: getPreferredKnowledgeType(intent, retrievalQuery),
        retrievalQuery,
        limit: 3,
      });

      knowledgeSection = buildKnowledgePromptSection(knowledgeContext);
    } catch (error) {
      console.error("[retrieveKnowledgeContext] Error:", error);
      knowledgeSection =
        "━━━ RETRIEVED FD KNOWLEDGE CONTEXT (MINIMAL RAG) ━━━\n" +
        "Knowledge retrieval failed for this turn. Give cautious guidance and avoid making up exact factual values.";
    }

    let systemContent = SYSTEM_PROMPT;
    systemContent += `\n\n${knowledgeSection}`;

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
            intent.tenure ?? undefined
          )
        : null;

    const finalStructured = structured || fallbackRecommendationStructured || undefined;
    let finalReply = finalStructured?.explanation || rawText;
    let finalOutputStructured = finalStructured;

    if (responseLanguage === "hi") {
      const structuredText = finalOutputStructured
        ? collectStringValues(finalOutputStructured).join(" ")
        : finalReply;

      if (shouldNormalizeHindiOutput(structuredText)) {
        if (finalOutputStructured) {
          const rewrittenStructured = await rewriteStructuredToHindi(
            finalOutputStructured
          );
          if (rewrittenStructured) {
            finalOutputStructured = rewrittenStructured;
            finalReply = rewrittenStructured.explanation || finalReply;
          }
        } else {
          const rewrittenText = await rewriteTextToHindi(finalReply);
          if (rewrittenText) {
            finalReply = rewrittenText;
          }
        }
      }
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
