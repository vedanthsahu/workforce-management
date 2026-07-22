import type { Booking } from "@/features/bookings/types/bookings.types";
import {
  AdminBooking,
  AdminBookingRaw,
  BookingStatus,
} from "../types/adminBooking.types";

function formatDateLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function relativeDayLabel(iso: string): string {
  const target = new Date(`${iso}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86_400_000);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  return diffDays > 1 ? `In ${diffDays} days` : `${Math.abs(diffDays)} days ago`;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatTimeOnly(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

/** booking_status only ever holds CONFIRMED/CANCELLED/MODIFIED/COMPLETED/NO_SHOW server-side;
 * checked-in/out are separate check_in_at/checked_out_at timestamps layered on top of that. */
function resolveStatus(raw: AdminBookingRaw): BookingStatus {
  if (raw.checked_out_at) return "Checked Out";
  if (raw.check_in_at) return "Checked In";

  switch (raw.booking_status) {
    case "CONFIRMED":
      return "Confirmed";
    case "CANCELLED":
      return "Cancelled";
    case "MODIFIED":
      return "Modified";
    case "COMPLETED":
      return "Completed";
    case "NO_SHOW":
      return "No Show";
    default:
      return "Scheduled";
  }
}

export function mapAdminBookingRawToUiBooking(raw: AdminBookingRaw): AdminBooking {
  return {
    booking_id: raw.booking_id ?? "",
    person_name: raw.booked_for_name ?? "",
    person_type: raw.booking_type === "GUEST" ? "Guest" : "Employee",
    person_email: raw.booked_for_email ?? "",
    seat_code: raw.seat_code ?? "",
    // Not returned by GET /admin/bookings; left blank until the backend adds it.
    seat_type: "",
    site_name: raw.site_name ?? "",
    building_name: raw.building_name ?? "",
    floor_name: raw.floor_name ?? "",
    activity_date: raw.booking_date ?? "",
    date_label: raw.booking_date ? formatDateLabel(raw.booking_date) : "",
    date_relative: raw.booking_date ? relativeDayLabel(raw.booking_date) : "",
    time_range: "",
    status: resolveStatus(raw),
    // "Self" when the booker made the booking for themself; otherwise the actual booker's name.
    booked_by:
      raw.booked_by_user_id && raw.booked_by_user_id === raw.booked_for_user_id
        ? "Self"
        : raw.booked_by_name || "—",
    booked_on: raw.created_at ? formatDateTime(raw.created_at) : "",
    check_in_time: raw.check_in_at ? formatTimeOnly(raw.check_in_at) : undefined,
    amenities: [],
    notes: raw.notes ?? undefined,

    site_id: raw.site_id,
    building_id: raw.building_id,
    floor_id: raw.floor_id,
    seat_id: raw.seat_id,
    booked_for_user_id: raw.booked_for_user_id,
    booked_for_guest_id: raw.booked_for_guest_id,

    guest_visit_id: raw.guest_visit_id,
    host_user_id: raw.host_user_id,
    host_name: raw.host_name,
    guest_type: raw.guest_type,
    purpose_of_visit: raw.purpose_of_visit,
    start_time: raw.start_time,
    end_time: raw.end_time,
  };
}

/**
 * A stable, unique identifier for a table row / selection-match — NOT the
 * same as `booking.booking_id`. GET /admin/bookings now also unions in
 * visit-only guest rows (a guest visit with no linked seat booking), which
 * have `booking_id: null` — several of those would otherwise collide on the
 * same "" key. `guest_visit_id` is unique per visit, so it's a safe fallback.
 */
export function getBookingRowKey(booking: AdminBooking): string {
  return booking.booking_id || `visit-${booking.guest_visit_id}`;
}

/**
 * Adapts an AdminBooking into the minimal Booking shape that
 * `bookings/components/CancelBookingDialog.tsx` reads (title/reason-list
 * branch on `bookingType`, message reads location/floor/seat/date) — this is
 * the same dialog "My Bookings" and "Book for Someone" already use, so
 * cancelling from admin gets identical copy and the same
 * POST /bookings/{id}/cancel + /guest-bookings/{id}/cancel routes.
 */
export function mapAdminBookingToDialogBooking(booking: AdminBooking): Booking {
  const isGuest = booking.person_type === "Guest";
  return {
    id: booking.booking_id,
    location: booking.site_name,
    building: booking.building_name,
    floor: booking.floor_name,
    seat: booking.seat_code,
    date: booking.activity_date,
    fromDate: booking.activity_date,
    toDate: booking.activity_date,
    startTime: "",
    endTime: "",
    isFullDay: true,
    status: "confirmed",
    bookedOn: booking.booked_on,
    tags: [],
    bookingType: isGuest ? "guest" : "employee",
    guestName: isGuest ? booking.person_name : undefined,
    bookedForName: isGuest ? undefined : booking.person_name,
  };
}
