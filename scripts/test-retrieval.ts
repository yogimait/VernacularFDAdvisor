/**
 * Test Retrieval Script
 *
 * Quick script to test the semantic retrieval pipeline.
 * Run: npx tsx scripts/test-retrieval.ts
 *
 * Tests Hindi, Hinglish, English, and bank-specific queries.
 */

import { config as dotenvConfig } from "dotenv";
dotenvConfig({ path: ".env.local" });
dotenvConfig({ path: ".env" });

import { retrieveContext, formatContextForPrompt } from "../lib/rag/retriever";

const TEST_QUERIES = [
  // Hindi
  "FD safe hai kya?",
  "1 साल के लिए सबसे अच्छी एफडी (FD) दर क्या है?",
  "FD pe tax kitna lagta hai?",
  "वरिष्ठ नागरिकों के लिए सबसे अच्छी FD दर क्या है?",
  "क्या मुझे FD से जल्दी पैसा निकालना चाहिए?",

  // Hinglish
  "1 year ke liye best FD rate kya hai?",
  "premature withdrawal pe penalty kitni hai?",

  // English
  "Is my fixed deposit insured by RBI?",
  "Best FD rate for senior citizens?",

  // Bank-specific
  "SBI FD interest rate 2026",
  "Suryoday bank FD policy",
];

async function main() {
  console.log("\n═══════════════════════════════════════════════════");
  console.log("  🧪 Retrieval Test Suite");
  console.log("═══════════════════════════════════════════════════\n");

  for (const query of TEST_QUERIES) {
    console.log(`\n📝 Query: "${query}"`);
    console.log("─".repeat(60));

    try {
      const response = await retrieveContext(query, { topK: 3 });

      console.log(`   ⏱️  Search time: ${response.searchTimeMs}ms`);
      console.log(`   📊 Results: ${response.totalResults}`);

      if (response.results.length === 0) {
        console.log("   ⚠️  No relevant results found");
        continue;
      }

      for (const result of response.results) {
        const sim = (result.similarity * 100).toFixed(1);
        console.log(
          `\n   [${sim}%] ${result.metadata.source} | ${result.metadata.topic} | ${result.metadata.bank ?? "General"}`
        );
        console.log(
          `   ${result.content.slice(0, 120).replace(/\n/g, " ")}...`
        );
      }
    } catch (err: unknown) {
      const error = err as { message?: string };
      console.log(`   ❌ Error: ${error.message ?? String(err)}`);
    }

    console.log("─".repeat(60));
  }

  console.log("\n✅ Test suite complete!\n");
}

main().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
