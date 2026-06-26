import { axiosInstance } from "@/lib/http/axios";
import { Booking, BookingSummary, RawBooking } from "../types/bookings.types";
import type { ApiTeamGroup } from "@/features/dashboard/types/dashboard.types";
import type { User } from "@/features/auth/types/auth.types";
import { fetchPreferences } from "@/features/book/services/Bookingform.service";

const BASE = "/bookings";

// ── Status normaliser ─────────────────────────────────────────────────────────

function normaliseStatus(raw: string): "confirmed" | "cancelled" | "pending" {
  const s = raw.toUpperCase();
  if (s === "CONFIRMED" || s === "ACTIVE")   return "confirmed";
  if (s === "CANCELLED" || s === "CANCELED") return "cancelled";
  return "pending";
}

// ── Preference key extractor ──────────────────────────────────────────────────
//
// The booking list API may not return amenity data at all. We try three
// shapes in order and fall back to an empty array:
//
//   1. raw.amenity_keys          → string[] of keys  e.g. ["window","dualMonitor"]
//   2. raw.amenities             → {key,name}[]      e.g. [{key:"window",name:"Window View"}]
//   3. raw.tags (filtered)       → tags that look like preference keys (not status tags)
//
// If your backend starts returning amenity data in the booking detail
// endpoint, adjust shape 1 or 2 above to match.

const KNOWN_STATUS_TAGS = new Set([
  "confirmed", "manager_booked", "sprint_day", "engineering_zone",
]);

function extractPreferenceKeys(raw: RawBooking): string[] {
  // Shape 1: direct key array
  if (Array.isArray(raw.amenity_keys) && raw.amenity_keys.length > 0) {
    return raw.amenity_keys;
  }
  // Shape 2: array of {key, name} objects
  if (Array.isArray(raw.amenities) && raw.amenities.length > 0) {
    return raw.amenities.map((a) => a.key).filter(Boolean);
  }
  // Shape 3: tags that are not status tags (best-effort)
  const unknownTags = (raw.tags ?? []).filter((t) => !KNOWN_STATUS_TAGS.has(t));
  if (unknownTags.length > 0) return unknownTags;

  return [];
}

// ── Mapper ────────────────────────────────────────────────────────────────────

function deriveBookingType(raw: RawBooking, currentUserId: string): Booking["bookingType"] {
  if (raw.activity_source === "GUEST_VISIT") {
    return (raw.booking_id && raw.seat_id) ? "guest" : "visit";
  }
  if (raw.booking_type === "GUEST") return "guest";
  const bookedForId = raw.booked_for_user_id ?? raw.user_id;
  const bookedById  = raw.booked_by_user_id;
  if (!bookedById || bookedById === bookedForId) {
    if (bookedForId === currentUserId) return "self";
    return "employee";
  }
  if (bookedForId === currentUserId) return "on_behalf";
  return "employee";
}

