import type { ApiTeamGroup, ApiTeamMember } from "@/features/dashboard/types/dashboard.types";

export type { ApiTeamGroup, ApiTeamMember };

// Matches BookingResponse (BaseModel — snake_case fields) inside UserBookingHistoryResponse
export interface RawTeammateBooking {
  booking_id: string | null;
  booking_date: string | null;
  booking_status: string | null;
  seat_id: string | null;
  seat_code: string | null;
  floor_id: string | null;
  floor_name: string | null;
  building_id: string | null;
  building_name: string | null;
  site_name: string | null;
  check_in_at: string | null;
  checked_out_at: string | null;
  // Optional enriched fields
  source_channel?: string | null;
  desk_type?: string | null;
  amenities?: string[] | null;
}

// Matches UserBookingHistoryResponse (CamelModel — camelCase wrapper fields)
export interface UserBookingHistoryApiResponse {
  hasTodayBooking: boolean;
  todayBooking: RawTeammateBooking | null;
  bookings: { items: RawTeammateBooking[] };
}

// Frontend display shape for a resolved teammate
export interface TeammateResult {
  userId: string;
  name: string;
  email: string;
  teamName: string;
  inOfficeToday: boolean;
  seatCode: string | null;
  booking: RawTeammateBooking | null;
}

export type SearchPhase =
  | { status: "idle" }
  | { status: "searching" }
  | { status: "done"; result: TeammateResult; searchedAt: Date }
  | { status: "not_found"; query: string }
  | { status: "error"; message: string };
