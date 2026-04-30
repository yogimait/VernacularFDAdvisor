/**
 * Text Cleaner Module
 *
 * Cleans raw extracted text from PDFs and TXT files:
 * - Removes PDF artifacts (page numbers, headers, footers)
 * - Fixes broken line breaks from PDF extraction
 * - Normalizes Unicode and whitespace
 * - Preserves structural markers (headings, bullets)
 * - Detects section headings for topic inference
 */

import type { LoadedDocument, CleanedDocument } from "./types";

// ─── Heading Detection ───────────────────────────────────────────

/**
 * Patterns that indicate a section heading in our corpus.
 * Priority order: markdown headings, bold markers, capitalized lines.
 */
const HEADING_PATTERNS: RegExp[] = [
  // Markdown headings: ### Heading, ## Heading
  /^#{1,4}\s+\*{0,2}[\d.]*\s*(.+?)\*{0,2}\s*$/,
  // Bold-only lines: **Heading Text**
  /^\*\*(.+?)\*\*\s*$/,
  // Numbered bold headings: **1. Heading**
  /^\*\*\d+\.\s*(.+?)\*\*\s*$/,
];

/**
 * Extracts section headings from text content.
 * These are used by the metadata enricher for hybrid topic detection.
 */
function detectHeadings(text: string): string[] {
  const lines = text.split("\n");
  const headings: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    for (const pattern of HEADING_PATTERNS) {
      const match = trimmed.match(pattern);
      if (match) {
        // Extract the heading text (capture group or full match)
        const heading = (match[1] ?? trimmed)
          .replace(/\*\*/g, "")
          .replace(/^#+\s*/, "")
          .replace(/^\d+\.\s*/, "")
          .trim();
        if (heading.length > 3 && heading.length < 120) {
          headings.push(heading);
        }
        break;
      }
    }
  }

  return headings;
}

// ─── Cleaning Functions ──────────────────────────────────────────

/** Remove common PDF extraction artifacts. */
function removePdfArtifacts(text: string): string {
  let cleaned = text;

  // Remove page numbers in various formats
  cleaned = cleaned.replace(/^\s*Page\s+\d+\s*$/gm, "");
  cleaned = cleaned.replace(/^\s*-\s*\d+\s*-\s*$/gm, "");
  cleaned = cleaned.replace(/^\s*\d+\s*$/gm, "");
  cleaned = cleaned.replace(/^\s*\[\s*\d+\s*\]\s*$/gm, "");

  // Remove repeated headers/footers (common in multi-page PDFs)
  cleaned = cleaned.replace(
    /^\s*(confidential|draft|for internal use only|page \d+ of \d+)\s*$/gim,
    ""
  );

  // Remove URLs that are standalone on a line (often headers/footers)
  cleaned = cleaned.replace(/^\s*https?:\/\/\S+\s*$/gm, "");

  return cleaned;
}

/** Fix broken line breaks common in PDF text extraction. */
function fixBrokenLineBreaks(text: string): string {
  // Join lines that were split mid-sentence (line ends without punctuation,
  // next line starts with lowercase)
  return text.replace(/([a-z,;])\s*\n\s*([a-z])/g, "$1 $2");
}

/** Normalize whitespace and Unicode. */
function normalizeWhitespace(text: string): string {
  let cleaned = text;

  // CRLF → LF
  cleaned = cleaned.replace(/\r\n/g, "\n");
  cleaned = cleaned.replace(/\r/g, "\n");

  // Tabs → spaces
  cleaned = cleaned.replace(/\t/g, " ");

  // Non-breaking spaces → regular spaces
  cleaned = cleaned.replace(/\u00A0/g, " ");

  // Multiple spaces → single space (but preserve newlines)
  cleaned = cleaned.replace(/[ ]+/g, " ");

  // More than 2 consecutive newlines → 2
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");

  // Remove leading/trailing whitespace on each line
  cleaned = cleaned
    .split("\n")
    .map((line) => line.trim())
    .join("\n");

  return cleaned.trim();
}

/** Preserve structural markers by normalizing them. */
function normalizeStructure(text: string): string {
  let cleaned = text;

  // Normalize bullet points to consistent format
  cleaned = cleaned.replace(/^\s*[•●○▪▸►]\s*/gm, "* ");
  cleaned = cleaned.replace(/^\s*[-–—]\s+/gm, "* ");

  // Ensure heading markers have proper spacing
  cleaned = cleaned.replace(/^(#{1,4})\s*(\S)/gm, "$1 $2");

  return cleaned;
}

// ─── Main Cleaner ────────────────────────────────────────────────

/**
 * Cleans a loaded document and detects section headings.
 * Different cleaning intensity based on file type (PDF needs more).
 */
export function cleanDocument(doc: LoadedDocument): CleanedDocument {
  let content = doc.content;

  if (doc.metadata.fileType === "pdf") {
    content = removePdfArtifacts(content);
    content = fixBrokenLineBreaks(content);
  }

  content = normalizeWhitespace(content);
  content = normalizeStructure(content);

  const detectedHeadings = detectHeadings(content);

  return {
    content,
    detectedHeadings,
    metadata: doc.metadata,
  };
}
