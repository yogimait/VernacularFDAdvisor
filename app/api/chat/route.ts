import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { findBestFDs, formatFDOptionsForPrompt } from "@/lib/fd-data";
import type { StructuredResponse, FDRecommendation } from "@/types/chat";

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
2. NEVER switch language mid-response.
3. Response should feel NATURAL — like a knowledgeable friend talking.
4. Match user's TONE (casual → casual, formal → formal).

━━━ JARGON SIMPLIFICATION ━━━

1. NEVER use a financial term without explaining it immediately.
2. ALWAYS include a relatable example with ₹ numbers.
3. Sound like a helpful friend, NOT a banker.
4. Keep sentences SHORT (max 15 words).

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

// ── Intent extraction ──
const EXTRACTION_PROMPT = `Analyze this user message and extract:
1. Is the user asking for FD recommendations? (yes/no)
2. Investment amount (number only, in INR. "1 lakh" = 100000, "50k" = 50000)
3. Duration in months ("1 year" = 12, "6 months" = 6)

Respond ONLY in this exact JSON format:
{"isRecommendation": true/false, "amount": number_or_null, "tenure": number_or_null}`;

async function extractIntent(
  message: string
): Promise<{
  isRecommendation: boolean;
  amount: number | null;
  tenure: number | null;
}> {
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
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error("[extractIntent] Error:", e);
  }

  return { isRecommendation: false, amount: null, tenure: null };
}

/** Check if parsed object has the expected structured response shape */
function isValidStructured(obj: Record<string, unknown>): boolean {
  return !!(obj.type && (obj.explanation || obj.points || obj.nextStep));
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
  return parsed as unknown as StructuredResponse;
}

/** Build a human-readable fallback from structured data (never show raw JSON) */
function buildFallbackText(parsed: Record<string, unknown>): string {
  const parts: string[] = [];
  if (parsed.explanation) parts.push(`💡 ${parsed.explanation}`);
  if (parsed.example) parts.push(`📌 ${parsed.example}`);
  if (parsed.points && Array.isArray(parsed.points)) {
    parts.push("📊 Key Points:");
    (parsed.points as string[]).forEach((p) => parts.push(`• ${p}`));
  }
  if (parsed.nextStep) parts.push(`➡️ ${parsed.nextStep}`);
  return parts.join("\n") || "Response received.";
}

/**
 * Try to parse the LLM response as structured JSON.
 * SECURITY: Raw JSON must NEVER be shown to the user.
 */
function parseStructuredResponse(
  text: string
): { structured: StructuredResponse | null; rawText: string } {
  // Attempt 1: Direct JSON.parse (response is pure JSON)
  try {
    const parsed = JSON.parse(text);
    if (isValidStructured(parsed)) {
      return { structured: cleanStructured(parsed), rawText: buildFallbackText(parsed) };
    }
  } catch {
    // Not pure JSON, try extraction
  }

  // Attempt 2: Extract JSON from markdown code blocks (```json ... ```)
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    try {
      const parsed = JSON.parse(codeBlockMatch[1].trim());
      if (isValidStructured(parsed)) {
        return { structured: cleanStructured(parsed), rawText: buildFallbackText(parsed) };
      }
    } catch {
      // Code block JSON invalid
    }
  }

  // Attempt 3: Greedy regex for JSON object in text
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (isValidStructured(parsed)) {
        return { structured: cleanStructured(parsed), rawText: buildFallbackText(parsed) };
      }
    } catch {
      // Regex JSON invalid
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
    const { message, history, languagePreference } = body;

    if (!message || typeof message !== "string" || !message.trim()) {
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
    const intent = await extractIntent(message.trim());

    let systemContent = SYSTEM_PROMPT;

    // Phase 10: Apply manual language preference
    if (languagePreference && typeof languagePreference === "string") {
      const langMap: Record<string, string> = {
        english: "Respond ONLY in English.",
        hindi: "Respond ONLY in Hindi.",
        hinglish: "Respond ONLY in Hinglish (natural Hindi-English mix).",
      };
      const langInstruction = langMap[languagePreference];
      if (langInstruction) {
        systemContent += `\n\n━━━ LANGUAGE OVERRIDE ━━━\n${langInstruction} Ignore the auto-detect rules above.`;
      }
    }

    if (intent.isRecommendation) {
      const fdOptions = findBestFDs(
        intent.amount ?? undefined,
        intent.tenure ?? undefined
      );

      if (fdOptions.length > 0) {
        const fdDataStr = formatFDOptionsForPrompt(
          fdOptions,
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

    messages.push({ role: "user", content: message.trim() });

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

    return NextResponse.json({
      reply: rawText,
      structured: structured || undefined,
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
