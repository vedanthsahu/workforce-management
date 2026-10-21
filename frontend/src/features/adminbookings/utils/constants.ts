import type { CSSProperties } from "react";
import { AdminBookingApiStatus, BookingStatus } from "../types/adminBooking.types";

export const BOOKING_STATUS_STYLES: Record<BookingStatus, string> = {
  Scheduled: "bg-indigo-100 text-indigo-700",
  Confirmed: "bg-blue-100 text-blue-700",
  "Checked In": "bg-green-100 text-green-700",
  "Checked Out": "bg-teal-100 text-teal-700",
  Completed: "bg-gray-100 text-gray-600",
  Cancelled: "bg-red-100 text-red-700",
  Modified: "bg-amber-100 text-amber-700",
  "No Show": "bg-orange-100 text-orange-700",
};

// "Completed" is intentionally excluded here — it remains a valid computed
// row status (see mapAdminBooking.ts) with its own badge style below, but is
// no longer offered as a selectable filter option.
export const BOOKING_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "All", label: "All Status" },
  ...(Object.keys(BOOKING_STATUS_STYLES) as BookingStatus[])
    .filter((status) => status !== "Completed")
    .map((status) => ({
      value: status,
      label: status,
    })),
];

// The backend's bookingStatus filter only recognizes these four values —
// Scheduled/Checked In/Checked Out are derived client-side from timestamps,
// not stored as their own booking_status, so they can't be sent as a filter.
export const BOOKING_STATUS_PARAM: Record<string, AdminBookingApiStatus> = {
  Confirmed: "CONFIRMED",
  Cancelled: "CANCELLED",
  Modified: "MODIFIED",
  "No Show": "NO_SHOW",
};

export const BOOKING_PAGE_SIZES = [10,25, 50, 75, 100];

// ─── Search-state persistence across the Modify flow ──────────────────────────
// AdminBookingsPage snapshots its search/filter state under this key so it
// can restore it on browser Back from /book or /book-for-someone. Restoring
// is only valid if that navigation-away was flagged first (see
// ADMIN_BOOKINGS_EXPECT_RETURN_KEY below) — otherwise a plain nav-bar visit
// or a page reload always starts clean.
export const ADMIN_BOOKINGS_SEARCH_STATE_KEY = "adminBookings:searchState";

// Set right before navigating away from Modify Seat/Modify Visit, consumed
// (read-and-cleared) once on the next AdminBookingsPage mount. Next.js App
// Router navigation doesn't create a new Performance "navigation" entry for
// client-side back/forward, so that API can't tell a Back from a fresh visit
// here — this flag is what actually distinguishes the two.
export const ADMIN_BOOKINGS_EXPECT_RETURN_KEY = "adminBookings:expectReturn";

// ─── Shared native-<select> styling (BookingManagementFilters) ────────────────
export const SELECT_BASE_CLASS =
  "h-10 pr-8 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors cursor-pointer w-full";

export const SELECT_ARROW_STYLE: CSSProperties = {
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\")",
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 10px center",
};
