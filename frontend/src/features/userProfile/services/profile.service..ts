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