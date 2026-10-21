// ─── Seat Types ───────────────────────────────────────────────────────────────

export type SeatType   = "SEAT" | "CABIN" | "CONFERENCE_ROOM";
export type SeatStatus = "ACTIVE" | "INACTIVE";
export type BookableStatus = "Yes" | "No";

export interface Seat {
  seat_id:                string;
  seat_svg_id:            string;
  layout_seat_mapping_id: string;
  seat_code:              string;
  seat_name:              string;
  seat_type:              string | null;   // null when unconfigured
  status:                 string | null;   // null when unconfigured
  is_bookable:            boolean | null;  // null when unconfigured
  is_reserved:            boolean;
  is_configured:          boolean;
  configuration_status:   string | null;  // null when unconfigured
  amenity_ids:            string[];
  layout_id:              string;
  notes:                  string;
  // Conference room seating capacity — meaningful only when seat_type is
  // CONFERENCE_ROOM, null otherwise.
  capacity:                number | null;
  // Set client-side only, for a seat edited locally on an already-published
  // layout that hasn't been flushed to the server yet (see Usemanageseats).
  // Never present on server-fetched data — a fresh fetch naturally clears it.
  has_unpublished_changes?: boolean;
}

export interface SeatFilters {
  search:    string;
  seat_type: string;   // "All" | specific type
  status:    string;   // "All" | "ACTIVE" | "INACTIVE"
  bookable:  string;   // "All" | "Yes" | "No"
  amenity:   string;   // "All" | preference_id
}

// The stat cards above the table (SpaceStatCards) are a single,
// mutually-exclusive selection -- picking one clears any other -- kept
// entirely separate from SeatFilters, which the filter bar's dropdowns
// combine freely (multi-filter). AND'd together with SeatFilters in
// filteredSeats, but neither reads or writes the other's state.
export type SpaceCardFilter = "CONFIGURED" | "UNCONFIGURED" | "NON_BOOKABLE" | "INACTIVE" | null;

export interface SeatUpdatePayload {
  seat_svg_id:  string;
  layout_id:    string;
  seat_name?:   string | null;
  seat_type:    SeatType;
  is_bookable:  boolean;
  is_reserved?: boolean;
  status:       SeatStatus;
  amenity_ids:  string[];
  notes?:       string;
  capacity?:    number | null;
}

export interface BulkUpdatePayload {
  seat_svg_ids: string[];
  layout_id:    string;
  seat_type?:   SeatType;
  is_bookable?: boolean;
  status?:      SeatStatus;
  amenity_ids?: string[];
  capacity?:    number | null;
}

export type ViewMode = "map" | "list";