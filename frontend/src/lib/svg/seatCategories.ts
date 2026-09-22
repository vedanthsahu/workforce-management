// Cabin/conference/meeting/training room seats are grouped under one svg id
// containing a "CBN"/"CFR"/"MR"/"TR" segment (e.g. "HYD-PRV-F11-CBN-04",
// "HYD-PRV-F11-CFR-02", "HYD-PRV-F11-MR-01", "HYD-PRV-F11-TR-01"), not a
// dedicated field — same convention duplicated as a single combined
// "isRoomSvgId" check in SvgFloorMapPage.tsx / LayoutPreview.tsx /
// LayoutSummary.tsx. This breaks that same convention out per-category
// instead of collapsing it to one "room" bucket, for counts that need to
// distinguish cabins from meeting rooms from training rooms.

export type SeatCategory = "seat" | "cabin" | "conference" | "meeting" | "training";

const CATEGORY_PATTERNS: [SeatCategory, RegExp][] = [
  ["cabin", /(^|[-_])cbn([-_]|$)/i],
  ["conference", /(^|[-_])cfr([-_]|$)/i],
  ["meeting", /(^|[-_])mr([-_]|$)/i],
  ["training", /(^|[-_])tr([-_]|$)/i],
];

const CATEGORY_LABELS: Record<SeatCategory, [singular: string, plural: string]> = {
  seat: ["seat", "seats"],
  cabin: ["cabin", "cabins"],
  conference: ["conference room", "conference rooms"],
  meeting: ["meeting room", "meeting rooms"],
  training: ["training room", "training rooms"],
};

// Categories in the order they should read in a summary — regular seats
// first (almost always the largest count), then rooms roughly by how often
// a floor plan tends to have them.
const CATEGORY_ORDER: SeatCategory[] = ["seat", "cabin", "conference", "meeting", "training"];

export function categorizeSvgId(svgId: string): SeatCategory {
  for (const [category, pattern] of CATEGORY_PATTERNS) {
    if (pattern.test(svgId)) return category;
  }
  return "seat";
}

export function countSeatCategories(svgIds: string[]): Record<SeatCategory, number> {
  const counts: Record<SeatCategory, number> = { seat: 0, cabin: 0, conference: 0, meeting: 0, training: 0 };
  for (const id of svgIds) counts[categorizeSvgId(id)] += 1;
  return counts;
}

// Renders a per-category breakdown instead of one flat total — e.g.
// "180 seats, 3 cabins, 4 meeting rooms" rather than "228 seats", which
// hides that most of that count wasn't desks at all. Categories with a zero
// count are omitted rather than padding the sentence out to five clauses.
export function formatSeatCategorySummary(svgIds: string[]): string {
  const counts = countSeatCategories(svgIds);
  const parts = CATEGORY_ORDER.filter((category) => counts[category] > 0).map((category) => {
    const count = counts[category];
    const [singular, plural] = CATEGORY_LABELS[category];
    return `${count} ${count === 1 ? singular : plural}`;
  });
  return parts.length > 0 ? parts.join(", ") : "0 seats";
}
