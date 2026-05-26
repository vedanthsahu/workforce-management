// import { axiosInstance } from "@/lib/http/axios";
// import type {
//   ApiProfile,
//   ApiSeatPreferences,
//   ApiUpdateProfilePayload,
//   ApiUpdatePreferencesPayload,
//   ProfileData,
//   ProfilePageData,
//   ProfileResult,
//   ProfileSectionError,
//   SeatPreferences,
// } from "../types/profile.types";

// // ─── Helpers ──────────────────────────────────────────────────────────────────

// function formatDate(iso?: string): string {
//   if (!iso) return "—";
//   const d = new Date(iso + "T00:00:00");
//   return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
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

// // ─── Mappers ──────────────────────────────────────────────────────────────────

// function mapApiProfile(api: ApiProfile): ProfileData {
//   return {
//     userId:          api.user_id,
//     fullName:        api.full_name,
//     displayName:     api.display_name ?? api.full_name,
//     email:           api.email,
//     personalEmail:   api.personal_email ?? "—",
//     phone:           api.phone          ?? "—",
//     role:            api.role,
//     jobTitle:        api.job_title       ?? "—",
//     department:      api.department      ?? "—",
//     employeeId:      api.employee_id     ?? "—",
//     dateOfJoining:   formatDate(api.date_of_joining),
//     dateOfBirth:     formatDate(api.date_of_birth),
//     gender:          api.gender          ?? "—",
//     employmentType:  api.employment_type ?? "—",
//     workLocation:    api.work_location   ?? "—",
//     reportingManager: api.reporting_manager ?? "—",
//     avatarUrl:       api.avatar_url ?? null,
//     bio:             api.bio     ?? "",
//     skills:          api.skills  ?? [],
//   };
// }

// function mapApiPreferences(api: ApiSeatPreferences): SeatPreferences {
//   return {
//     preferredOffice:    api.preferred_office    ?? "—",
//     preferredFloor:     api.preferred_floor     ?? "—",
//     seatType:           api.seat_type           ?? "—",
//     nearTeammates:      api.near_teammates      ?? [],
//     awayFrom:           api.away_from           ?? [],
//     noisePreference:    api.noise_preference    ?? "—",
//     preferredAmenities: api.preferred_amenities ?? [],
//     otherPreferences:   api.other_preferences   ?? [],
//   };
// }

// // ─── Raw fetchers ─────────────────────────────────────────────────────────────

// async function fetchProfileRaw(): Promise<ApiProfile> {
//   const { data } = await axiosInstance.get<ApiProfile>("/profile/me");
//   return data;
// }

// async function fetchPreferencesRaw(): Promise<ApiSeatPreferences> {
//   const { data } = await axiosInstance.get<ApiSeatPreferences>("/profile/me/preferences");
//   return data;
// }

// // ─── Main fetch (parallel, mirrors getDashboardData pattern) ──────────────────

// export async function getProfileData(): Promise<ProfileResult> {
//   const [profileResult, prefsResult] = await Promise.allSettled([
//     fetchProfileRaw(),
//     fetchPreferencesRaw(),
//   ]);

//   // Profile is fatal — nothing to render without it
//   if (profileResult.status === "rejected") {
//     return { ok: false, fatal: classifyError(profileResult.reason, "profile") };
//   }

//   const sectionErrors: ProfileSectionError[] = [];

//   const preferences: SeatPreferences = (() => {
//     if (prefsResult.status === "fulfilled") return mapApiPreferences(prefsResult.value);
//     sectionErrors.push(classifyError(prefsResult.reason, "preferences"));
//     return {
//       preferredOffice:    "—",
//       preferredFloor:     "—",
//       seatType:           "—",
//       nearTeammates:      [],
//       awayFrom:           [],
//       noisePreference:    "—",
//       preferredAmenities: [],
//       otherPreferences:   [],
//     };
//   })();

//   return {
//     ok: true,
//     data: {
//       profile:     mapApiProfile(profileResult.value),
//       preferences,
//     },
//     errors: sectionErrors,
//   };
// }

// // ─── Mutations ────────────────────────────────────────────────────────────────

// export async function updateProfile(payload: ApiUpdateProfilePayload): Promise<ProfileData> {
//   const { data } = await axiosInstance.patch<ApiProfile>("/profile/me", payload);
//   return mapApiProfile(data);
// }

// export async function updatePreferences(payload: ApiUpdatePreferencesPayload): Promise<SeatPreferences> {
//   const { data } = await axiosInstance.patch<ApiSeatPreferences>("/profile/me/preferences", payload);
//   return mapApiPreferences(data);
// }

// export async function uploadAvatar(file: File): Promise<string> {
//   const form = new FormData();
//   form.append("avatar", file);
//   const { data } = await axiosInstance.post<{ avatar_url: string }>("/profile/me/avatar", form, {
//     headers: { "Content-Type": "multipart/form-data" },
//   });
//   return data.avatar_url;
// }

