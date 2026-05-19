// // // // export interface Site {
// // // //   id: string;
// // // //   name: string;
// // // //   city: string;
// // // //   country: string;
// // // //   timezone: string;
// // // // }

// // // // export interface Building {
// // // //   id: string;
// // // //   siteId: string;
// // // //   name: string;
// // // // }

// // // // export interface Floor {
// // // //   id: string;
// // // //   buildingId: string;
// // // //   name: string;
// // // //   number: number;
// // // // }

// // // // // ── Preferences (fetched from API) ────────────────────────────────────────────

// // // // export interface Preference {
// // // //   id: string;
// // // //   key: string;
// // // //   name: string;
// // // //   category?: string | null;
// // // //   description?: string | null;
// // // //   icon?: string | null;
// // // // }

// // // // // ── Booking form state ────────────────────────────────────────────────────────

// // // // export interface BookingFormState {
// // // //   // Step 1
// // // //   siteId: string;
// // // //   buildingId: string;
// // // //   floorId: string;
// // // //   fromDate: string;
// // // //   toDate: string;
// // // //   preferences: string[];       // ← was PreferenceKey[]

// // // //   // Step 2
// // // //   selectedSeatId: string | null;
// // // // }

// // // // // ── Seat (for floor map step) ─────────────────────────────────────────────────

// // // // export type SeatStatus = "available" | "booked" | "unavailable" | "yours";

// // // // // export interface Seat {
// // // // //   id: string;
// // // // //   label: string;
// // // // //   row: number;
// // // // //   col: number;
// // // // //   status: SeatStatus;
// // // // //   matchesPreferences: boolean;
// // // // //   amenities: string[];         // ← was PreferenceKey[]
// // // // // }
// // // // export interface Seat {
// // // //   id:                 string;
// // // //   svgId:              string;   // ← add this if missing
// // // //   label:              string;
// // // //   row?:               number;
// // // //   col?:               number;
// // // //   status:             "available" | "booked" | "unavailable" | "yours";
// // // //   matchesPreferences: boolean;
// // // //   amenities:          string[];
// // // // }

// // // // // ── Booking confirmation payload ──────────────────────────────────────────────

// // // // // export interface CreateBookingPayload {
// // // // //   siteId: string;
// // // // //   buildingId: string;
// // // // //   floorId: string;
// // // // //   seatId: string;
// // // // //   fromDate: string;
// // // // //   toDate: string;
// // // // //   preferences: string[];       // ← was PreferenceKey[]
// // // // // }

// // // // // export interface CreateBookingResponse {
// // // // //   bookingId: string;
// // // // //   confirmationCode: string;
// // // // //   seat: string;
// // // // //   location: string;
// // // // //   floor: string;
// // // // //   fromDate: string;
// // // // //   toDate: string;
// // // // // }

// // // // export interface CreateBookingPayload {
// // // //   site_id: number;
// // // //   building_id: number;
// // // //   floor_id: number;
// // // //   seat_id: number;
// // // //   booking_date: string; // "YYYY-MM-DD"
// // // // }

// // // // export interface CreateBookingResponse {
// // // //   booking_id: string;
// // // //   tenant_id: string;
// // // //   user_id: string;
// // // //   seat_id: string;
// // // //   site_id: string | null;
// // // //   building_id: string | null;
// // // //   floor_id: string | null;
// // // //   seat_code: string | null;
// // // //   site_name: string | null;
// // // //   building_name: string | null;
// // // //   floor_name: string | null;
// // // //   booking_date: string;
// // // //   booking_status: string;
// // // //   source_channel: string | null;
// // // //   cancelled_at: string | null;
// // // //   cancellation_reason: string | null;
// // // //   created_at: string | null;
// // // // }

// // // // // ── Step enum ─────────────────────────────────────────────────────────────────

// // // // export type BookingStep = 1 | 2 | 3;

// // // // ── Preferences (fetched from API) ────────────────────────────────────────────

// // // export interface Preference {
// // //   id: string;
// // //   key: string;
// // //   name: string;
// // //   category?: string | null;
// // //   description?: string | null;
// // //   icon?: string | null;
// // // }

