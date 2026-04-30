/**
 * HuggingFace Embedding Client
 *
 * Wraps @huggingface/inference for multilingual-e5-large embeddings.
 * Handles:
 * - Passage prefix ("passage: ") for document chunks
 * - Query prefix ("query: ") for user questions
 * - Batch processing (16 chunks per call)
 * - Exponential backoff retry for 429 / cold-start errors
 * - Token limit safety (trims >512 token chunks)
 */

import { InferenceClient } from "@huggingface/inference";
import { EMBEDDING_CONFIG } from "./types";

// ─── Client Singleton ────────────────────────────────────────────

let clientInstance: InferenceClient | null = null;

function getClient(): InferenceClient {
  if (!clientInstance) {
    const token = process.env.HF_TOKEN;
    if (!token) {
      throw new Error(
        "HF_TOKEN environment variable is required. Get one at https://huggingface.co/settings/tokens"
      );
    }
    clientInstance = new InferenceClient(token);
  }
  return clientInstance;
}

// ─── Token Safety ────────────────────────────────────────────────

/**
 * Rough estimate: 1 word ≈ 1.3 tokens.
 * If a chunk exceeds ~390 words (≈512 tokens), trim it.
 */
function trimToTokenLimit(text: string): string {
  const words = text.split(/\s+/);
  const maxWords = Math.floor(EMBEDDING_CONFIG.maxInputTokens / 1.3);

  if (words.length <= maxWords) return text;

  console.warn(
    `  ⚠️  Trimming chunk from ${words.length} words to ${maxWords} (512 token limit)`
  );
  return words.slice(0, maxWords).join(" ");
}

// ─── Retry Logic ─────────────────────────────────────────────────

/**
 * Sleep for a given number of milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Call the HF API with exponential backoff retry.
 * Handles: 429 (rate limit), 503 (cold start), network errors.
 */
async function callWithRetry(
  texts: string[]
): Promise<number[][]> {
  const client = getClient();

  for (let attempt = 0; attempt < EMBEDDING_CONFIG.maxRetries; attempt++) {
    try {
      // Use featureExtraction for batch embedding
      const output = await client.featureExtraction({
        model: EMBEDDING_CONFIG.model,
        inputs: texts,
        provider: "hf-inference",
      });

      // The output is number[][] for batch inputs (one embedding per input)
      // Each embedding is a 1024-dim vector
      return normalizeOutput(output, texts.length);
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string };
      const status = err.status ?? 0;
      const message = err.message ?? String(error);

      // Rate limit (429) or cold start (503) — retry with backoff
      if (status === 429 || status === 503 || message.includes("loading")) {
        const delay =
          EMBEDDING_CONFIG.retryBaseDelayMs * Math.pow(2, attempt);
        console.warn(
          `  ⏳ ${status === 429 ? "Rate limited" : "Model loading"} — retrying in ${(delay / 1000).toFixed(1)}s (attempt ${attempt + 1}/${EMBEDDING_CONFIG.maxRetries})`
        );
        await sleep(delay);
        continue;
      }

      // Other errors — don't retry
      throw new Error(`HF embedding failed: ${message}`);
    }
  }

  throw new Error(
    `HF embedding failed after ${EMBEDDING_CONFIG.maxRetries} retries`
  );
}

// ─── Output Normalization ────────────────────────────────────────

/**
 * The HF featureExtraction API can return various nested formats.
 * Normalize to number[][] (one 1024-dim vector per input).
 */
function normalizeOutput(
  output: unknown,
  expectedCount: number
): number[][] {
  // If it's already a flat array of arrays of numbers
  if (
    Array.isArray(output) &&
    output.length === expectedCount &&
    Array.isArray(output[0]) &&
    typeof output[0][0] === "number"
  ) {
    return output as number[][];
  }

  // Sometimes for single input it returns number[] directly
  if (
    Array.isArray(output) &&
    typeof output[0] === "number" &&
    expectedCount === 1
  ) {
    return [output as number[]];
  }

  // Token-level embeddings: number[][][] — need to mean-pool
  if (
    Array.isArray(output) &&
    Array.isArray(output[0]) &&
    Array.isArray(output[0][0]) &&
    typeof output[0][0][0] === "number"
  ) {
    // Mean pool across token dimension
    return (output as number[][][]).map((tokenEmbeddings) =>
      meanPool(tokenEmbeddings)
    );
  }

  throw new Error(
    `Unexpected HF embedding output format: ${typeof output}, isArray=${Array.isArray(output)}`
  );
}

/**
 * Mean pooling: average across all token embeddings to get a single vector.
 */
function meanPool(tokenEmbeddings: number[][]): number[] {
  if (tokenEmbeddings.length === 0) return [];

  const dim = tokenEmbeddings[0].length;
  const result = new Array(dim).fill(0);

  for (const token of tokenEmbeddings) {
    for (let i = 0; i < dim; i++) {
      result[i] += token[i];
    }
  }

  for (let i = 0; i < dim; i++) {
    result[i] /= tokenEmbeddings.length;
  }

  return result;
}

// ─── Public API ──────────────────────────────────────────────────

/**
 * Embed a batch of document chunks (passage mode).
 * Prepends "passage: " to each text.
 * Returns one 1024-dim embedding per chunk.
 */
export async function embedPassages(
  texts: string[]
): Promise<number[][]> {
  const prefixed = texts.map((text) => {
    const trimmed = trimToTokenLimit(text);
    return `${EMBEDDING_CONFIG.passagePrefix}${trimmed}`;
  });

  return callWithRetry(prefixed);
}

/**
 * Embed a single user query (query mode).
 * Prepends "query: " to the text.
 * Returns a single 1024-dim embedding.
 */
export async function embedQuery(text: string): Promise<number[]> {
  const prefixed = `${EMBEDDING_CONFIG.queryPrefix}${text}`;
  const result = await callWithRetry([prefixed]);
  return result[0];
}

/**
 * Process all chunks in batches with rate limit awareness.
 * Returns embeddings in the same order as input.
 *
 * @param texts - Array of raw chunk texts
 * @param onProgress - Optional callback for progress tracking
 */
export async function embedAllChunks(
  texts: string[],
  onProgress?: (completed: number, total: number) => void
): Promise<number[][]> {
  const allEmbeddings: number[][] = [];
  const batchSize = EMBEDDING_CONFIG.batchSize;
  const totalBatches = Math.ceil(texts.length / batchSize);

  for (let i = 0; i < texts.length; i += batchSize) {
    const batchNum = Math.floor(i / batchSize) + 1;
    const batch = texts.slice(i, i + batchSize);

    console.log(
      `  📡 Batch ${batchNum}/${totalBatches} (${batch.length} chunks)...`
    );

    const embeddings = await embedPassages(batch);
    allEmbeddings.push(...embeddings);

    onProgress?.(allEmbeddings.length, texts.length);

    // Delay between batches (skip after last batch)
    if (i + batchSize < texts.length) {
      await sleep(EMBEDDING_CONFIG.batchDelayMs);
    }
  }

  return allEmbeddings;
}
