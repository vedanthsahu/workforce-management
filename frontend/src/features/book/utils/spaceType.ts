// The space-type narrowing choice offered in the booking flow's "3.
// Preferences" section (Bookaseatpage.tsx). Deliberately a small, local
// module rather than importing managelayout1's spaceCategory.ts — that's an
// admin-only feature domain with its own SpaceCategory type. Same underlying
// 3 real values (SEAT/CABIN/CONFERENCE_ROOM) by convention with
// seats.seat_type, so the "space_type" query param this drives means the
// same thing server-side, but the two modules don't share code across that
// boundary.
//
// No "ALL" option -- a user always searches one concrete space type, never
// an unfiltered mix of all three.

export type BookingSpaceType = "SEAT" | "CABIN" | "CONFERENCE_ROOM";

export const BOOKING_SPACE_TYPES: BookingSpaceType[] = ["SEAT", "CABIN", "CONFERENCE_ROOM"];

export const BOOKING_SPACE_TYPE_LABELS: Record<BookingSpaceType, string> = {
  SEAT: "Seat",
  CABIN: "Cabin",
  CONFERENCE_ROOM: "Conference Room",
};

export const BOOKING_SPACE_TYPE_SUBLABELS: Record<BookingSpaceType, string> = {
  SEAT: "Individual desk",
  CABIN: "Private space",
  CONFERENCE_ROOM: "With team",
};

// Same accent colors as the admin Manage Seats screen's SPACE_CATEGORY_COLOR
// (managelayout1/utils/spaceCategory.ts) -- kept as a separate literal copy
// rather than a shared import since these two modules deliberately don't
// share code across the admin/booking boundary (see module comment above).
export const BOOKING_SPACE_TYPE_COLORS: Record<BookingSpaceType, { color: string; tint: string }> = {
  SEAT: { color: "#3B82F6", tint: "#EAF2FE" },
  CABIN: { color: "#A855F7", tint: "#F6EEFE" },
  CONFERENCE_ROOM: { color: "#0E9F6E", tint: "#E9F9F2" },
};

// Whether one amenity should be offered under the given space type. Strict:
// only amenities explicitly tagged for this type show -- an untagged
// amenity (applicable_seat_types empty/unset) never shows, since there's no
// "All" view left to fall back to.
export function amenityAppliesTo(
  applicableSeatTypes: string[] | null | undefined,
  spaceType: BookingSpaceType,
): boolean {
  if (!applicableSeatTypes || applicableSeatTypes.length === 0) return false;
  return applicableSeatTypes.includes(spaceType);
}
