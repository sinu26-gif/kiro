/**
 * Client-safe helper for embedding YouTube videos.
 * Kept out of catalog.ts (which is server-only) so client components can use it.
 */

/**
 * Convert a YouTube watch/share URL into an embeddable URL, or null.
 */
export function youtubeEmbedUrl(url: string | null): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/) ?? null;
  if (!match) return null;
  return `https://www.youtube.com/embed/${match[1]}`;
}