// // // // ── Sites / Buildings / Floors ────────────────────────────────────────────────

// // // export interface Site {
// // //   id: string;
// // //   name: string;
// // //   city: string;
// // //   country: string;
// // //   timezone: string;
// // // }

// // // export interface Building {
// // //   id: string;
// // //   siteId: string;
// // //   name: string;
// // // }

// // // export interface Floor {
// // //   id: string;
// // //   buildingId: string;
// // //   name: string;
// // //   number: number;
// // // }

// // // // ── Booking form state ────────────────────────────────────────────────────────

// // // export interface BookingFormState {
// // //   siteId: string;
// // //   buildingId: string;
// // //   floorId: string;
// // //   fromDate: string;
// // //   toDate: string;
// // //   preferences: string[];
// // //   selectedSeatId: string | null;
// // // }

// // // // ── Preference match status (from backend) ────────────────────────────────────

// // // export type PreferenceMatchStatus = "FULL_MATCH" | "PARTIAL_MATCH" | "NO_MATCH";

// // // export type UiState = "BEST_MATCH" | "AVAILABLE" | "UNAVAILABLE";

// // // // ── Seat ──────────────────────────────────────────────────────────────────────

// // // export type SeatStatus = "available" | "booked" | "unavailable" | "yours";

// // // export interface Seat {
// // //   id: string;
// // //   svgId: string;
// // //   label: string;
// // //   row?: number;
// // //   col?: number;
// // //   status: SeatStatus;

// // //   /** true when backend returns FULL_MATCH or PARTIAL_MATCH */
// // //   matchesPreferences: boolean;

// // //   amenities: string[];

// // //   // ── New preference-match fields ───────────────────────────────────────────
// // //   /** Amenity names that matched the user's request */
// // //   matchedAmenityNames?: string[];
// // //   /** How many amenities matched */
// // //   matchedAmenityCount?: number;
// // //   /** How many amenities the user requested */
// // //   requestedAmenityCount?: number;
// // //   /** Backend-provided match status */
// // //   preferenceMatchStatus?: PreferenceMatchStatus;
// // //   /** Backend-provided UI state */
// // //   uiState?: UiState;
// // // }

// // // // ── Booking payload / response ────────────────────────────────────────────────

// // // export interface CreateBookingPayload {
// // //   site_id: number;
// // //   building_id: number;
// // //   floor_id: number;
// // //   seat_id: number;
// // //   booking_date: string;
// // // }

// // // export interface CreateBookingResponse {
// // //   booking_id: string;
// // //   tenant_id: string;
// // //   user_id: string;
// // //   seat_id: string;
// // //   site_id: string | null;
// // //   building_id: string | null;
// // //   floor_id: string | null;
// // //   seat_code: string | null;
// // //   site_name: string | null;
// // //   building_name: string | null;
// // //   floor_name: string | null;
// // //   booking_date: string;
// // //   booking_status: string;
// // //   source_channel: string | null;
// // //   cancelled_at: string | null;
// // //   cancellation_reason: string | null;
// // //   created_at: string | null;
// // // }

// // // export type BookingStep = 1 | 2 | 3;


// // export interface Preference {
// //   id: string;
// //   key: string;
// //   name: string;
// //   category?: string | null;
// //   description?: string | null;
// //   icon?: string | null;
// // }

// // // ── Sites / Buildings / Floors ────────────────────────────────────────────────

// // export interface Site {
// //   id: string;
// //   name: string;
// //   city: string;
// //   country: string;
// //   timezone: string;
// // }

// // export interface Building {
// //   id: string;
// //   siteId: string;
// //   name: string;
// // }

// // export interface Floor {
// //   id: string;
// //   buildingId: string;
// //   name: string;
// //   number: number;
// // }

// // // ── Booking form state ────────────────────────────────────────────────────────

// // export interface BookingFormState {
// //   siteId: string;
// //   buildingId: string;
// //   floorId: string;
// //   fromDate: string;
// //   toDate: string;
// //   preferences: string[];
// //   selectedSeatId: string | null;
// // }

// // // ── Preference match status (from backend) ────────────────────────────────────

