/**
 * Money is stored as integer paisa (1 NPR = 100 paisa).
 * Use these helpers for every money read/write.
 */

const NPR_FORMATTER = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

/**
 * Convert integer paisa into a display string like "Rs 4,250".
 */
export function formatNpr(paisa: number): string {
  const rupees = Math.round(paisa) / 100;
  // For whole-rupee values, hide decimals; otherwise show two.
  if (rupees % 1 === 0) {
    return `Rs ${NPR_FORMATTER.format(rupees)}`;
  }
  return `Rs ${rupees.toFixed(2)}`;
}

/**
 * Parse a user-typed rupee string into integer paisa.
 * Returns null when the input cannot be parsed.
 */
export function parseNprToPaisa(input: string): number | null {
  const cleaned = input.replace(/[^0-9.]/g, "").trim();
  if (!cleaned) return null;
  const rupees = Number(cleaned);
  if (!Number.isFinite(rupees) || rupees < 0) return null;
  return Math.round(rupees * 100);
}

/**
 * Format a date as a short, human-friendly string.
 */
export function formatDate(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
