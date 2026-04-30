import { NextRequest, NextResponse } from "next/server";
import { createHash, randomUUID, timingSafeEqual } from "crypto";
import type { DocumentCategory, LoadedDocument, SourceOrg } from "@/lib/rag/types";
import { cleanDocument } from "@/lib/rag/text-cleaner";
import { chunkDocument } from "@/lib/rag/semantic-chunker";
import { embedAllChunks } from "@/lib/rag/embedding-client";
import { upsertChunks } from "@/lib/rag/vector-store";
import { getServiceClient } from "@/lib/rag/supabase-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AUTH_HEADER = "x-ingest-token";
const AUDIT_TABLE = "ingestion_raw_documents";

interface IngestPayload {
  source: string;
  title: string;
  url?: string;
  category: string;
  timestamp: string | number;
  summary?: string;
  content: string;
}

interface IngestResponseBase {
  requestId: string;
  documentId?: string;
}

function parseAuthToken(request: NextRequest): string | null {
  const headerToken = request.headers.get(AUTH_HEADER);
  if (headerToken) return headerToken.trim();

  const authHeader = request.headers.get("authorization");
  if (!authHeader) return null;

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

function safeTokenMatch(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

function parseTrustedSources(): { allowAll: boolean; sources: Set<string> } {
  const raw = process.env.INGEST_TRUSTED_SOURCES ?? "";
  const entries = raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const allowAll = entries.includes("*");
  const sources = new Set(entries.filter((value) => value !== "*"));
  return { allowAll, sources };
}

function parseCategory(value: unknown): DocumentCategory | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();

  if (normalized === "regulatory" || normalized === "regulation") {
    return "regulatory";
  }
  if (normalized === "bank_product" || normalized === "bank-product" || normalized === "bank") {
    return "bank_product";
  }
  if (normalized === "education" || normalized === "knowledge") {
    return "education";
  }

  return null;
}

function parseTimestamp(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
}

function looksLikeHtml(text: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(text);
}

function normalizeContent(raw: string): string {
  let text = raw.replace(/\u0000/g, "");

  if (looksLikeHtml(text)) {
    text = text.replace(/<script[\s\S]*?<\/script>/gi, "");
    text = text.replace(/<style[\s\S]*?<\/style>/gi, "");
    text = text.replace(/<br\s*\/?>/gi, "\n");
    text = text.replace(/<\/p\s*>/gi, "\n");
    text = text.replace(/<\/div\s*>/gi, "\n");
    text = text.replace(/<[^>]+>/g, "");
  }

  text = text.replace(/\r\n/g, "\n");
  text = text.replace(/\r/g, "\n");
  text = text.replace(/[ \t]+/g, " ");
  text = text.replace(/\n{3,}/g, "\n\n");

  return text.trim();
}

function computeHash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function detectSourceOrg(source: string, title: string, url?: string): SourceOrg {
  const combined = `${source} ${title} ${url ?? ""}`.toLowerCase();
  if (combined.includes("rbi")) return "rbi";
  if (combined.includes("sebi")) return "sebi";
  if (combined.includes("dicgc")) return "dicgc";
  return "bank";
}

function buildChunkingContent(title: string, summary: string | null, content: string): string {
  const sections: string[] = [];
  const trimmedTitle = title.trim();
  if (trimmedTitle) {
    sections.push(`# ${trimmedTitle}`);
  }
  if (summary) {
    sections.push(`Summary: ${summary}`);
  }
  sections.push(content);
  return sections.join("\n\n");
}

function isValidUrl(value: string): boolean {
  try {
    // eslint-disable-next-line no-new
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function buildErrorResponse(
  status: number,
  requestId: string,
  error: string,
  details?: string[]
) {
  return NextResponse.json(
    {
      status: "error",
      requestId,
      error,
      details:
        process.env.NODE_ENV === "development" ? details : undefined,
    },
    { status }
  );
}

export async function POST(request: NextRequest) {
  const requestId = randomUUID();
  const startedAt = Date.now();

  try {
    const ingestToken = process.env.INGEST_TOKEN;
    if (!ingestToken) {
      return buildErrorResponse(500, requestId, "Ingestion not configured.", [
        "INGEST_TOKEN is missing.",
      ]);
    }

    const { allowAll, sources } = parseTrustedSources();
    if (!allowAll && sources.size === 0) {
      return buildErrorResponse(500, requestId, "Ingestion not configured.", [
        "INGEST_TRUSTED_SOURCES is missing.",
      ]);
    }

    const authToken = parseAuthToken(request);
    if (!authToken || !safeTokenMatch(authToken, ingestToken)) {
      console.warn("[/api/ingest] Unauthorized request", { requestId });
      return buildErrorResponse(401, requestId, "Unauthorized request.");
    }

    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("application/json")) {
      return buildErrorResponse(415, requestId, "Content-Type must be application/json.");
    }

    let payload: IngestPayload;
    try {
      payload = (await request.json()) as IngestPayload;
    } catch (error) {
      console.warn("[/api/ingest] Invalid JSON", { requestId, error });
      return buildErrorResponse(400, requestId, "Invalid JSON payload.");
    }

    const errors: string[] = [];
    const source = typeof payload.source === "string" ? payload.source.trim() : "";
    const title = typeof payload.title === "string" ? payload.title.trim() : "";
    const url = typeof payload.url === "string" ? payload.url.trim() : "";
    const summary =
      typeof payload.summary === "string" ? payload.summary.trim() : "";
    const content =
      typeof payload.content === "string" ? payload.content : "";

    if (!source) errors.push("source is required");
    if (!title) errors.push("title is required");
    if (!content) errors.push("content is required");

    const category = parseCategory(payload.category);
    if (!category) errors.push("category must be regulatory, bank_product, or education");

    const timestamp = parseTimestamp(payload.timestamp);
    if (!timestamp) errors.push("timestamp must be a valid date string or number");

    if (url && !isValidUrl(url)) errors.push("url must be a valid URL");

    const maxContentChars = Number(process.env.INGEST_MAX_CONTENT_CHARS ?? 1_000_000);
    if (content && content.length > maxContentChars) {
      errors.push(`content exceeds max length (${maxContentChars} chars)`);
    }

    if (errors.length > 0) {
      console.warn("[/api/ingest] Validation failed", { requestId, errors });
      return buildErrorResponse(400, requestId, "Invalid payload.", errors);
    }

    if (!category) {
      return buildErrorResponse(400, requestId, "Invalid payload.", [
        "category must be regulatory, bank_product, or education",
      ]);
    }

    if (!allowAll && !sources.has(source)) {
      console.warn("[/api/ingest] Untrusted source", { requestId, source });
      return buildErrorResponse(403, requestId, "Source not trusted.");
    }

    const supabaseUrl =
      process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!process.env.HF_TOKEN || !process.env.SUPABASE_SERVICE_KEY || !supabaseUrl) {
      return buildErrorResponse(500, requestId, "Processing pipeline not configured.", [
        "HF_TOKEN, SUPABASE_SERVICE_KEY, or SUPABASE_URL is missing.",
      ]);
    }

    console.log("[/api/ingest] Received", { requestId, source, title });

    const normalizedContent = normalizeContent(content);
    if (!normalizedContent) {
      return buildErrorResponse(400, requestId, "Content is empty after normalization.");
    }

    const contentHash = computeHash(normalizedContent);
    const documentId = computeHash(`${source}|${title}|${timestamp}|${contentHash}`);

    const supabase = getServiceClient();

    const [hashCheck, sourceCheck] = await Promise.all([
      supabase
        .from(AUDIT_TABLE)
        .select("id")
        .eq("content_hash", contentHash)
        .limit(1)
        .maybeSingle(),
      supabase
        .from(AUDIT_TABLE)
        .select("id")
        .eq("source", source)
        .eq("timestamp", timestamp)
        .limit(1)
        .maybeSingle(),
    ]);

    if (hashCheck.error || sourceCheck.error) {
      console.error("[/api/ingest] Duplicate check failed", {
        requestId,
        hashError: hashCheck.error?.message,
        sourceError: sourceCheck.error?.message,
      });
      return buildErrorResponse(500, requestId, "Ingestion storage error.");
    }

    if (hashCheck.data || sourceCheck.data) {
      console.log("[/api/ingest] Duplicate skipped", {
        requestId,
        source,
        reason: hashCheck.data ? "content_hash" : "source_timestamp",
      });

      const response: IngestResponseBase & {
        status: "duplicate";
        duplicate: true;
        reason: "content_hash" | "source_timestamp";
      } = {
        status: "duplicate",
        requestId,
        documentId,
        duplicate: true,
        reason: hashCheck.data ? "content_hash" : "source_timestamp",
      };

      return NextResponse.json(response, { status: 200 });
    }

    const auditRecord = {
      id: documentId,
      source,
      title,
      url: url || null,
      category,
      timestamp,
      summary: summary || null,
      content,
      content_hash: contentHash,
      received_at: new Date().toISOString(),
      request_id: requestId,
    };

    const { error: auditError } = await supabase
      .from(AUDIT_TABLE)
      .upsert(auditRecord, { onConflict: "id" });

    if (auditError) {
      console.error("[/api/ingest] Audit store failed", {
        requestId,
        error: auditError.message,
      });
      return buildErrorResponse(500, requestId, "Failed to store raw document.");
    }

    console.log("[/api/ingest] Accepted", { requestId, documentId });

    const sourceOrg = detectSourceOrg(source, title, url || undefined);
    const summaryValue = summary ? summary.slice(0, 2000) : null;
    const chunkingContent = buildChunkingContent(title, summaryValue, normalizedContent);

    const doc: LoadedDocument = {
      content: chunkingContent,
      metadata: {
        source: title,
        sourceId: documentId,
        filePath: url || `ingest:${documentId}`,
        category,
        sourceOrg,
        bank: null,
        fileType: "txt",
        directory: category === "bank_product" ? "banks-info" : "fd-info",
      },
    };

    console.log("[/api/ingest] Processing started", { requestId, documentId });

    const cleaned = cleanDocument(doc);
    const chunks = chunkDocument(cleaned);

    if (chunks.length === 0) {
      console.warn("[/api/ingest] No chunks produced", { requestId, documentId });
      return buildErrorResponse(422, requestId, "No chunks produced from content.");
    }

    const embeddings = await embedAllChunks(chunks.map((chunk) => chunk.text));
    const { inserted, errors: upsertErrors } = await upsertChunks(
      chunks,
      embeddings
    );

    if (upsertErrors.length > 0) {
      console.error("[/api/ingest] Vector upsert errors", {
        requestId,
        documentId,
        errors: upsertErrors,
      });
      return buildErrorResponse(500, requestId, "Vector indexing failed.", upsertErrors);
    }

    const processingMs = Date.now() - startedAt;
    console.log("[/api/ingest] Processing complete", {
      requestId,
      documentId,
      chunks: chunks.length,
      inserted,
      processingMs,
    });

    const response: IngestResponseBase & {
      status: "ok";
      duplicate: false;
      chunks: number;
      inserted: number;
      processingMs: number;
    } = {
      status: "ok",
      requestId,
      documentId,
      duplicate: false,
      chunks: chunks.length,
      inserted,
      processingMs,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("[/api/ingest] Unexpected error", { requestId, error });
    return buildErrorResponse(500, requestId, "Unexpected ingestion error.");
  }
}
