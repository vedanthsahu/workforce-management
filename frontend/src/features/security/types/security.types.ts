// ─── Raw API response types (mirrors future backend schema) ─────────────────
// NOTE: backend is not ready yet — security.service.ts currently returns
// hardcoded data shaped exactly like this. Swap the function bodies only
// when the real endpoints exist; nothing below this file should need to change.

export type VisitorStatus = "SCHEDULED" | "CHECKED_IN" | "OVERDUE" | "CANCELLED" | "NO_SHOW";

export interface ApiVisitor {
  visit_id: string;
  guest_name: string;
  guest_initials?: string | null;
  guest_phone?: string | null;
  guest_email?: string | null;
  host_name: string;
  host_email?: string | null;
  host_phone?: string;
  purpose: string;
  visit_date: string; // ISO date e.g. "2026-06-16"
  start_time: string; // "10:00"
  end_time: string;   // "12:00"
  site_id: string;
  site_name: string;
  building_name?: string | null;
  floor_name?: string | null;
  seat_code?: string | null;
  seat_booked: boolean;
  status: VisitorStatus;
  checked_in_at?: string | null;
  checked_out_at?: string | null;
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
  items: ApiVisitor[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

// ─── Frontend display types ───────────────────────────────────────────────────

export interface Visitor {
  id: string;
  guestName: string;
  guestInitials: string;
  hostName: string;
  hostEmail: string;
  hostPhone: string;
  purpose: string;
  visitDate: string;
  startTime: string;
  endTime: string;
  visitTimeLabel: string; // "10:00 AM – 12:00 PM"
  siteId: string;
  siteName: string;
  buildingName: string;
  floorName: string;
  location: string; // "Head Office, Tower A, 4th Floor"
  seatCode: string | null;
  seatBooked: boolean;
  status: VisitorStatus;
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

// ─── Filters / payloads ─────────────────────────────────────────────────────

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