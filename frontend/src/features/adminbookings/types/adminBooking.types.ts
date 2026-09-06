export type BookingStatus =
  | "Scheduled"
  | "Confirmed"
  | "Checked In"
  | "Checked Out"
  | "Completed"
  | "Cancelled"
  | "Modified"
  | "No Show";

/** "Self" when the booker booked for themself, otherwise the actual booker's name. */
export type BookedByType = string;
export type GuestOrEmployee = "Employee" | "Guest";

export interface AdminBookingAmenity {
  id: string;
  label: string;
}

export interface AdminBooking {
  booking_id: string;
  person_name: string;
  person_type: GuestOrEmployee;
  person_email: string;
  avatar_url?: string;
  seat_code: string;
  seat_type: string;
  site_name: string;
  building_name: string;
  floor_name: string;
  /** ISO yyyy-mm-dd, used for date-range filtering. */
  activity_date: string;
  date_label: string;
  date_relative: string;
  /** Not available from GET /admin/activities; blank until a real source exists. */
  time_range: string;
  status: BookingStatus;
  booked_by: BookedByType;
  booked_on: string;
  check_in_time?: string;
  /** Set only when this row is Cancelled/Modified by someone other than its own owner. */
  cancelled_by?: string;
  /** Not available from GET /admin/activities; always empty until a real source exists. */
  amenities: AdminBookingAmenity[];
  /** Not available from GET /admin/activities. */
  notes?: string;

  // IDs needed to modify/cancel the booking (same POST /bookings/{id}/modify
  // and /cancel routes the employee "My Bookings" and facilitator "Book for
  // Someone" flows already use) — not shown in the UI, only forwarded.
  site_id: string | null;
  building_id: string | null;
  floor_id: string | null;
  seat_id: string | null;
  booked_for_user_id: string | null;
  booked_for_guest_id: string | null;

  // Present only when this guest booking is linked to a guest-visit invite
  // (LEFT JOIN guest_visits — a plain guest seat booking has none). When set,
  // the booking has both a "visit" and a "seat" side that can be modified or
  // cancelled independently via POST /guest-visits/{id}/workflow.
  guest_visit_id: string | null;
  host_user_id: string | null;
  host_name: string | null;
  guest_type: string | null;
  purpose_of_visit: string | null;
  start_time: string | null;
  end_time: string | null;
}

export interface AdminBookingFilters {
  search: string;
  /** "All" or a real site_id (resolved via the Office dropdown). */
  site: string;
  /** "All" or a real building_id. */
  building: string;
  /** "All" or a real floor_id. */
  floor: string;
  bookingType: string;
  status: string;
  seatNumber: string;
  /** ISO yyyy-mm-dd, "" means unset */
  dateFrom: string;
  /** ISO yyyy-mm-dd, "" means unset */
  dateTo: string;
}

export interface AdminBookingSiteOption {
  site_id: string;
  site_name: string;
}

export interface AdminBookingBuildingOption {
  building_id: string;
  site_id: string;
  building_name: string;
}

export interface AdminBookingFloorOption {
  floor_id: string;
  building_id: string;
  floor_name: string;
}

export function defaultAdminBookingFilters(): AdminBookingFilters {
  // Date Range defaults to today so the page loads showing today's bookings
  // without the admin needing to pick a date and click Search first.
  const todayIso = new Date().toISOString().slice(0, 10);
  return {
    search: "",
    site: "",
    building: "",
    floor: "",
    bookingType: "Employee",
    status: "All",
    seatNumber: "",
    dateFrom: todayIso,
    dateTo: todayIso,
  };
}

// ─── Raw GET /admin/bookings response shape ────────────────────────────────

/** Query-param-level values accepted by GET /admin/bookings's bookingStatus filter. */
export type AdminBookingApiStatus =
  | "CONFIRMED"
  | "CANCELLED"
  | "MODIFIED"
  | "COMPLETED"
  | "NO_SHOW";

export type AdminBookingApiType = "EMPLOYEE" | "GUEST";

/** One row of the backend's BookingResponse DTO — already snake_case, no mapping needed. */
export interface AdminBookingRaw {
  activity_source: string | null;
  booking_id: string | null;
  tenant_id: string | null;

  booked_for_user_id: string | null;
  booked_for_guest_id: string | null;
  booked_by_user_id: string | null;

  booked_by_name: string | null;
  booked_by_email: string | null;

  booked_for_name: string | null;
  booked_for_email: string | null;
  booked_for_phone: string | null;
  booked_for_organization: string | null;

  guest_visit_id: string | null;
  booking_type: AdminBookingApiType;

  seat_id: string | null;
  site_id: string | null;
  building_id: string | null;
  floor_id: string | null;

  seat_code: string | null;
  site_name: string | null;
  building_name: string | null;
  floor_name: string | null;

  booking_date: string | null;
  booking_status: AdminBookingApiStatus | null;
  source_channel: string | null;

  check_in_at: string | null;
  checked_out_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  updated_user_id?: string | null;
  updated_by_name?: string | null;
  updated_by_email?: string | null;

  // Server-derived (modified_from_booking_id is not null) — the authoritative
  // signal for whether this row is a modification, independent of whatever
  // literal string booking_status happens to carry.
  modified_from_booking_id?: string | null;
  modification_reason?: string | null;
  is_modified?: boolean;

  created_at: string | null;
  updated_at: string | null;

  guest_name: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  guest_organization: string | null;

  guest_type: string | null;
  purpose_of_visit: string | null;
  visit_status: string | null;

  host_user_id: string | null;
  host_name: string | null;
  host_email: string | null;

  start_time: string | null;
  end_time: string | null;
  notes: string | null;
  requires_seat: boolean | null;

  amenities: unknown[];
}

/** Aggregate counts over the filtered (not paginated) dataset, computed server-side. */
export interface AdminBookingSummary {
  total_bookings: number;
  confirmed_bookings: number;
  cancelled_bookings: number;
  modified_bookings: number;
  completed_bookings: number;
  no_show_bookings: number;
  employee_bookings: number;
  guest_bookings: number;
  checked_in_bookings: number;
  checked_out_bookings: number;
}

export interface AdminBookingPagination {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface AdminBookingListResponse {
  items: AdminBookingRaw[];
  summary: AdminBookingSummary;
  pagination: AdminBookingPagination;
}