function mapRawBooking(raw: RawBooking, currentUserId: string): Booking {
  const createdAt = raw.created_at ?? raw.booking_date;
  const bookedDate = new Date(createdAt);
  const bookedOn   = bookedDate.toLocaleDateString("en-US", {
    month: "short",
    day:   "numeric",
  });

  const status = normaliseStatus(raw.booking_status);
  const bookingType = deriveBookingType(raw, currentUserId);

  const tagList: Booking["tags"] = [];

  if (status === "confirmed") {
    tagList.push({ label: "Confirmed", variant: "confirmed" });
  }

  for (const t of raw.tags ?? []) {
    if (t === "confirmed")             continue;
    if (t === "manager_booked")        tagList.push({ label: "Manager booked",  variant: "manager" });
    else if (t === "sprint_day")       tagList.push({ label: "Sprint day",       variant: "sprint"  });
    else if (t === "engineering_zone") tagList.push({ label: "Engineering zone", variant: "zone"    });
    else                               tagList.push({ label: t,                  variant: "zone"    });
  }

  const fromDate = raw.from_date ?? raw.booking_date;
  const toDate   = raw.to_date   ?? raw.booking_date;

  const id = raw.booking_id ?? raw.guest_visit_id ?? "";
  const isVisitOnly = raw.activity_source === "GUEST_VISIT";

  return {
    id,
    location:         raw.site_name      ?? "Office",
    building:         raw.building_name  ?? "",
    floor:            raw.floor_name     ?? (raw.floor_id ? `Floor ${raw.floor_id}` : ""),
    seat:             raw.seat_code      ?? raw.seat_id ?? (isVisitOnly ? "—" : ""),
    date:             raw.booking_date,
    fromDate,
    toDate,
    startTime:        raw.start_time     ?? "9:00 AM",
    endTime:          raw.end_time       ?? "6:00 PM",
    isFullDay:        raw.is_full_day    ?? false,
    status,
    bookedOn,
    tags:             tagList,
    isRecurring:      raw.is_recurring      ?? false,
    recurringPattern: raw.recurring_pattern,
    preferences:      extractPreferenceKeys(raw),
    siteId:           raw.site_id     ? String(raw.site_id)     : undefined,
    buildingId:       raw.building_id ? String(raw.building_id) : undefined,
    floorId:          raw.floor_id    ? String(raw.floor_id)    : undefined,
    seatId:           raw.seat_id     ? String(raw.seat_id)     : undefined,
    bookingType,
    bookedByUserId:   raw.booked_by_user_id,
    bookedByName:     raw.booked_by_name ?? undefined,
    bookedByRole:     raw.booked_by_email ?? undefined,
    bookedForUserId:  raw.booked_for_user_id ?? undefined,
    bookedForName:    raw.booked_for_name ?? raw.guest_name ?? undefined,
    bookedForGuestId: raw.booked_for_guest_id ?? undefined,
    guestName:        raw.guest_name ?? undefined,
    guestEmail:       raw.guest_email ?? undefined,
    guestType:        raw.guest_type ?? undefined,
    purposeOfVisit:   raw.purpose_of_visit ?? undefined,
    hostName:         raw.host_name ?? undefined,
    hostUserId:       raw.host_user_id ? String(raw.host_user_id) : undefined,
    guestVisitId:     raw.guest_visit_id ?? undefined,
    activitySource:   (raw.activity_source as Booking["activitySource"]) ?? "BOOKING",
    createdAt:        raw.created_at ?? raw.booking_date,
  };
}

// ── API calls ─────────────────────────────────────────────────────────────────

export async function fetchCurrentBookings(currentUserId: string): Promise<Booking[]> {
  const { data } = await axiosInstance.get<RawBooking[]>(`${BASE}/me/current`);
  return data.map((raw) => mapRawBooking(raw, currentUserId));
}

export async function fetchFutureBookings(currentUserId: string): Promise<Booking[]> {
  const { data } = await axiosInstance.get<RawBooking[]>(`${BASE}/me/future`);
  return data.map((raw) => mapRawBooking(raw, currentUserId));
}

export async function fetchPastBookings(currentUserId: string): Promise<Booking[]> {
  const { data } = await axiosInstance.get<RawBooking[]>(`${BASE}/me/past`);
  return data.map((raw) => mapRawBooking(raw, currentUserId));
}

export async function fetchCancelledBookings(currentUserId: string): Promise<Booking[]> {
  const { data } = await axiosInstance.get<RawBooking[]>(`${BASE}/me/cancelled`);
  return data.map((raw) => mapRawBooking(raw, currentUserId));
}

// ── Delegated bookings (booked BY current user for others) ───────────────────

export async function fetchDelegatedCurrentBookings(currentUserId: string): Promise<Booking[]> {
  const { data } = await axiosInstance.get<RawBooking[]>(`${BASE}/delegated/current`);
  return data.map((raw) => mapRawBooking(raw, currentUserId));
}

export async function fetchDelegatedFutureBookings(currentUserId: string): Promise<Booking[]> {
  const { data } = await axiosInstance.get<RawBooking[]>(`${BASE}/delegated/future`);
  return data.map((raw) => mapRawBooking(raw, currentUserId));
}

export async function fetchDelegatedPastBookings(currentUserId: string): Promise<Booking[]> {
  const { data } = await axiosInstance.get<RawBooking[]>(`${BASE}/delegated/past`);
  return data.map((raw) => mapRawBooking(raw, currentUserId));
}

export async function cancelBooking(
  bookingId: string,
  cancellationReason?: string,
): Promise<void> {
  await axiosInstance.post(`${BASE}/${bookingId}/cancel`, {
    cancellation_reason: cancellationReason?.trim() || null,
  });
}

export async function cancelGuestBooking(
  bookingId: string,
  cancellationReason?: string,
): Promise<void> {
  await axiosInstance.post(`/guest-bookings/${bookingId}/cancel`, {
    cancellation_reason: cancellationReason?.trim() || null,
  });
}

export type GuestWorkflowAction =
  | "MODIFY_VISIT_ONLY"
  | "MODIFY_VISIT_AND_BOOKING"
  | "ADD_BOOKING"
  | "CANCEL_BOOKING"
  | "CANCEL_VISIT";

