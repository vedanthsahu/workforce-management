export interface Amenity {
  amenity_id: string;
  amenity_key: string;
  amenity_name: string;
  description: string;
  icon_name: string;
  category_id: string;
  category_name: string;
  is_active: boolean;
  assigned_seat_count: number;
  // Empty array means "applies to every space type" (Seat, Cabin, Conference Room).
  applicable_seat_types: string[];
}

export interface AmenitiesResponse {
  items: Amenity[];

  total: number;
  page: number;
  limit: number;
  total_pages: number;

  total_amenities: number;
  active_amenities: number;
  inactive_amenities: number;
  assigned_amenities: number;
}

export interface AmenitiesQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

export interface CreateAmenityPayload {
  amenity_key: string;
  amenity_name: string;
  description: string;
  icon_name: string;
  category_id: number;
  is_active: boolean;
  applicable_seat_types: string[];
}

export interface UpdateAmenityPayload {
  amenity_name: string;
  description: string;
  icon_name: string;
  category_id: number;
  is_active: boolean;
  applicable_seat_types: string[];
}

export interface PreferenceAmenity {
  id: string;
  key: string;
  name: string;
  category: string;
  description: string;
  icon: string;
  applicable_seat_types: string[];
}

export interface PreferencesResponse {
  amenities: PreferenceAmenity[];
}

export interface AmenityFormData {
  amenity_key: string;
  amenity_name: string;
  description: string;
  icon_name: string;
  category_id: string;
  is_active: boolean;
  applicable_seat_types: string[];
}

export interface AmenityStats {
  total_amenities: number;
  active_amenities: number;
  inactive_amenities: number;
  assigned_amenities: number;
}

export interface AmenityCategory {
  category_id: string;
  category_key: string;
  category_name: string;
  description: string;
  is_active: boolean;
}

export interface AmenityCategoryResponse {
  items: AmenityCategory[];
}