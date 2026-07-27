
import { axiosInstance } from "@/lib/http/axios";
import type {
  ApiAuthMe,
  ApiBooking,
  ApiBuilding,
  ApiDashboardMe,
  ApiFloor,
  ApiSite,
  ApiUpdatePreferencesPayload,
  ApiUpdateProfilePayload,
  ApiWorkPreferences,
  AccountInfo,
  ActivitySummary,
  BookingData,
  ProfileData,
  ProfileResult,
  ProfileSectionError,
  SeatPreferences,
  ApiAmenity,
} from "../types/profile.types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safeStr(val: unknown): string {
  if (typeof val === "string") return val;
  if (val === null || val === undefined) return "—";
  if (typeof val === "object") {
    const o = val as Record<string, unknown>;
    return String(o.display_name ?? o.full_name ?? o.name ?? o.email ?? "—");
  }
  return String(val);
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "numeric", month: "short", year: "numeric",
    });
  } catch {
    return "—";
  }
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "numeric", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

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
    if (status) return { section, code: `http_${status}`, message: `Request failed (${status}).`, status };
  }
  return { section, code: "network_error", message: "Could not connect to the server." };
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

function mapDashboardMe(api: ApiDashboardMe, authMe?: ApiAuthMe): ProfileData {
  return {
    displayName:      safeStr(api.display_name ?? api.full_name),
    email:            safeStr(api.email),
    phone:            safeStr(api.mobile_phone),
    role:             safeStr(api.profile_metadata?.role_name ?? authMe?.role_name),
    jobTitle:         safeStr(api.title ?? api.job_title),
    department:       safeStr(api.department),
    workLocation:     safeStr(api.office_info ?? authMe?.office_location),
    avatarUrl:        null,
    employeeId:       safeStr(api.profile_metadata?.employee_id ?? authMe?.employee_id),
    reportingManager: safeStr(api.manager),
    dateOfJoining:    formatDate(api.profile_metadata?.created_at ?? authMe?.created_at),
    bio:
      "Curious developer exploring AI, building intelligent solutions, learning endlessly.",

    skills: ["Next.js", "React", "TypeScript", "FastAPI", "AWS"],
    status: safeStr(api.profile_metadata?.status ?? authMe?.status),
  };
}

function mapAuthMe(api: ApiAuthMe): AccountInfo {
  return {
    username:          api.display_name || api.full_name || api.email,
    role:              api.role_name || api.role,
    lastLogin:         formatDateTime(api.updated_at),
    userPrincipalName: api.user_principal_name || api.email,
  };
}

function mapPreferences(api: ApiDashboardMe): SeatPreferences {
  const wp = api.work_preferences;
  return {
    preferredOfficeId:     wp?.site_id       ?? "",
    preferredOfficeName:   wp?.site_name     ?? "—",
    preferredBuildingId:   wp?.building_id   ?? "",
    preferredBuildingName: wp?.building_name ?? "—",
    preferredFloorId:      wp?.floor_id      ?? "",
    preferredFloorName:    wp?.floor_name    ?? "—",
    preferredSeatType:     wp?.seat_type     ?? null,
    preferredAmenities:    (wp?.amenities ?? []).map((a) => ({ id: a.id, name: a.name, category: a.category })),
  };
}

function computeActivitySummary(bookings: BookingData): ActivitySummary {
  const total = bookings.current.length + bookings.future.length + bookings.past.length;
  return {
    totalBookings:    total,
    upcomingBookings: bookings.future.length + bookings.current.length,
    pastBookings:     bookings.past.length,
  };
}

// ─── Local override types ─────────────────────────────────────────────────────

interface LocalProfileOverride {
  bio?:      string;
  skills?:   string[];
  avatarUrl?: string;
}

// ─── Persistent overrides (survive refresh via localStorage) ─────────────────
// Bio/skills/avatar have no backend endpoint yet, so they stay local-only.

// const PROFILE_OVERRIDE_KEY = "seatbook:profile_override";
const PROFILE_OVERRIDE_KEY = (userId: string) =>
  `seatbook:profile_override:${userId}`;

// function loadProfileOverride(): LocalProfileOverride {
//   try {
//     const raw = localStorage.getItem(PROFILE_OVERRIDE_KEY);
//     return raw ? JSON.parse(raw) : {};
//   } catch { return {}; }
// }


