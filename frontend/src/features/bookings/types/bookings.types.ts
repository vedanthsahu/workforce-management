export type BookingStatus = "confirmed" | "cancelled" | "pending";

export type BookingType = "self" | "on_behalf" | "employee" | "guest";

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
  date: string;           // kept for backward compat — always equals fromDate
  fromDate: string;       // ← NEW: booking start date "YYYY-MM-DD"
  toDate: string;         // ← NEW: booking end date  "YYYY-MM-DD" (= fromDate for single-day)
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
  bookingType?: BookingType;
  bookedForName?: string;
  bookedByName?: string;
  bookedForRole?: string;
  bookedByRole?: string;
}

export interface BookingSummary {
  upcomingCount:      number;
  nextBookingDate:    string | null;
  completedThisMonth: number;
  daysInOffice:       number;
  teamInOffice:       number;
}

export interface RawBooking {
  booking_id:           string;
  tenant_id:            string;
  user_id:              string;
  seat_id:              string;
  site_id:              string;
  building_id:          string;
  floor_id:             string;
  seat_code:            string;
  site_name:            string;
  building_name:        string;
  floor_name:           string;
  booking_date:         string;    // single-day bookings: primary date
  from_date?:           string;    // ← NEW: if API returns a range start
  to_date?:             string;    // ← NEW: if API returns a range end
  booking_status:       "CONFIRMED" | "CANCELLED" | "PENDING" | "ACTIVE";
  source_channel:       string;
  check_in_at:          string | null;
  checked_out_at:       string | null;
  cancelled_at:         string | null;
  cancellation_reason:  string | null;
  created_at:           string;
  updated_at:           string;
  // optional enrichment fields
  is_full_day?:         boolean;
  start_time?:          string;
  end_time?:            string;
  is_recurring?:        boolean;
  recurring_pattern?:   string;
  tags?:                string[];
  amenity_keys?:        string[];  // ← NEW: preference keys if API returns them
  amenities?:           { key: string; name: string }[]; // ← NEW: alternate shape
}