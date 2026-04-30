/**
 * Supabase Client Singleton
 *
 * Provides a typed Supabase client for vector DB operations.
 * Uses the SERVICE_ROLE key for server-side operations (embedding ingestion).
 * Uses the ANON key for client-side operations (query retrieval).
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ─── Service Role Client (for server-side / scripts) ─────────────

let serviceClient: SupabaseClient | null = null;

/**
 * Get the Supabase client with service role key.
 * Used for:
 * - Embedding ingestion scripts
 * - Server-side API routes
 * - Admin operations (bypasses RLS)
 */
export function getServiceClient(): SupabaseClient {
  if (!serviceClient) {
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;

    if (!url) {
      throw new Error(
        "SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL environment variable is required."
      );
    }
    if (!key) {
      throw new Error(
        "SUPABASE_SERVICE_KEY environment variable is required."
      );
    }

    serviceClient = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return serviceClient;
}

// ─── Anon Client (for API routes / retrieval) ────────────────────

let anonClient: SupabaseClient | null = null;

/**
 * Get the Supabase client with anon key.
 * Used for:
 * - API route retrieval queries
 * - Read-only operations (respects RLS)
 */
export function getAnonClient(): SupabaseClient {
  if (!anonClient) {
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_SERVICE_KEY;

    if (!url || !key) {
      throw new Error(
        "Supabase URL and ANON_KEY (or SERVICE_KEY) environment variables are required."
      );
    }

    anonClient = createClient(url, key);
  }
  return anonClient;
}
