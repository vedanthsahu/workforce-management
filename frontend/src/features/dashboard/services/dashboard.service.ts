import { axiosInstance } from "@/lib/http/axios";
import type {
  ApiBooking,
  ApiDashboardMe,
  ApiFavouriteSeat,
  ApiTeamGroup,
  Booking,
  DashboardData,
  DashboardStats,
  FavouriteSeat,
  TeamMember,
  TodayBookingInfo,
  WeekDay,
} from "../types/dashboard.types";
import type { User } from "@/features/auth/types/auth.types";
import {
  AVATAR_COLORS,
  DAY_LABELS,
  DEFAULT_BOOKING_START_TIME,
  DEFAULT_BOOKING_END_TIME,
} from "../utils/constants";

// ─── Error types ──────────────────────────────────────────────────────────────

export type DashboardSectionError = {
  section: "user" | "dashboardMe" | "currentBookings" | "futureBookings" | "team";
  code: string;
  message: string;
  status?: number;
};

export type DashboardResult =
  | { ok: true; data: DashboardData; errors: DashboardSectionError[] }
  | { ok: false; fatal: DashboardSectionError };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapBookingStatus(status: string): "Confirmed" | "Pending" | "Cancelled" {
  const s = status.toUpperCase();
  if (s === "CONFIRMED" || s === "ACTIVE")   return "Confirmed";
  if (s === "CANCELLED" || s === "CANCELED") return "Cancelled";
  return "Pending";
}

