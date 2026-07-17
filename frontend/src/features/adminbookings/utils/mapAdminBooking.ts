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
  };
}
