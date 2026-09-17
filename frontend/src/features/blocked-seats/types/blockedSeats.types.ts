export type BlockCategory =
  | "active"
  | "today"
  | "upcoming"
  | "expiring"
  | "expired";
export type BlockType = "MAINTENANCE" | "RESERVED" | "ADMIN_BLOCK";
export type DisplayStatus = "ACTIVE" | "UPCOMING" | "EXPIRED";

export interface LocationOption {
  id: string;
  name: string;
}
export interface SeatOption {
  seat_id: string;
  seat_code: string;
  selectable: boolean;
  hasBooking: boolean;
  hasBlock: boolean;
  isUnavailable: boolean;
  resource_name?: string | null;
  resource_type?: string;
  svg_element_id?: string;
  capacity?: number | null;
}

export interface BlockedSeatConflict {
  booking_id: string;
  seat_id: string;
  site_id: string;
  building_id: string;
  floor_id: string;
  seat_code: string;
  booking_date: string;
  booking_type: string;
  booking_status: string;
  booked_for_name: string | null;
}

export interface BlockableFloorLayout {
  conflicts: BlockedSeatConflict[];
  has_more_conflicts: boolean;
  layout_id: string;
  layout_name: string;
  layout_file_url: string;
  effective_from: string | null;
  effective_till: string | null;
  resources: Array<{
    resource_id: string;
    resource_code: string;
    resource_name: string | null;
    resource_type: string;
    svg_element_id: string;
    capacity: number | null;
    is_bookable: boolean;
    is_active: boolean;
    has_booking: boolean;
    has_block: boolean;
  }>;
}

export interface BlockedSeat {
  block_id: string;
  seat_id: string;
  seat_code: string;
  site_id: string;
  site_name: string;
  building_id: string;
  building_name: string;
  floor_id: string;
  floor_name: string;
  blocked_from: string;
  blocked_to: string;
  block_type: BlockType;
  reason: string;
  display_status: DisplayStatus;
  blocked_by: { user_id: string | null; name: string | null };
  created_at: string;
}

export interface BlockedSeatSummary {
  active_blocks: number;
  seats_blocked_today: number;
  upcoming_blocks: number;
  expiring_soon: number;
  expired: number;
}

export interface BlockedSeatListResponse {
  items: BlockedSeat[];
  summary: BlockedSeatSummary;
  pagination: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

export interface BlockedSeatFilters {
  search: string;
  siteId: string;
  buildingId: string;
  floorId: string;
  blockType: string;
  date: string;
}

export interface CreateBlockedSeatsPayload {
  seat_ids: number[];
  block_type: BlockType;
  blocked_from: string;
  blocked_to: string;
  reason: string;
}
