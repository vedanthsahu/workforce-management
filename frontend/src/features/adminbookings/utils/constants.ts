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

export const BOOKING_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "All", label: "All Status" },
  ...(Object.keys(BOOKING_STATUS_STYLES) as BookingStatus[]).map((status) => ({
    value: status,
    label: status,
  })),
];

// The backend's bookingStatus filter only recognizes these five values —
// Scheduled/Checked In/Checked Out are derived client-side from timestamps,
// not stored as their own booking_status, so they can't be sent as a filter.
export const BOOKING_STATUS_PARAM: Record<string, AdminBookingApiStatus> = {
  Confirmed: "CONFIRMED",
  Cancelled: "CANCELLED",
  Modified: "MODIFIED",
  Completed: "COMPLETED",
  "No Show": "NO_SHOW",
};

export const BOOKING_PAGE_SIZES = [10, 25, 50, 75, 100];
