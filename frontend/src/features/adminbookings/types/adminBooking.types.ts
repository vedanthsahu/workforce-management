export type BookingStatus =
  | "Scheduled"
  | "Confirmed"
  | "Checked In"
  | "Checked Out"
  | "Completed"
  | "Cancelled"
  | "Modified"
  | "No Show";

export type BookedByType = "Self" | "Admin";
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
  /** Not available from GET /admin/activities; always empty until a real source exists. */
  amenities: AdminBookingAmenity[];
  /** Not available from GET /admin/activities. */
  notes?: string;
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
  bookedBy: string;
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
  return {
    search: "",
    site: "All",
    building: "All",
    floor: "All",
    bookingType: "All",
    status: "All",
    seatNumber: "",
    bookedBy: "All",
    dateFrom: "",
    dateTo: "",
  };
}

// ─── Raw GET /admin/activities response shape ──────────────────────────────

export type AdminActivityType = "EMPLOYEE_BOOKING" | "GUEST_VISIT" | "GUEST_BOOKING";

export type AdminActivityStatus =
  | "CONFIRMED"
  | "CHECKED_IN"
  | "CHECKED_OUT"
  | "COMPLETED"
  | "CANCELLED"
  | "MODIFIED"
  | "NO_SHOW"
  | "SCHEDULED";

export interface AdminActivityPerson {
  entityType: "EMPLOYEE" | "GUEST";
  id: string;
  name: string;
  email: string;
  role?: string;
  department?: string;
  jobTitle?: string;
  guestType?: string;
}

export interface AdminActivitySeat {
  seatId: string;
  seatCode: string;
  seatType: string;
  seatNeighborhood?: string;
}

export interface AdminActivitySite {
  siteId: string;
  siteCode: string;
  siteName: string;
}

export interface AdminActivityBuilding {
  buildingId: string;
  buildingCode: string;
  buildingName: string;
}

export interface AdminActivityFloor {
  floorId: string;
  floorCode: string;
  floorName: string;
}

export interface AdminActivityItem {
  activityId: string;
  activityType: AdminActivityType;
  hasBooking: boolean;
  activityStatus: AdminActivityStatus;
  activityDate: string;
  bookingId?: string;
  guestVisitId?: string;
  bookedBy: AdminActivityPerson;
  bookedFor: AdminActivityPerson;
  seat?: AdminActivitySeat;
  site: AdminActivitySite;
  building: AdminActivityBuilding;
  floor?: AdminActivityFloor;
  checkInAt?: string;
  checkedOutAt?: string;
  createdAt?: string;
}

export interface AdminActivityListResponse {
  items: AdminActivityItem[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages?: number;
  } | null;
}
