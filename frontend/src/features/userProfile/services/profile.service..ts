// // // import { axiosInstance } from "@/lib/http/axios";
// // // import type {
// // //   ApiProfile,
// // //   ApiSeatPreferences,
// // //   ApiUpdateProfilePayload,
// // //   ApiUpdatePreferencesPayload,
// // //   ProfileData,
// // //   ProfilePageData,
// // //   ProfileResult,
// // //   ProfileSectionError,
// // //   SeatPreferences,
// // // } from "../types/profile.types";

// // // // ─── Helpers ──────────────────────────────────────────────────────────────────

// // // function formatDate(iso?: string): string {
// // //   if (!iso) return "—";
// // //   const d = new Date(iso + "T00:00:00");
// // //   return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
// // // }

// // // function classifyError(
// // //   err: unknown,
// // //   section: ProfileSectionError["section"],
// // // ): ProfileSectionError {
// // //   if (err && typeof err === "object" && "response" in err) {
// // //     const axiosErr = err as {
// // //       response?: { status?: number; data?: { detail?: { code?: string; message?: string } | string } };
// // //     };
// // //     const status = axiosErr.response?.status;
// // //     const detail = axiosErr.response?.data?.detail;

// // //     if (status === 401) return { section, code: "unauthenticated", message: "Session expired. Please log in again.", status };
// // //     if (status === 403) return { section, code: "forbidden",       message: "You don't have permission to view this.", status };

// // //     if (detail && typeof detail === "object" && detail.code) {
// // //       return { section, code: detail.code, message: detail.message ?? "An error occurred.", status };
// // //     }
// // //     if (status) {
// // //       return { section, code: `http_${status}`, message: `Request failed (${status}).`, status };
// // //     }
// // //   }
// // //   return { section, code: "network_error", message: "Could not connect to the server." };
// // // }

// // // // ─── Mappers ──────────────────────────────────────────────────────────────────

// // // function mapApiProfile(api: ApiProfile): ProfileData {
// // //   return {
// // //     userId:          api.user_id,
// // //     fullName:        api.full_name,
// // //     displayName:     api.display_name ?? api.full_name,
// // //     email:           api.email,
// // //     personalEmail:   api.personal_email ?? "—",
// // //     phone:           api.phone          ?? "—",
// // //     role:            api.role,
// // //     jobTitle:        api.job_title       ?? "—",
// // //     department:      api.department      ?? "—",
// // //     employeeId:      api.employee_id     ?? "—",
// // //     dateOfJoining:   formatDate(api.date_of_joining),
// // //     dateOfBirth:     formatDate(api.date_of_birth),
// // //     gender:          api.gender          ?? "—",
// // //     employmentType:  api.employment_type ?? "—",
// // //     workLocation:    api.work_location   ?? "—",
// // //     reportingManager: api.reporting_manager ?? "—",
// // //     avatarUrl:       api.avatar_url ?? null,
// // //     bio:             api.bio     ?? "",
// // //     skills:          api.skills  ?? [],
// // //   };
// // // }

// // // function mapApiPreferences(api: ApiSeatPreferences): SeatPreferences {
// // //   return {
// // //     preferredOffice:    api.preferred_office    ?? "—",
// // //     preferredFloor:     api.preferred_floor     ?? "—",
// // //     seatType:           api.seat_type           ?? "—",
// // //     nearTeammates:      api.near_teammates      ?? [],
// // //     awayFrom:           api.away_from           ?? [],
// // //     noisePreference:    api.noise_preference    ?? "—",
// // //     preferredAmenities: api.preferred_amenities ?? [],
// // //     otherPreferences:   api.other_preferences   ?? [],
// // //   };
// // // }

// // // // ─── Raw fetchers ─────────────────────────────────────────────────────────────

// // // async function fetchProfileRaw(): Promise<ApiProfile> {
// // //   const { data } = await axiosInstance.get<ApiProfile>("/profile/me");
// // //   return data;
// // // }

// // // async function fetchPreferencesRaw(): Promise<ApiSeatPreferences> {
// // //   const { data } = await axiosInstance.get<ApiSeatPreferences>("/profile/me/preferences");
// // //   return data;
// // // }

// // // // ─── Main fetch (parallel, mirrors getDashboardData pattern) ──────────────────

// // // export async function getProfileData(): Promise<ProfileResult> {
// // //   const [profileResult, prefsResult] = await Promise.allSettled([
// // //     fetchProfileRaw(),
// // //     fetchPreferencesRaw(),
// // //   ]);

