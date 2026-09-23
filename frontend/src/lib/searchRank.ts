/**
 * Ranks how well `text` matches a search `query` for client-side search-as-you-go
 * lists. Lower is a better match; `null` means no match (row should be filtered out).
 * Prefix matching only -- a query only matches names that start with it, so
 * "rence" does NOT match "Conference Speakerphone" and "so" does NOT match
 * "Santiago Office" even though both appear mid-name.
 *
 * 0 = text starts with the query (e.g. "Scottsdale" for "s")
 */
export function searchMatchRank(text: string, query: string): number | null {
  const t = text.toLowerCase();
  const q = query.toLowerCase().trim();
  if (!q) return 0;

  return t.startsWith(q) ? 0 : null;
}
