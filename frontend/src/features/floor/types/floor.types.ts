export interface Floor {
  floor_id: string;
  site_id: string;
  building_id: string;

  building_code: string;
  building_name: string;

  floor_code: string;
  floor_name: string;

  status: string;

  seat_count: number;
  active_seat_count: number;
  bookable_seat_count: number;

  layout_count: number;
}

export interface CreateFloorPayload {
  site_id: number;
  building_id: number;
  floor_code: string;
  floor_name: string;
  status: string;
}

export interface UpdateFloorPayload {
  floor_name: string;
  status: string;
}