// // //   // Profile is fatal — nothing to render without it
// // //   if (profileResult.status === "rejected") {
// // //     return { ok: false, fatal: classifyError(profileResult.reason, "profile") };
// // //   }

// // //   const sectionErrors: ProfileSectionError[] = [];

// // //   const preferences: SeatPreferences = (() => {
// // //     if (prefsResult.status === "fulfilled") return mapApiPreferences(prefsResult.value);
// // //     sectionErrors.push(classifyError(prefsResult.reason, "preferences"));
// // //     return {
// // //       preferredOffice:    "—",
// // //       preferredFloor:     "—",
// // //       seatType:           "—",
// // //       nearTeammates:      [],
// // //       awayFrom:           [],
// // //       noisePreference:    "—",
// // //       preferredAmenities: [],
// // //       otherPreferences:   [],
// // //     };
// // //   })();

// // //   return {
// // //     ok: true,
// // //     data: {
// // //       profile:     mapApiProfile(profileResult.value),
// // //       preferences,
// // //     },
// // //     errors: sectionErrors,
// // //   };
// // // }

// // // // ─── Mutations ────────────────────────────────────────────────────────────────

// // // export async function updateProfile(payload: ApiUpdateProfilePayload): Promise<ProfileData> {
// // //   const { data } = await axiosInstance.patch<ApiProfile>("/profile/me", payload);
// // //   return mapApiProfile(data);
// // // }

// // // export async function updatePreferences(payload: ApiUpdatePreferencesPayload): Promise<SeatPreferences> {
// // //   const { data } = await axiosInstance.patch<ApiSeatPreferences>("/profile/me/preferences", payload);
// // //   return mapApiPreferences(data);
// // // }

// // // export async function uploadAvatar(file: File): Promise<string> {
// // //   const form = new FormData();
// // //   form.append("avatar", file);
// // //   const { data } = await axiosInstance.post<{ avatar_url: string }>("/profile/me/avatar", form, {
// // //     headers: { "Content-Type": "multipart/form-data" },
// // //   });
// // //   return data.avatar_url;
// // // }

// // import { axiosInstance } from "@/lib/http/axios";
// // import type {
// //   ApiUpdateProfilePayload,
// //   ApiUpdatePreferencesPayload,
// //   ProfileData,
// //   ProfilePageData,
// //   ProfileResult,
// //   ProfileSectionError,
// //   SeatPreferences,
// // } from "../types/profile.types";

// // // ─── /auth/me shape (what the backend actually returns) ───────────────────────

// // interface AuthMe {
// //   user_id:              string;
// //   tenant_id:            string;
// //   email:                string;
// //   full_name:            string;
// //   display_name?:        string;
// //   name?:                string;
// //   microsoft_object_id?: string;
// //   user_principal_name?: string;
// //   mobile_phone?:        string;
// //   office_location?:     string;
// //   department?:          string;
// //   job_title?:           string;
// //   company_name?:        string;
// //   employee_id?:         string;
// //   manager_user_id?:     string;
// //   home_site_id?:        string;
// //   role:                 string;
// //   status?:              string;
// //   graph_last_synced_at?: string;
// //   created_at?:          string;
// //   updated_at?:          string;
// //   permissions?:         string[];
// // }

// // // ─── Helpers ──────────────────────────────────────────────────────────────────

// // function classifyError(
// //   err: unknown,
// //   section: ProfileSectionError["section"],
// // ): ProfileSectionError {
// //   if (err && typeof err === "object" && "response" in err) {
// //     const axiosErr = err as {
// //       response?: { status?: number; data?: { detail?: { code?: string; message?: string } | string } };
// //     };
// //     const status = axiosErr.response?.status;
// //     const detail = axiosErr.response?.data?.detail;

// //     if (status === 401) return { section, code: "unauthenticated", message: "Session expired. Please log in again.", status };
// //     if (status === 403) return { section, code: "forbidden",       message: "You don't have permission to view this.", status };

// //     if (detail && typeof detail === "object" && detail.code) {
// //       return { section, code: detail.code, message: detail.message ?? "An error occurred.", status };
// //     }
// //     if (status) {
// //       return { section, code: `http_${status}`, message: `Request failed (${status}).`, status };
// //     }
// //   }
// //   return { section, code: "network_error", message: "Could not connect to the server." };
// // }

// // // ─── Mapper ───────────────────────────────────────────────────────────────────

