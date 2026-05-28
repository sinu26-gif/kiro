"use client";

import { createBrowserClient } from "@supabase/ssr";

import { getSupabasePublicEnv } from "./env";
import type { Database } from "./types";

/**
 * Supabase client for use inside Client Components.
 * Re-uses a single instance across the app.
 */
let cached: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function getSupabaseBrowserClient() {
  if (cached) return cached;
  const { url, anonKey } = getSupabasePublicEnv();
  cached = createBrowserClient<Database>(url, anonKey);
  return cached;
}