function loadProfileOverride(userId: string): LocalProfileOverride {
  try {
    const raw = localStorage.getItem(PROFILE_OVERRIDE_KEY(userId));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}


// function saveProfileOverride(data: LocalProfileOverride) {
//   try { localStorage.setItem(PROFILE_OVERRIDE_KEY, JSON.stringify(data)); } catch {}
// }

function saveProfileOverride(
  userId: string,
  data: LocalProfileOverride
) {
  try {
    localStorage.setItem(
      PROFILE_OVERRIDE_KEY(userId),
      JSON.stringify(data)
    );
  } catch {}
}

// ─── Main fetch ───────────────────────────────────────────────────────────────

export async function getProfileData(): Promise<ProfileResult> {
  try {
    const [dashboardResult, authResult, currentResult, futureResult, pastResult] =
      await Promise.allSettled([
        axiosInstance.get<ApiDashboardMe>("/dashboard/me"),
        axiosInstance.get<ApiAuthMe>("/auth/me"),
        axiosInstance.get<ApiBooking[]>("/bookings/me/current"),
        axiosInstance.get<ApiBooking[]>("/bookings/me/future"),
        axiosInstance.get<ApiBooking[]>("/bookings/me/past"),
      ]);

    if (dashboardResult.status === "rejected") {
      return { ok: false, fatal: classifyError(dashboardResult.reason, "profile") };
    }

    const dashboardData = dashboardResult.value.data;
    const profileOverride =
  loadProfileOverride(dashboardData.user_id);

    const authData      = authResult.status === "fulfilled" ? authResult.value.data : undefined;

    const errors: ProfileSectionError[] = [];

    if (authResult.status === "rejected") {
      errors.push(classifyError(authResult.reason, "account"));
    }
    if (
      currentResult.status === "rejected" ||
      futureResult.status  === "rejected" ||
      pastResult.status    === "rejected"
    ) {
      errors.push({ section: "bookings", code: "fetch_failed", message: "Could not load booking data." });
    }

    const bookings: BookingData = {
      current: currentResult.status === "fulfilled" ? (currentResult.value.data ?? []) : [],
      future:  futureResult.status  === "fulfilled" ? (futureResult.value.data  ?? []) : [],
      past:    pastResult.status    === "fulfilled" ? (pastResult.value.data    ?? []) : [],
    };

    const bestStr = (...vals: (string | null | undefined)[]): string => {
      for (const v of vals) {
        if (v && typeof v === "string" && v.trim() !== "") return v.trim();
      }
      return "—";
    };

    const mergedProfile: ProfileData = {
      ...mapDashboardMe(dashboardData, authData),
      workLocation:  bestStr(authData?.office_location, dashboardData.office_info),
      employeeId:    bestStr(authData?.employee_id,     dashboardData.profile_metadata?.employee_id),
      jobTitle:      bestStr(authData?.job_title,       dashboardData.job_title,  dashboardData.title),
      department:    bestStr(authData?.department,      dashboardData.department),
      phone:         bestStr(authData?.mobile_phone,    dashboardData.mobile_phone),
      status:        bestStr(authData?.status,          dashboardData.profile_metadata?.status),
      dateOfJoining: formatDate(authData?.created_at ?? dashboardData.profile_metadata?.created_at),
      ...profileOverride,  // ← persisted bio/skills/avatar applied last
    };

    const accountInfo: AccountInfo = authData
      ? mapAuthMe(authData)
      : {
          username:          mergedProfile.displayName,
          role:              mergedProfile.role,
          lastLogin:         "—",
          userPrincipalName: mergedProfile.email,
        };

    return {
      ok: true,
      data: {
        profile:         mergedProfile,
        preferences:     mapPreferences(dashboardData),
        accountInfo,
        activitySummary: computeActivitySummary(bookings),
        bookings,
      },
      errors,
    };
  } catch (err) {
    return { ok: false, fatal: classifyError(err, "profile") };
  }
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function updateProfile(payload: ApiUpdateProfilePayload): Promise<ProfileData> {
  const dashResponse =
  await axiosInstance.get<ApiDashboardMe>("/dashboard/me");

const userId = dashResponse.data.user_id;

const existing = loadProfileOverride(userId);
  const updated: LocalProfileOverride = {
    ...existing,
    ...(payload.bio        !== undefined && { bio:       payload.bio        }),
    ...(payload.skills     !== undefined && { skills:    payload.skills     }),
    ...(payload.avatar_url !== undefined && { avatarUrl: payload.avatar_url }),
  };
  saveProfileOverride(userId, updated); // ← persist immediately

  const [dashResult, authResult] = await Promise.allSettled([
    axiosInstance.get<ApiDashboardMe>("/dashboard/me"),
    axiosInstance.get<ApiAuthMe>("/auth/me"),
  ]);

  const dashData = dashResult.status === "fulfilled" ? dashResult.value.data : null;
  const authData = authResult.status === "fulfilled" ? authResult.value.data : undefined;

  if (!dashData) throw new Error("Failed to refresh profile data");

  return {
    ...mapDashboardMe(dashData, authData),
    ...updated,  // ← use the freshly saved override
  };
}

export async function updatePreferences(
  payload: ApiUpdatePreferencesPayload,
): Promise<SeatPreferences> {
  const { data } = await axiosInstance.post<ApiWorkPreferences>(
    "/preferences/me",
    payload,
  );

  return {
    preferredOfficeId:     data.site_id       ?? "",
    preferredOfficeName:   data.site_name     ?? "—",
    preferredBuildingId:   data.building_id   ?? "",
    preferredBuildingName: data.building_name ?? "—",
    preferredFloorId:      data.floor_id      ?? "",
    preferredFloorName:    data.floor_name    ?? "—",
    preferredSeatType:     data.seat_type     ?? null,
    preferredAmenities:    (data.amenities ?? []).map((a) => ({ id: a.id, name: a.name, category: a.category })),
  };
}

export async function uploadAvatar(_file: File): Promise<string> {
  return "";
}

export async function getAvailableAmenities(): Promise<ApiAmenity[]> {
  try {
    const { data } = await axiosInstance.get<{ amenities: ApiAmenity[] }>("/preferences");
    return data.amenities ?? [];
  } catch {
    return [];
  }
}

// ─── Location cascade helpers ─────────────────────────────────────────────────

export async function getSites(): Promise<ApiSite[]> {
  try {
    const { data } = await axiosInstance.get<ApiSite[]>("/sites?page=1&limit=200");
    return data ?? [];
  } catch {
    return [];
  }
}

export async function getBuildingsBySite(siteId: string): Promise<ApiBuilding[]> {
  try {
    const { data } = await axiosInstance.get<ApiBuilding[]>(
      `/buildings?site_id=${siteId}&page=1&limit=200`,
    );
    return data ?? [];
  } catch {
    return [];
  }
}

export async function getFloorsByBuilding(buildingId: string): Promise<ApiFloor[]> {
  try {
    const { data } = await axiosInstance.get<ApiFloor[]>(
      `/buildings/${buildingId}/floors?page=1&limit=200`,
    );
    return data ?? [];
  } catch {
    return [];
  }
}