// // function mapAuthMe(api: AuthMe): ProfileData {
// //   return {
// //     userId:           api.user_id,
// //     fullName:         api.full_name,
// //     displayName:      api.display_name ?? api.full_name,
// //     email:            api.email,
// //     personalEmail:    "—",                           // not in /auth/me
// //     phone:            api.mobile_phone   ?? "—",
// //     role:             api.role,
// //     jobTitle:         api.job_title      ?? "—",
// //     department:       api.department     ?? "—",
// //     employeeId:       api.employee_id    ?? "—",
// //     dateOfJoining:    "—",                           // not in /auth/me
// //     dateOfBirth:      "—",                           // not in /auth/me
// //     gender:           "—",                           // not in /auth/me
// //     employmentType:   "—",                           // not in /auth/me
// //     workLocation:     api.office_location ?? "—",
// //     reportingManager: "—",                           // manager_user_id is an ID, not a name
// //     avatarUrl:        null,                          // not in /auth/me
// //     bio:              "",                            // not in /auth/me
// //     skills:           [],                            // not in /auth/me
// //   };
// // }

// // const STATIC_PREFERENCES: SeatPreferences = {
// //   preferredOffice:    "—",
// //   preferredFloor:     "—",
// //   seatType:           "—",
// //   nearTeammates:      [],
// //   awayFrom:           [],
// //   noisePreference:    "—",
// //   preferredAmenities: [],
// //   otherPreferences:   [],
// // };

// // // ─── Main fetch ───────────────────────────────────────────────────────────────

// // export async function getProfileData(): Promise<ProfileResult> {
// //   try {
// //     const { data } = await axiosInstance.get<AuthMe>("/auth/me");
// //     return {
// //       ok: true,
// //       data: {
// //         profile:     mapAuthMe(data),
// //         preferences: STATIC_PREFERENCES,
// //       },
// //       errors: [],
// //     };
// //   } catch (err) {
// //     return { ok: false, fatal: classifyError(err, "profile") };
// //   }
// // }

// // // ─── Mutations (optimistic local update only — no backend endpoints yet) ──────

// // // Holds in-memory overrides so edits persist within the session
// // let localProfileOverride: Partial<ProfileData> = {};
// // let localPrefsOverride:   SeatPreferences      = { ...STATIC_PREFERENCES };

// // export async function updateProfile(payload: ApiUpdateProfilePayload): Promise<ProfileData> {
// //   // No PATCH /profile/me endpoint — apply locally
// //   localProfileOverride = {
// //     ...localProfileOverride,
// //     ...(payload.display_name   && { displayName:   payload.display_name   }),
// //     ...(payload.phone          && { phone:          payload.phone          }),
// //     ...(payload.personal_email && { personalEmail: payload.personal_email }),
// //     ...(payload.bio            && { bio:            payload.bio            }),
// //     ...(payload.skills         && { skills:         payload.skills         }),
// //     ...(payload.avatar_url     && { avatarUrl:      payload.avatar_url     }),
// //   };

// //   // Re-fetch base and merge override
// //   const { data } = await axiosInstance.get<AuthMe>("/auth/me");
// //   return { ...mapAuthMe(data), ...localProfileOverride };
// // }

// // export async function updatePreferences(payload: ApiUpdatePreferencesPayload): Promise<SeatPreferences> {
// //   // No PATCH /profile/me/preferences endpoint — apply locally
// //   localPrefsOverride = {
// //     preferredOffice:    payload.preferred_office    ?? localPrefsOverride.preferredOffice,
// //     preferredFloor:     payload.preferred_floor     ?? localPrefsOverride.preferredFloor,
// //     seatType:           payload.seat_type           ?? localPrefsOverride.seatType,
// //     nearTeammates:      payload.near_teammates      ?? localPrefsOverride.nearTeammates,
// //     awayFrom:           payload.away_from           ?? localPrefsOverride.awayFrom,
// //     noisePreference:    payload.noise_preference    ?? localPrefsOverride.noisePreference,
// //     preferredAmenities: payload.preferred_amenities ?? localPrefsOverride.preferredAmenities,
// //     otherPreferences:   payload.other_preferences   ?? localPrefsOverride.otherPreferences,
// //   };
// //   return localPrefsOverride;
// // }

// // export async function uploadAvatar(_file: File): Promise<string> {
// //   // No avatar upload endpoint — return empty so UI falls back to initials
// //   return "";
// // }

