/**
 * Database types for Supabase.
 *
 * In production we generate this file with:
 *   npx supabase gen types typescript --project-id <id> --schema public
 *
 * Until the Supabase project is created (deferred until Milestone 1),
 * this file exports a permissive `Database` type so the rest of the
 * codebase can be typed without compile errors.
 */
export type Database = {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
