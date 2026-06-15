// Display names matched against the /preferences API response by name.
// Used when a booking from the dashboard has no preference data from the API.
export const FALLBACK_PREFERENCE_NAMES = ["Window Seat", "Near Cafeteria"];

// Cycled through for team member avatar fallback colors.
export const AVATAR_COLORS = [
  "#E8D5B7", "#B7D5E8", "#D5E8B7", "#E8B7D5",
  "#B7E8D5", "#D5B7E8", "#E8E8B7", "#B7B7E8",
];

export const DAY_LABELS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

// Default working hours shown on every booking card (no per-booking time data from the API).
export const DEFAULT_BOOKING_START_TIME = "9:00 AM";
export const DEFAULT_BOOKING_END_TIME = "6:00 PM";

// Number of upcoming bookings shown on the dashboard before "View all".
export const MAX_VISIBLE_BOOKINGS = 2;
