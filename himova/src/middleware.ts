import { NextResponse, type NextRequest } from "next/server";

import { updateSupabaseSession } from "@/lib/supabase/middleware";

const ADMIN_PREFIX = "/admin";
const SHOP_PREFIX = "/shop";

/**
 * Middleware:
 *   1. Refresh the Supabase session cookie on every request.
 *   2. Gate `/shop/*` to shopkeepers, `/admin/*` to admins.
 *   3. Redirect already-authenticated users away from `/login` to their portal.
 *
 * Note: we deliberately do NOT force a password change after first login.
 * The shopkeeper's initial password matches their phone number, and changing
 * it is entirely optional. They can do it from /shop/welcome or settings
 * whenever they want.
 */
export async function middleware(request: NextRequest) {
  const { response, supabase } = updateSupabaseSession(request);
  const pathname = request.nextUrl.pathname;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let role: "admin" | "shopkeeper" | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role === "admin" || profile?.role === "shopkeeper") {
      role = profile.role;
    }
  }

  // Already-logged-in users hitting /login go straight to their portal.
  if (pathname === "/login" && user && role) {
    return NextResponse.redirect(
      new URL(role === "admin" ? "/admin" : "/shop", request.url)
    );
  }

  // /admin/* — admin only.
  if (pathname.startsWith(ADMIN_PREFIX)) {
    if (!user || role !== "admin") {
      const url = new URL("/login", request.url);
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  // /shop/* — shopkeeper only.
  if (pathname.startsWith(SHOP_PREFIX)) {
    if (!user || role !== "shopkeeper") {
      const url = new URL("/login", request.url);
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|icon-maskable.svg|apple-touch-icon.svg|manifest.webmanifest).*)",
  ],
};
