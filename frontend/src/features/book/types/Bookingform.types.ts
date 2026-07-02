export interface Preference {
  id: string;
  key: string;
  name: string;
  category?: string | null;
  description?: string | null;
  icon?: string | null;
}

// ── Sites / Buildings / Floors ────────────────────────────────────────────────

export interface Site {
  id: string;
  name: string;
  city: string;
  country: string;
  timezone: string;
}

export interface Building {
  id: string;
  siteId: string;
  name: string;
}

export interface Floor {
  id: string;
  buildingId: string;
  name: string;
  number: number;
  layoutFileUrl?: string;
}

// ── Booking form state ────────────────────────────────────────────────────────

export interface BookingFormState {
  siteId: string;
  buildingId: string;
  floorId: string;
  fromDate: string;
  toDate: string;
  preferences: string[];
  selectedSeatId: string | null;
}

// ── Preference match status (from backend) ────────────────────────────────────

export type PreferenceMatchStatus =
  | "FULL_MATCH"
  | "PARTIAL_MATCH"
  | "NO_MATCH"
  | "NOT_APPLICABLE";

export type UiState = "BEST_MATCH" | "AVAILABLE" | "UNAVAILABLE";

// ── Seat ──────────────────────────────────────────────────────────────────────

export type SeatStatus = "available" | "booked" | "unavailable" | "yours";

export interface Seat {
  id: string;
  svgId: string;
  label: string;
  row?: number;
  col?: number;
  status: SeatStatus;

  /** true when backend returns FULL_MATCH or PARTIAL_MATCH */
  matchesPreferences: boolean;

  /** Amenity tags for display in tooltip */
  amenities: string[];

  // ── Preference-match fields ───────────────────────────────────────────────
  /** Amenity names that matched the user's request (display only) */
  matchedAmenityNames?: string[];
  /** How many amenities matched */
  matchedAmenityCount?: number;
  /** How many amenities the user requested */
  requestedAmenityCount?: number;
  /** Backend-provided match status */
  preferenceMatchStatus?: PreferenceMatchStatus;
  /** Backend-provided UI state */
  uiState?: UiState;
}

// ── Parameters for fetchSeatsWithAvailability ─────────────────────────────────

export interface FetchSeatsParams {
  floorId: string;
  fromDate: string;
  toDate: string;
  preferences?: string[];
  /** Numeric amenity IDs sent as repeated query params */
  amenityIds?: number[];
  /** Seat currently held by the booking being modified — shown as "yours" even if otherwise unavailable */
  currentSeatId?: string;
  /** Booking being modified, if any — passed through to the availability API */
  modifyBookingId?: string | null;
  /** When booking for an employee */
  bookedForUserId?: string | null;
  /** When booking for a guest */
  isGuestBooking?: boolean;
  bookedForGuestId?: string | null;
}

// ── Booking payload / response ────────────────────────────────────────────────

export interface CreateBookingPayload {
  site_id: number;
  building_id: number;
  floor_id: number;
  seat_id: number;
  booking_date: string;
  booked_for_user_id?: number;
}

export interface CreateGuestBookingPayload {
  site_id: number;
  building_id: number;
  floor_id: number;
  seat_id: number;
  visit_date: string;
  guest_id: number;
  host_user_id: number;
  guest_type: string;
  purpose_of_visit?: string;
  start_time?: string;
  end_time?: string;
  notes?: string;
}

export interface CreateBookingResponse {
  booking_id: string;
  tenant_id: string;
  user_id: string;
  seat_id: string;
  site_id: string | null;
  building_id: string | null;
  floor_id: string | null;
  seat_code: string | null;
  site_name: string | null;
  building_name: string | null;
  floor_name: string | null;
  booking_date: string;
  booking_status: string;
  source_channel: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  created_at: string | null;
}

export type BookingStep = 1 | 2 | 3;

// ── Floor map visual configuration ────────────────────────────────────────────

export interface SeatPalette {
  body: string;
  bodyStroke: string;
  armrest: string;
  back: string;
  backStroke: string;
  curve: string;
  arc: string;
  opacity: string;
}

export interface DayStatusConfig {
  bg: string;
  text: string;
  dot: string;
  label: string;
}

export interface TooltipStatusConfig {
  label: string;
  color: string;
  bg: string;
}

export interface PreferenceMatchConfig extends TooltipStatusConfig {
  icon: string;
}