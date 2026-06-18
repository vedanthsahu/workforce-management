// // ─── Raw API response types (mirrors future backend schema) ─────────────────
// // NOTE: backend is not ready yet — security.service.ts currently returns
// // hardcoded data shaped exactly like this. Swap the function bodies only
// // when the real endpoints exist; nothing below this file should need to change.

// export type VisitorStatus = "SCHEDULED" | "CHECKED_IN" | "OVERDUE" | "CANCELLED" | "NO_SHOW";

// export interface ApiVisitor {
//   visit_id: string;
//   guest_name: string;
//   guest_initials?: string | null;
//   guest_phone?: string | null;
//   guest_email?: string | null;
//   host_name: string;
//   host_email?: string | null;
//   host_phone?: string;
//   purpose: string;
//   visit_date: string; // ISO date e.g. "2026-06-16"
//   start_time: string; // "10:00"
//   end_time: string;   // "12:00"
//   site_id: string;
//   site_name: string;
//   building_name?: string | null;
//   floor_name?: string | null;
//   seat_code?: string | null;
//   seat_booked: boolean;
//   status: VisitorStatus;
//   checked_in_at?: string | null;
//   checked_out_at?: string | null;
// }

// export interface ApiSecurityDashboardSummary {
//   expected_today: number;
//   checked_in: number;
//   overdue_checkout: number;
//   cancelled_no_show: number;
// }

// export interface ApiSite {
//   site_id: string;
//   site_name: string;
// }

// // ─── Paginated response ───────────────────────────────────────────────────────

// export interface VisitorResponse {
//   items: ApiVisitor[];
//   total: number;
//   page: number;
//   limit: number;
//   total_pages: number;
// }

// // ─── Frontend display types ───────────────────────────────────────────────────

// export interface Visitor {
//   id: string;
//   guestName: string;
//   guestInitials: string;
//   hostName: string;
//   hostEmail: string;
//   hostPhone: string;
//   purpose: string;
//   visitDate: string;
//   startTime: string;
//   endTime: string;
//   visitTimeLabel: string; // "10:00 AM – 12:00 PM"
//   siteId: string;
//   siteName: string;
//   buildingName: string;
//   floorName: string;
//   location: string; // "Head Office, Tower A, 4th Floor"
//   seatCode: string | null;
//   seatBooked: boolean;
//   status: VisitorStatus;
// }

// export interface SecurityDashboardSummary {
//   expectedToday: number;
//   checkedIn: number;
//   overdueCheckout: number;
//   cancelledNoShow: number;
// }

// export interface Site {
//   id: string;
//   name: string;
// }

// // ─── Filters / payloads ─────────────────────────────────────────────────────

// export interface VisitorFilters {
//   date?: string;
//   site_id?: string;
//   search?: string;
//   status?: VisitorStatus | "ALL";
//   page?: number;
//   limit?: number;
// }

// export interface InviteGuestPayload {
//   guest_name: string;
//   guest_email?: string;
//   guest_phone?: string;
//   host_user_id: string;
//   purpose: string;
//   visit_date: string;
//   start_time: string;
//   end_time: string;
//   site_id: string;
// }

// export interface CheckInPayload {
//   visit_id: string;
// }

// export interface CheckOutPayload {
//   visit_id: string;
// }


// ─── Raw API response types (mirrors /guest-bookings backend schema) ─────────

export type VisitorStatus =
  | "SCHEDULED"
  | "CHECKED_IN"
  | "CHECKED_OUT"
  | "OVERDUE"
  | "CANCELLED"
  | "NO_SHOW";

export type BookingStatus = "CONFIRMED" | "CANCELLED" | "MODIFIED";

export type GuestType =
  | "INTERVIEW_CANDIDATE"
  | "CLIENT"
  | "VENDOR"
  | "CONTRACTOR"
  | "OTHER";

/** Shape returned by GET /guest-bookings and GET /guest-bookings/{booking_id} */
export interface ApiGuestBooking {
  booking_id: string;
  tenant_id: string;
  booked_for_user_id: string | null;
  booked_for_guest_id: string | null;
  booked_by_user_id: string | null;
  guest_visit_id: string;
  booking_type: string;
  seat_id: string | null;
  site_id: string;
  building_id: string | null;
  floor_id: string | null;
  seat_code: string | null;
  site_name: string;
  building_name: string | null;
  floor_name: string | null;
  booking_date: string; // "2026-07-07"
  booking_status: BookingStatus;
  source_channel: string | null;
  check_in_at: string | null;
  checked_out_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
  // Guest fields
  guest_name: string;
  guest_email: string | null;
  guest_phone: string | null;
  guest_organization: string | null;
  guest_type: GuestType | null;
  // Visit fields
  purpose_of_visit: string | null;
  visit_status: VisitorStatus;
  host_user_id: string | null;
  host_name: string | null;
  start_time: string | null; // "10:00:00" or null
  end_time: string | null;
  notes: string | null;
  requires_seat: boolean;
}

export interface ApiSecurityDashboardSummary {
  expected_today: number;
  checked_in: number;
  overdue_checkout: number;
  cancelled_no_show: number;
}

export interface ApiSite {
  site_id: string;
  site_name: string;
}

// ─── Paginated response ───────────────────────────────────────────────────────

export interface VisitorResponse {
  items: ApiGuestBooking[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

// ─── Frontend display types ───────────────────────────────────────────────────

export interface Visitor {
  id: string;          // guest_visit_id
  bookingId: string;   // booking_id — used for cancel / modify / view-details
  guestName: string;
  guestInitials: string;
  guestEmail: string;
  guestPhone: string;
  guestOrganization: string;
  guestType: string;
  hostName: string;
  hostEmail: string;
  hostPhone: string;
  purpose: string;
  notes: string;
  visitDate: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  visitTimeLabel: string; // "10:00 AM – 12:00 PM"
  siteId: string;
  siteName: string;
  buildingName: string;
  floorName: string;
  location: string; // "Tower A, 4th Floor"
  seatCode: string | null;
  seatBooked: boolean;
  status: VisitorStatus;
  bookingStatus: BookingStatus;
  checkedInAt: string | null;
  checkedOutAt: string | null;
}

export interface SecurityDashboardSummary {
  expectedToday: number;
  checkedIn: number;
  overdueCheckout: number;
  cancelledNoShow: number;
}

export interface Site {
  id: string;
  name: string;
}

// ─── Filters / payloads ──────────────────────────────────────────────────────

export interface VisitorFilters {
  date?: string;
  site_id?: string;
  search?: string;
  status?: VisitorStatus | "ALL";
  page?: number;
  limit?: number;
}

export interface InviteGuestPayload {
  guest_name: string;
  guest_email?: string;
  guest_phone?: string;
  host_user_id: string;
  purpose: string;
  visit_date: string;
  start_time: string;
  end_time: string;
  site_id: string;
}

export interface CheckInPayload {
  visit_id: string;
}

export interface CheckOutPayload {
  visit_id: string;
}

export interface CancelBookingPayload {
  cancellation_reason: string;
}

export interface ModifyBookingPayload {
  site_id?: number;
  building_id?: number;
  floor_id?: number;
  seat_id?: number;
  booking_date?: string;
}