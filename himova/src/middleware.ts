import { NextResponse, type NextRequest } from "next/server";

/**
 * Route gating happens here.
 *
 * For Milestone 0 we keep the middleware extremely lean: it just lets every
 * request through. In Milestone 1 we will add Supabase session refresh and
 * role-based route gating for `/admin/*` and `/shop/*`.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Run on every request except Next internals and static files.
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|icon-maskable.svg|apple-touch-icon.svg|manifest.webmanifest).*)",
  ],
};
