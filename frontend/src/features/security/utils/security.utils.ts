

import type {
  ApiGuestVisit,
  ApiGuestVisitsSummary,
  GuestType,
  SecurityDashboardSummary,
  Visitor,
  VisitorStatus,
} from "../types/security.types";

// ─── Small formatters ─────────────────────────────────────────────────────────

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function formatTimeRange(
  start: string | null | undefined,
  end: string | null | undefined
): string {
  if (!start && !end) return "—";
  const fmt = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
  };
  if (!start) return end ? fmt(end) : "—";
  if (!end) return fmt(start);
  return `${fmt(start)} – ${fmt(end)}`;
}

export function formatLocation(building?: string | null, floor?: string | null): string {
  return [building, floor].filter(Boolean).join(", ") || "—";
}

const GUEST_TYPE_LABELS: Record<GuestType, string> = {
  INTERVIEW_CANDIDATE: "Interview Candidate",
  CLIENT: "Client",
  VENDOR: "Vendor",
  CONTRACTOR: "Contractor",
  OTHER: "Other",
};

export function getGuestTypeLabel(type: GuestType | null | undefined): string {
  if (!type) return "—";
  return GUEST_TYPE_LABELS[type] ?? type;
}

// ─── Mappers: API (snake_case) → frontend (camelCase) ────────────────────────

export function mapApiGuestVisitToVisitor(item: ApiGuestVisit): Visitor {
  return {
    id: item.guest_visit_id,
    guestVisitId: item.guest_visit_id,
    guestId: item.guest_id,
    bookingId: item.booking_id,
    bookingStatus: item.booking_status,

    guestName: item.guest_name,
    guestInitials: getInitials(item.guest_name),
    guestEmail: item.guest_email ?? "",
    guestPhone: item.guest_phone ?? "",
    guestType: item.guest_type,

    hostUserId: item.host_user_id,
    hostName: item.host_name ?? "—",
    hostEmail: item.host_email ?? "",
    hostPhone: item.host_phone ?? "",
    hostDepartment: item.host_department ?? "",
    hostJobTitle: item.host_job_title ?? "",

    purpose: item.purpose_of_visit,
    notes: item.notes ?? "",

    visitDate: item.visit_date,
    startTime: item.start_time?.slice(0, 5) ?? "",
    endTime: item.end_time?.slice(0, 5) ?? "",
    visitTimeLabel: formatTimeRange(item.start_time, item.end_time),

    siteId: item.site_id,
    siteName: item.site_name,
    buildingId: item.building_id,
    buildingName: item.building_name ?? "",
    floorId: item.floor_id,
    floorName: item.floor_name ?? "",
    location: formatLocation(item.building_name, item.floor_name),

    seatId: item.seat_id,
    seatCode: item.seat_code,
    seatBooked: item.requires_seat,

    status: item.visit_status,
    checkedInAt: item.checked_in_at,
    checkedOutAt: item.checked_out_at,
  };
}

export function mapApiSummary(summary: ApiGuestVisitsSummary): SecurityDashboardSummary {
  return {
    total: summary.total,
    scheduled: summary.scheduled,
    checkedIn: summary.checked_in,
    checkedOut: summary.checked_out,
    cancelled: summary.cancelled,
    modified: summary.modified,
    overdue: summary.overdue,
  };
}

// ─── Visit status badge styling ───────────────────────────────────────────────

export const STATUS_LABELS: Record<VisitorStatus, string> = {
  SCHEDULED: "Scheduled",
  CHECKED_IN: "Checked In",
  CHECKED_OUT: "Checked Out",
  OVERDUE: "Overdue",
  CANCELLED: "Cancelled",
  NO_SHOW: "No Show",
};

export const STATUS_BADGE_STYLES: Record<VisitorStatus, string> = {
  SCHEDULED: "bg-blue-50 text-blue-600 ring-blue-200",
  CHECKED_IN: "bg-emerald-50 text-emerald-600 ring-emerald-200",
  CHECKED_OUT: "bg-teal-50 text-teal-600 ring-teal-200",
  OVERDUE: "bg-amber-50 text-amber-600 ring-amber-200",
  CANCELLED: "bg-gray-50 text-gray-500 ring-gray-200",
  NO_SHOW: "bg-red-50 text-red-600 ring-red-200",
};

export function getStatusLabel(status: VisitorStatus): string {
  return STATUS_LABELS[status] ?? status;
}

export function getStatusBadgeClass(status: VisitorStatus): string {
  return STATUS_BADGE_STYLES[status] ?? "bg-gray-50 text-gray-500 ring-gray-200";
}

// ─── Booking status badge ─────────────────────────────────────────────────────
// booking_status is null whenever the visit has no seat booking attached.

export const BOOKING_STATUS_STYLES: Record<string, string> = {
  CONFIRMED: "bg-emerald-50 text-emerald-600 ring-emerald-200",
  CANCELLED: "bg-red-50 text-red-500 ring-red-200",
  MODIFIED: "bg-amber-50 text-amber-600 ring-amber-200",
};

export function getBookingStatusBadgeClass(status: string | null): string {
  if (!status) return "bg-gray-50 text-gray-400 ring-gray-200";
  return BOOKING_STATUS_STYLES[status] ?? "bg-gray-50 text-gray-500 ring-gray-200";
}