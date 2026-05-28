"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import {
  defaultLocale,
  LOCALE_COOKIE_MAX_AGE,
  LOCALE_COOKIE_NAME,
  locales,
  type Locale,
} from "./config";

/**
 * Server action to switch the active locale.
 * Stores the choice in a year-long cookie and revalidates the current path.
 */
export async function setLocale(
  next: string,
): Promise<{ ok: boolean; locale: Locale }> {
  const safeLocale: Locale = (locales as readonly string[]).includes(next)
    ? (next as Locale)
    : defaultLocale;

  cookies().set(LOCALE_COOKIE_NAME, safeLocale, {
    maxAge: LOCALE_COOKIE_MAX_AGE,
    path: "/",
    sameSite: "lax",
  });

  revalidatePath("/", "layout");
  return { ok: true, locale: safeLocale };
}
