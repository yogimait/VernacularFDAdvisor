/**
 * Document Loader Module
 *
 * Loads documents from the banks-info/ and fd-info/ directories.
 * Handles both TXT and PDF file types.
 * Classifies each document by category, source org, and bank.
 */

import { promises as fs } from "fs";
import path from "path";
import { createRequire } from "module";
import type {
  LoadedDocument,
  DocumentCategory,
  SourceOrg,
  BankName,
} from "./types";

// Use createRequire for CJS modules in ESM context
const require = createRequire(import.meta.url);

// ─── File Classification Maps ────────────────────────────────────

/** Files to skip during processing. */
const SKIP_FILES = new Set([
  "SBI Mutual funds.pdf", // Not FD-specific, 9.2 MB, out of scope
]);

/**
 * Bank detection from filename patterns.
 * Layer 1 of hybrid bank detection.
 */
const FILENAME_BANK_MAP: Array<[RegExp, BankName]> = [
  [/\bSBI\b/i, "SBI"],
  [/\bHDFC\b/i, "HDFC"],
  [/\bICICI\b/i, "ICICI"],
  [/\bAxis\b/i, "Axis"],
  [/\b(?:SSFB|Suryoday)\b/i, "Suryoday"],
];

/**
 * Source organization detection from filename patterns.
 */
const FILENAME_ORG_MAP: Array<[RegExp, SourceOrg]> = [
  [/\bRBI\b/i, "rbi"],
  [/\bSEBI\b/i, "sebi"],
  [/\bDICGC\b/i, "dicgc"],
  [/\bombudsman\b/i, "rbi"],
];

/**
 * Category classification rules.
 * regulatory = RBI/SEBI/DICGC formal docs
 * bank_product = bank-specific FD terms, rates, rules
 * education = curated knowledge explainers
 */
function classifyCategory(
  fileName: string,
  directory: "banks-info" | "fd-info",
  sourceOrg: SourceOrg
): DocumentCategory {
  // Regulatory docs
  if (sourceOrg === "rbi" || sourceOrg === "sebi" || sourceOrg === "dicgc") {
    return "regulatory";
  }

  // Bank product docs (anything in banks-info/ that's not regulatory)
  if (directory === "banks-info") {
    return "bank_product";
  }

  // Everything in fd-info/ is education/knowledge
  return "education";
}

/** Detect bank name from filename. */
function detectBankFromFilename(fileName: string): BankName {
  for (const [pattern, bank] of FILENAME_BANK_MAP) {
    if (pattern.test(fileName)) {
      return bank;
    }
  }
  return null;
}

/** Detect source organization from filename. */
function detectOrgFromFilename(
  fileName: string,
  bank: BankName
): SourceOrg {
  for (const [pattern, org] of FILENAME_ORG_MAP) {
    if (pattern.test(fileName)) {
      return org;
    }
  }
  // If a bank was detected, it's a bank doc
  if (bank) {
    return "bank";
  }
  // Default for fd-info educational content
  return "bank";
}

// ─── File Loaders ────────────────────────────────────────────────

/** Load a TXT file. */
async function loadTxtFile(filePath: string): Promise<string> {
  return fs.readFile(filePath, "utf-8");
}

/** Load a PDF file using pdf-parse (v1.x — CJS, simple function API). */
async function loadPdfFile(filePath: string): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse") as (
    buf: Buffer
  ) => Promise<{ text: string; numpages: number }>;

  const buffer = await fs.readFile(filePath);
  const data = await pdfParse(buffer);
  return data.text;
}

// ─── Main Loader ─────────────────────────────────────────────────

/**
 * Loads all documents from a given directory.
 * Returns an array of LoadedDocument with metadata pre-classified.
 */
async function loadFromDirectory(
  dirPath: string,
  directoryName: "banks-info" | "fd-info"
): Promise<LoadedDocument[]> {
  const entries = await fs.readdir(dirPath);
  const documents: LoadedDocument[] = [];

  for (const entry of entries) {
    // Skip files in the skip list
    if (SKIP_FILES.has(entry)) {
      console.log(`  ⏭️  Skipping: ${entry}`);
      continue;
    }

    const filePath = path.join(dirPath, entry);
    const stat = await fs.stat(filePath);

    // Only process files, not directories
    if (!stat.isFile()) continue;

    const ext = path.extname(entry).toLowerCase();

    // Only process .txt and .pdf
    if (ext !== ".txt" && ext !== ".pdf") continue;

    const fileType = ext === ".pdf" ? "pdf" : "txt";

    try {
      console.log(`  📄 Loading: ${entry} (${fileType.toUpperCase()})`);

      const content =
        fileType === "pdf"
          ? await loadPdfFile(filePath)
          : await loadTxtFile(filePath);

      const bank = detectBankFromFilename(entry);
      const sourceOrg = detectOrgFromFilename(entry, bank);
      const category = classifyCategory(entry, directoryName, sourceOrg);

      documents.push({
        content,
        metadata: {
          source: entry,
          filePath,
          category,
          sourceOrg,
          bank,
          fileType,
          directory: directoryName,
        },
      });
    } catch (error) {
      console.error(`  ❌ Failed to load ${entry}:`, error);
    }
  }

  return documents;
}

/**
 * Loads all documents from both banks-info/ and fd-info/ directories.
 * This is the main entry point for the document loading stage.
 */
export async function loadAllDocuments(
  projectRoot: string
): Promise<{ documents: LoadedDocument[]; skipped: string[] }> {
  const banksInfoDir = path.join(projectRoot, "banks-info");
  const fdInfoDir = path.join(projectRoot, "fd-info");

  console.log("\n📂 Loading documents from banks-info/...");
  const bankDocs = await loadFromDirectory(banksInfoDir, "banks-info");

  console.log("\n📂 Loading documents from fd-info/...");
  const fdDocs = await loadFromDirectory(fdInfoDir, "fd-info");

  const allDocs = [...bankDocs, ...fdDocs];
  const skipped = [...SKIP_FILES];

  console.log(
    `\n✅ Loaded ${allDocs.length} documents (${bankDocs.length} from banks-info, ${fdDocs.length} from fd-info)`
  );

  return { documents: allDocs, skipped };
}
