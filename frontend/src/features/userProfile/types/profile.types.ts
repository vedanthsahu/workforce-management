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

export interface ApiDashboardMe {
  user_id:                      string;
  tenant_id:                    string;
  tenant_name:                  string;
  email:                        string;
  full_name:                    string;
  display_name:                 string;
  department:                   string | null;
  title:                        string | null;
  job_title:                    string | null;
  mobile_phone:                 string | null;
  manager:                      string | null;
  office_info:                  string | null;
  preferences:                  ApiPreferences;
  profile_metadata:             ApiProfileMetadata;
}

export interface ApiUpdateProfilePayload {
  display_name?:   string;
  phone?:          string;
  personal_email?: string;
  bio?:            string;
  skills?:         string[];
  avatar_url?:     string;
}

export interface ApiUpdatePreferencesPayload {
  preferred_office?:  string;
  preferred_floor?:   string;
  seat_type?:         string;
  near_teammates?:    string[];
  away_from?:         string[];
  noise_preference?:  string;
  other_preferences?: string[];
}

// ─── App shapes ───────────────────────────────────────────────────────────────

export interface ProfileData {
  // Identity card
  displayName:      string;
  email:            string;
  phone:            string;
  role:             string;
  jobTitle:         string;
  department:       string;
  workLocation:     string;
  avatarUrl:        string | null;
  // Personal Information card
  employeeId:       string;
  reportingManager: string;
  dateOfJoining:    string;
  dateOfBirth:      string;
  gender:           string;
  employmentType:   string;
  personalEmail:    string;
  // About Me
  bio:              string;
  skills:           string[];
}

export interface SeatPreferences {
  preferredAmenities: string[];
  preferredOffice:    string;
  preferredFloor:     string;
  seatType:           string;
  nearTeammates:      string[];
  awayFrom:           string[];
  noisePreference:    string;
  otherPreferences:   string[];
}

export interface ProfilePageData {
  profile:     ProfileData;
  preferences: SeatPreferences;
}

export interface EditProfileForm {
  displayName:   string;
  phone:         string;
  personalEmail: string;
  bio:           string;
  skills:        string[];
}

export interface EditPreferencesForm {
  preferredOffice:    string;
  preferredFloor:     string;
  seatType:           string;
  nearTeammates:      string;
  awayFrom:           string;
  noisePreference:    string;
  preferredAmenities: string;
  otherPreferences:   string;
}

export type ProfileSectionError = {
  section:  "profile" | "preferences";
  code:     string;
  message:  string;
  status?:  number;
};

export type ProfileResult =
  | { ok: true;  data: ProfilePageData; errors: ProfileSectionError[] }
  | { ok: false; fatal: ProfileSectionError };