import type { ApiVisitor, Visitor, VisitorStatus } from "../types/security.types";

// ─── Display mapping ──────────────────────────────────────────────────────

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function formatTimeRange(start: string, end: string): string {
  const fmt = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
  };
  return `${fmt(start)} – ${fmt(end)}`;
}

export function formatLocation(building?: string | null, floor?: string | null): string {
  return [building, floor].filter(Boolean).join(", ") || "—";
}

export function mapApiVisitorToVisitor(item: ApiVisitor): Visitor {
  return {
    id: item.visit_id,
    guestName: item.guest_name,
    guestInitials: item.guest_initials ?? getInitials(item.guest_name),
    hostName: item.host_name,
    hostEmail: item.host_email ?? "",
    hostPhone: item.host_phone ?? "",
    purpose: item.purpose,
    visitDate: item.visit_date,
    startTime: item.start_time,
    endTime: item.end_time,
    visitTimeLabel: formatTimeRange(item.start_time, item.end_time),
    siteId: item.site_id,
    siteName: item.site_name,
    buildingName: item.building_name ?? "",
    floorName: item.floor_name ?? "",
    location: formatLocation(item.building_name, item.floor_name),
    seatCode: item.seat_code ?? null,
    seatBooked: item.seat_booked,
    status: item.status,
  };
}

// ─── Status badge styling ─────────────────────────────────────────────────

export const STATUS_LABELS: Record<VisitorStatus, string> = {
  SCHEDULED: "Scheduled",
  CHECKED_IN: "Checked In",
  OVERDUE: "Overdue",
  CANCELLED: "Cancelled",
  NO_SHOW: "No Show",
};

export const STATUS_BADGE_STYLES: Record<VisitorStatus, string> = {
  SCHEDULED: "bg-blue-50 text-blue-600 ring-blue-200",
  CHECKED_IN: "bg-emerald-50 text-emerald-600 ring-emerald-200",
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