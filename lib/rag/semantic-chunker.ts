/**
 * Semantic Chunker Module
 *
 * Implements hybrid semantic chunking with:
 * - Heading-aware section splitting
 * - Table detection and key-value conversion
 * - Token-based sizing (250-450 tokens target)
 * - Overlap between chunks for continuity
 * - Per-category chunking strategies:
 *   A) Regulatory → section-aware splitting
 *   B) Bank Product → topic block splitting
 *   C) Education → paragraph-aware splitting
 */

import type {
  CleanedDocument,
  DocumentChunk,
  ChunkingConfig,
} from "./types";
import { enrichMetadata } from "./metadata-enricher";

// ─── Token Estimation ────────────────────────────────────────────

/**
 * Estimate token count from text.
 * Rule of thumb: 1 word ≈ 1.3 tokens for English.
 * This is approximate; actual tokenization depends on the model.
 */
function estimateTokens(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.ceil(words * 1.3);
}

/** Count words in text. */
function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Convert token count to approximate word count. */
function tokensToWords(tokens: number): number {
  return Math.floor(tokens / 1.3);
}

// ─── Heading Detection ───────────────────────────────────────────

/**
 * Check if a line is a section heading.
 * Returns the heading text or null.
 */
function extractHeading(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  // Markdown headings: ## Heading, ### **1. Heading**
  const mdMatch = trimmed.match(
    /^#{1,4}\s+\*{0,2}[\d.]*\s*(.+?)\*{0,2}\s*$/
  );
  if (mdMatch) {
    return (mdMatch[1] ?? trimmed).replace(/\*\*/g, "").trim();
  }

  // Bold-only lines: **Heading Text**
  const boldMatch = trimmed.match(/^\*\*(.+?)\*\*\s*$/);
  if (boldMatch && trimmed.length < 120) {
    return boldMatch[1].replace(/^\d+\.\s*/, "").trim();
  }

  return null;
}

// ─── Table Detection & Conversion ────────────────────────────────

/**
 * Detects if text contains a markdown table.
 */
function containsTable(text: string): boolean {
  return /\|.+\|/.test(text) && /\|[-:]+\|/.test(text);
}

/**
 * Converts a markdown table into key-value text blocks.
 * Each row becomes a readable chunk.
 *
 * Example:
 *   | Tenure | Rate | Senior |
 *   |--------|------|--------|
 *   | 1 year | 6.8% | 7.3%   |
 *
 * Becomes:
 *   Tenure: 1 year
 *   Rate: 6.8%
 *   Senior: 7.3%
 */
function convertTableToKeyValue(tableText: string): string[] {
  const lines = tableText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // Find header row and separator
  const headerIdx = lines.findIndex((l) => /\|.+\|/.test(l));
  if (headerIdx === -1) return [tableText];

  const headers = lines[headerIdx]
    .split("|")
    .map((h) => h.trim())
    .filter(Boolean);

  // Skip separator line (|---|---|)
  const dataStartIdx = lines.findIndex(
    (l, i) => i > headerIdx && /\|[-:]+\|/.test(l)
  );
  const dataLines = lines.slice(
    dataStartIdx !== -1 ? dataStartIdx + 1 : headerIdx + 1
  );

  const chunks: string[] = [];
  let batch: string[] = [];

  for (const line of dataLines) {
    if (!/\|.+\|/.test(line)) continue;

    const cells = line
      .split("|")
      .map((c) => c.trim())
      .filter(Boolean);

    const kvPairs = headers
      .map((header, i) => {
        const value = cells[i] ?? "N/A";
        return `${header}: ${value}`;
      })
      .join("\n");

    batch.push(kvPairs);

    // Group 3-5 rows per chunk to avoid too-small chunks
    if (batch.length >= 4) {
      chunks.push(batch.join("\n\n"));
      batch = [];
    }
  }

  if (batch.length > 0) {
    chunks.push(batch.join("\n\n"));
  }

  return chunks.length > 0 ? chunks : [tableText];
}

/**
 * Detects structured rate listings in text (common in bank TXT files).
 * Example: "* **Short-Term (7 to 45 days):** 3.05% for regular citizens..."
 */
function containsRateListing(text: string): boolean {
  const rateLines = text.match(/\d+\.?\d*%\s*(p\.?a\.?|per\s+annum)?/gi);
  return (rateLines?.length ?? 0) >= 3;
}

/**
 * Converts bullet-point rate listings into key-value format.
 */
function convertRateListingToKeyValue(text: string): string {
  // Replace bullet rate lines with cleaner format
  let converted = text;

  // Pattern: * **Label:** Rate info
  converted = converted.replace(
    /^\s*\*\s*\*\*(.+?)\*\*:?\s*(.+)$/gm,
    (_match, label: string, value: string) => {
      return `${label.trim()}: ${value.trim()}`;
    }
  );

  return converted;
}

