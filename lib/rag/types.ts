/**
 * Shared types for the RAG semantic chunking pipeline.
 * All modules in lib/rag/ reference these types.
 */

// ─── Document Categories ─────────────────────────────────────────

/** Category of the source document, determines chunking strategy. */
export type DocumentCategory = "regulatory" | "bank_product" | "education";

/** Fine-grained topic assigned to each chunk via hybrid detection. */
export type ChunkTopic =
  | "fd_basics"
  | "interest_rates"
  | "premature_withdrawal"
  | "taxation"
  | "deposit_insurance"
  | "senior_citizen_benefits"
  | "kyc_documentation"
  | "nri_deposits"
  | "liquidity_facilities"
  | "savings_account"
  | "fd_vs_rd_vs_savings"
  | "fraud_awareness"
  | "investor_education"
  | "banking_ombudsman"
  | "rural_banking"
  | "multilingual_access"
  | "general_banking"
  | "fd_schemes"
  | "eligibility"
  | "quarterly_payout"
  | "deposit_policy"
  | "general";

/** Source organization (regulatory body or bank). */
export type SourceOrg = "rbi" | "sebi" | "dicgc" | "bank";

/** Known bank names in the corpus. */
export type BankName = "SBI" | "HDFC" | "ICICI" | "Axis" | "Suryoday" | null;

// ─── Pipeline Stages ─────────────────────────────────────────────

/** Raw document loaded from disk. */
export interface LoadedDocument {
  content: string;
  metadata: {
    source: string;
    sourceId?: string;
    filePath: string;
    category: DocumentCategory;
    sourceOrg: SourceOrg;
    bank: BankName;
    fileType: "pdf" | "txt";
    directory: "banks-info" | "fd-info";
  };
}

/** Document after text cleaning. */
export interface CleanedDocument {
  content: string;
  /** Section headings detected during cleaning, used for topic detection. */
  detectedHeadings: string[];
  metadata: LoadedDocument["metadata"];
}

/** A single chunk with full metadata, ready for embedding. */
export interface DocumentChunk {
  id: string;
  text: string;
  tokenEstimate: number;
  metadata: ChunkMetadata;
}

/** Rich metadata attached to every chunk for retrieval filtering. */
export interface ChunkMetadata {
  source: string;
  sourceId?: string;
  category: DocumentCategory;
  sourceOrg: SourceOrg;
  topic: ChunkTopic;
  bank: BankName;
  language: "english";
  /** The heading this chunk falls under, if detected. */
  headingContext: string | null;
  wordCount: number;
  charCount: number;
}

// ─── Configuration ───────────────────────────────────────────────

/** Chunking configuration (token-based). */
export interface ChunkingConfig {
  /** Target token count per chunk. */
  targetTokens: number;
  /** Maximum token count before force-splitting. */
  maxTokens: number;
  /** Minimum token count; chunks below this get merged with neighbors. */
  minTokens: number;
  /** Overlap in tokens between consecutive chunks. */
  overlapTokens: number;
}

/** Default chunking config based on the approved plan. */
export const DEFAULT_CHUNKING_CONFIG: ChunkingConfig = {
  targetTokens: 350,
  maxTokens: 450,
  minTokens: 150,
  overlapTokens: 50,
};

// ─── Pipeline Output ─────────────────────────────────────────────

/** Summary statistics from a chunking run. */
export interface ChunkingStats {
  totalFilesProcessed: number;
  txtFilesProcessed: number;
  pdfFilesProcessed: number;
  skippedFiles: string[];
  totalChunks: number;
  avgTokensPerChunk: number;
  chunksByCategory: Record<DocumentCategory, number>;
  chunksByBank: Record<string, number>;
  chunksByTopic: Record<string, number>;
  tooSmallChunks: number;
  tooLargeChunks: number;
}

// ─── Embedding Pipeline Types ────────────────────────────────────

/** multilingual-e5-large constraints. */
export const EMBEDDING_CONFIG = {
  model: "intfloat/multilingual-e5-large",
  dimensions: 1024,
  maxInputTokens: 512,
  passagePrefix: "passage: ",
  queryPrefix: "query: ",
  /** Chunks per HF API batch call (free tier safe). */
  batchSize: 16,
  /** Delay between batches in ms to respect rate limits. */
  batchDelayMs: 2500,
  /** Max retries on 429 / 5xx errors. */
  maxRetries: 5,
  /** Base delay for exponential backoff in ms. */
  retryBaseDelayMs: 3000,
} as const;

/** A chunk with its embedding vector attached. */
export interface EmbeddedChunk {
  id: string;
  text: string;
  embedding: number[];
  tokenEstimate: number;
  metadata: ChunkMetadata;
}

/** A Supabase document row (what we store). */
export interface DocumentRow {
  id: string;
  content: string;
  embedding: number[];
  metadata: ChunkMetadata;
  token_estimate: number;
  created_at?: string;
}

// ─── Retrieval Types ─────────────────────────────────────────────

/** Options for semantic search. */
export interface RetrievalOptions {
  /** Number of results to return. */
  topK?: number;
  /** Minimum cosine similarity threshold (0-1). */
  similarityThreshold?: number;
  /** Filter by bank name. */
  filterBank?: BankName;
  /** Filter by topic. */
  filterTopic?: ChunkTopic;
  /** Filter by category. */
  filterCategory?: DocumentCategory;
}

/** A single search result with similarity score. */
export interface RetrievalResult {
  id: string;
  content: string;
  similarity: number;
  metadata: ChunkMetadata;
}

/** Full retrieval response. */
export interface RetrievalResponse {
  query: string;
  results: RetrievalResult[];
  totalResults: number;
  searchTimeMs: number;
}

