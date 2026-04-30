/**
 * Vector Store — Supabase pgvector Operations
 *
 * Handles:
 * - Bulk upsert of chunks + embeddings (duplicate-safe via id)
 * - Cosine similarity search with metadata filters
 * - Chunk count verification
 */

import { getServiceClient } from "./supabase-client";
import type {
  DocumentChunk,
  ChunkMetadata,
  RetrievalResult,
  RetrievalOptions,
  EMBEDDING_CONFIG,
} from "./types";

/** Supabase table name for our document vectors. */
const TABLE_NAME = "documents";

/** RPC function name for similarity search. */
const MATCH_FUNCTION = "match_documents";

// ─── Upsert Operations ──────────────────────────────────────────

/**
 * Upsert a batch of chunks with their embeddings into Supabase.
 * Uses the chunk `id` as the primary key for duplicate prevention.
 *
 * @param chunks - The document chunks
 * @param embeddings - Corresponding embedding vectors (same order)
 * @param batchSize - How many rows to upsert per DB call (default 50)
 */
export async function upsertChunks(
  chunks: DocumentChunk[],
  embeddings: number[][],
  batchSize = 50
): Promise<{ inserted: number; errors: string[] }> {
  const supabase = getServiceClient();
  let inserted = 0;
  const errors: string[] = [];

  // Build rows
  const rows = chunks.map((chunk, i) => ({
    id: chunk.id,
    content: chunk.text,
    embedding: `[${embeddings[i].join(",")}]`,
    metadata: chunk.metadata,
    token_estimate: chunk.tokenEstimate,
  }));

  // Batch upsert
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(rows.length / batchSize);

    const { error } = await supabase
      .from(TABLE_NAME)
      .upsert(batch, { onConflict: "id" });

    if (error) {
      const msg = `Batch ${batchNum}/${totalBatches} failed: ${error.message}`;
      console.error(`  ❌ ${msg}`);
      errors.push(msg);
    } else {
      inserted += batch.length;
      console.log(
        `  ✅ Batch ${batchNum}/${totalBatches}: ${batch.length} rows upserted`
      );
    }
  }

  return { inserted, errors };
}

// ─── Search Operations ───────────────────────────────────────────

/**
 * Perform cosine similarity search on the vector store.
 * Calls the `match_documents` Postgres RPC function.
 *
 * @param queryEmbedding - The 1024-dim embedding of the user query
 * @param options - Search options (topK, threshold, filters)
 */
export async function searchSimilar(
  queryEmbedding: number[],
  options: RetrievalOptions = {}
): Promise<RetrievalResult[]> {
  const supabase = getServiceClient();
  const topK = options.topK ?? 5;
  const threshold = options.similarityThreshold ?? 0.3;

  // Build the RPC call params
  const params: Record<string, unknown> = {
    query_embedding: `[${queryEmbedding.join(",")}]`,
    match_count: topK,
    match_threshold: threshold,
  };

  // Add optional metadata filters
  if (options.filterBank) {
    params.filter_bank = options.filterBank;
  }
  if (options.filterTopic) {
    params.filter_topic = options.filterTopic;
  }
  if (options.filterCategory) {
    params.filter_category = options.filterCategory;
  }

  const { data, error } = await supabase.rpc(MATCH_FUNCTION, params);

  if (error) {
    console.error("Vector search error:", error.message);
    return [];
  }

  if (!data || !Array.isArray(data)) {
    return [];
  }

  return data.map(
    (row: {
      id: string;
      content: string;
      similarity: number;
      metadata: ChunkMetadata;
    }) => ({
      id: row.id,
      content: row.content,
      similarity: row.similarity,
      metadata: row.metadata,
    })
  );
}

// ─── Utility Operations ──────────────────────────────────────────

/**
 * Get the total number of documents in the vector store.
 * Useful for verification after ingestion.
 */
export async function getDocumentCount(): Promise<number> {
  const supabase = getServiceClient();

  const { count, error } = await supabase
    .from(TABLE_NAME)
    .select("id", { count: "exact", head: true });

  if (error) {
    console.error("Count error:", error.message);
    return -1;
  }

  return count ?? 0;
}

/**
 * Delete all documents from the store.
 * Used for re-ingestion.
 */
export async function clearAllDocuments(): Promise<void> {
  const supabase = getServiceClient();

  const { error } = await supabase
    .from(TABLE_NAME)
    .delete()
    .neq("id", "");

  if (error) {
    throw new Error(`Failed to clear documents: ${error.message}`);
  }
}
