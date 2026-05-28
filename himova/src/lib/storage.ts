/**
 * Constants and helpers for Supabase Storage usage in Himova.
 */

export const PRODUCT_PHOTOS_BUCKET = "product-photos";

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5 MB

export const ACCEPTED_PHOTO_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

/**
 * Build the public URL for an object in the product-photos bucket.
 * Falls back to a relative path when the env var is missing (dev edge case).
 */
export function publicProductPhotoUrl(objectPath: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (!base) return `/${objectPath}`;
  return `${base}/storage/v1/object/public/${PRODUCT_PHOTOS_BUCKET}/${objectPath}`;
}

/**
 * Generate a storage object key for a product photo.
 * Layout: <productId>/<random>-<safeFileName>
 */
export function buildProductPhotoKey(productId: string, originalName: string): string {
  const random = Math.random().toString(36).slice(2, 10);
  const safe = originalName
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
  return `${productId}/${random}-${safe}`;
}
