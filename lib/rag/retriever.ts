/**
 * Retriever Module
 *
 * High-level retrieval function for the chat API.
 * End-to-end: user query → embed → search Supabase → return context.
 *
 * Features:
 * - Automatic query prefix handling
 * - Smart metadata filter extraction from query text
 * - Minimum relevance threshold
 * - Structured response with timing info
 */

import { embedQuery } from "./embedding-client";
import { searchSimilar } from "./vector-store";
import type {
  RetrievalOptions,
  RetrievalResponse,
  BankName,
  ChunkTopic,
} from "./types";

// ─── Query Analysis ──────────────────────────────────────────────

/**
 * Extract metadata filters from the user's query text.
 * If the user mentions a specific bank or topic, we boost retrieval
 * by adding metadata filters alongside the vector search.
 */
function extractFiltersFromQuery(query: string): Partial<RetrievalOptions> {
  const lower = query.toLowerCase();
  const filters: Partial<RetrievalOptions> = {};

  // Bank detection in query
  const bankPatterns: Array<[RegExp, BankName]> = [
    [/\bsbi\b/i, "SBI"],
    [/\bhdfc\b/i, "HDFC"],
    [/\bicici\b/i, "ICICI"],
    [/\baxis\b/i, "Axis"],
    [/\bsuryoday\b|\bssfb\b/i, "Suryoday"],
  ];

  for (const [pattern, bank] of bankPatterns) {
    if (pattern.test(lower)) {
      filters.filterBank = bank;
      break;
    }
  }

  // Topic detection in query (Hindi + English + Hinglish)
  const topicPatterns: Array<[RegExp, ChunkTopic]> = [
    [/\btax|tds|कर|80c|15g|15h\b/i, "taxation"],
    [
      /\bpremature|penalty|तोड़|break|closure|pre-?mature|पेनल्टी\b/i,
      "premature_withdrawal",
    ],
    [
      /\binsurance|dicgc|बीमा|insured|सुरक्षित|safe|safety\b/i,
      "deposit_insurance",
    ],
    [/\bsenior|वरिष्ठ|बुजुर्ग|60\+?\b/i, "senior_citizen_benefits"],
    [/\bkyc|aadhaar|pan\b/i, "kyc_documentation"],
    [/\bnri|nre|nro\b/i, "nri_deposits"],
    [
      /\brate|interest|दर|ब्याज|%\b/i,
      "interest_rates",
    ],
    [/\bfraud|धोखा|scam\b/i, "fraud_awareness"],
    [/\bombudsman|शिकायत\b/i, "banking_ombudsman"],
  ];

  for (const [pattern, topic] of topicPatterns) {
    if (pattern.test(lower)) {
      filters.filterTopic = topic;
      break;
    }
  }

  return filters;
}

// ─── Main Retrieval Function ─────────────────────────────────────

/**
 * Retrieve relevant context for a user query.
 *
 * This is the main function called by the chat API.
 * It handles the full pipeline:
 * 1. Extract metadata filters from query text
 * 2. Generate query embedding via HF API
 * 3. Search Supabase for similar chunks
 * 4. Return structured results with timing
 *
 * @param userQuery - Raw user question (Hindi/English/Hinglish)
 * @param options - Optional overrides for search parameters
 */
export async function retrieveContext(
  userQuery: string,
  options: RetrievalOptions = {}
): Promise<RetrievalResponse> {
  const startTime = Date.now();

  // Step 1: Smart filter extraction from query text
  const autoFilters = extractFiltersFromQuery(userQuery);

  // Merge: explicit options take priority over auto-detected
  const mergedOptions: RetrievalOptions = {
    topK: options.topK ?? 5,
    similarityThreshold: options.similarityThreshold ?? 0.35,
    filterBank: options.filterBank ?? autoFilters.filterBank,
    filterTopic: options.filterTopic ?? autoFilters.filterTopic,
    filterCategory: options.filterCategory,
  };

  // Step 2: Generate query embedding
  const queryEmbedding = await embedQuery(userQuery);

  // Step 3: Search Supabase
  let results = await searchSimilar(queryEmbedding, mergedOptions);

  // Step 4: If filtered search returns too few results, retry without filters
  if (results.length < 2 && (mergedOptions.filterBank || mergedOptions.filterTopic)) {
    const fallbackResults = await searchSimilar(queryEmbedding, {
      topK: mergedOptions.topK,
      similarityThreshold: mergedOptions.similarityThreshold,
    });

    // Merge: keep filtered results first, then add unfiltered
    const seenIds = new Set(results.map((r) => r.id));
    for (const result of fallbackResults) {
      if (!seenIds.has(result.id)) {
        results.push(result);
        seenIds.add(result.id);
      }
    }

    // Trim to topK
    results = results.slice(0, mergedOptions.topK);
  }

  const searchTimeMs = Date.now() - startTime;

  return {
    query: userQuery,
    results,
    totalResults: results.length,
    searchTimeMs,
  };
}

/**
 * Format retrieved results into a context string for the LLM prompt.
 * Includes source citations for grounded answers.
 */
export function formatContextForPrompt(
  response: RetrievalResponse
): string {
  if (response.results.length === 0) {
    return "No relevant information found in the knowledge base.";
  }

  const contextBlocks = response.results.map((result, i) => {
    const source = result.metadata.source;
    const topic = result.metadata.topic;
    const bank = result.metadata.bank ?? "General";
    const similarity = (result.similarity * 100).toFixed(1);

    return [
      `[Source ${i + 1}] ${source}`,
      `Bank: ${bank} | Topic: ${topic} | Relevance: ${similarity}%`,
      result.content,
    ].join("\n");
  });

  return contextBlocks.join("\n\n---\n\n");
}
