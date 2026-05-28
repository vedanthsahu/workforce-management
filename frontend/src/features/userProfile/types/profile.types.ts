// // // // ─── API shapes (what the backend sends) ─────────────────────────────────────

// // // export interface ApiProfile {
// // //   user_id:         string;
// // //   full_name:       string;
// // //   display_name?:   string;
// // //   email:           string;
// // //   personal_email?: string;
// // //   phone?:          string;
// // //   role:            string;
// // //   job_title?:      string;
// // //   department?:     string;
// // //   employee_id?:    string;
// // //   date_of_joining?: string;   // ISO date "2023-01-15"
// // //   date_of_birth?:  string;   // ISO date "1994-08-12"
// // //   gender?:         string;
// // //   employment_type?: string;
// // //   work_location?:  string;
// // //   reporting_manager?: string;
// // //   avatar_url?:     string;
// // //   bio?:            string;
// // //   skills?:         string[];
// // // }

// // // export interface ApiSeatPreferences {
// // //   preferred_office?:   string;
// // //   preferred_floor?:    string;
// // //   seat_type?:          string;
// // //   near_teammates?:     string[];
// // //   away_from?:          string[];
// // //   noise_preference?:   string;
// // //   preferred_amenities?: string[];
// // //   other_preferences?:  string[];
// // // }

// // // export interface ApiUpdateProfilePayload {
// // //   full_name?:      string;
// // //   display_name?:   string;
// // //   phone?:          string;
// // //   personal_email?: string;
// // //   bio?:            string;
// // //   skills?:         string[];
// // //   avatar_url?:     string;
// // // }

// // // export interface ApiUpdatePreferencesPayload {
// // //   preferred_office?:    string;
// // //   preferred_floor?:     string;
// // //   seat_type?:           string;
// // //   near_teammates?:      string[];
// // //   away_from?:           string[];
// // //   noise_preference?:    string;
// // //   preferred_amenities?: string[];
// // //   other_preferences?:   string[];
// // // }

// // // // ─── App shapes (what components consume) ────────────────────────────────────

// // // export interface ProfileData {
// // //   userId:          string;
// // //   fullName:        string;
// // //   displayName:     string;
// // //   email:           string;
// // //   personalEmail:   string;
// // //   phone:           string;
// // //   role:            string;
// // //   jobTitle:        string;
// // //   department:      string;
// // //   employeeId:      string;
// // //   dateOfJoining:   string;   // formatted "15 Jan 2023"
// // //   dateOfBirth:     string;   // formatted "12 Aug 1994"
// // //   gender:          string;
// // //   employmentType:  string;
// // //   workLocation:    string;
// // //   reportingManager: string;
// // //   avatarUrl:       string | null;
// // //   bio:             string;
// // //   skills:          string[];
// // // }

// // // export interface SeatPreferences {
// // //   preferredOffice:    string;
// // //   preferredFloor:     string;
// // //   seatType:           string;
// // //   nearTeammates:      string[];
// // //   awayFrom:           string[];
// // //   noisePreference:    string;
// // //   preferredAmenities: string[];
// // //   otherPreferences:   string[];
// // // }

// // // export interface ProfilePageData {
// // //   profile:     ProfileData;
// // //   preferences: SeatPreferences;
// // // }

// // // // ─── Edit form shapes ─────────────────────────────────────────────────────────

// // // export interface EditProfileForm {
// // //   displayName:   string;
// // //   phone:         string;
// // //   personalEmail: string;
// // //   bio:           string;
// // //   skills:        string[];
// // // }

// // // export interface EditPreferencesForm {
// // //   preferredOffice:    string;
// // //   preferredFloor:     string;
// // //   seatType:           string;
// // //   nearTeammates:      string;   // comma-separated for the input
// // //   awayFrom:           string;
// // //   noisePreference:    string;
// // //   preferredAmenities: string;
// // //   otherPreferences:   string;
// // // }

// // // // ─── Error shape (mirrors dashboard pattern) ──────────────────────────────────

// // // export type ProfileSectionError = {
// // //   section:  "profile" | "preferences";
// // //   code:     string;
// // //   message:  string;
// // //   status?:  number;
// // // };

// // // export type ProfileResult =
// // //   | { ok: true;  data: ProfilePageData; errors: ProfileSectionError[] }
// // //   | { ok: false; fatal: ProfileSectionError };

// // // ─── API shapes (what /dashboard/me returns) ─────────────────────────────────

// // export interface ApiAmenity {
// //   id:          string;
// //   key:         string;
// //   name:        string;
// //   category:    string;
// //   description: string;
// //   icon:        string;
// // }

// // export interface ApiPreferences {
// //   amenities: ApiAmenity[];
// // }

