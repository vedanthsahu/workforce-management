// ─── Seat Types ───────────────────────────────────────────────────────────────

export type SeatType   = "STANDARD" | "WINDOW" | "CABIN" | "ACCESSIBLE" | "HOT_DESK";
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
}

export interface BulkUpdatePayload {
  seat_svg_ids: string[];
  layout_id:    string;
  seat_type?:   SeatType;
  is_bookable?: boolean;
  status?:      SeatStatus;
  amenity_ids?: string[];
}

export type ViewMode = "map" | "list";