function formatBookingDate(isoDate: string): string {
  const d = new Date(isoDate + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function toInitials(fullName: string): string {
  return fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

function pickAvatarColor(index: number): string {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

function buildWeekDays(bookedDates: Set<string>): WeekDay[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - 3 + i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return {
      date:       d.getDate(),
      dayLabel:   DAY_LABELS[d.getDay()],
      isToday:    i === 3,
      hasBooking: bookedDates.has(iso),
      hasDot:     i === 3 || bookedDates.has(iso),
    };
  });
}

function mapFavouriteSeat(seat: ApiFavouriteSeat | null): FavouriteSeat | null {
  if (!seat) return null;
  const floor = seat.floor_name ?? (seat.floor_id ? `Floor ${seat.floor_id}` : "");
  const site  = seat.site_name ?? seat.building_name ?? "Office";
  return {
    id:          seat.seat_id,
    seatCode:    seat.seat_code ?? seat.seat_id,
    label:       seat.seat_code ?? seat.seat_id,
    location:    [floor, site].filter(Boolean).join(" · "),
    description: "Favourite seat",
    floor,
    floorId:     seat.floor_id ?? null,
    buildingId:  seat.building_id ?? null,
    siteId:      seat.site_id ?? null,
  };
}

function mapApiBooking(b: ApiBooking, currentUserId: string): Booking {
  const fromDate = b.from_date ?? b.booking_date;
  const toDate   = b.to_date   ?? b.booking_date;

  const bookedById  = b.booked_by_user_id;
  const bookedForId = b.booked_for_user_id ?? b.user_id;
  const isSelf      = !bookedById || bookedById === bookedForId || bookedById === currentUserId && bookedForId === currentUserId;

  return {
    id:          b.booking_id,
    location:    b.site_name      ?? "Office",
    building:    b.building_name  ?? "",
    floor:       b.floor_name     ?? (b.floor_id ? `Floor ${b.floor_id}` : ""),
    date:        formatBookingDate(b.booking_date),
    fromDate,
    toDate,
    startTime:   DEFAULT_BOOKING_START_TIME,
    endTime:     DEFAULT_BOOKING_END_TIME,
    status:      mapBookingStatus(b.booking_status),
    isRecurring: false,
    seatId:      b.seat_code ?? b.seat_id,
    rawSeatId:   b.seat_id  ? String(b.seat_id)  : undefined,
    floorId:     b.floor_id ? String(b.floor_id) : undefined,
    managerNote: "",
    bookedOn:    b.created_at
      ? new Date(b.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
      : undefined,
    bookingType:   isSelf ? "self" : "on_behalf",
    bookedByName:  isSelf ? undefined : (b.booked_by_name ?? undefined),
    bookedByEmail: isSelf ? undefined : (b.booked_by_email ?? undefined),
  };
}

function mapApiTeamToMembers(groups: ApiTeamGroup[], currentUserId: string): TeamMember[] {
  const members: TeamMember[] = [];
  const seenUserIds = new Set<string>();
  let colorIndex = 0;
  for (const group of groups) {
    for (const m of group.members) {
      if (m.user_id === currentUserId) continue;
      if (!m.seat) continue;
      // A colleague can belong to more than one team shared with the
      // current user (groups aren't mutually exclusive) — show them once.
      if (seenUserIds.has(m.user_id)) continue;
      seenUserIds.add(m.user_id);
      members.push({
        id:          m.user_id,
        name:        m.full_name,
        initials:    toInitials(m.full_name),
        floor:       m.seat.floor_id ? `Floor ${m.seat.floor_id}` : "—",
        avatarColor: pickAvatarColor(colorIndex++),
        seatCode:    m.seat.seat_code ?? undefined,
        email:       m.email ?? undefined,
        buildingId:  m.seat.building_id ?? undefined,
      });
    }
  }
  return members;
}

function extractTodayBookingInfo(currentBookings: ApiBooking[]): TodayBookingInfo {
  if (currentBookings.length === 0) {
    return { hasTodayBooking: false, seatCode: null, floor: null, bookingId: null };
  }
  const b = currentBookings[0];
  return {
    hasTodayBooking: true,
    seatCode:        b.seat_code ?? b.seat_id,
    floor:           b.floor_name ?? (b.floor_id ? `Floor ${b.floor_id}` : null),
    bookingId:       b.booking_id,
  };
}

function deriveStats(
  teamGroups: ApiTeamGroup[],
  dashboardMe: ApiDashboardMe,
  currentUserId: string,
): DashboardStats {
  const totalMembers = teamGroups.reduce((acc, g) => {
    const selfInGroup = g.members.some((m) => m.user_id === currentUserId);
    return acc + g.total_members - (selfInGroup ? 1 : 0);
  }, 0);

  const bookedToday = teamGroups.reduce((acc, g) => {
    const selfMember      = g.members.find((m) => m.user_id === currentUserId);
    const selfBookedToday = selfMember?.seat != null;
    return acc + g.booked_today_count - (selfBookedToday ? 1 : 0);
  }, 0);

  return {
    trend:                0,
    teamInOffice:         bookedToday,
    teamRemoteCount:      totalMembers - bookedToday,
    officeVisitsThisYear: dashboardMe.days_in_office_current_year,
    teamRank:             dashboardMe.team_rank_current_year ?? 0,
  };
}

// ─── Error classifier ─────────────────────────────────────────────────────────

function classifyError(
  err: unknown,
  section: DashboardSectionError["section"],
): DashboardSectionError {
  if (err && typeof err === "object" && "response" in err) {
    const axiosErr = err as {
      response?: { status?: number; data?: { detail?: { code?: string; message?: string } | string } };
    };
    const status = axiosErr.response?.status;
    const detail = axiosErr.response?.data?.detail;

    if (status === 401) return { section, code: "unauthenticated", message: "Your session has expired. Please log in again.", status };
    if (status === 403) return { section, code: "forbidden",       message: "You don't have permission to access this data.", status };

    if (detail && typeof detail === "object" && detail.code) {
      return { section, code: detail.code, message: detail.message ?? "An error occurred.", status };
    }
    if (status) {
      return { section, code: `http_${status}`, message: `Request failed (${status}). Please try again.`, status };
    }
  }
  return { section, code: "network_error", message: "Could not connect to the server. Check your connection." };
}

// ─── API fetchers ─────────────────────────────────────────────────────────────

async function fetchCurrentUser(): Promise<User> {
  const { data } = await axiosInstance.get<User>("/auth/me");
  return data;
}

async function fetchDashboardMe(): Promise<ApiDashboardMe> {
  const { data } = await axiosInstance.get<ApiDashboardMe>("/dashboard/me");
  return data;
}

async function fetchCurrentBookingsRaw(): Promise<ApiBooking[]> {
  const { data } = await axiosInstance.get<ApiBooking[]>("/bookings/me/current");
  return data;
}

async function fetchFutureBookingsRaw(): Promise<ApiBooking[]> {
  const { data } = await axiosInstance.get<ApiBooking[]>("/bookings/me/future");
  return data;
}

async function fetchTeamGroupsRaw(): Promise<ApiTeamGroup[]> {
  const { data } = await axiosInstance.get<ApiTeamGroup[]>("/teams/me");
  return data;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function getDashboardData(): Promise<DashboardResult> {
  let user: User;
  try {
    user = await fetchCurrentUser();
  } catch (err) {
    return { ok: false, fatal: classifyError(err, "user") };
  }

  const currentUserId  = user.user_id;
  const sectionErrors: DashboardSectionError[] = [];

  const [dashboardMeResult, currentRawResult, futureRawResult, teamGroupsResult] =
    await Promise.allSettled([
      fetchDashboardMe(),
      fetchCurrentBookingsRaw(),
      fetchFutureBookingsRaw(),
      fetchTeamGroupsRaw(),
    ]);

  const dashboardMe: ApiDashboardMe = (() => {
    if (dashboardMeResult.status === "fulfilled") return dashboardMeResult.value;
    sectionErrors.push(classifyError(dashboardMeResult.reason, "dashboardMe"));
    return {
      favorite_seat:                null,
      second_favorite_seat:         null,
      days_in_office_total:         0,
      days_in_office_current_month: 0,
      days_in_office_current_year:  0,
      team_rank_current_year:       null,
      team_member_count:            0,
    };
  })();

  const currentRaw: ApiBooking[] = (() => {
    if (currentRawResult.status === "fulfilled") return currentRawResult.value;
    sectionErrors.push(classifyError(currentRawResult.reason, "currentBookings"));
    return [];
  })();

  const futureRaw: ApiBooking[] = (() => {
    if (futureRawResult.status === "fulfilled") return futureRawResult.value;
    sectionErrors.push(classifyError(futureRawResult.reason, "futureBookings"));
    return [];
  })();

  const teamGroups: ApiTeamGroup[] = (() => {
    if (teamGroupsResult.status === "fulfilled") return teamGroupsResult.value;
    sectionErrors.push(classifyError(teamGroupsResult.reason, "team"));
    return [];
  })();

  const teamInOfficeToday = mapApiTeamToMembers(teamGroups, currentUserId);
  const stats             = deriveStats(teamGroups, dashboardMe, currentUserId);
  const todayBooking      = extractTodayBookingInfo(currentRaw);

  const allBookedDates = new Set([
    ...currentRaw.map((b) => b.booking_date),
    ...futureRaw.map((b)  => b.booking_date),
  ]);

  const upcomingBookings = [...futureRaw]
    .sort((a, b) => new Date(a.booking_date).getTime() - new Date(b.booking_date).getTime())
    .map((b) => mapApiBooking(b, currentUserId));

  return {
    ok: true,
    data: {
      user,
      stats,
      weekDays:         buildWeekDays(allBookedDates),
      upcomingBookings,
      teamInOfficeToday,
      favouriteSeat:       mapFavouriteSeat(dashboardMe.favorite_seat),
      secondFavouriteSeat: mapFavouriteSeat(dashboardMe.second_favorite_seat ?? null),
      nextBookingDate:  upcomingBookings[0]?.date ?? "—",
      todayBooking,
      daysInOffice:     dashboardMe.days_in_office_current_month,
    },
    errors: sectionErrors,
  };
}

// ✅ cancelBooking is intentionally absent from this service.
// Use cancelBooking from @/features/bookings/services/bookings.service
// which calls POST /bookings/{id}/cancel with an optional cancellation_reason.