// // export interface ApiProfileMetadata {
// //   status:               string;
// //   role_name:            string;
// //   company_name:         string | null;
// //   employee_id:          string | null;
// //   microsoft_object_id:  string | null;
// //   user_principal_name:  string | null;
// //   graph_last_synced_at: string | null;
// //   created_at:           string | null;
// //   updated_at:           string | null;
// // }

// // export interface ApiFavoriteSeat {
// //   seat_id:       string;
// //   seat_code:     string;
// //   booking_count: number;
// // }

// // export interface ApiDashboardMe {
// //   user_id:                       string;
// //   tenant_id:                     string;
// //   tenant_name:                   string;
// //   email:                         string;
// //   full_name:                     string;
// //   display_name:                  string;
// //   department:                    string | null;
// //   title:                         string | null;
// //   job_title:                     string | null;
// //   mobile_phone:                  string | null;
// //   manager:                       string | null;
// //   office_info:                   string | null;
// //   preferences:                   ApiPreferences;
// //   profile_metadata:              ApiProfileMetadata;
// //   favorite_seat:                 ApiFavoriteSeat | null;
// //   days_in_office_total:          number;
// //   days_in_office_current_month:  number;
// //   days_in_office_current_year:   number;
// //   team_rank_current_year:        number | null;
// //   team_member_count:             number;
// // }

// // export interface ApiUpdateProfilePayload {
// //   display_name?:   string;
// //   phone?:          string;
// //   personal_email?: string;
// //   bio?:            string;
// //   skills?:         string[];
// //   avatar_url?:     string;
// // }

// // export interface ApiUpdatePreferencesPayload {
// //   preferred_office?:    string;
// //   preferred_floor?:     string;
// //   seat_type?:           string;
// //   near_teammates?:      string[];
// //   away_from?:           string[];
// //   noise_preference?:    string;
// //   preferred_amenities?: string[];
// //   other_preferences?:   string[];
// // }

// // // ─── App shapes (what components consume) ────────────────────────────────────

// // export interface ProfileData {
// //   userId:          string;
// //   tenantId:        string;
// //   tenantName:      string;
// //   fullName:        string;
// //   displayName:     string;
// //   email:           string;
// //   personalEmail:   string;
// //   phone:           string;
// //   role:            string;             // from profile_metadata.role_name
// //   status:          string;             // from profile_metadata.status
// //   jobTitle:        string;             // title ?? job_title
// //   department:      string;
// //   employeeId:      string;             // from profile_metadata.employee_id
// //   companyName:     string;             // from profile_metadata.company_name
// //   workLocation:    string;             // from office_info
// //   reportingManager: string;            // from manager
// //   userPrincipalName: string;           // from profile_metadata.user_principal_name
// //   createdAt:       string;             // formatted from profile_metadata.created_at
// //   lastSyncedAt:    string;             // formatted from profile_metadata.graph_last_synced_at
// //   avatarUrl:       string | null;
// //   bio:             string;
// //   skills:          string[];
// //   // Stats
// //   daysInOfficeTotal:         number;
// //   daysInOfficeCurrentMonth:  number;
// //   daysInOfficeCurrentYear:   number;
// //   teamRankCurrentYear:       number | null;
// //   teamMemberCount:           number;
// //   // Favorite seat
// //   favoriteSeat: {
// //     seatId:       string;
// //     seatCode:     string;
// //     bookingCount: number;
// //   } | null;
// // }

// // export interface AmenityPreference {
// //   id:          string;
// //   key:         string;
// //   name:        string;
// //   category:    string;
// //   description: string;
// //   icon:        string;
// // }

// // export interface SeatPreferences {
// //   // Structured amenities from the API
// //   amenities:          AmenityPreference[];
// //   // Locally editable free-form fields (no backend endpoint yet)
// //   preferredOffice:    string;
// //   preferredFloor:     string;
// //   seatType:           string;
// //   nearTeammates:      string[];
// //   awayFrom:           string[];
// //   noisePreference:    string;
// //   otherPreferences:   string[];
// // }

// // export interface ProfilePageData {
// //   profile:     ProfileData;
// //   preferences: SeatPreferences;
// // }

// // // ─── Edit form shapes ─────────────────────────────────────────────────────────

// // export interface EditProfileForm {
// //   displayName:   string;
// //   phone:         string;
// //   personalEmail: string;
// //   bio:           string;
// //   skills:        string[];
// // }

// // export interface EditPreferencesForm {
// //   preferredOffice:  string;
// //   preferredFloor:   string;
// //   seatType:         string;
// //   nearTeammates:    string;   // comma-separated for the input
// //   awayFrom:         string;
// //   noisePreference:  string;
// //   otherPreferences: string;
// // }

// // // ─── Error shape ──────────────────────────────────────────────────────────────

// // export type ProfileSectionError = {
// //   section:  "profile" | "preferences";
// //   code:     string;
// //   message:  string;
// //   status?:  number;
// // };

