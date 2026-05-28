/**
 * Phone number helpers for Nepali shopkeeper auth.
 *
 * Storage format: E.164 without the leading "+". Example: "9779841234567".
 * Synthetic email mapping (so Supabase can authenticate by phone): "<digits>@phone.himova.local".
 */

const NEPAL_DIAL_CODE = "977";
const PHONE_EMAIL_DOMAIN = "phone.himova.local";

/**
 * Strip everything that is not a digit.
 */
function stripNonDigits(value: string): string {
  return value.replace(/\D+/g, "");
}

/**
 * Normalise a user-typed phone number into the canonical storage form.
 * Returns null if the input does not look like a valid Nepali mobile.
 *
 * Accepted inputs:
 *   "9841234567"           -> "9779841234567"
 *   "+9779841234567"       -> "9779841234567"
 *   "9779841234567"        -> "9779841234567"
 *   "977 9841234567"       -> "9779841234567"
 *   "98-4123-4567"         -> "9779841234567"
 */
export function normalisePhone(input: string): string | null {
  const digits = stripNonDigits(input);

  // 10-digit local mobile, must start with 9.
  if (digits.length === 10 && digits.startsWith("9")) {
    return `${NEPAL_DIAL_CODE}${digits}`;
  }

  // Already E.164 (with or without +).
  if (digits.length === 13 && digits.startsWith(NEPAL_DIAL_CODE) && digits[3] === "9") {
    return digits;
  }

  return null;
}

/**
 * Convert a normalised phone number into the synthetic email used by Supabase Auth.
 */
export function phoneToSyntheticEmail(phone: string): string {
  return `${phone}@${PHONE_EMAIL_DOMAIN}`;
}

/**
 * True if the given email is a phone-mapped synthetic email.
 */
export function isPhoneSyntheticEmail(email: string): boolean {
  return email.endsWith(`@${PHONE_EMAIL_DOMAIN}`);
}

/**
 * Extract the phone number from a synthetic email, or null if not a phone email.
 */
export function syntheticEmailToPhone(email: string): string | null {
  if (!isPhoneSyntheticEmail(email)) return null;
  return email.slice(0, -(PHONE_EMAIL_DOMAIN.length + 1));
}

/**
 * Display formatter for Nepali phone numbers (e.g., "+977 98-4123-4567").
 */
export function formatPhoneForDisplay(phone: string): string {
  if (phone.length !== 13 || !phone.startsWith(NEPAL_DIAL_CODE)) return phone;
  const local = phone.slice(3);
  return `+${NEPAL_DIAL_CODE} ${local.slice(0, 2)}-${local.slice(2, 6)}-${local.slice(6)}`;
}