// // export type PreferenceMatchStatus =
// //   | "FULL_MATCH"
// //   | "PARTIAL_MATCH"
// //   | "NO_MATCH"
// //   | "NOT_APPLICABLE";

// // export type UiState = "BEST_MATCH" | "AVAILABLE" | "UNAVAILABLE";

// // // ── Seat ──────────────────────────────────────────────────────────────────────

// // export type SeatStatus = "available" | "booked" | "unavailable" | "yours";

// // export interface Seat {
// //   id: string;
// //   svgId: string;
// //   label: string;
// //   row?: number;
// //   col?: number;
// //   status: SeatStatus;

// //   /** true when backend returns FULL_MATCH or PARTIAL_MATCH */
// //   matchesPreferences: boolean;

// //   /** Amenity tags for display in tooltip */
// //   amenities: string[];

// //   // ── Preference-match fields ───────────────────────────────────────────────
// //   /** Amenity names that matched the user's request (display only) */
// //   matchedAmenityNames?: string[];
// //   /** How many amenities matched */
// //   matchedAmenityCount?: number;
// //   /** How many amenities the user requested */
// //   requestedAmenityCount?: number;
// //   /** Backend-provided match status */
// //   preferenceMatchStatus?: PreferenceMatchStatus;
// //   /** Backend-provided UI state */
// //   uiState?: UiState;
// // }

// // // ── Raw API shape from GET /floors/:id/seats ──────────────────────────────────

// // export interface SeatAvailability {
// //   /** Primary key from DB */
// //   id: string | number;
// //   /** Human-readable seat code, e.g. "T3-8-001" */
// //   code: string;

// //   /** SVG/canvas position (kept for future dynamic layouts) */
// //   x?: number;
// //   y?: number;
// //   w?: number;
// //   h?: number;
// //   rotation_angle?: number;

// //   /** "AVAILABLE" | "BOOKED" | "BLOCKED" | "UNAVAILABLE" */
// //   status: string;
// //   /** Whether the seat can be booked right now */
// //   selectable: boolean;

// //   /** IDs of amenities that matched the request */
// //   matched_amenity_ids?: number[];
// //   /** How many amenities matched */
// //   matched_amenity_count?: number;
// //   /** How many amenities were requested */
// //   requested_amenity_count?: number;
// //   /** Backend-computed match bucket */
// //   preference_match_status?: PreferenceMatchStatus;
// //   /** Backend-computed rendering hint */
// //   ui_state?: UiState;
// // }

// // // ── Parameters for fetchSeatsWithAvailability ─────────────────────────────────

// // export interface FetchSeatsParams {
// //   floorId: string;
// //   fromDate: string;
// //   toDate: string;
// //   preferences?: string[];
// //   /** Numeric amenity IDs sent as repeated query params */
// //   amenityIds?: number[];
// // }

// // // ── Booking payload / response ────────────────────────────────────────────────

// // export interface CreateBookingPayload {
// //   site_id: number;
// //   building_id: number;
// //   floor_id: number;
// //   seat_id: number;
// //   booking_date: string;
// // }

// // export interface CreateBookingResponse {
// //   booking_id: string;
// //   tenant_id: string;
// //   user_id: string;
// //   seat_id: string;
// //   site_id: string | null;
// //   building_id: string | null;
// //   floor_id: string | null;
// //   seat_code: string | null;
// //   site_name: string | null;
// //   building_name: string | null;
// //   floor_name: string | null;
// //   booking_date: string;
// //   booking_status: string;
// //   source_channel: string | null;
// //   cancelled_at: string | null;
// //   cancellation_reason: string | null;
// //   created_at: string | null;
// // }

// // export type BookingStep = 1 | 2 | 3;

// export interface Preference {
//   id: string;
//   key: string;
//   name: string;
//   category?: string | null;
//   description?: string | null;
//   icon?: string | null;
// }

// // ── Sites / Buildings / Floors ────────────────────────────────────────────────

// export interface Site {
//   id: string;
//   name: string;
//   city: string;
//   country: string;
//   timezone: string;
// }

// export interface Building {
//   id: string;
//   siteId: string;
//   name: string;
// }

