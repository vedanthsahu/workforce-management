export interface Building {
  building_id: string;
  site_id: string;
  site_name: string;

  building_code: string;
  building_name: string;

  status: "ACTIVE" | "INACTIVE";

  floor_count: number;
  seat_count: number;
  active_seat_count: number;
  bookable_seat_count: number;
}

export interface BuildingStatsSummary {
  total_buildings: number;
  active_buildings: number;
  inactive_buildings: number;
  total_seats: number;
}

export interface SiteOption {
  site_id: string;
  site_code: string;
  site_name: string;
}

export interface CreateBuildingPayload {
  site_id: number;

  building_code: string;

  building_name: string;

  status: "ACTIVE" | "INACTIVE";
}

export interface UpdateBuildingPayload {
  building_name: string;

  status: "ACTIVE" | "INACTIVE";
}