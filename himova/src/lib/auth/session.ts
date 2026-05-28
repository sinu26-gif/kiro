import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";

export type AuthRole = "admin" | "shopkeeper";

export type SessionUser = {
  id: string;
  email: string | null;
  role: AuthRole;
  fullName: string | null;
  mustChangePassword: boolean;
};

/**
 * Returns the currently authenticated user with their profile row joined,
 * or null if the request is unauthenticated.
 *
 * Used inside server components, server actions, and route handlers.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = getSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) return null;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) return null;

  const meta = (user.user_metadata ?? {}) as { must_change_password?: boolean };

  return {
    id: user.id,
    email: user.email ?? null,
    role: profile.role as AuthRole,
    fullName: (profile.full_name as string | null) ?? null,
    mustChangePassword: meta.must_change_password === true,
  };
}

/**
 * Throws if the request is not authenticated, or if the role is not in `allowedRoles`.
 * Returns the session user otherwise.
 */
export async function requireRole(allowedRoles: AuthRole[]): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    throw new Error("UNAUTHENTICATED");
  }
  if (!allowedRoles.includes(user.role)) {
    throw new Error("FORBIDDEN");
  }
  return user;
}
