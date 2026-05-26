// ─── API shapes (what the backend sends) ─────────────────────────────────────

export interface ApiProfile {
  user_id:         string;
  full_name:       string;
  display_name?:   string;
  email:           string;
  personal_email?: string;
  phone?:          string;
  role:            string;
  job_title?:      string;
  department?:     string;
  employee_id?:    string;
  date_of_joining?: string;   // ISO date "2023-01-15"
  date_of_birth?:  string;   // ISO date "1994-08-12"
  gender?:         string;
  employment_type?: string;
  work_location?:  string;
  reporting_manager?: string;
  avatar_url?:     string;
  bio?:            string;
  skills?:         string[];
}

export interface ApiSeatPreferences {
  preferred_office?:   string;
  preferred_floor?:    string;
  seat_type?:          string;
  near_teammates?:     string[];
  away_from?:          string[];
  noise_preference?:   string;
  preferred_amenities?: string[];
  other_preferences?:  string[];
}

export interface ApiUpdateProfilePayload {
  full_name?:      string;
  display_name?:   string;
  phone?:          string;
  personal_email?: string;
  bio?:            string;
  skills?:         string[];
  avatar_url?:     string;
}

export interface ApiUpdatePreferencesPayload {
  preferred_office?:    string;
  preferred_floor?:     string;
  seat_type?:           string;
  near_teammates?:      string[];
  away_from?:           string[];
  noise_preference?:    string;
  preferred_amenities?: string[];
  other_preferences?:   string[];
}

// ─── App shapes (what components consume) ────────────────────────────────────

export interface ProfileData {
  userId:          string;
  fullName:        string;
  displayName:     string;
  email:           string;
  personalEmail:   string;
  phone:           string;
  role:            string;
  jobTitle:        string;
  department:      string;
  employeeId:      string;
  dateOfJoining:   string;   // formatted "15 Jan 2023"
  dateOfBirth:     string;   // formatted "12 Aug 1994"
  gender:          string;
  employmentType:  string;
  workLocation:    string;
  reportingManager: string;
  avatarUrl:       string | null;
  bio:             string;
  skills:          string[];
}

export interface SeatPreferences {
  preferredOffice:    string;
  preferredFloor:     string;
  seatType:           string;
  nearTeammates:      string[];
  awayFrom:           string[];
  noisePreference:    string;
  preferredAmenities: string[];
  otherPreferences:   string[];
}

export interface ProfilePageData {
  profile:     ProfileData;
  preferences: SeatPreferences;
}

// ─── Edit form shapes ─────────────────────────────────────────────────────────

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
  nearTeammates:      string;   // comma-separated for the input
  awayFrom:           string;
  noisePreference:    string;
  preferredAmenities: string;
  otherPreferences:   string;
}

// ─── Error shape (mirrors dashboard pattern) ──────────────────────────────────

export type ProfileSectionError = {
  section:  "profile" | "preferences";
  code:     string;
  message:  string;
  status?:  number;
};

export type ProfileResult =
  | { ok: true;  data: ProfilePageData; errors: ProfileSectionError[] }
  | { ok: false; fatal: ProfileSectionError };