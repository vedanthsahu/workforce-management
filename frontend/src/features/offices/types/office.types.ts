export interface Office {
  site_id: string;
  site_code: string;
  site_name: string;
  city: string;
  country: string;
  timezone: string;
  address_line1: string;
  address_line2: string | null;
  status: "ACTIVE" | "INACTIVE";
  building_count: number;
  floor_count: number;
  seat_count: number;
  active_seat_count: number;
  bookable_seat_count: number;
}

export interface UpdateOfficePayload {
  site_name: string;
  city: string;
  country: string;
  timezone: string;
  address_line1: string;
  address_line2: string | null;
  status: "ACTIVE" | "INACTIVE";
}
export interface OfficeStatsSummary {
  total_offices: number;
  active_sites: number;
  inactive_sites: number;
  total_seats: number;
}