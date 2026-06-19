// // // // import type { ApiVisitor, Visitor, VisitorStatus } from "../types/security.types";

// // // // // ─── Display mapping ──────────────────────────────────────────────────────

// // // // export function getInitials(name: string): string {
// // // //   const parts = name.trim().split(/\s+/);
// // // //   if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
// // // //   return (parts[0][0] + parts[1][0]).toUpperCase();
// // // // }

// // // // export function formatTimeRange(start: string, end: string): string {
// // // //   const fmt = (t: string) => {
// // // //     const [h, m] = t.split(":").map(Number);
// // // //     const period = h >= 12 ? "PM" : "AM";
// // // //     const hour12 = h % 12 === 0 ? 12 : h % 12;
// // // //     return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
// // // //   };
// // // //   return `${fmt(start)} – ${fmt(end)}`;
// // // // }

// // // // export function formatLocation(building?: string | null, floor?: string | null): string {
// // // //   return [building, floor].filter(Boolean).join(", ") || "—";
// // // // }

// // // // export function mapApiVisitorToVisitor(item: ApiVisitor): Visitor {
// // // //   return {
// // // //     id: item.visit_id,
// // // //     guestName: item.guest_name,
// // // //     guestInitials: item.guest_initials ?? getInitials(item.guest_name),
// // // //     hostName: item.host_name,
// // // //     hostEmail: item.host_email ?? "",
// // // //     hostPhone: item.host_phone ?? "",
// // // //     purpose: item.purpose,
// // // //     visitDate: item.visit_date,
// // // //     startTime: item.start_time,
// // // //     endTime: item.end_time,
// // // //     visitTimeLabel: formatTimeRange(item.start_time, item.end_time),
// // // //     siteId: item.site_id,
// // // //     siteName: item.site_name,
// // // //     buildingName: item.building_name ?? "",
// // // //     floorName: item.floor_name ?? "",
// // // //     location: formatLocation(item.building_name, item.floor_name),
// // // //     seatCode: item.seat_code ?? null,
// // // //     seatBooked: item.seat_booked,
// // // //     status: item.status,
// // // //   };
// // // // }

// // // // // ─── Status badge styling ─────────────────────────────────────────────────

// // // // export const STATUS_LABELS: Record<VisitorStatus, string> = {
// // // //   SCHEDULED: "Scheduled",
// // // //   CHECKED_IN: "Checked In",
// // // //   OVERDUE: "Overdue",
// // // //   CANCELLED: "Cancelled",
// // // //   NO_SHOW: "No Show",
// // // // };

// // // // export const STATUS_BADGE_STYLES: Record<VisitorStatus, string> = {
// // // //   SCHEDULED: "bg-blue-50 text-blue-600 ring-blue-200",
// // // //   CHECKED_IN: "bg-emerald-50 text-emerald-600 ring-emerald-200",
// // // //   OVERDUE: "bg-amber-50 text-amber-600 ring-amber-200",
// // // //   CANCELLED: "bg-gray-50 text-gray-500 ring-gray-200",
// // // //   NO_SHOW: "bg-red-50 text-red-600 ring-red-200",
// // // // };

// // // // export function getStatusLabel(status: VisitorStatus): string {
// // // //   return STATUS_LABELS[status] ?? status;
// // // // }

// // // // export function getStatusBadgeClass(status: VisitorStatus): string {
// // // //   return STATUS_BADGE_STYLES[status] ?? "bg-gray-50 text-gray-500 ring-gray-200";
// // // // }


// // // import type {
// // //   ApiGuestBooking,
// // //   BookingStatus,
// // //   GuestType,
// // //   Visitor,
// // //   VisitorStatus,
// // // } from "../types/security.types";

// // // // ─── String helpers ───────────────────────────────────────────────────────────

// // // export function getInitials(name: string): string {
// // //   const parts = name.trim().split(/\s+/);
// // //   if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
// // //   return (parts[0][0] + parts[1][0]).toUpperCase();
// // // }

// // // /**
// // //  * Formats a time string ("10:00", "10:00:00", or null) to "10:00 AM" style.
// // //  * Returns "—" when null / empty.
// // //  */
// // // export function formatTime(t: string | null | undefined): string {
// // //   if (!t) return "—";
// // //   const [hStr, mStr] = t.split(":");
// // //   const h = parseInt(hStr, 10);
// // //   const m = parseInt(mStr ?? "0", 10);
// // //   if (isNaN(h) || isNaN(m)) return t;
// // //   const period = h >= 12 ? "PM" : "AM";
// // //   const hour12 = h % 12 === 0 ? 12 : h % 12;
// // //   return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
// // // }

