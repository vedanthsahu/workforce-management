import { AdminPersonSuggestion, AdminSeatSuggestion } from "../services/adminBookings.service";

// Mirrors the backend's ranking so a preloaded list filtered here orders the
// same way as a server search: starts-with first, then word/segment-start,
// then any other contains-match.
const norm = (value: string | null | undefined) => (value ?? "").toLowerCase();

function rankedFilter<T>(items: T[], rank: (item: T) => number): T[] {
  return items
    .map((item) => ({ item, score: rank(item) }))
    .filter((x) => x.score >= 0)
    .sort((a, b) => a.score - b.score)
    .map((x) => x.item);
}

export function filterPeople(items: AdminPersonSuggestion[], text: string): AdminPersonSuggestion[] {
  const q = norm(text.trim());
  return rankedFilter(items, (p) => {
    const name = norm(p.name);
    const email = norm(p.email);
    if (name.startsWith(q)) return 0;
    if (name.includes(` ${q}`)) return 1;
    if (email.startsWith(q)) return 2;
    return name.includes(q) || email.includes(q) ? 3 : -1;
  });
}

export function filterSeats(items: AdminSeatSuggestion[], text: string): AdminSeatSuggestion[] {
  const q = norm(text.trim());
  return rankedFilter(items, (s) => {
    const code = norm(s.seat_code);
    if (code.startsWith(q)) return 0;
    if (code.includes(`-${q}`)) return 1;
    return code.includes(q) ? 2 : -1;
  });
}
