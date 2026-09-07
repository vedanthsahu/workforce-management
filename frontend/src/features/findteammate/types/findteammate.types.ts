import type { ApiTeamGroup, ApiTeamMember } from "@/features/dashboard/types/dashboard.types";

export type { ApiTeamGroup, ApiTeamMember };

// Matches UserSearchResponse from GET /teams/members/search
export interface TeammateSearchResult {
  user_id: string;
  tenant_id: string;
  full_name: string;
  email: string;
  role_name?: string | null;
  status?: string | null;
  employee_id?: string | null;
  department?: string | null;
}

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
  start_time: string | null;
  end_time: string | null;
  // Optional enriched fields
  source_channel?: string | null;
  desk_type?: string | null;
  amenities?: string[] | null;
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
