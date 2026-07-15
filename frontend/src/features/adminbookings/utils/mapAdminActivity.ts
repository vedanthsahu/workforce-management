import {
  AdminActivityItem,
  AdminActivityStatus,
  AdminBooking,
  BookingStatus,
} from "../types/adminBooking.types";

const STATUS_LABELS: Record<AdminActivityStatus, BookingStatus> = {
  SCHEDULED: "Scheduled",
  CONFIRMED: "Confirmed",
  CHECKED_IN: "Checked In",
  CHECKED_OUT: "Checked Out",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  MODIFIED: "Modified",
  NO_SHOW: "No Show",
};

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

function formatDateLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
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

export function mapActivityToAdminBooking(item: AdminActivityItem): AdminBooking {
  return {
    booking_id: item.bookingId ?? item.activityId,
    person_name: item.bookedFor.name,
    person_type: item.bookedFor.entityType === "GUEST" ? "Guest" : "Employee",
    person_email: item.bookedFor.email,
    seat_code: item.seat?.seatCode ?? "",
    seat_type: item.seat?.seatType ?? "",
    site_name: item.site.siteName,
    building_name: item.building.buildingName,
    floor_name: item.floor?.floorName ?? "",
    activity_date: item.activityDate,
    date_label: formatDateLabel(item.activityDate),
    date_relative: relativeDayLabel(item.activityDate),
    time_range: "",
    status: STATUS_LABELS[item.activityStatus],
    booked_by: item.bookedBy.id === item.bookedFor.id ? "Self" : "Admin",
    booked_on: item.createdAt ? formatDateTime(item.createdAt) : "",
    check_in_time: item.checkInAt ? formatTimeOnly(item.checkInAt) : undefined,
    amenities: [],
    notes: undefined,
  };
}
