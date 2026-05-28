/**
 * Validates that Supabase environment variables are present.
 * Reads from process.env at call time so Next.js can inline NEXT_PUBLIC_*
 * variables on the client.
 */

type SupabasePublicEnv = {
  url: string;
  anonKey: string;
};

type SupabaseServerEnv = SupabasePublicEnv & {
  serviceRoleKey: string;
};

export function getSupabasePublicEnv(): SupabasePublicEnv {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.",
    );
  }

  return { url, anonKey };
}

export function getSupabaseServerEnv(): SupabaseServerEnv {
  const publicEnv = getSupabasePublicEnv();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY. This must only be set on the server.",
    );
  }

  return { ...publicEnv, serviceRoleKey };
}
