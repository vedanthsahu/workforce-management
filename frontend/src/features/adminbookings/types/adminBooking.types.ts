export type BookingStatus = "Confirmed" | "Checked In" | "Cancelled" | "Completed";
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
  date_label: string;
  date_relative: string;
  time_range: string;
  status: BookingStatus;
  booked_by: BookedByType;
  booked_on: string;
  check_in_time?: string;
  amenities: AdminBookingAmenity[];
  notes?: string;
}

export interface AdminBookingFilters {
  search: string;
  site: string;
  building: string;
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