// import { axiosInstance } from "@/lib/http/axios";
// import type {
//   ApiDashboardMe,
//   ApiUpdateProfilePayload,
//   ApiUpdatePreferencesPayload,
//   AmenityPreference,
//   ProfileData,
//   ProfilePageData,
//   ProfileResult,
//   ProfileSectionError,
//   SeatPreferences,
// } from "../types/profile.types";

// // ─── Helpers ──────────────────────────────────────────────────────────────────

// function fmt(iso: string | null | undefined): string {
//   if (!iso) return "—";
//   try {
//     return new Date(iso).toLocaleDateString("en-IN", {
//       day: "2-digit", month: "short", year: "numeric",
//     });
//   } catch {
//     return "—";
//   }
// }

// function classifyError(
//   err: unknown,
//   section: ProfileSectionError["section"],
// ): ProfileSectionError {
//   if (err && typeof err === "object" && "response" in err) {
//     const axiosErr = err as {
//       response?: { status?: number; data?: { detail?: { code?: string; message?: string } | string } };
//     };
//     const status = axiosErr.response?.status;
//     const detail = axiosErr.response?.data?.detail;

//     if (status === 401) return { section, code: "unauthenticated", message: "Session expired. Please log in again.", status };
//     if (status === 403) return { section, code: "forbidden",       message: "You don't have permission to view this.", status };

//     if (detail && typeof detail === "object" && detail.code) {
//       return { section, code: detail.code, message: detail.message ?? "An error occurred.", status };
//     }
//     if (status) {
//       return { section, code: `http_${status}`, message: `Request failed (${status}).`, status };
//     }
//   }
//   return { section, code: "network_error", message: "Could not connect to the server." };
// }

// // ─── Mapper ───────────────────────────────────────────────────────────────────

// function mapDashboardMe(api: ApiDashboardMe): ProfileData {
//   return {
//     userId:            api.user_id,
//     tenantId:          api.tenant_id,
//     tenantName:        api.tenant_name ?? "—",
//     fullName:          api.full_name,
//     displayName:       api.display_name ?? api.full_name,
//     email:             api.email,
//     personalEmail:     "—",                                       // not in API yet
//     phone:             api.mobile_phone ?? "—",
//     role:              api.profile_metadata.role_name,
//     status:            api.profile_metadata.status ?? "—",
//     jobTitle:          api.title ?? api.job_title ?? "—",
//     department:        api.department ?? "—",
//     employeeId:        api.profile_metadata.employee_id ?? "—",
//     companyName:       api.profile_metadata.company_name ?? "—",
//     workLocation:      api.office_info ?? "—",
//     reportingManager:  api.manager ?? "—",
//     userPrincipalName: api.profile_metadata.user_principal_name ?? "—",
//     createdAt:         fmt(api.profile_metadata.created_at),
//     lastSyncedAt:      fmt(api.profile_metadata.graph_last_synced_at),
//     avatarUrl:         null,                                      // not in API yet
//     bio:               "",                                        // not in API yet
//     skills:            [],                                        // not in API yet
//     daysInOfficeTotal:        api.days_in_office_total,
//     daysInOfficeCurrentMonth: api.days_in_office_current_month,
//     daysInOfficeCurrentYear:  api.days_in_office_current_year,
//     teamRankCurrentYear:      api.team_rank_current_year,
//     teamMemberCount:          api.team_member_count,
//     favoriteSeat: api.favorite_seat
//       ? {
//           seatId:       api.favorite_seat.seat_id,
//           seatCode:     api.favorite_seat.seat_code,
//           bookingCount: api.favorite_seat.booking_count,
//         }
//       : null,
//   };
// }

// function mapPreferences(api: ApiDashboardMe, override: LocalPrefsOverride): SeatPreferences {
//   const amenities: AmenityPreference[] = (api.preferences?.amenities ?? []).map((a) => ({
//     id:          a.id,
//     key:         a.key,
//     name:        a.name,
//     category:    a.category,
//     description: a.description,
//     icon:        a.icon,
//   }));

//   return {
//     amenities,
//     preferredOffice:  override.preferredOffice  ?? "—",
//     preferredFloor:   override.preferredFloor   ?? "—",
//     seatType:         override.seatType         ?? "—",
//     nearTeammates:    override.nearTeammates     ?? [],
//     awayFrom:         override.awayFrom          ?? [],
//     noisePreference:  override.noisePreference   ?? "—",
//     otherPreferences: override.otherPreferences  ?? [],
//   };
// }

// // ─── In-memory overrides (no backend endpoints yet) ───────────────────────────

