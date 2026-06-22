// ─── Enums / literal unions ───────────────────────────────────────────────────

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

export type PurposeOfVisit =
  | "INTERVIEW"
  | "MEETING"
  | "VENDOR_VISIT"
  | "CLIENT_VISIT"
  | "OTHER";

export type VisitScope = "CURRENT" | "UPCOMING" | "PAST" | "ALL";

// ─── API shapes — mirror the FastAPI response exactly (snake_case) ──────────

/** A single item from GET /guest-visits */
export interface ApiGuestVisit {
  guest_visit_id: string;
  visit_date: string;
  start_time: string | null;
  end_time: string | null;
  visit_status: VisitorStatus;
  guest_type: GuestType | null;
  purpose_of_visit: PurposeOfVisit | string | null;
  requires_seat: boolean;
  checked_in_at: string | null;
  checked_out_at: string | null;

  guest_id: string;
  guest_name: string;
  guest_email: string | null;
  guest_phone: string | null;

  host_user_id: string | null;
  host_name: string | null;
  host_email: string | null;
  host_phone: string | null;
  host_department: string | null;
  host_job_title: string | null;

  site_id: string;
  site_name: string;
  building_id: string | null;
  building_name: string | null;
  floor_id: string | null;
  floor_name: string | null;

  booking_id: string | null;
  booking_status: BookingStatus | null;
  seat_id: string | null;
  seat_code: string | null;

  notes: string | null;
}

/** The `summary` block returned alongside `items` by GET /guest-visits */
export interface ApiGuestVisitsSummary {
  total: number;
  scheduled: number;
  checked_in: number;
  checked_out: number;
  cancelled: number;
  modified: number;
  overdue: number;
}

/** Full shape returned by GET /guest-visits */
export interface ApiGuestVisitsResponse {
  summary: ApiGuestVisitsSummary;
  items: ApiGuestVisit[];
}

/** Shape returned by POST /guest-visits/{id}/check-in and /check-out */
export interface ApiCheckInOutResponse {
  guest_visit_id: string;
  visit_status: VisitorStatus;
  checked_in_at: string | null;
  checked_out_at: string | null;
}

export interface ApiSite {
  site_id: string;
  site_name: string;
}

// ─── Query params for GET /guest-visits ──────────────────────────────────────

export interface GuestVisitsQueryParams {
  visit_scope?: VisitScope;
  site_id?: string;
  visit_status?: VisitorStatus | "ALL";
  requires_seat?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

// ─── Frontend display types (camelCase) ──────────────────────────────────────

export interface Visitor {
  id: string; // = guestVisitId, used as the row/list key everywhere in the UI
  guestVisitId: string;
  guestId: string;
  bookingId: string | null;
  bookingStatus: BookingStatus | null;

  guestName: string;
  guestInitials: string;
  guestEmail: string;
  guestPhone: string;
  guestType: GuestType | null;

  hostUserId: string | null;
  hostName: string;
  hostEmail: string;
  hostPhone: string;
  hostDepartment: string;
  hostJobTitle: string;

  purpose: PurposeOfVisit | string | null;
  notes: string;

  visitDate: string;
  startTime: string; // "HH:MM", ready for <input type="time">
  endTime: string;
  visitTimeLabel: string;

  siteId: string;
  siteName: string;
  buildingId: string | null;
  buildingName: string;
  floorId: string | null;
  floorName: string;
  location: string;

  seatId: string | null;
  seatCode: string | null;
  seatBooked: boolean; // = requires_seat

  status: VisitorStatus;
  checkedInAt: string | null;
  checkedOutAt: string | null;
}

export interface SecurityDashboardSummary {
  total: number;
  scheduled: number;
  checkedIn: number;
  checkedOut: number;
  cancelled: number;
  modified: number;
  overdue: number;
}

export interface Site {
  id: string;
  name: string;
}

// ─── Mutation payloads ───────────────────────────────────────────────────────

export interface CancelVisitPayload {
  cancellation_reason: string;
}

export interface ModifyVisitPayload {
  host_user_id?: number;
  site_id?: number;
  building_id?: number;
  floor_id?: number;
  visit_date?: string;
  guest_type?: GuestType;
  purpose_of_visit?: PurposeOfVisit;
  start_time?: string;
  end_time?: string;
  notes?: string;
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