// // export type ProfileResult =
// //   | { ok: true;  data: ProfilePageData; errors: ProfileSectionError[] }
// //   | { ok: false; fatal: ProfileSectionError };

// export interface ApiAmenity {
//   id:          string;
//   key:         string;
//   name:        string;
//   category:    string;
//   description: string;
//   icon:        string;
// }

// export interface ApiPreferences {
//   amenities: ApiAmenity[];
// }

// export interface ApiProfileMetadata {
//   status:               string;
//   role_name:            string;
//   company_name:         string | null;
//   employee_id:          string | null;
//   microsoft_object_id:  string | null;
//   user_principal_name:  string | null;
//   graph_last_synced_at: string | null;
//   created_at:           string | null;
//   updated_at:           string | null;
// }

// export interface ApiFavoriteSeat {
//   seat_id:       string;
//   seat_code:     string;
//   booking_count: number;
// }

// export interface ApiDashboardMe {
//   user_id:                       string;
//   tenant_id:                     string;
//   tenant_name:                   string;
//   email:                         string;
//   full_name:                     string;
//   display_name:                  string;
//   department:                    string | null;
//   title:                         string | null;
//   job_title:                     string | null;
//   mobile_phone:                  string | null;
//   manager:                       string | null;
//   office_info:                   string | null;
//   preferences:                   ApiPreferences;
//   profile_metadata:              ApiProfileMetadata;
//   favorite_seat:                 ApiFavoriteSeat | null;
//   days_in_office_total:          number;
//   days_in_office_current_month:  number;
//   days_in_office_current_year:   number;
//   team_rank_current_year:        number | null;
//   team_member_count:             number;
// }

// export interface ApiUpdateProfilePayload {
//   display_name?:   string;
//   phone?:          string;
//   personal_email?: string;
//   bio?:            string;
//   skills?:         string[];
//   avatar_url?:     string;
// }

// export interface ApiUpdatePreferencesPayload {
//   preferred_office?:    string;
//   preferred_floor?:     string;
//   seat_type?:           string;
//   near_teammates?:      string[];
//   away_from?:           string[];
//   noise_preference?:    string;
//   preferred_amenities?: string[];
//   other_preferences?:   string[];
// }

// // ─── App shapes (what components consume) ────────────────────────────────────

// export interface ProfileData {
//   userId:            string;
//   tenantId:          string;
//   tenantName:        string;
//   fullName:          string;
//   displayName:       string;
//   email:             string;
//   personalEmail:     string;
//   phone:             string;
//   role:              string;
//   status:            string;
//   jobTitle:          string;
//   department:        string;
//   employeeId:        string;
//   companyName:       string;
//   workLocation:      string;
//   reportingManager:  string;
//   userPrincipalName: string;
//   createdAt:         string;
//   lastSyncedAt:      string;
//   avatarUrl:         string | null;
//   bio:               string;
//   skills:            string[];
//   // Extra personal info (not in API yet)
//   dateOfJoining:     string;
//   dateOfBirth:       string;
//   gender:            string;
//   employmentType:    string;
//   // Stats
//   daysInOfficeTotal:        number;
//   daysInOfficeCurrentMonth: number;
//   daysInOfficeCurrentYear:  number;
//   teamRankCurrentYear:      number | null;
//   teamMemberCount:          number;
//   // Favorite seat
//   favoriteSeat: {
//     seatId:       string;
//     seatCode:     string;
//     bookingCount: number;
//   } | null;
// }

// export interface SeatPreferences {
//   preferredAmenities: string[];
//   preferredOffice:    string;
//   preferredFloor:     string;
//   seatType:           string;
//   nearTeammates:      string[];
//   awayFrom:           string[];
//   noisePreference:    string;
//   otherPreferences:   string[];
// }

// export interface ProfilePageData {
//   profile:     ProfileData;
//   preferences: SeatPreferences;
// }

// // ─── Edit form shapes ─────────────────────────────────────────────────────────

// export interface EditProfileForm {
//   displayName:   string;
//   phone:         string;
//   personalEmail: string;
//   bio:           string;
//   skills:        string[];
// }

// export interface EditPreferencesForm {
//   preferredOffice:    string;
//   preferredFloor:     string;
//   seatType:           string;
//   nearTeammates:      string;
//   awayFrom:           string;
//   noisePreference:    string;
//   preferredAmenities: string;
//   otherPreferences:   string;
// }

// // ─── Error shape ──────────────────────────────────────────────────────────────

// export type ProfileSectionError = {
//   section:  "profile" | "preferences";
//   code:     string;
//   message:  string;
//   status?:  number;
// };

// export type ProfileResult =
//   | { ok: true;  data: ProfilePageData; errors: ProfileSectionError[] }
//   | { ok: false; fatal: ProfileSectionError };

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