import { categorizeSvgId } from "@/lib/svg/seatCategories";

// The tabs Manage Spaces is organized around: "ALL" is a view-only tab (the
// original, pre-redesign flat list of everything combined — restored after
// a first pass dropped it without discussion) layered on top of the 3 real
// per-seat categories. Deliberately flat within Cabins/Conference Rooms — no
// sub-types (Meeting Room/Training Room/Conference Room from the original
// mockup all collapse into the single CONFERENCE_ROOM value below).
export type SpaceCategory = "ALL" | "SEATS" | "CABINS" | "CONFERENCE_ROOMS";

export const SPACE_CATEGORIES: SpaceCategory[] = ["ALL", "SEATS", "CABINS", "CONFERENCE_ROOMS"];

export const SPACE_CATEGORY_LABELS: Record<SpaceCategory, { singular: string; plural: string }> = {
  ALL: { singular: "Space", plural: "Spaces" },
  SEATS: { singular: "Seat", plural: "Seats" },
  CABINS: { singular: "Cabin", plural: "Cabins" },
  CONFERENCE_ROOMS: { singular: "Conference Room", plural: "Conference Rooms" },
};

// One accent color per category (including ALL, for the tab itself) —
// mirrors the original design's --primary/--seats/--cabins/--rooms tokens.
// Shared between SpaceCategoryTabs (the tab card) and SeatTable (the
// per-row category badge shown only on the ALL tab, where rows are mixed).
export const SPACE_CATEGORY_COLOR: Record<SpaceCategory, { color: string; tint: string }> = {
  ALL: { color: "#6C5CE7", tint: "#F1EEFE" },
  SEATS: { color: "#3B82F6", tint: "#EAF2FE" },
  CABINS: { color: "#A855F7", tint: "#F6EEFE" },
  CONFERENCE_ROOMS: { color: "#0E9F6E", tint: "#E9F9F2" },
};

// The original seat_type list, unchanged — this is exactly what Usemanageseats.ts's
// old hardcoded `seatTypes` array was ("All" prefix aside). Kept as-is rather than
// trimmed, per explicit instruction — CABIN stays in this list.
export const SEAT_TYPES = ["STANDARD", "WINDOW", "CABIN", "ACCESSIBLE", "HOT_DESK"] as const;

// Every seat_type value selectable in a config dropdown: the original list,
// plus the one new value this redesign adds.
export const ALL_SPACE_TYPES = [...SEAT_TYPES, "CONFERENCE_ROOM"] as const;

export const SPACE_TYPE_LABELS: Record<string, string> = {
  STANDARD: "Standard",
  WINDOW: "Window",
  CABIN: "Cabin",
  ACCESSIBLE: "Accessible",
  HOT_DESK: "Hot Desk",
  CONFERENCE_ROOM: "Conference Room",
};

// The real, configured seat_type is the only source of truth for which
// category a seat belongs to. An unconfigured seat (seat_type null) — or any
// legacy/unrecognized value — always falls back to Seats, never inferred
// from the SVG id: that heuristic is a prefill suggestion only (see
// suggestSeatType below), not a bucketing signal, so a seat's category never
// silently disagrees with its own stored seat_type. Never returns "ALL" —
// that's a view-level tab, not something an individual seat belongs to.
export function categoryOf(seatType: string | null | undefined): "SEATS" | "CABINS" | "CONFERENCE_ROOMS" {
  const t = (seatType ?? "").toUpperCase();
  if (t === "CABIN") return "CABINS";
  if (t === "CONFERENCE_ROOM") return "CONFERENCE_ROOMS";
  return "SEATS";
}

// Prefill suggestion for the seat_type dropdown when configuring a seat that
// doesn't have one yet — wraps the existing CBN/CFR/MR/TR svg-id heuristic
// (lib/svg/seatCategories.ts), built for the layout-upload summary. Meeting
// and training rooms both suggest CONFERENCE_ROOM, matching the flat
// category model above.
export function suggestSeatType(svgId: string): string {
  const c = categorizeSvgId(svgId);
  if (c === "cabin") return "CABIN";
  if (c === "seat") return "STANDARD";
  return "CONFERENCE_ROOM"; // conference + meeting + training all collapse
}
