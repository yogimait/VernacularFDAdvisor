/**
 * Run Embedding Pipeline
 *
 * One-time script to embed all chunks and upload to Supabase.
 * Run: npx tsx scripts/run-embedding.ts
 *
 * Steps:
 * 1. Load chunks.json
 * 2. Validate token safety (trim >512 token chunks)
 * 3. Batch embed via HF API (16 per batch, 2.5s delay)
 * 4. Upload to Supabase with progress tracking
 * 5. Verify final count
 *
 * Resume-capable: uses chunk IDs to upsert (won't duplicate on re-run).
 *
 * Environment required:
 * - HF_TOKEN
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_KEY
 */

import { promises as fs } from "fs";
import path from "path";
import { config as dotenvConfig } from "dotenv";
import type { DocumentChunk } from "../lib/rag/types";
import { embedAllChunks } from "../lib/rag/embedding-client";
import { upsertChunks, getDocumentCount } from "../lib/rag/vector-store";

// Load environment variables
dotenvConfig({ path: ".env.local" });
dotenvConfig({ path: ".env" });

// ─── Config ──────────────────────────────────────────────────────

const CHUNKS_PATH = path.join(process.cwd(), "lib", "rag", "chunks.json");
const EMBEDDINGS_CACHE_PATH = path.join(
  process.cwd(),
  "lib",
  "rag",
  "embeddings-cache.json"
);

// ─── Main ────────────────────────────────────────────────────────

async function main() {
  console.log("\n═══════════════════════════════════════════════════");
  console.log("  🚀 Embedding Pipeline — Starting...");
  console.log("═══════════════════════════════════════════════════");

  // ── Step 1: Validate environment ─────────────────────────────
  const hfToken = process.env.HF_TOKEN;
  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!hfToken) {
    console.error("❌ HF_TOKEN is missing from .env.local");
    console.error("   Get your token at: https://huggingface.co/settings/tokens");
    process.exit(1);
  }
  if (!supabaseUrl || !supabaseKey) {
    console.error("❌ SUPABASE_URL or SUPABASE_SERVICE_KEY missing from .env.local");
    console.error("   Set up your Supabase project first (see setup guide).");
    process.exit(1);
  }

  console.log("  ✅ Environment validated");
  console.log(`     HF_TOKEN: ${hfToken.slice(0, 8)}...`);
  console.log(`     SUPABASE_URL: ${supabaseUrl}`);

  // ── Step 2: Load chunks ──────────────────────────────────────
  console.log("\n  📄 Loading chunks.json...");
  const rawContent = await fs.readFile(CHUNKS_PATH, "utf-8");
  const chunks: DocumentChunk[] = JSON.parse(rawContent);
  console.log(`     Loaded ${chunks.length} chunks`);

  // Token safety check
  const overLimit = chunks.filter((c) => c.tokenEstimate > 512);
  if (overLimit.length > 0) {
    console.log(
      `  ⚠️  ${overLimit.length} chunks exceed 512 tokens — will be auto-trimmed during embedding`
    );
  }

  // ── Step 3: Check for cached embeddings ──────────────────────
  let embeddings: number[][] | null = null;

  try {
    const cached = await fs.readFile(EMBEDDINGS_CACHE_PATH, "utf-8");
    const cachedData = JSON.parse(cached);
    if (
      cachedData.count === chunks.length &&
      Array.isArray(cachedData.embeddings) &&
      cachedData.embeddings.length === chunks.length
    ) {
      console.log("  📦 Found cached embeddings — skipping HF API calls");
      embeddings = cachedData.embeddings;
    } else {
      console.log(
        `  ⚠️  Cache mismatch (${cachedData.count} cached vs ${chunks.length} current) — re-embedding`
      );
    }
  } catch {
    console.log("  📡 No cache found — will generate embeddings via HF API");
  }

  // ── Step 4: Generate embeddings ──────────────────────────────
  if (!embeddings) {
    const startEmbed = Date.now();
    console.log("\n  📡 Generating embeddings via HuggingFace API...");
    console.log(
      `     Model: intfloat/multilingual-e5-large (1024 dims)`
    );
    console.log(`     Batch size: 16 chunks/request`);
    console.log(`     Rate delay: 2.5s between batches`);
    console.log(
      `     Estimated time: ~${Math.ceil((chunks.length / 16) * 4)}s\n`
    );

    const texts = chunks.map((c) => c.text);

    embeddings = await embedAllChunks(texts, (completed, total) => {
      const pct = ((completed / total) * 100).toFixed(1);
      const bar = "█".repeat(Math.floor(completed / total * 30));
      const empty = "░".repeat(30 - bar.length);
      process.stdout.write(
        `\r  [${bar}${empty}] ${pct}% (${completed}/${total})`
      );
    });

    const embedTime = ((Date.now() - startEmbed) / 1000).toFixed(1);
    console.log(`\n\n  ✅ Embeddings generated in ${embedTime}s`);

    // Validate dimensions
    const sampleDim = embeddings[0]?.length;
    if (sampleDim !== 1024) {
      console.error(
        `  ❌ Expected 1024 dimensions, got ${sampleDim}. Aborting.`
      );
      process.exit(1);
    }
    console.log(`     Dimension check: ${sampleDim} ✅`);

    // Cache embeddings locally (saves HF credits on re-runs)
    console.log("  💾 Caching embeddings locally...");
    await fs.writeFile(
      EMBEDDINGS_CACHE_PATH,
      JSON.stringify({
        count: embeddings.length,
        model: "intfloat/multilingual-e5-large",
        generatedAt: new Date().toISOString(),
        embeddings,
      }),
      "utf-8"
    );
    console.log("     Saved to embeddings-cache.json");
  }

  // ── Step 5: Upload to Supabase ───────────────────────────────
  console.log("\n  ☁️  Uploading to Supabase pgvector...");
  const startUpload = Date.now();

  const { inserted, errors } = await upsertChunks(chunks, embeddings);

  const uploadTime = ((Date.now() - startUpload) / 1000).toFixed(1);
  console.log(`\n  ✅ Upload complete in ${uploadTime}s`);
  console.log(`     Inserted/Updated: ${inserted} rows`);
  if (errors.length > 0) {
    console.log(`     ⚠️  Errors: ${errors.length}`);
    for (const err of errors) {
      console.log(`        ${err}`);
    }
  }

  // ── Step 6: Verify ───────────────────────────────────────────
  console.log("\n  🔍 Verifying...");
  const count = await getDocumentCount();
  const match = count === chunks.length;
  console.log(
    `     Supabase rows: ${count} / Expected: ${chunks.length} ${match ? "✅" : "⚠️  MISMATCH"}`
  );

  // ── Summary ──────────────────────────────────────────────────
  console.log("\n╔══════════════════════════════════════════════════╗");
  console.log("║       📊 EMBEDDING PIPELINE SUMMARY              ║");
  console.log("╠══════════════════════════════════════════════════╣");
  console.log(
    `║  Chunks Embedded:  ${String(embeddings.length).padStart(4)}                             ║`
  );
  console.log(
    `║  Dimensions:       1024                             ║`
  );
  console.log(
    `║  Supabase Rows:    ${String(count).padStart(4)}                             ║`
  );
  console.log(
    `║  Errors:           ${String(errors.length).padStart(4)}                             ║`
  );
  console.log("╚══════════════════════════════════════════════════╝");
  console.log("\n✅ Ready for retrieval! Test with: npx tsx scripts/test-retrieval.ts\n");
}

main().catch((err) => {
  console.error("\n❌ Embedding pipeline failed:", err.message || err);
  process.exit(1);
});
