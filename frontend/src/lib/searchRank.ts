/**
 * Ranks how well `text` matches a search `query` for client-side search-as-you-go
 * lists. Lower is a better match; `null` means no match (row should be filtered out).
 * Word-prefix matching only -- no mid-word/fuzzy matching, so "rence" still does
 * NOT match "Conference Speakerphone". A query may match the start of ANY word
 * in `text`, not just the first one, so for "Chandana Gowda": "chandana",
 * "gowda", and "chandana gowda" all match, while "handana" or "owda" do not.
 *
 * The rank is the 0-based index of the earliest word the query matched, so
 * results are ordered by word position, not just "matched vs. didn't" --
 * e.g. searching "i" ranks "Indore Office" (word 0) above "Hyderabad Irrum
 * Manzil office" (word 1), instead of leaving that tie to fall back to
 * whatever order the list happened to arrive in.
 */
export function searchMatchRank(text: string, query: string): number | null {
  const t = text.toLowerCase();
  const q = query.toLowerCase().trim();
  if (!q) return 0;

  if (t.startsWith(q)) return 0;

  const words = t.split(/\s+/);
  const index = words.findIndex((word) => word.startsWith(q));
  return index === -1 ? null : index;
}