// // // export function formatTimeRange(
// // //   start: string | null | undefined,
// // //   end: string | null | undefined
// // // ): string {
// // //   if (!start && !end) return "—";
// // //   return `${formatTime(start)} – ${formatTime(end)}`;
// // // }

// // // export function formatLocation(
// // //   building?: string | null,
// // //   floor?: string | null
// // // ): string {
// // //   return [building, floor].filter(Boolean).join(", ") || "—";
// // // }

// // // /** Readable label for guest_type enum */
// // // export const GUEST_TYPE_LABELS: Record<GuestType, string> = {
// // //   INTERVIEW_CANDIDATE: "Interview Candidate",
// // //   CLIENT: "Client",
// // //   VENDOR: "Vendor",
// // //   CONTRACTOR: "Contractor",
// // //   OTHER: "Other",
// // // };

// // // export function getGuestTypeLabel(type: GuestType | null | undefined): string {
// // //   if (!type) return "—";
// // //   return GUEST_TYPE_LABELS[type] ?? type;
// // // }

// // // // ─── API → Frontend mapper ────────────────────────────────────────────────────

// // // export function mapApiGuestBookingToVisitor(item: ApiGuestBooking): Visitor {
// // //   return {
// // //     id: item.guest_visit_id,
// // //     bookingId: item.booking_id,
// // //     guestName: item.guest_name,
// // //     guestInitials: getInitials(item.guest_name),
// // //     guestEmail: item.guest_email ?? "",
// // //     guestPhone: item.guest_phone ?? "",
// // //     guestOrganization: item.guest_organization ?? "",
// // //     guestType: getGuestTypeLabel(item.guest_type),
// // //     hostName: item.host_name ?? "—",
// // //     hostEmail: "",
// // //     hostPhone: "",
// // //     purpose: item.purpose_of_visit ?? "—",
// // //     notes: item.notes ?? "",
// // //     visitDate: item.booking_date,
// // //     bookingDate: item.booking_date,
// // //     startTime: item.start_time ?? "",
// // //     endTime: item.end_time ?? "",
// // //     visitTimeLabel: formatTimeRange(item.start_time, item.end_time),
// // //     siteId: item.site_id,
// // //     siteName: item.site_name,
// // //     buildingName: item.building_name ?? "",
// // //     floorName: item.floor_name ?? "",
// // //     location: formatLocation(item.building_name, item.floor_name),
// // //     seatCode: item.seat_code ?? null,
// // //     seatBooked: item.requires_seat,
// // //     status: item.visit_status,
// // //     bookingStatus: item.booking_status,
// // //     checkedInAt: item.check_in_at,
// // //     checkedOutAt: item.checked_out_at,
// // //   };
// // // }

// // // /**
// // //  * Keep old name as alias so existing imports in hooks don't break.
// // //  * Hooks that previously called mapApiVisitorToVisitor can stay unchanged.
// // //  */
// // // export const mapApiVisitorToVisitor = mapApiGuestBookingToVisitor;

// // // // ─── Status badge styling ─────────────────────────────────────────────────────

// // // export const STATUS_LABELS: Record<VisitorStatus, string> = {
// // //   SCHEDULED: "Scheduled",
// // //   CHECKED_IN: "Checked In",
// // //   CHECKED_OUT: "Checked Out",
// // //   OVERDUE: "Overdue",
// // //   CANCELLED: "Cancelled",
// // //   NO_SHOW: "No Show",
// // // };

// // // export const STATUS_BADGE_STYLES: Record<VisitorStatus, string> = {
// // //   SCHEDULED: "bg-blue-50 text-blue-600 ring-blue-200",
// // //   CHECKED_IN: "bg-emerald-50 text-emerald-600 ring-emerald-200",
// // //   CHECKED_OUT: "bg-teal-50 text-teal-600 ring-teal-200",
// // //   OVERDUE: "bg-amber-50 text-amber-600 ring-amber-200",
// // //   CANCELLED: "bg-gray-50 text-gray-500 ring-gray-200",
// // //   NO_SHOW: "bg-red-50 text-red-600 ring-red-200",
// // // };