// ─── Section Splitting ───────────────────────────────────────────

interface TextSection {
  heading: string | null;
  content: string;
}

/**
 * Splits text into sections based on detected headings.
 * This is the primary splitting strategy for regulatory and bank docs.
 */
function splitBySections(text: string): TextSection[] {
  const lines = text.split("\n");
  const sections: TextSection[] = [];
  let currentHeading: string | null = null;
  let currentLines: string[] = [];

  const flushSection = () => {
    const content = currentLines.join("\n").trim();
    if (content) {
      sections.push({ heading: currentHeading, content });
    }
  };

  for (const line of lines) {
    const heading = extractHeading(line);
    if (heading) {
      flushSection();
      currentHeading = heading;
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }

  flushSection();

  // If no sections detected (no headings), return entire text as one section
  if (sections.length === 0) {
    return [{ heading: null, content: text.trim() }];
  }

  return sections;
}

/**
 * Splits text by paragraphs (double newline boundaries).
 * Used for education/knowledge documents.
 */
function splitByParagraphs(text: string): TextSection[] {
  const paragraphs = text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  // Try to detect if paragraphs start with bold headings
  return paragraphs.map((para) => {
    const firstLine = para.split("\n")[0];
    const heading = extractHeading(firstLine);

    if (heading) {
      // Remove heading from content
      const contentWithoutHeading = para
        .split("\n")
        .slice(1)
        .join("\n")
        .trim();
      return {
        heading,
        content: contentWithoutHeading || para,
      };
    }

    return { heading: null, content: para };
  });
}

// ─── Size-Controlled Splitting ───────────────────────────────────

/**
 * Splits a text section into token-sized chunks with overlap.
 * Uses recursive splitting: paragraph → sentence → word boundaries.
 */
function splitToTokenSize(
  text: string,
  config: ChunkingConfig
): string[] {
  const tokens = estimateTokens(text);

  // If already within size, return as-is
  if (tokens <= config.maxTokens) {
    return [text];
  }

  // Try splitting by paragraphs first
  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim());
  if (paragraphs.length > 1) {
    return mergeToTargetSize(paragraphs, config);
  }

  // Try splitting by sentences
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .filter((s) => s.trim());
  if (sentences.length > 1) {
    return mergeToTargetSize(sentences, config);
  }

  // Last resort: split by words
  const words = text.split(/\s+/);
  const targetWords = tokensToWords(config.targetTokens);
  const chunks: string[] = [];

  for (let i = 0; i < words.length; i += targetWords) {
    chunks.push(words.slice(i, i + targetWords).join(" "));
  }

  return chunks;
}

/**
 * Merges small segments into chunks that fit the target token size.
 */
function mergeToTargetSize(
  segments: string[],
  config: ChunkingConfig
): string[] {
  const chunks: string[] = [];
  let buffer = "";
  let bufferTokens = 0;

  for (const segment of segments) {
    const segTokens = estimateTokens(segment);

    // If adding this segment would exceed max, flush buffer
    if (
      bufferTokens + segTokens > config.maxTokens &&
      bufferTokens >= config.minTokens
    ) {
      chunks.push(buffer.trim());
      buffer = "";
      bufferTokens = 0;
    }

    // If a single segment exceeds max, recursively split it
    if (segTokens > config.maxTokens) {
      if (buffer.trim()) {
        chunks.push(buffer.trim());
        buffer = "";
        bufferTokens = 0;
      }
      const subChunks = splitToTokenSize(segment, config);
      chunks.push(...subChunks);
      continue;
    }

    buffer = buffer ? `${buffer}\n\n${segment}` : segment;
    bufferTokens += segTokens;

    // If we've reached target, flush
    if (bufferTokens >= config.targetTokens) {
      chunks.push(buffer.trim());
      buffer = "";
      bufferTokens = 0;
    }
  }

  if (buffer.trim()) {
    chunks.push(buffer.trim());
  }

  return chunks;
}

// ─── Overlap Application ─────────────────────────────────────────

/**
 * Adds overlap between consecutive chunks for context continuity.
 * Takes the last N tokens worth of text from the previous chunk
 * and prepends it to the next chunk.
 */
function applyOverlap(
  chunks: string[],
  overlapTokens: number
): string[] {
  if (chunks.length <= 1 || overlapTokens <= 0) return chunks;

  const result: string[] = [chunks[0]];
  const overlapWords = tokensToWords(overlapTokens);

  for (let i = 1; i < chunks.length; i++) {
    const prevWords = chunks[i - 1].split(/\s+/);
    const overlapText = prevWords
      .slice(Math.max(0, prevWords.length - overlapWords))
      .join(" ");

    // Only add overlap if it doesn't make the chunk too large
    const combined = `${overlapText} ${chunks[i]}`;
    if (estimateTokens(combined) <= 500) {
      // Allow slight overflow for overlap
      result.push(combined);
    } else {
      result.push(chunks[i]);
    }
  }

  return result;
}