export async function guestVisitWorkflow(
  guestVisitId: string,
  action: GuestWorkflowAction,
  payload?: Record<string, unknown>,
): Promise<unknown> {
  const { data } = await axiosInstance.post(
    `/guest-visits/${guestVisitId}/workflow`,
    { action, ...payload },
  );
  return data;
}

// ── Team / user ───────────────────────────────────────────────────────────────

export async function fetchCurrentUser(): Promise<User> {
  const { data } = await axiosInstance.get<User>("/auth/me");
  return data;
}

export async function fetchTeamGroups(): Promise<ApiTeamGroup[]> {
  const { data } = await axiosInstance.get<ApiTeamGroup[]>("/teams/me");
  return data;
}

// ── Summary aggregation ───────────────────────────────────────────────────────

export function deriveBookingSummary(
  current:       Booking[],   // today's bookings from /bookings/me/current
  future:        Booking[],   // future bookings  from /bookings/me/future
  past:          Booking[],
  teamGroups:    ApiTeamGroup[] = [],
  currentUserId: string        = "",
): BookingSummary {
  const todayIso = new Date().toISOString().slice(0, 10);

  // All non-cancelled upcoming (current + future), sorted ascending by date
  const upcoming = [...current, ...future]
    .filter((b) => b.status !== "cancelled")
    .sort(
      (a, b) =>
        new Date(a.date + "T00:00:00").getTime() -
        new Date(b.date + "T00:00:00").getTime(),
    );

  // ── Next booking label ────────────────────────────────────────────────────
  // Earliest upcoming date strictly after today.
  const futureBooking = upcoming.find((b) => b.date > todayIso);

  const nextBookingDate = futureBooking
    ? (() => {
        const d     = new Date(futureBooking.date + "T00:00:00");
        const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        return `Next: ${label} · ${futureBooking.seat}`;
      })()
    : null;

  // ── Completed this month ──────────────────────────────────────────────────
  const now                = new Date();
  const completedThisMonth = past.filter((b) => {
    const d = new Date(b.date);
    return (
      d.getMonth()    === now.getMonth() &&
      d.getFullYear() === now.getFullYear()
    );
  }).length;

  // ── Team in office ────────────────────────────────────────────────────────
  const teamInOffice = teamGroups.reduce((acc, g) => {
    const selfMember      = g.members.find((m) => m.user_id === currentUserId);
    const selfBookedToday = selfMember?.seat != null;
    return acc + g.booked_today_count - (selfBookedToday ? 1 : 0);
  }, 0);

  return {
    upcomingCount:      upcoming.length,
    nextBookingDate,
    completedThisMonth,
    daysInOffice:       completedThisMonth,
    teamInOffice,
  };
}

// ── Seat amenities ────────────────────────────────────────────────────────────

interface SeatAmenityMatch {
  seat_id: string | number;
  matched_amenities?: string[];
}

export async function fetchSeatAmenities(
  floorId: string,
  seatId: string,
  bookingDate: string,
): Promise<string[]> {
  try {
    // Step 1: fetch all preferences to get their ids and keys
    const allPrefs = await fetchPreferences();
    const allAmenityIds = allPrefs.map((p) => p.id);

    // Step 2: fetch seats passing all amenity ids so the backend populates matched_amenities
    const { data } = await axiosInstance.get<SeatAmenityMatch[]>(
      `/floors/${floorId}/seats`,
      {
        params: {
          start_date:  bookingDate,
          end_date:    bookingDate,
          amenity_ids: allAmenityIds,
        },
        paramsSerializer: (p) => {
          const parts: string[] = [];
          Object.entries(p).forEach(([key, value]) => {
            if (Array.isArray(value)) {
              value.forEach((v) => parts.push(`${key}=${encodeURIComponent(v)}`));
            } else {
              parts.push(`${key}=${encodeURIComponent(String(value))}`);
            }
          });
          return parts.join("&");
        },
      }
    );

    // Step 3: find our specific seat
    const match = data.find((s) => String(s.seat_id) === String(seatId));
    if (!match) return [];

    // Step 4: map display names → keys using the preferences list (no hardcoding)
    const names = match.matched_amenities ?? [];
    return names
      .map((name) => {
        const pref = allPrefs.find(
          (p) => p.name.toLowerCase() === name.toLowerCase()
        );
        return pref?.key ?? null;
      })
      .filter((key): key is string => key !== null);
  } catch {
    return [];
  }
}
