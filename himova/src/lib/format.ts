/**
 * Format paisa to NPR display string
 * e.g., 425000 -> "Rs 4,250"
 */
export function formatNpr(paisa: number): string {
  const rupees = Math.round(paisa / 100);
  return `Rs ${rupees.toLocaleString('en-IN')}`;
}

/**
 * Format paisa amount as a simple number string (no "Rs" prefix)
 * e.g., 425000 -> "4,250"
 */
export function formatNprNumber(paisa: number): string {
  const rupees = Math.round(paisa / 100);
  return rupees.toLocaleString('en-IN');
}

/**
 * Calculate per-piece display price from set price and sizes count
 */
export function getDisplayPricePaisa(setPricePaisa: number, sizesCount: number): number {
  if (sizesCount <= 0) return setPricePaisa;
  return Math.round(setPricePaisa / sizesCount);
}

/**
 * Parse a string money input to paisa (integer)
 * e.g., "4250" -> 425000
 */
export function parseToPaisa(rupeesString: string): number {
  const cleaned = rupeesString.replace(/[^0-9]/g, '');
  const rupees = parseInt(cleaned, 10);
  if (isNaN(rupees)) return 0;
  return rupees * 100;
}
