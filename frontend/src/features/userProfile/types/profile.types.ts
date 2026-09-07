
export interface ApiAmenity {
  id:          string;
  key:         string;
  name:        string;
  category:    string;
  description: string;
  icon:        string;
}

export interface ApiPreferences {
  amenities: ApiAmenity[];
}

export interface ApiProfileMetadata {
  status:               string;
  role_name:            string;
  company_name:         string | null;
  employee_id:          string | null;
  microsoft_object_id:  string | null;
  user_principal_name:  string | null;
  graph_last_synced_at: string | null;
  created_at:           string | null;
  updated_at:           string | null;
}

export interface ApiWorkPreferences {
  site_id:          string | null;
  site_name:        string | null;
  building_id:      string | null;
  building_name:    string | null;
  floor_id:         string | null;
  floor_name:       string | null;
  seat_type:        string | null;
  amenities:        ApiAmenity[];
}

export interface ApiDashboardMe {
  user_id:          string;
  tenant_id:        string;
  tenant_name:      string;
  email:            string;
  full_name:        string;
  display_name:     string;
  department:       string | null;
  title:            string | null;
  job_title:        string | null;
  mobile_phone:     string | null;
  manager:          string | null;
  office_info:      string | null;
  preferences:      ApiPreferences;
  profile_metadata: ApiProfileMetadata;
  work_preferences: ApiWorkPreferences | null;
}

// ─── Auth/Me API response ─────────────────────────────────────────────────────

export interface ApiAuthMe {
  user_id:               string;
  tenant_id:             string;
  tenant_name:           string;
  email:                 string;
  full_name:             string;
  display_name:          string;
  name:                  string;
  microsoft_object_id:   string | null;
  user_principal_name:   string | null;
  mobile_phone:          string | null;
  office_location:       string | null;
  department:            string | null;
  job_title:             string | null;
  company_name:          string | null;
  employee_id:           string | null;
  manager_user_id:       string | null;
  home_site_id:          string | null;
  role:                  string;
  role_name:             string;
  status:                string;
  graph_last_synced_at:  string | null;
  created_at:            string | null;
  updated_at:            string | null;
  permissions:           string[];
}

// ─── Booking API ──────────────────────────────────────────────────────────────

export interface ApiBooking {
  booking_id:          string;
  tenant_id:           string;
  user_id:             string;
  booked_for_user_id:  string;
  booked_by_user_id:   string;
  seat_id:             string;
  site_id:             string;
  building_id:         string;
  floor_id:            string;
  seat_code:           string;
  site_name:           string;
  building_name:       string;
  floor_name:          string;
  booking_date:        string;
  booking_status:      string;
  source_channel:      string;
  cancelled_at:        string | null;
  cancellation_reason: string | null;
  created_at:          string;
}

// ─── Sites / Buildings / Floors ───────────────────────────────────────────────

export interface ApiSite {
  site_id:             string;
  site_code:           string;
  site_name:           string;
  city:                string;
  country:             string;
  timezone:            string;
  address_line1:       string;
  address_line2:       string | null;
  status:              string;
  building_count:      number;
  floor_count:         number;
  seat_count:          number;
  active_seat_count:   number;
  bookable_seat_count: number;
}

export interface ApiBuilding {
  building_id:         string;
  site_id:             string;
  site_name:           string;
  building_code:       string;
  building_name:       string;
  status:              string;
  floor_count:         number;
  seat_count:          number;
  active_seat_count:   number;
  bookable_seat_count: number;
}

export interface ApiFloor {
  floor_id:                string;
  site_id:                 string;
  building_id:             string;
  building_code:           string;
  building_name:           string;
  floor_code:              string;
  floor_name:              string;
  status:                  string;
  seat_count:              number;
  active_seat_count:       number;
  bookable_seat_count:     number;
  layout_count:            number;
  published_layout_exists: boolean;
  layout_id:               string | null;
  layout_name:             string | null;
  layout_file_url:         string | null;
  layout_status:           string | null;
  layout_is_published:     boolean;
  layout_version_no:       number | null;
}

// ─── Payload types ────────────────────────────────────────────────────────────

export interface ApiUpdateProfilePayload {
  display_name?:   string;
  phone?:          string;
  personal_email?: string;
  bio?:            string;
  skills?:         string[];
  avatar_url?:     string;
}

// Matches backend's UpdateMyPreferencesRequest — POST /preferences/me
// always replaces the full saved row, so every field must be resent.
export interface ApiUpdatePreferencesPayload {
  site_id:      number | null;
  building_id:  number | null;
  floor_id:     number | null;
  seat_type:    string | null;
  amenity_ids:  number[];
}

// ─── App shapes ───────────────────────────────────────────────────────────────

export interface ProfileData {
  displayName:      string;
  email:            string;
  phone:            string;
  role:             string;
  jobTitle:         string;
  department:       string;
  workLocation:     string;
  avatarUrl:        string | null;
  employeeId:       string;
  reportingManager: string;
  dateOfJoining:    string;
  bio:              string;
  skills:           string[];
  status:           string;
}

export interface AccountInfo {
  username:          string;
  role:              string;
  lastLogin:         string;
  userPrincipalName: string;
}

export interface SeatPreferences {
  preferredOfficeId:   string;
  preferredOfficeName: string;
  preferredBuildingId:   string;
  preferredBuildingName: string;
  preferredFloorId:   string;
  preferredFloorName: string;
  preferredSeatType:  string | null;
  preferredAmenities: { id: string; name: string; category: string }[]; // id+name+category for display
}

export interface ActivitySummary {
  totalBookings:    number;
  upcomingBookings: number;
  pastBookings:     number;
}

export interface BookingData {
  current: ApiBooking[];
  future:  ApiBooking[];
  past:    ApiBooking[];
}

export interface ProfilePageData {
  profile:         ProfileData;
  preferences:     SeatPreferences;
  accountInfo:     AccountInfo;
  activitySummary: ActivitySummary;
  bookings:        BookingData;
}

// ─── Edit forms ───────────────────────────────────────────────────────────────

export interface EditProfileForm {
  bio:    string;
  skills: string[];
}

export interface EditPreferencesForm {
  preferredOfficeId:   string;
  preferredBuildingId: string;
  preferredFloorId:    string;
  preferredAmenityIds: string[];
}

// ─── Error / Result ───────────────────────────────────────────────────────────

export type ProfileSectionError = {
  section:  "profile" | "preferences" | "account" | "bookings";
  code:     string;
  message:  string;
  status?:  number;
};

export type ProfileResult =
  | { ok: true;  data: ProfilePageData; errors: ProfileSectionError[] }
  | { ok: false; fatal: ProfileSectionError };