import { axiosInstance } from "@/lib/http/axios";
import type {
  ApiUpdateProfilePayload,
  ApiUpdatePreferencesPayload,
  ProfileData,
  ProfilePageData,
  ProfileResult,
  ProfileSectionError,
  SeatPreferences,
} from "../types/profile.types";

// ─── /auth/me shape (what the backend actually returns) ───────────────────────

interface AuthMe {
  user_id:              string;
  tenant_id:            string;
  email:                string;
  full_name:            string;
  display_name?:        string;
  name?:                string;
  microsoft_object_id?: string;
  user_principal_name?: string;
  mobile_phone?:        string;
  office_location?:     string;
  department?:          string;
  job_title?:           string;
  company_name?:        string;
  employee_id?:         string;
  manager_user_id?:     string;
  home_site_id?:        string;
  role:                 string;
  status?:              string;
  graph_last_synced_at?: string;
  created_at?:          string;
  updated_at?:          string;
  permissions?:         string[];
}

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

// ─── Mapper ───────────────────────────────────────────────────────────────────

function mapAuthMe(api: AuthMe): ProfileData {
  return {
    userId:           api.user_id,
    fullName:         api.full_name,
    displayName:      api.display_name ?? api.full_name,
    email:            api.email,
    personalEmail:    "—",                           // not in /auth/me
    phone:            api.mobile_phone   ?? "—",
    role:             api.role,
    jobTitle:         api.job_title      ?? "—",
    department:       api.department     ?? "—",
    employeeId:       api.employee_id    ?? "—",
    dateOfJoining:    "—",                           // not in /auth/me
    dateOfBirth:      "—",                           // not in /auth/me
    gender:           "—",                           // not in /auth/me
    employmentType:   "—",                           // not in /auth/me
    workLocation:     api.office_location ?? "—",
    reportingManager: "—",                           // manager_user_id is an ID, not a name
    avatarUrl:        null,                          // not in /auth/me
    bio:              "",                            // not in /auth/me
    skills:           [],                            // not in /auth/me
  };
}

const STATIC_PREFERENCES: SeatPreferences = {
  preferredOffice:    "—",
  preferredFloor:     "—",
  seatType:           "—",
  nearTeammates:      [],
  awayFrom:           [],
  noisePreference:    "—",
  preferredAmenities: [],
  otherPreferences:   [],
};

// ─── Main fetch ───────────────────────────────────────────────────────────────

export async function getProfileData(): Promise<ProfileResult> {
  try {
    const { data } = await axiosInstance.get<AuthMe>("/auth/me");
    return {
      ok: true,
      data: {
        profile:     mapAuthMe(data),
        preferences: STATIC_PREFERENCES,
      },
      errors: [],
    };
  } catch (err) {
    return { ok: false, fatal: classifyError(err, "profile") };
  }
}

// ─── Mutations (optimistic local update only — no backend endpoints yet) ──────

// Holds in-memory overrides so edits persist within the session
let localProfileOverride: Partial<ProfileData> = {};
let localPrefsOverride:   SeatPreferences      = { ...STATIC_PREFERENCES };

export async function updateProfile(payload: ApiUpdateProfilePayload): Promise<ProfileData> {
  // No PATCH /profile/me endpoint — apply locally
  localProfileOverride = {
    ...localProfileOverride,
    ...(payload.display_name   && { displayName:   payload.display_name   }),
    ...(payload.phone          && { phone:          payload.phone          }),
    ...(payload.personal_email && { personalEmail: payload.personal_email }),
    ...(payload.bio            && { bio:            payload.bio            }),
    ...(payload.skills         && { skills:         payload.skills         }),
    ...(payload.avatar_url     && { avatarUrl:      payload.avatar_url     }),
  };

  // Re-fetch base and merge override
  const { data } = await axiosInstance.get<AuthMe>("/auth/me");
  return { ...mapAuthMe(data), ...localProfileOverride };
}

export async function updatePreferences(payload: ApiUpdatePreferencesPayload): Promise<SeatPreferences> {
  // No PATCH /profile/me/preferences endpoint — apply locally
  localPrefsOverride = {
    preferredOffice:    payload.preferred_office    ?? localPrefsOverride.preferredOffice,
    preferredFloor:     payload.preferred_floor     ?? localPrefsOverride.preferredFloor,
    seatType:           payload.seat_type           ?? localPrefsOverride.seatType,
    nearTeammates:      payload.near_teammates      ?? localPrefsOverride.nearTeammates,
    awayFrom:           payload.away_from           ?? localPrefsOverride.awayFrom,
    noisePreference:    payload.noise_preference    ?? localPrefsOverride.noisePreference,
    preferredAmenities: payload.preferred_amenities ?? localPrefsOverride.preferredAmenities,
    otherPreferences:   payload.other_preferences   ?? localPrefsOverride.otherPreferences,
  };
  return localPrefsOverride;
}

export async function uploadAvatar(_file: File): Promise<string> {
  // No avatar upload endpoint — return empty so UI falls back to initials
  return "";
}