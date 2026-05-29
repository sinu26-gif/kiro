/**
 * Phone number helpers for Nepali shopkeeper auth.
 *
 * Storage format (DB + synthetic email): E.164 without the leading "+", e.g. "9779847465097".
 * UI / display / initial password format: the 10-digit local mobile, e.g. "9847465097".
 *
 * The synthetic email derives from the E.164 form so login lookups stay unique
 * even if a future phase ever supports another country code, but everything a
 * shopkeeper sees or types is the plain 10-digit number they already know.
 */

const NEPAL_DIAL_CODE = "977";
const NEPAL_LOCAL_LENGTH = 10;
const PHONE_EMAIL_DOMAIN = "phone.himova.local";

function stripNonDigits(value: string): string {
  return value.replace(/\D+/g, "");
}

/**
 * Normalise a user-typed phone number into the canonical storage form (E.164).
 * Returns null if the input does not look like a valid Nepali mobile.
 *
 * Accepted inputs:
 *   "9847465097"           -> "9779847465097"
 *   "+9779847465097"       -> "9779847465097"
 *   "9779847465097"        -> "9779847465097"
 *   "977 9847465097"       -> "9779847465097"
 *   "98-4746-5097"         -> "9779847465097"
 */
export function normalisePhone(input: string): string | null {
  const digits = stripNonDigits(input);

  // 10-digit local mobile, must start with 9.
  if (digits.length === NEPAL_LOCAL_LENGTH && digits.startsWith("9")) {
    return `${NEPAL_DIAL_CODE}${digits}`;
  }

  // Already E.164 (with or without +).
  if (digits.length === 13 && digits.startsWith(NEPAL_DIAL_CODE) && digits[3] === "9") {
    return digits;
  }

  return null;
}

/**
 * Convert a stored E.164 phone (e.g. "9779847465097") into the local 10-digit form
 * (e.g. "9847465097"). Returns the input unchanged if it doesn't look like an E.164
 * Nepali number.
 *
 * This is the form we show in the UI and use as the initial shopkeeper password.
 */
export function toLocalDigits(phone: string): string {
  const digits = stripNonDigits(phone);
  if (digits.length === 13 && digits.startsWith(NEPAL_DIAL_CODE) && digits[3] === "9") {
    return digits.slice(NEPAL_DIAL_CODE.length);
  }
  if (digits.length === NEPAL_LOCAL_LENGTH && digits.startsWith("9")) {
    return digits;
  }
  return phone;
}

/**
 * Convert any normalised form (E.164 or local) to the synthetic email used by Supabase Auth.
 * Always builds the email from the E.164 form for stable uniqueness.
 */
export function phoneToSyntheticEmail(phone: string): string {
  const e164 = normalisePhone(phone) ?? phone;
  return `${e164}@${PHONE_EMAIL_DOMAIN}`;
}

/**
 * True if the given email is a phone-mapped synthetic email.
 */
export function isPhoneSyntheticEmail(email: string): boolean {
  return email.endsWith(`@${PHONE_EMAIL_DOMAIN}`);
}

/**
 * Extract the local 10-digit phone number from a synthetic email, or null if not a phone email.
 */
export function syntheticEmailToPhone(email: string): string | null {
  if (!isPhoneSyntheticEmail(email)) return null;
  const e164 = email.slice(0, -(PHONE_EMAIL_DOMAIN.length + 1));
  return toLocalDigits(e164);
}

/**
 * Display formatter — returns the raw 10-digit mobile (no "+977", no dashes).
 * Use this anywhere we show a phone number to a human.
 */
export function formatPhoneForDisplay(phone: string): string {
  return toLocalDigits(phone);
}
