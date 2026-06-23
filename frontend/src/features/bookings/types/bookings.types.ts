export type BookingStatus = "confirmed" | "cancelled" | "pending";

export type BookingType = "self" | "on_behalf" | "employee" | "guest" | "visit";

export type BookingTab = "upcoming" | "past" | "recurring" | "cancelled";

export interface BookingTag {
  label: string;
  variant: "confirmed" | "manager" | "zone" | "sprint" | "recurring";
}

export interface Booking {
  id: string;
  location: string;
  building: string;
  floor: string;
  seat: string;
  date: string;
  fromDate: string;
  toDate: string;
  startTime: string;
  endTime: string;
  isFullDay: boolean;
  status: BookingStatus;
  bookedOn: string;
  tags: BookingTag[];
  isRecurring?: boolean;
  recurringPattern?: string;
  preferences?: string[];
  floorId?: string;
  seatId?: string;
  bookingType: BookingType;
  bookedForName?: string;
  bookedByName?: string;
  bookedForRole?: string;
  bookedByRole?: string;
  bookedByUserId?: string;
  bookedForUserId?: string;
  bookedForGuestId?: string;
  guestName?: string;
  guestEmail?: string;
  hostName?: string;
  activitySource?: "BOOKING" | "GUEST_VISIT";
  createdAt?: string;
}

export interface BookingSummary {
  upcomingCount:      number;
  nextBookingDate:    string | null;
  completedThisMonth: number;
  daysInOffice:       number;
  teamInOffice:       number;
}

export interface RawBooking {
  booking_id:           string | null;
  activity_source?:     "BOOKING" | "GUEST_VISIT" | string;
  tenant_id:            string;
  user_id:              string;
  seat_id:              string | null;
  site_id:              string;
  building_id:          string;
  floor_id:             string;
  seat_code:            string;
  site_name:            string;
  building_name:        string;
  floor_name:           string;
  booking_date:         string;
  from_date?:           string;
  to_date?:             string;
  booking_status:       "CONFIRMED" | "CANCELLED" | "PENDING" | "ACTIVE";
  booking_type?:        "EMPLOYEE" | "GUEST";
  source_channel:       string;
  check_in_at:          string | null;
  checked_out_at:       string | null;
  cancelled_at:         string | null;
  cancellation_reason:  string | null;
  created_at:           string;
  updated_at:           string;
  is_full_day?:         boolean;
  start_time?:          string;
  end_time?:            string;
  is_recurring?:        boolean;
  recurring_pattern?:   string;
  tags?:                string[];
  amenity_keys?:        string[];
  amenities?:           { key: string; name: string }[];

  // Delegation / on-behalf fields
  booked_for_user_id?:  string | null;
  booked_for_guest_id?: string | null;
  booked_by_user_id?:   string;
  booked_by_name?:      string | null;
  booked_by_email?:     string | null;
  booked_for_name?:     string | null;
  booked_for_email?:    string | null;

  guest_visit_id?:      string | null;

  // Guest enrichment
  guest_name?:          string | null;
  guest_email?:         string | null;
  guest_phone?:         string | null;
  guest_organization?:  string | null;
  guest_type?:          string | null;
  purpose_of_visit?:    string | null;
  host_user_id?:        string | null;
  host_name?:           string | null;
}