// // // export function getStatusLabel(status: VisitorStatus): string {
// // //   return STATUS_LABELS[status] ?? status;
// // // }

// // // export function getStatusBadgeClass(status: VisitorStatus): string {
// // //   return STATUS_BADGE_STYLES[status] ?? "bg-gray-50 text-gray-500 ring-gray-200";
// // // }

// // // // ─── Booking status badge ─────────────────────────────────────────────────────

// // // export const BOOKING_STATUS_STYLES: Record<BookingStatus, string> = {
// // //   CONFIRMED: "bg-emerald-50 text-emerald-600 ring-emerald-200",
// // //   CANCELLED: "bg-red-50 text-red-500 ring-red-200",
// // //   MODIFIED: "bg-amber-50 text-amber-600 ring-amber-200",
// // // };

// // // export function getBookingStatusBadgeClass(status: BookingStatus): string {
// // //   return BOOKING_STATUS_STYLES[status] ?? "bg-gray-50 text-gray-500 ring-gray-200";
// // // }

// // import type {
// //   ApiGuestVisit,
// //   BookingStatus,
// //   GuestType,
// //   Visitor,
// //   VisitorStatus,
// // } from "../types/security.types";

// // // ─── String helpers ───────────────────────────────────────────────────────────

// // export function getInitials(name: string): string {
// //   const parts = name.trim().split(/\s+/);
// //   if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
// //   return (parts[0][0] + parts[1][0]).toUpperCase();
// // }

// // /**
// //  * Formats a time string ("10:00", "10:00:00", or null) to "10:00 AM" style.
// //  * Returns "—" when null / empty.
// //  */
// // export function formatTime(t: string | null | undefined): string {
// //   if (!t) return "—";
// //   const [hStr, mStr] = t.split(":");
// //   const h = parseInt(hStr, 10);
// //   const m = parseInt(mStr ?? "0", 10);
// //   if (isNaN(h) || isNaN(m)) return t;
// //   const period = h >= 12 ? "PM" : "AM";
// //   const hour12 = h % 12 === 0 ? 12 : h % 12;
// //   return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
// // }

// // export function formatTimeRange(
// //   start: string | null | undefined,
// //   end: string | null | undefined
// // ): string {
// //   if (!start && !end) return "—";
// //   return `${formatTime(start)} – ${formatTime(end)}`;
// // }

// // export function formatLocation(
// //   building?: string | null,
// //   floor?: string | null
// // ): string {
// //   return [building, floor].filter(Boolean).join(", ") || "—";
// // }

// // // ─── Guest type label ─────────────────────────────────────────────────────────

// // export const GUEST_TYPE_LABELS: Record<GuestType, string> = {
// //   INTERVIEW_CANDIDATE: "Interview Candidate",
// //   CLIENT: "Client",
// //   VENDOR: "Vendor",
// //   CONTRACTOR: "Contractor",
// //   OTHER: "Other",
// // };

// // export function getGuestTypeLabel(type: GuestType | null | undefined): string {
// //   if (!type) return "";
// //   return GUEST_TYPE_LABELS[type] ?? type;
// // }

// // // ─── API → Frontend mapper ────────────────────────────────────────────────────

// // export function mapApiGuestVisitToVisitor(item: ApiGuestVisit): Visitor {
// //   return {
// //     id: item.guest_visit_id,
// //     bookingId: item.booking_id,
// //     guestName: item.guest_name,
// //     guestInitials: getInitials(item.guest_name),
// //     guestEmail: item.guest_email ?? "",
// //     guestPhone: item.guest_phone ?? "",
// //     guestOrganization: "",           // not in /guest-visits response
// //     guestType: getGuestTypeLabel(item.guest_type),
// //     hostName: item.host_name ?? "—",
// //     hostEmail: item.host_email ?? "",
// //     hostPhone: item.host_phone ?? "",
// //     hostDepartment: item.host_department ?? "",
// //     hostJobTitle: item.host_job_title ?? "",
// //     purpose: item.purpose_of_visit ?? "—",
// //     notes: item.notes ?? "",
// //     visitDate: item.visit_date,
// //     bookingDate: item.visit_date,
// //     startTime: item.start_time ?? "",
// //     endTime: item.end_time ?? "",
// //     visitTimeLabel: formatTimeRange(item.start_time, item.end_time),
// //     siteId: item.site_id,
// //     siteName: item.site_name,
// //     buildingName: item.building_name ?? "",
// //     floorName: item.floor_name ?? "",
// //     location: formatLocation(item.building_name, item.floor_name),
// //     seatCode: item.seat_code ?? null,
// //     seatBooked: item.requires_seat,
// //     status: item.visit_status,
// //     bookingStatus: item.booking_status,
// //     checkedInAt: item.checked_in_at,
// //     checkedOutAt: item.checked_out_at,
// //   };
// // }

