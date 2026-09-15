// The space-type narrowing choice offered in the booking flow's "3.
// Preferences" section (Bookaseatpage.tsx). Deliberately a small, local
// module rather than importing managelayout1's spaceCategory.ts — that's an
// admin-only feature domain with its own SpaceCategory type (which also
// includes an "ALL" tab, but for a totally different purpose: a combined
// admin table view vs. an unfiltered search here). Same underlying 3 real
// values (SEAT/CABIN/CONFERENCE_ROOM) by convention with seats.seat_type,
// so the "space_type" query param this drives means the same thing
// server-side, but the two modules don't share code across that boundary.

export type BookingSpaceType = "ALL" | "SEAT" | "CABIN" | "CONFERENCE_ROOM";

export const BOOKING_SPACE_TYPES: BookingSpaceType[] = ["ALL", "SEAT", "CABIN", "CONFERENCE_ROOM"];

export const BOOKING_SPACE_TYPE_LABELS: Record<BookingSpaceType, string> = {
  ALL: "All",
  SEAT: "Seat",
  CABIN: "Cabin",
  CONFERENCE_ROOM: "Conference Room",
};

// Whether one amenity should be offered under the given space type. "ALL"
// always shows everything; otherwise an amenity shows when it's tagged for
// this type, OR when it isn't tagged at all yet -- applicable_seat_types is
// optional until the backend ships it (see Preference type), so an
// untagged/undefined amenity degrades to "always shown" rather than
// vanishing the moment this filter ships.
export function amenityAppliesTo(
  applicableSeatTypes: string[] | null | undefined,
  spaceType: BookingSpaceType,
): boolean {
  if (spaceType === "ALL") return true;
  if (!applicableSeatTypes || applicableSeatTypes.length === 0) return true;
  return applicableSeatTypes.includes(spaceType);
}
