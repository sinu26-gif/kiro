import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";

import {
  defaultLocale,
  LOCALE_COOKIE_NAME,
  locales,
  type Locale,
} from "./config";

/**
 * Resolves the active locale from the cookie on every request.
 * Returns translation messages for that locale.
 */
export default getRequestConfig(async () => {
  const cookieStore = cookies();
  const cookieValue = cookieStore.get(LOCALE_COOKIE_NAME)?.value;
  const locale: Locale =
    cookieValue && (locales as readonly string[]).includes(cookieValue)
      ? (cookieValue as Locale)
      : defaultLocale;

  const messages = (await import(`../../messages/${locale}.json`)).default;

  return {
    locale,
    messages,
    timeZone: "Asia/Kathmandu",
  };
});
