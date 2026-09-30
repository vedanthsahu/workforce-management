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

// The only 3 real space types — no finer sub-types (Window/Accessible/Hot
// Desk/etc.) under Seats. Every seat_type value selectable in a config
// dropdown.
export const SPACE_TYPES = ["SEAT", "CABIN", "CONFERENCE_ROOM"] as const;

export const SPACE_TYPE_LABELS: Record<string, string> = {
  SEAT: "Seat",
  CABIN: "Cabin",
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

// The amenities admin screen tags each amenity with which of the 3 real
// space types (SEAT/CABIN/CONFERENCE_ROOM) it applies to -- same convention
// as categoryOf, singular rather than plural. Also doubles as the fixed
// seat_type for a bulk edit started from a specific tab (BulkEditModal) --
// every seat selected there already shares this type.
export const CATEGORY_TO_APPLICABLE_SEAT_TYPE: Record<
  "SEATS" | "CABINS" | "CONFERENCE_ROOMS",
  string
> = {
  SEATS: "SEAT",
  CABINS: "CABIN",
  CONFERENCE_ROOMS: "CONFERENCE_ROOM",
};

// Whether an amenity may be assigned to a seat of the given (granular)
// seat_type. Strict: an amenity only applies where it's explicitly tagged --
// an untagged amenity (applicable_seat_types empty/unset) applies nowhere,
// same convention as the booking flow's amenityAppliesTo.
export function amenityAppliesToSeatType(
  applicableSeatTypes: string[] | null | undefined,
  seatType: string | null | undefined,
): boolean {
  if (!applicableSeatTypes || applicableSeatTypes.length === 0) return false;
  return applicableSeatTypes.includes(CATEGORY_TO_APPLICABLE_SEAT_TYPE[categoryOf(seatType)]);
}

// Prefill suggestion for the seat_type dropdown when configuring a seat that
// doesn't have one yet — wraps the existing CBN/CFR/MR/TR svg-id heuristic
// (lib/svg/seatCategories.ts), built for the layout-upload summary. Meeting
// and training rooms both suggest CONFERENCE_ROOM, matching the flat
// category model above.
export function suggestSeatType(svgId: string): string {
  const c = categorizeSvgId(svgId);
  if (c === "cabin") return "CABIN";
  if (c === "seat") return "SEAT";
  return "CONFERENCE_ROOM"; // conference + meeting + training all collapse
}
