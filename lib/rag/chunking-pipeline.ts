/**
 * Chunking Pipeline — Orchestrator
 *
 * Wires together: loader → cleaner → chunker → output
 * Produces the final chunks.json with quality stats.
 */

import type {
  DocumentChunk,
  ChunkingConfig,
  ChunkingStats,
  DocumentCategory,
} from "./types";
import { DEFAULT_CHUNKING_CONFIG } from "./types";
import { loadAllDocuments } from "./document-loader";
import { cleanDocument } from "./text-cleaner";
import { chunkDocument } from "./semantic-chunker";

// ─── Deduplication ───────────────────────────────────────────────

/**
 * Simple near-duplicate detection.
 * Removes chunks that have very similar content (>90% word overlap).
 */
function deduplicateChunks(chunks: DocumentChunk[]): DocumentChunk[] {
  const seen = new Map<string, DocumentChunk>();
  const result: DocumentChunk[] = [];

  for (const chunk of chunks) {
    // Create a simple fingerprint from first 200 chars
    const fingerprint = chunk.text
      .slice(0, 200)
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();

    // Check if we've seen something very similar
    let isDuplicate = false;
    for (const [existingFp] of seen) {
      if (
        fingerprint.length > 50 &&
        existingFp.length > 50 &&
        computeSimilarity(fingerprint, existingFp) > 0.9
      ) {
        isDuplicate = true;
        break;
      }
    }

    if (!isDuplicate) {
      seen.set(fingerprint, chunk);
      result.push(chunk);
    }
  }

  return result;
}

/**
 * Simple word-overlap similarity between two strings.
 */
function computeSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.split(/\s+/));
  const wordsB = new Set(b.split(/\s+/));

  let overlap = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) overlap++;
  }

  const union = new Set([...wordsA, ...wordsB]).size;
  return union === 0 ? 0 : overlap / union;
}

// ─── Stats Computation ──────────────────────────────────────────

function computeStats(
  chunks: DocumentChunk[],
  txtCount: number,
  pdfCount: number,
  skipped: string[]
): ChunkingStats {
  const chunksByCategory: Record<DocumentCategory, number> = {
    regulatory: 0,
    bank_product: 0,
    education: 0,
  };

  const chunksByBank: Record<string, number> = {};
  const chunksByTopic: Record<string, number> = {};
  let totalTokens = 0;
  let tooSmall = 0;
  let tooLarge = 0;

  for (const chunk of chunks) {
    // Category
    chunksByCategory[chunk.metadata.category] =
      (chunksByCategory[chunk.metadata.category] ?? 0) + 1;

    // Bank
    const bankKey = chunk.metadata.bank ?? "none";
    chunksByBank[bankKey] = (chunksByBank[bankKey] ?? 0) + 1;

    // Topic
    chunksByTopic[chunk.metadata.topic] =
      (chunksByTopic[chunk.metadata.topic] ?? 0) + 1;

    // Tokens
    totalTokens += chunk.tokenEstimate;

    // Size checks
    if (chunk.tokenEstimate < 100) tooSmall++;
    if (chunk.tokenEstimate > 500) tooLarge++;
  }

  return {
    totalFilesProcessed: txtCount + pdfCount,
    txtFilesProcessed: txtCount,
    pdfFilesProcessed: pdfCount,
    skippedFiles: skipped,
    totalChunks: chunks.length,
    avgTokensPerChunk:
      chunks.length > 0 ? Math.round(totalTokens / chunks.length) : 0,
    chunksByCategory,
    chunksByBank,
    chunksByTopic,
    tooSmallChunks: tooSmall,
    tooLargeChunks: tooLarge,
  };
}

// ─── Main Pipeline ──────────────────────────────────────────────

export interface ChunkingPipelineResult {
  chunks: DocumentChunk[];
  stats: ChunkingStats;
}

/**
 * Runs the full chunking pipeline:
 * 1. Load all documents (TXT + PDF)
 * 2. Clean text
 * 3. Chunk with category-specific strategies
 * 4. Deduplicate
 * 5. Compute stats
 */
export async function runChunkingPipeline(
  projectRoot: string,
  config: ChunkingConfig = DEFAULT_CHUNKING_CONFIG
): Promise<ChunkingPipelineResult> {
  console.log("═══════════════════════════════════════════════════");
  console.log("  📊 Semantic Chunking Pipeline — Starting...");
  console.log("═══════════════════════════════════════════════════");
  console.log(
    `  Config: target=${config.targetTokens} tokens, max=${config.maxTokens}, min=${config.minTokens}, overlap=${config.overlapTokens}`
  );

  // Step 1: Load documents
  const { documents, skipped } = await loadAllDocuments(projectRoot);

  let txtCount = 0;
  let pdfCount = 0;
  for (const doc of documents) {
    if (doc.metadata.fileType === "txt") txtCount++;
    else pdfCount++;
  }

  // Step 2 & 3: Clean and chunk each document
  const allChunks: DocumentChunk[] = [];

  for (const doc of documents) {
    console.log(
      `\n  🔧 Processing: ${doc.metadata.source} [${doc.metadata.category}]`
    );

    const cleaned = cleanDocument(doc);
    const chunks = chunkDocument(cleaned, config);

    console.log(
      `     → ${chunks.length} chunks (avg ~${
        chunks.length > 0
          ? Math.round(
              chunks.reduce((s, c) => s + c.tokenEstimate, 0) / chunks.length
            )
          : 0
      } tokens/chunk)`
    );

    allChunks.push(...chunks);
  }

  // Step 4: Deduplicate
  console.log(`\n  🔄 Deduplicating ${allChunks.length} chunks...`);
  const dedupedChunks = deduplicateChunks(allChunks);
  const removedCount = allChunks.length - dedupedChunks.length;
  if (removedCount > 0) {
    console.log(`     → Removed ${removedCount} near-duplicate chunks`);
  }

  // Step 5: Compute stats
  const stats = computeStats(dedupedChunks, txtCount, pdfCount, skipped);

  console.log("\n═══════════════════════════════════════════════════");
  console.log("  ✅ Pipeline Complete!");
  console.log("═══════════════════════════════════════════════════");

  return { chunks: dedupedChunks, stats };
}
