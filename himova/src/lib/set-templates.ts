/**
 * Shared set-type templates and size validation rules.
 *
 * A "set type" defines a fixed size combination sold as one unit. Shoes are
 * always whole sizes; clothing uses letter sizes. Within a single set, each
 * size appears exactly once (no duplicates).
 */

export type SetTemplate = {
  id: string;
  label: string;
  sizes: string[];
  kind: "shoe" | "clothing";
};

export const SET_TEMPLATES: SetTemplate[] = [
  // Shoes — 5-pair packs of consecutive whole sizes.
  { id: "shoe-35-39", label: "35-39", sizes: ["35", "36", "37", "38", "39"], kind: "shoe" },
  { id: "shoe-36-40", label: "36-40", sizes: ["36", "37", "38", "39", "40"], kind: "shoe" },
  { id: "shoe-39-43", label: "39-43", sizes: ["39", "40", "41", "42", "43"], kind: "shoe" },
  { id: "shoe-40-44", label: "40-44", sizes: ["40", "41", "42", "43", "44"], kind: "shoe" },
  { id: "shoe-41-45", label: "41-45", sizes: ["41", "42", "43", "44", "45"], kind: "shoe" },
  // Clothing — unique letter sizes.
  { id: "cloth-s-xxl", label: "S-XXL", sizes: ["S", "M", "L", "XL", "XXL"], kind: "clothing" },
  { id: "cloth-m-xxl", label: "M-XXL", sizes: ["M", "L", "XL", "XXL"], kind: "clothing" },
  { id: "cloth-s-xl", label: "S-XL", sizes: ["S", "M", "L", "XL"], kind: "clothing" },
];

/**
 * Parse a comma/space separated size string into a trimmed array.
 * "39, 40, 41" -> ["39","40","41"]; "S M L XL" -> ["S","M","L","XL"].
 */
export function parseSizesInput(input: string): string[] {
  return input
    .split(/[,\s]+/)
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
}

export type SizeValidation = { ok: true; sizes: string[] } | { ok: false; error: string };

/**
 * Validate a list of sizes for a set type:
 *  - at least one size
 *  - at most 12 (sanity cap)
 *  - no duplicates (case-insensitive)
 */
export function validateSizes(sizes: string[]): SizeValidation {
  if (sizes.length === 0) {
    return { ok: false, error: "Add at least one size." };
  }
  if (sizes.length > 12) {
    return { ok: false, error: "A set can have at most 12 sizes." };
  }
  const seen = new Set<string>();
  for (const s of sizes) {
    const key = s.toUpperCase();
    if (seen.has(key)) {
      return { ok: false, error: `Size "${s}" appears more than once. Each size must be unique.` };
    }
    seen.add(key);
  }
  return { ok: true, sizes };
}

/**
 * Build a default label from a size list (e.g. ["39",...,"43"] -> "39-43",
 * ["S","M","L","XL","XXL"] -> "S-XXL"). Falls back to a joined string.
 */
export function defaultLabelForSizes(sizes: string[]): string {
  if (sizes.length === 0) return "";
  if (sizes.length === 1) return sizes[0];
  return `${sizes[0]}-${sizes[sizes.length - 1]}`;
}
