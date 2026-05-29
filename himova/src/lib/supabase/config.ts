/**
 * Returns true when Supabase environment variables are present and are not
 * the placeholder values committed in .env.example.
 *
 * This lets the app deploy and render (with mock data) before Supabase is
 * configured. Once real credentials are added, auth/data flows activate.
 */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return false;
  if (url.includes('placeholder') || anonKey.includes('placeholder')) return false;

  return true;
}