// // /**
// //  * Aliases so existing hook imports don't need to change.
// //  * Both mapApiVisitorToVisitor and mapApiGuestBookingToVisitor now point here.
// //  */
// // export const mapApiVisitorToVisitor = mapApiGuestVisitToVisitor;
// // export const mapApiGuestBookingToVisitor = mapApiGuestVisitToVisitor;

// // // ─── Status badge styling ─────────────────────────────────────────────────────

// // export const STATUS_LABELS: Record<VisitorStatus, string> = {
// //   SCHEDULED: "Scheduled",
// //   CHECKED_IN: "Checked In",
// //   CHECKED_OUT: "Checked Out",
// //   OVERDUE: "Overdue",
// //   CANCELLED: "Cancelled",
// //   NO_SHOW: "No Show",
// // };

// // export const STATUS_BADGE_STYLES: Record<VisitorStatus, string> = {
// //   SCHEDULED: "bg-blue-50 text-blue-600 ring-blue-200",
// //   CHECKED_IN: "bg-emerald-50 text-emerald-600 ring-emerald-200",
// //   CHECKED_OUT: "bg-teal-50 text-teal-600 ring-teal-200",
// //   OVERDUE: "bg-amber-50 text-amber-600 ring-amber-200",
// //   CANCELLED: "bg-gray-50 text-gray-500 ring-gray-200",
// //   NO_SHOW: "bg-red-50 text-red-600 ring-red-200",
// // };

// // export function getStatusLabel(status: VisitorStatus): string {
// //   return STATUS_LABELS[status] ?? status;
// // }

// // export function getStatusBadgeClass(status: VisitorStatus): string {
// //   return STATUS_BADGE_STYLES[status] ?? "bg-gray-50 text-gray-500 ring-gray-200";
// // }

// // // ─── Booking status badge ─────────────────────────────────────────────────────

// // export const BOOKING_STATUS_STYLES: Record<BookingStatus, string> = {
// //   CONFIRMED: "bg-emerald-50 text-emerald-600 ring-emerald-200",
// //   CANCELLED: "bg-red-50 text-red-500 ring-red-200",
// //   MODIFIED: "bg-amber-50 text-amber-600 ring-amber-200",
// // };

// // export function getBookingStatusBadgeClass(status: BookingStatus): string {
// //   return BOOKING_STATUS_STYLES[status] ?? "bg-gray-50 text-gray-500 ring-gray-200";
// // }

// import type {
//   ApiGuestVisit,
//   ApiGuestBooking,
//   BookingStatus,
//   GuestType,
//   Visitor,
//   VisitorStatus,
// } from "../types/security.types";

// // ─── String helpers ───────────────────────────────────────────────────────────

// export function getInitials(name: string): string {
//   const parts = name.trim().split(/\s+/);
//   if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
//   return (parts[0][0] + parts[1][0]).toUpperCase();
// }

// export function formatTime(t: string | null | undefined): string {
//   if (!t) return "—";
//   const [hStr, mStr] = t.split(":");
//   const h = parseInt(hStr, 10);
//   const m = parseInt(mStr ?? "0", 10);
//   if (isNaN(h) || isNaN(m)) return t;
//   const period = h >= 12 ? "PM" : "AM";
//   const hour12 = h % 12 === 0 ? 12 : h % 12;
//   return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
// }

// export function formatTimeRange(
//   start: string | null | undefined,
//   end: string | null | undefined
// ): string {
//   if (!start && !end) return "—";
//   return `${formatTime(start)} – ${formatTime(end)}`;
// }

// export function formatLocation(
//   building?: string | null,
//   floor?: string | null
// ): string {
//   return [building, floor].filter(Boolean).join(", ") || "—";
// }

