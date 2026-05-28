import { NextResponse, type NextRequest } from "next/server";

import { updateSupabaseSession } from "@/lib/supabase/middleware";

const ADMIN_PREFIX = "/admin";
const SHOP_PREFIX = "/shop";
const SHOP_WELCOME = "/shop/welcome";

/**
 * Middleware:
 *   1. Refresh the Supabase session cookie on every request.
 *   2. Gate `/shop/*` to shopkeepers, `/admin/*` to admins.
 *   3. Redirect already-authenticated users away from `/login` to their portal.
 *   4. Force first-time shopkeepers to `/shop/welcome` until they change password.
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

  const mustChangePassword =
    (user?.user_metadata as { must_change_password?: boolean } | undefined)
      ?.must_change_password === true;

  // Already-logged-in users hitting /login go straight to their portal.
  if (pathname === "/login" && user && role) {
    if (role === "shopkeeper" && mustChangePassword) {
      return NextResponse.redirect(new URL(SHOP_WELCOME, request.url));
    }
    return NextResponse.redirect(new URL(role === "admin" ? "/admin" : "/shop", request.url));
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

    // Force password change on first login.
    if (mustChangePassword && pathname !== SHOP_WELCOME) {
      return NextResponse.redirect(new URL(SHOP_WELCOME, request.url));
    }
    if (!mustChangePassword && pathname === SHOP_WELCOME) {
      return NextResponse.redirect(new URL("/shop", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|icon-maskable.svg|apple-touch-icon.svg|manifest.webmanifest).*)",
  ],
};
