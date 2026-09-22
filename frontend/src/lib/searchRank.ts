/**
 * Ranks how well `text` matches a search `query` for client-side search-as-you-go
 * lists. Lower is a better match; `null` means no match (row should be filtered out).
 *
 * 0 = text starts with the query (e.g. "Scottsdale" for "s")
 * 1 = query appears elsewhere in text (plain substring)
 * 2 = every character of query appears in text in order, but not contiguously
 *     (fuzzy subsequence match, e.g. "sdl" -> "Scottsdale")
 */
export function searchMatchRank(text: string, query: string): number | null {
  const t = text.toLowerCase();
  const q = query.toLowerCase().trim();
  if (!q) return 0;

  if (t.startsWith(q)) return 0;
  if (t.includes(q)) return 1;

  let i = 0;
  for (const char of t) {
    if (char === q[i]) i++;
    if (i === q.length) return 2;
  }
  return null;
}

/** Best (lowest) rank across multiple candidate fields, or null if none match. */
export function bestSearchMatchRank(...ranks: (number | null)[]): number | null {
  const valid = ranks.filter((r): r is number => r !== null);
  return valid.length ? Math.min(...valid) : null;
}