// export const GUEST_TYPE_LABELS: Record<GuestType, string> = {
//   INTERVIEW_CANDIDATE: "Interview Candidate",
//   CLIENT: "Client",
//   VENDOR: "Vendor",
//   CONTRACTOR: "Contractor",
//   OTHER: "Other",
// };

// export function getGuestTypeLabel(type: GuestType | null | undefined): string {
//   if (!type) return "";
//   return GUEST_TYPE_LABELS[type] ?? type;
// }

// // ─── API → Frontend mappers ───────────────────────────────────────────────────

// /** Used for GET /guest-visits (table list) */
// export function mapApiGuestVisitToVisitor(item: ApiGuestVisit): Visitor {
//   return {
//     id: item.guest_visit_id,
//     bookingId: item.booking_id ?? null,
//     guestName: item.guest_name,
//     guestInitials: getInitials(item.guest_name),
//     guestEmail: item.guest_email ?? "",
//     guestPhone: item.guest_phone ?? "",
//     guestOrganization: "",
//     guestType: getGuestTypeLabel(item.guest_type),
//     hostName: item.host_name ?? "—",
//     hostEmail: item.host_email ?? "",
//     hostPhone: item.host_phone ?? "",
//     hostDepartment: item.host_department ?? "",
//     hostJobTitle: item.host_job_title ?? "",
//     purpose: item.purpose_of_visit ?? "—",
//     notes: item.notes ?? "",
//     visitDate: item.visit_date,
//     bookingDate: item.visit_date,
//     startTime: item.start_time ?? "",
//     endTime: item.end_time ?? "",
//     visitTimeLabel: formatTimeRange(item.start_time, item.end_time),
//     siteId: item.site_id,
//     siteName: item.site_name,
//     buildingName: item.building_name ?? "",
//     floorName: item.floor_name ?? "",
//     location: formatLocation(item.building_name, item.floor_name),
//     seatCode: item.seat_code ?? null,
//     seatBooked: item.requires_seat,
//     status: item.visit_status,
//     bookingStatus: item.booking_status,
//     checkedInAt: item.checked_in_at,
//     checkedOutAt: item.checked_out_at,
//   };
// }

// /** Used for GET /guest-bookings/{booking_id} (details modal) */
// export function mapApiGuestBookingToVisitor(item: ApiGuestBooking): Visitor {
//   return {
//     id: item.guest_visit_id,
//     bookingId: item.booking_id ?? null,
//     guestName: item.guest_name,
//     guestInitials: getInitials(item.guest_name),
//     guestEmail: item.guest_email ?? "",
//     guestPhone: item.guest_phone ?? "",
//     guestOrganization: item.guest_organization ?? "",
//     guestType: getGuestTypeLabel(item.guest_type),
//     hostName: item.host_name ?? "—",
//     hostEmail: "",
//     hostPhone: "",
//     hostDepartment: "",
//     hostJobTitle: "",
//     purpose: item.purpose_of_visit ?? "—",
//     notes: item.notes ?? "",
//     visitDate: item.booking_date,
//     bookingDate: item.booking_date,
//     startTime: item.start_time ?? "",
//     endTime: item.end_time ?? "",
//     visitTimeLabel: formatTimeRange(item.start_time, item.end_time),
//     siteId: item.site_id,
//     siteName: item.site_name,
//     buildingName: item.building_name ?? "",
//     floorName: item.floor_name ?? "",
//     location: formatLocation(item.building_name, item.floor_name),
//     seatCode: item.seat_code ?? null,
//     seatBooked: item.requires_seat,
//     status: item.visit_status,
//     bookingStatus: item.booking_status,
//     checkedInAt: item.check_in_at,       // ← booking API field name
//     checkedOutAt: item.checked_out_at,
//   };
// }

// // Alias for hooks that import the old name
// export const mapApiVisitorToVisitor = mapApiGuestVisitToVisitor;

// // ─── Status badge styling ─────────────────────────────────────────────────────

// export const STATUS_LABELS: Record<VisitorStatus, string> = {
//   SCHEDULED: "Scheduled",
//   CHECKED_IN: "Checked In",
//   CHECKED_OUT: "Checked Out",
//   OVERDUE: "Overdue",
//   CANCELLED: "Cancelled",
//   NO_SHOW: "No Show",
// };