// ─── Merge Small Chunks ──────────────────────────────────────────

/**
 * Merges chunks that are below the minimum token threshold
 * with their neighbors.
 */
function mergeSmallChunks(
  chunks: string[],
  minTokens: number
): string[] {
  if (chunks.length <= 1) return chunks;

  const result: string[] = [];
  let buffer = "";
  let bufferTokens = 0;

  for (const chunk of chunks) {
    const tokens = estimateTokens(chunk);

    if (bufferTokens > 0 && bufferTokens + tokens <= 500) {
      buffer = `${buffer}\n\n${chunk}`;
      bufferTokens += tokens;
    } else if (bufferTokens > 0) {
      result.push(buffer.trim());
      buffer = chunk;
      bufferTokens = tokens;
    } else {
      buffer = chunk;
      bufferTokens = tokens;
    }

    if (bufferTokens >= minTokens) {
      result.push(buffer.trim());
      buffer = "";
      bufferTokens = 0;
    }
  }

  if (buffer.trim()) {
    if (result.length > 0 && bufferTokens < minTokens) {
      // Merge with last chunk
      result[result.length - 1] = `${result[result.length - 1]}\n\n${buffer.trim()}`;
    } else {
      result.push(buffer.trim());
    }
  }

  return result;
}

// ─── Main Chunking Function ─────────────────────────────────────

/**
 * Chunks a cleaned document into semantically meaningful pieces.
 * Applies category-specific strategies and attaches rich metadata.
 */
export function chunkDocument(
  doc: CleanedDocument,
  config: ChunkingConfig = {
    targetTokens: 350,
    maxTokens: 450,
    minTokens: 150,
    overlapTokens: 50,
  }
): DocumentChunk[] {
  const { content, metadata } = doc;
  const chunks: DocumentChunk[] = [];

  // Step 1: Handle tables separately
  let processedContent = content;
  const tableChunkTexts: Array<{ text: string; heading: string | null }> = [];

  if (containsTable(content)) {
    // Extract and convert tables
    const tableMatch = content.match(
      /(\|.+\|\n\|[-:| ]+\|\n(?:\|.+\|\n?)*)/g
    );
    if (tableMatch) {
      for (const table of tableMatch) {
        const kvChunks = convertTableToKeyValue(table);
        for (const kv of kvChunks) {
          tableChunkTexts.push({ text: kv, heading: "Interest Rates" });
        }
        processedContent = processedContent.replace(table, "");
      }
    }
  }

  // Convert rate listings to key-value format
  if (containsRateListing(processedContent)) {
    processedContent = convertRateListingToKeyValue(processedContent);
  }

  // Step 2: Split into sections based on category strategy
  let sections: TextSection[];

  switch (metadata.category) {
    case "regulatory":
      // Section-aware splitting for formal documents
      sections = splitBySections(processedContent);
      break;
    case "bank_product":
      // Topic block splitting for bank documents
      sections = splitBySections(processedContent);
      break;
    case "education":
      // Light paragraph-aware splitting
      sections = splitByParagraphs(processedContent);
      break;
    default:
      sections = splitBySections(processedContent);
  }

  // Step 3: Size-control each section
  const rawChunks: Array<{ text: string; heading: string | null }> = [];

  for (const section of sections) {
    const sizedChunks = splitToTokenSize(section.content, config);
    for (const chunk of sizedChunks) {
      rawChunks.push({ text: chunk, heading: section.heading });
    }
  }

  // Add table chunks
  rawChunks.push(...tableChunkTexts);

  // Step 4: Extract just texts, apply overlap, merge small chunks
  let texts = rawChunks.map((c) => c.text);
  texts = applyOverlap(texts, config.overlapTokens);
  texts = mergeSmallChunks(texts, config.minTokens);

  // Step 5: Build final DocumentChunk objects with metadata
  const sourceSlug = (metadata.sourceId ?? metadata.source)
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .toLowerCase()
    .slice(0, 40);

  for (let i = 0; i < texts.length; i++) {
    const text = texts[i];

    // Find the heading context (from original raw chunks mapping)
    // Best effort: use the heading from the corresponding raw chunk
    const headingContext =
      i < rawChunks.length ? rawChunks[i].heading : null;

    const chunkMeta = enrichMetadata(
      text,
      headingContext,
      metadata.source,
      metadata.category,
      metadata.sourceOrg,
      metadata.bank,
      metadata.sourceId
    );

    chunks.push({
      id: `${sourceSlug}_chunk_${String(i + 1).padStart(3, "0")}`,
      text,
      tokenEstimate: estimateTokens(text),
      metadata: chunkMeta,
    });
  }

  return chunks;
}
