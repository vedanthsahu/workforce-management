// The 3 space types an amenity can be scoped to. Same fixed convention used
// elsewhere in the app (seats.seat_type, book/utils/spaceType.ts) — no
// lookup table backs this, so it's kept as a small local constant here too
// rather than a shared cross-feature import.

export type ApplicableSeatType = "SEAT" | "CABIN" | "CONFERENCE_ROOM";

export const APPLICABLE_SEAT_TYPES: ApplicableSeatType[] = [
  "SEAT",
  "CABIN",
  "CONFERENCE_ROOM",
];

export const APPLICABLE_SEAT_TYPE_LABELS: Record<ApplicableSeatType, string> = {
  SEAT: "Seat",
  CABIN: "Cabin",
  CONFERENCE_ROOM: "Conference Room",
};
