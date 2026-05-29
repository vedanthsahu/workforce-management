// ─── Seat Types ───────────────────────────────────────────────────────────────

// export type SeatType = "Workstation" | "Meeting Room" | "Cabin" | "Phone Booth" | string;
// export type SeatStatus = "ACTIVE" | "INACTIVE";
export type SeatType   =  "STANDARD" | "WINDOW" | "CABIN" |"ACCESSIBLE"| "HOT_DESK"

export type SeatStatus = "ACTIVE" | "INACTIVE";
export type BookableStatus = "Yes" | "No";

// export interface Seat {
//   seat_id: string;
//   seat_svg_id: string;        // SVG element ID (e.g. "W-03")
//   seat_code: string;          // Display code
//   seat_type: SeatType;
//   status: SeatStatus;
//   is_bookable: boolean;
//   layout_id: string;
// //   floor_id: string;
//   amenity_ids: string[];
//   notes?: string;
// }

export interface Seat {
  seat_id:                string;
  seat_svg_id:            string;
  layout_seat_mapping_id: string;   // ← needed to hit the config endpoint
  seat_code:              string;
  seat_name:              string;
  seat_type:              string;
  status:                 SeatStatus;
  is_bookable:            boolean;
  is_reserved:            boolean;
  is_configured:          boolean;   // ← drives "configured" badge in UI
  configuration_status:   string;
  amenity_ids:            string[];
  layout_id:              string;
  notes:                  string;
}

export interface SeatFilters {
  search: string;
  seat_type: string;         // "All" | specific type
  status: string;            // "All" | "Active" | "Inactive"
  bookable: string;          // "All" | "Yes" | "No"
  amenity: string;           // "All" | preference_id
}

// export interface SeatUpdatePayload {
//   seat_svg_id: string;
//   layout_id: string;
//   seat_type: SeatType;
//   is_bookable: boolean;
//   status: SeatStatus;
//   amenity_ids: string[];
//   notes?: string;
// }

export interface SeatUpdatePayload {
  seat_svg_id:  string;
  layout_id:    string;
  seat_name?:  string | null;     // ← add this
  seat_type:    SeatType;
  is_bookable:  boolean;
  is_reserved?: boolean;
  status:       SeatStatus;
  amenity_ids:  string[];
  notes?:       string;
}

export interface BulkUpdatePayload {
  seat_svg_ids: string[];
  layout_id: string;
  seat_type?: SeatType;
  is_bookable?: boolean;
  status?: SeatStatus;
  amenity_ids?: string[];
}

export type ViewMode = "map" | "list";