// interface LocalProfileOverride {
//   displayName?:   string;
//   phone?:         string;
//   personalEmail?: string;
//   bio?:           string;
//   skills?:        string[];
//   avatarUrl?:     string;
// }

// interface LocalPrefsOverride {
//   preferredOffice?:  string;
//   preferredFloor?:   string;
//   seatType?:         string;
//   nearTeammates?:    string[];
//   awayFrom?:         string[];
//   noisePreference?:  string;
//   otherPreferences?: string[];
// }

// let localProfileOverride: LocalProfileOverride = {};
// let localPrefsOverride:   LocalPrefsOverride   = {};

// // ─── Main fetch ───────────────────────────────────────────────────────────────

// export async function getProfileData(): Promise<ProfileResult> {
//   try {
//     const { data } = await axiosInstance.get<ApiDashboardMe>("/dashboard/me");
//     const profile     = { ...mapDashboardMe(data), ...localProfileOverride };
//     const preferences = mapPreferences(data, localPrefsOverride);

//     return {
//       ok:     true,
//       data:   { profile, preferences },
//       errors: [],
//     };
//   } catch (err) {
//     return { ok: false, fatal: classifyError(err, "profile") };
//   }
// }

// // ─── Mutations ────────────────────────────────────────────────────────────────

// export async function updateProfile(payload: ApiUpdateProfilePayload): Promise<ProfileData> {
//   // No PATCH endpoint yet — persist locally and re-derive from fresh fetch
//   localProfileOverride = {
//     ...localProfileOverride,
//     ...(payload.display_name   !== undefined && { displayName:   payload.display_name   }),
//     ...(payload.phone          !== undefined && { phone:          payload.phone          }),
//     ...(payload.personal_email !== undefined && { personalEmail: payload.personal_email }),
//     ...(payload.bio            !== undefined && { bio:            payload.bio            }),
//     ...(payload.skills         !== undefined && { skills:         payload.skills         }),
//     ...(payload.avatar_url     !== undefined && { avatarUrl:      payload.avatar_url     }),
//   };

//   const { data } = await axiosInstance.get<ApiDashboardMe>("/dashboard/me");
//   return { ...mapDashboardMe(data), ...localProfileOverride };
// }

// export async function updatePreferences(
//   payload: ApiUpdatePreferencesPayload,
// ): Promise<SeatPreferences> {
//   // No PATCH endpoint yet — persist locally
//   localPrefsOverride = {
//     preferredOffice:  payload.preferred_office    ?? localPrefsOverride.preferredOffice,
//     preferredFloor:   payload.preferred_floor     ?? localPrefsOverride.preferredFloor,
//     seatType:         payload.seat_type           ?? localPrefsOverride.seatType,
//     nearTeammates:    payload.near_teammates       ?? localPrefsOverride.nearTeammates,
//     awayFrom:         payload.away_from            ?? localPrefsOverride.awayFrom,
//     noisePreference:  payload.noise_preference     ?? localPrefsOverride.noisePreference,
//     otherPreferences: payload.other_preferences    ?? localPrefsOverride.otherPreferences,
//   };

//   // Re-fetch to get latest amenities from API and merge with local overrides
//   const { data } = await axiosInstance.get<ApiDashboardMe>("/dashboard/me");
//   return mapPreferences(data, localPrefsOverride);
// }

// export async function uploadAvatar(_file: File): Promise<string> {
//   // No avatar upload endpoint yet — return empty so UI falls back to initials
//   return "";
// }