// export interface Floor {
//   id: string;
//   buildingId: string;
//   name: string;
//   number: number;
// }

// // ── Booking form state ────────────────────────────────────────────────────────

// export interface BookingFormState {
//   siteId: string;
//   buildingId: string;
//   floorId: string;
//   fromDate: string;
//   toDate: string;
//   preferences: string[];
//   selectedSeatId: string | null;
// }

// // ── Preference match status (from backend) ────────────────────────────────────

// export type PreferenceMatchStatus =
//   | "FULL_MATCH"
//   | "PARTIAL_MATCH"
//   | "NO_MATCH"
//   | "NOT_APPLICABLE";

// export type UiState = "BEST_MATCH" | "AVAILABLE" | "UNAVAILABLE";

// // ── Seat ──────────────────────────────────────────────────────────────────────

// export type SeatStatus = "available" | "booked" | "unavailable" | "yours";

// export interface Seat {
//   id: string;
//   svgId: string;
//   label: string;
//   row?: number;
//   col?: number;
//   status: SeatStatus;

//   /** true when backend returns FULL_MATCH or PARTIAL_MATCH */
//   matchesPreferences: boolean;

//   /** Amenity tags for display in tooltip */
//   amenities: string[];

//   // ── Preference-match fields ───────────────────────────────────────────────
//   /** Amenity names that matched the user's request (display only) */
//   matchedAmenityNames?: string[];
//   /** How many amenities matched */
//   matchedAmenityCount?: number;
//   /** How many amenities the user requested */
//   requestedAmenityCount?: number;
//   /** Backend-provided match status */
//   preferenceMatchStatus?: PreferenceMatchStatus;
//   /** Backend-provided UI state */
//   uiState?: UiState;
// }

// // ── Raw API shape from GET /floors/:id/seats ──────────────────────────────────

// export interface SeatAvailability {
//   /**
//    * Backend returns this field as `seat_id` (not `id`).
//    * Both are declared here so the service can handle either shape safely.
//    */
//   seat_id?: string | number;
//   /** Fallback — some API versions use `id` */
//   id?: string | number;

//   /** Human-readable seat code, e.g. "T3-9-001" */
//   code: string;

//   /** SVG/canvas position (kept for future dynamic layouts) */
//   x?: number;
//   y?: number;
//   w?: number;
//   h?: number;
//   rotation_angle?: number;

//   /** "AVAILABLE" | "BOOKED" | "BLOCKED" | "UNAVAILABLE" */
//   status: string;
//   /** Whether the seat can be booked right now */
//   selectable: boolean;

//   /** IDs of amenities that matched the request */
//   matched_amenity_ids?: number[];
//   /** How many amenities matched */
//   matched_amenity_count?: number;
//   /** How many amenities were requested */
//   requested_amenity_count?: number;
//   /** Backend-computed match bucket */
//   preference_match_status?: PreferenceMatchStatus;
//   /** Backend-computed rendering hint */
//   ui_state?: UiState;
// }

// // ── Parameters for fetchSeatsWithAvailability ─────────────────────────────────

// export interface FetchSeatsParams {
//   floorId: string;
//   fromDate: string;
//   toDate: string;
//   preferences?: string[];
//   /** Numeric amenity IDs sent as repeated query params */
//   amenityIds?: number[];
// }

// // ── Booking payload / response ────────────────────────────────────────────────

// export interface CreateBookingPayload {
//   site_id: number;
//   building_id: number;
//   floor_id: number;
//   seat_id: number;
//   booking_date: string;
// }

// export interface CreateBookingResponse {
//   booking_id: string;
//   tenant_id: string;
//   user_id: string;
//   seat_id: string;
//   site_id: string | null;
//   building_id: string | null;
//   floor_id: string | null;
//   seat_code: string | null;
//   site_name: string | null;
//   building_name: string | null;
//   floor_name: string | null;
//   booking_date: string;
//   booking_status: string;
//   source_channel: string | null;
//   cancelled_at: string | null;
//   cancellation_reason: string | null;
//   created_at: string | null;
// }

// export type BookingStep = 1 | 2 | 3;


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