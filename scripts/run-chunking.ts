/**
 * Run Chunking Pipeline
 *
 * Standalone script to execute the full semantic chunking pipeline.
 * Run: npx tsx scripts/run-chunking.ts
 *
 * Outputs:
 * - lib/rag/chunks.json — all chunks with metadata
 * - Console summary table with quality stats
 */

import { promises as fs } from "fs";
import path from "path";
import { runChunkingPipeline } from "../lib/rag/chunking-pipeline";

async function main() {
  const projectRoot = process.cwd();

  console.log(`\n🚀 Running Semantic Chunking Pipeline`);
  console.log(`   Project root: ${projectRoot}\n`);

  const startTime = Date.now();
  const { chunks, stats } = await runChunkingPipeline(projectRoot);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  // ─── Save chunks.json ───────────────────────────────────────

  const outputDir = path.join(projectRoot, "lib", "rag");
  const outputPath = path.join(outputDir, "chunks.json");

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(chunks, null, 2), "utf-8");

  console.log(`\n📦 Saved ${chunks.length} chunks → ${outputPath}`);

  // ─── Summary Stats ──────────────────────────────────────────

  console.log("\n╔══════════════════════════════════════════════════╗");
  console.log("║         📊 CHUNKING PIPELINE SUMMARY             ║");
  console.log("╠══════════════════════════════════════════════════╣");
  console.log(
    `║  Files Processed: ${String(stats.totalFilesProcessed).padStart(4)} (${stats.txtFilesProcessed} TXT, ${stats.pdfFilesProcessed} PDF)  ║`
  );
  if (stats.skippedFiles.length > 0) {
    console.log(
      `║  Files Skipped:   ${String(stats.skippedFiles.length).padStart(4)} (${stats.skippedFiles.join(", ")}) ║`
    );
  }
  console.log(
    `║  Total Chunks:    ${String(stats.totalChunks).padStart(4)}                              ║`
  );
  console.log(
    `║  Avg Tokens/Chunk:${String(stats.avgTokensPerChunk).padStart(4)}                              ║`
  );
  console.log(
    `║  Time Elapsed:    ${elapsed.padStart(4)}s                             ║`
  );
  console.log("╠══════════════════════════════════════════════════╣");

  // Category breakdown
  console.log("║  📂 BY CATEGORY:                                 ║");
  for (const [category, count] of Object.entries(stats.chunksByCategory)) {
    console.log(
      `║    ${category.padEnd(16)} → ${String(count).padStart(4)} chunks                ║`
    );
  }

  // Bank breakdown
  console.log("╠══════════════════════════════════════════════════╣");
  console.log("║  🏦 BY BANK:                                     ║");
  for (const [bank, count] of Object.entries(stats.chunksByBank).sort(
    (a, b) => b[1] - a[1]
  )) {
    console.log(
      `║    ${bank.padEnd(16)} → ${String(count).padStart(4)} chunks                ║`
    );
  }

  // Topic breakdown
  console.log("╠══════════════════════════════════════════════════╣");
  console.log("║  🏷️  BY TOPIC:                                    ║");
  for (const [topic, count] of Object.entries(stats.chunksByTopic).sort(
    (a, b) => b[1] - a[1]
  )) {
    console.log(
      `║    ${topic.padEnd(24)} → ${String(count).padStart(3)} chunks          ║`
    );
  }

  // Quality flags
  console.log("╠══════════════════════════════════════════════════╣");
  console.log("║  ⚠️  QUALITY FLAGS:                               ║");
  console.log(
    `║    Too small (<100 tokens): ${String(stats.tooSmallChunks).padStart(4)}                   ║`
  );
  console.log(
    `║    Too large (>500 tokens): ${String(stats.tooLargeChunks).padStart(4)}                   ║`
  );
  console.log("╚══════════════════════════════════════════════════╝");

  // ─── Sample Chunks Preview ──────────────────────────────────

  console.log("\n🔍 SAMPLE CHUNKS (first 3):");
  console.log("─".repeat(60));

  for (const chunk of chunks.slice(0, 3)) {
    console.log(`\n📌 ${chunk.id}`);
    console.log(`   Topic:    ${chunk.metadata.topic}`);
    console.log(`   Bank:     ${chunk.metadata.bank ?? "none"}`);
    console.log(`   Category: ${chunk.metadata.category}`);
    console.log(`   Source:   ${chunk.metadata.source}`);
    console.log(`   Tokens:   ~${chunk.tokenEstimate}`);
    console.log(`   Heading:  ${chunk.metadata.headingContext ?? "(none)"}`);
    console.log(
      `   Text:     ${chunk.text.slice(0, 150).replace(/\n/g, " ")}...`
    );
    console.log("─".repeat(60));
  }

  console.log("\n✅ Done! Inspect chunks at: lib/rag/chunks.json\n");
}

main().catch((err) => {
  console.error("❌ Pipeline failed:", err);
  process.exit(1);
});
