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

// export interface Floor {
//   id: string;
//   buildingId: string;
//   name: string;
//   number: number;
// }

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

// ── Raw API shape from GET /floors/{floor_id}/seats ──────────────────────────

export interface SeatAvailability {
  /** Seat identifier */
  seat_id: string | number;

  /** Human-readable seat code, e.g. "T3-13-001" */
  code: string;

  /** SVG/canvas position (kept for future dynamic layouts) */
  x?: number | null;
  y?: number | null;
  w?: number | null;
  h?: number | null;
  rotation_angle?: number;

  /** "AVAILABLE" | "BOOKED" | "BLOCKED" | "YOURS" */
  status: string;

  /** Whether the seat can be booked right now (replaces is_bookable) */
  selectable: boolean;

  /** IDs of amenities that matched the request */
  matched_amenity_ids?: number[];
  /** How many amenities matched */
  matched_amenity_count?: number;
  /** How many amenities were requested */
  requested_amenity_count?: number;
  /** Backend-computed match bucket */
  preference_match_status?: PreferenceMatchStatus;
  /** Backend-computed rendering hint */
  ui_state?: UiState;

  // Optional — may not be returned by this endpoint
  seat_type?: string;
  seat_neighborhood?: string;
  matched_amenity_names?: string[];
}

// ── Parameters for fetchSeatsWithAvailability ─────────────────────────────────

export interface FetchSeatsParams {
  floorId: string;
  fromDate: string;
  toDate: string;
  preferences?: string[];
  /** Numeric amenity IDs sent as repeated query params */
  amenityIds?: number[];
   currentSeatId?: string;  
}

// ── Booking payload / response ────────────────────────────────────────────────

export interface CreateBookingPayload {
  site_id: number;
  building_id: number;
  floor_id: number;
  seat_id: number;
  booking_date: string;
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