// export const STATUS_BADGE_STYLES: Record<VisitorStatus, string> = {
//   SCHEDULED: "bg-blue-50 text-blue-600 ring-blue-200",
//   CHECKED_IN: "bg-emerald-50 text-emerald-600 ring-emerald-200",
//   CHECKED_OUT: "bg-teal-50 text-teal-600 ring-teal-200",
//   OVERDUE: "bg-amber-50 text-amber-600 ring-amber-200",
//   CANCELLED: "bg-gray-50 text-gray-500 ring-gray-200",
//   NO_SHOW: "bg-red-50 text-red-600 ring-red-200",
// };

// export function getStatusLabel(status: VisitorStatus): string {
//   return STATUS_LABELS[status] ?? status;
// }

// export function getStatusBadgeClass(status: VisitorStatus): string {
//   return STATUS_BADGE_STYLES[status] ?? "bg-gray-50 text-gray-500 ring-gray-200";
// }

// // ─── Booking status badge ─────────────────────────────────────────────────────

// export const BOOKING_STATUS_STYLES: Record<BookingStatus, string> = {
//   CONFIRMED: "bg-emerald-50 text-emerald-600 ring-emerald-200",
//   CANCELLED: "bg-red-50 text-red-500 ring-red-200",
//   MODIFIED: "bg-amber-50 text-amber-600 ring-amber-200",
// };

// export function getBookingStatusBadgeClass(status: BookingStatus): string {
//   return BOOKING_STATUS_STYLES[status] ?? "bg-gray-50 text-gray-500 ring-gray-200";
// }

import type {
  ApiGuestBooking,
  BookingStatus,
  GuestType,
  Visitor,
  VisitorStatus,
} from "../types/security.types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
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

export function formatLocation(
  building?: string | null,
  floor?: string | null
): string {
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

// ─── Main mapper ──────────────────────────────────────────────────────────────

export function mapApiGuestBookingToVisitor(item: ApiGuestBooking): Visitor {
  return {
    id: item.guest_visit_id,
    bookingId: item.booking_id,
    guestVisitId: item.guest_visit_id,   // used for PATCH /guest-visits/{id} and cancel
    guestName: item.guest_name,
    guestInitials: getInitials(item.guest_name),
    guestEmail: item.guest_email ?? "",
    guestPhone: item.guest_phone ?? "",
    guestOrganization: item.guest_organization ?? "",
    guestType: item.guest_type ?? null,
    hostName: item.host_name ?? "—",
    hostEmail: "",
    hostPhone: "",
    hostUserId: item.host_user_id,       // needed for ModifyVisitPayload.host_user_id
    purpose: item.purpose_of_visit ?? null,
    notes: item.notes ?? "",
    visitDate: item.booking_date,
    bookingDate: item.booking_date,
    startTime: item.start_time?.slice(0, 5) ?? "",   // "HH:MM" for <input type="time">
    endTime: item.end_time?.slice(0, 5) ?? "",
    visitTimeLabel: formatTimeRange(item.start_time, item.end_time),
    siteId: item.site_id,
    siteName: item.site_name,
    buildingId: item.building_id,        // for location change placeholder
    floorId: item.floor_id,              // for location change placeholder
    buildingName: item.building_name ?? "",
    floorName: item.floor_name ?? "",
    location: formatLocation(item.building_name, item.floor_name),
    seatCode: item.seat_code ?? null,
    seatBooked: item.requires_seat,
    status: item.visit_status,
    bookingStatus: item.booking_status,
    checkedInAt: item.check_in_at,
    checkedOutAt: item.checked_out_at,
  };
}

/**
 * Keep old name as alias so existing imports in hooks don't break.
 */
export const mapApiVisitorToVisitor = mapApiGuestBookingToVisitor;

// ─── Status badge styling ─────────────────────────────────────────────────────

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

export const BOOKING_STATUS_STYLES: Record<BookingStatus, string> = {
  CONFIRMED: "bg-emerald-50 text-emerald-600 ring-emerald-200",
  CANCELLED: "bg-red-50 text-red-500 ring-red-200",
  MODIFIED: "bg-amber-50 text-amber-600 ring-amber-200",
};

export function getBookingStatusBadgeClass(status: BookingStatus): string {
  return BOOKING_STATUS_STYLES[status] ?? "bg-gray-50 text-gray-500 ring-gray-200";
}