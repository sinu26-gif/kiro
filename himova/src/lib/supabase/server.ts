import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

import { getSupabasePublicEnv, getSupabaseServerEnv } from "./env";
import type { Database } from "./types";

/**
 * Supabase client for use inside Server Components, Server Actions,
 * and Route Handlers. Reads/writes cookies for session management.
 *
 * Always create a fresh client per request (Next.js best practice).
 */
export function getSupabaseServerClient() {
  const cookieStore = cookies();
  const { url, anonKey } = getSupabasePublicEnv();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          // The set method was called from a Server Component.
          // This is fine if the session is being refreshed by middleware.
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: "", ...options });
        } catch {
          // See note above.
        }
      },
    },
  });
}

/**
 * Supabase client with the service role key.
 * Bypasses RLS — use ONLY for trusted admin operations on the server.
 * Never import this from a Client Component.
 */
export function getSupabaseAdminClient() {
  const { url, serviceRoleKey } = getSupabaseServerEnv();

  return createServerClient<Database>(url, serviceRoleKey, {
    cookies: {
      get() {
        return undefined;
      },
      set() {},
      remove() {},
    },
  });
}