import { axiosInstance } from "@/lib/http/axios";
import type {
  ApiDashboardMe,
  ApiUpdateProfilePayload,
  ApiUpdatePreferencesPayload,
  ProfileData,
  ProfileResult,
  ProfileSectionError,
  SeatPreferences,
} from "../types/profile.types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function classifyError(
  err: unknown,
  section: ProfileSectionError["section"],
): ProfileSectionError {
  if (err && typeof err === "object" && "response" in err) {
    const axiosErr = err as {
      response?: { status?: number; data?: { detail?: { code?: string; message?: string } | string } };
    };
    const status = axiosErr.response?.status;
    const detail = axiosErr.response?.data?.detail;

    if (status === 401) return { section, code: "unauthenticated", message: "Session expired. Please log in again.", status };
    if (status === 403) return { section, code: "forbidden",       message: "You don't have permission to view this.", status };

    if (detail && typeof detail === "object" && detail.code) {
      return { section, code: detail.code, message: detail.message ?? "An error occurred.", status };
    }
    if (status) {
      return { section, code: `http_${status}`, message: `Request failed (${status}).`, status };
    }
  }
  return { section, code: "network_error", message: "Could not connect to the server." };
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

function mapDashboardMe(api: ApiDashboardMe): ProfileData {
  return {
    // From API
    displayName:      api.display_name ?? api.full_name,
    email:            api.email,
    phone:            api.mobile_phone     ?? "—",
    role:             api.profile_metadata.role_name,
    jobTitle:         api.title ?? api.job_title ?? "—",
    department:       api.department       ?? "—",
    workLocation:     api.office_info      ?? "—",
    employeeId:       api.profile_metadata.employee_id ?? "—",
    reportingManager: api.manager          ?? "—",
    // Not in API yet
    avatarUrl:        null,
    dateOfJoining:    "—",
    dateOfBirth:      "—",
    gender:           "—",
    employmentType:   "—",
    personalEmail:    "—",
    bio:              "",
    skills:           [],
  };
}

function mapPreferences(api: ApiDashboardMe, override: LocalPrefsOverride): SeatPreferences {
  return {
    preferredAmenities: (api.preferences?.amenities ?? []).map((a) => a.name),
    preferredOffice:    override.preferredOffice ?? "—",
    preferredFloor:     override.preferredFloor  ?? "—",
    seatType:           override.seatType        ?? "—",
    nearTeammates:      override.nearTeammates   ?? [],
    awayFrom:           override.awayFrom        ?? [],
    noisePreference:    override.noisePreference ?? "—",
    otherPreferences:   override.otherPreferences ?? [],
  };
}

// ─── In-memory overrides ──────────────────────────────────────────────────────

interface LocalProfileOverride {
  displayName?:   string;
  phone?:         string;
  personalEmail?: string;
  bio?:           string;
  skills?:        string[];
  avatarUrl?:     string;
}

interface LocalPrefsOverride {
  preferredOffice?:  string;
  preferredFloor?:   string;
  seatType?:         string;
  nearTeammates?:    string[];
  awayFrom?:         string[];
  noisePreference?:  string;
  otherPreferences?: string[];
}

let localProfileOverride: LocalProfileOverride = {};
let localPrefsOverride:   LocalPrefsOverride   = {};

// ─── Main fetch ───────────────────────────────────────────────────────────────

export async function getProfileData(): Promise<ProfileResult> {
  try {
    const { data } = await axiosInstance.get<ApiDashboardMe>("/dashboard/me");
    const profile     = { ...mapDashboardMe(data), ...localProfileOverride };
    const preferences = mapPreferences(data, localPrefsOverride);
    return { ok: true, data: { profile, preferences }, errors: [] };
  } catch (err) {
    return { ok: false, fatal: classifyError(err, "profile") };
  }
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function updateProfile(payload: ApiUpdateProfilePayload): Promise<ProfileData> {
  localProfileOverride = {
    ...localProfileOverride,
    ...(payload.display_name   !== undefined && { displayName:   payload.display_name   }),
    ...(payload.phone          !== undefined && { phone:         payload.phone          }),
    ...(payload.personal_email !== undefined && { personalEmail: payload.personal_email }),
    ...(payload.bio            !== undefined && { bio:           payload.bio            }),
    ...(payload.skills         !== undefined && { skills:        payload.skills         }),
    ...(payload.avatar_url     !== undefined && { avatarUrl:     payload.avatar_url     }),
  };

  const { data } = await axiosInstance.get<ApiDashboardMe>("/dashboard/me");
  return { ...mapDashboardMe(data), ...localProfileOverride };
}

export async function updatePreferences(
  payload: ApiUpdatePreferencesPayload,
): Promise<SeatPreferences> {
  localPrefsOverride = {
    preferredOffice:  payload.preferred_office  ?? localPrefsOverride.preferredOffice,
    preferredFloor:   payload.preferred_floor   ?? localPrefsOverride.preferredFloor,
    seatType:         payload.seat_type         ?? localPrefsOverride.seatType,
    nearTeammates:    payload.near_teammates     ?? localPrefsOverride.nearTeammates,
    awayFrom:         payload.away_from         ?? localPrefsOverride.awayFrom,
    noisePreference:  payload.noise_preference  ?? localPrefsOverride.noisePreference,
    otherPreferences: payload.other_preferences ?? localPrefsOverride.otherPreferences,
  };

  const { data } = await axiosInstance.get<ApiDashboardMe>("/dashboard/me");
  return mapPreferences(data, localPrefsOverride);
}

export async function uploadAvatar(_file: File): Promise<string> {
  return "";
}