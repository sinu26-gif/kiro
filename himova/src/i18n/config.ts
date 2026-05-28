/**
 * Locale configuration for Himova.
 * We do NOT use URL-based locale routing (no /en/ /ne/ prefix).
 * Locale is stored in a cookie and switched via a server action.
 */
export const locales = ["en", "ne"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const localeLabels: Record<Locale, string> = {
  en: "English",
  ne: "नेपाली",
};

export const LOCALE_COOKIE_NAME = "HIMOVA_LOCALE";
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year
