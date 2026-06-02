import { axiosInstance } from "@/lib/http/axios";
import { Booking, BookingSummary, RawBooking } from "../types/bookings.types";
import type { ApiTeamGroup } from "@/features/dashboard/types/dashboard.types";
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

function mapRawBooking(raw: RawBooking): Booking {
  const bookedDate = new Date(raw.created_at);
  const bookedOn   = bookedDate.toLocaleDateString("en-US", {
    month: "short",
    day:   "numeric",
  });

  const status = normaliseStatus(raw.booking_status);

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

  // ── Date range ──────────────────────────────────────────────────────────
  // Prefer explicit from_date/to_date if the API returns them.
  // Fall back to booking_date for both (single-day booking).
  const fromDate = raw.from_date ?? raw.booking_date;
  const toDate   = raw.to_date   ?? raw.booking_date;

  return {
    id:               raw.booking_id,
    location:         raw.site_name      ?? "Office",
    building:         raw.building_name  ?? "",
    floor:            raw.floor_name     ?? (raw.floor_id ? `Floor ${raw.floor_id}` : ""),
    seat:             raw.seat_code      ?? raw.seat_id,
    // Keep `date` for backward compat — always equals fromDate
    date:             raw.booking_date,
    fromDate,                            // ← NEW
    toDate,                              // ← NEW
    startTime:        raw.start_time     ?? "9:00 AM",
    endTime:          raw.end_time       ?? "6:00 PM",
    isFullDay:        raw.is_full_day    ?? false,
    status,
    bookedOn,
    tags:             tagList,
    isRecurring:      raw.is_recurring      ?? false,
    recurringPattern: raw.recurring_pattern,
    preferences:      extractPreferenceKeys(raw), // ← NEW
    floorId:  raw.floor_id  ? String(raw.floor_id)  : undefined,
seatId:   raw.seat_id   ? String(raw.seat_id)   : undefined,
  };
}

// ── API calls ─────────────────────────────────────────────────────────────────

export async function fetchCurrentBookings(): Promise<Booking[]> {
  const { data } = await axiosInstance.get<RawBooking[]>(`${BASE}/me/current`);
  return data.map(mapRawBooking);
}

export async function fetchFutureBookings(): Promise<Booking[]> {
  const { data } = await axiosInstance.get<RawBooking[]>(`${BASE}/me/future`);
  return data.map(mapRawBooking);
}

export async function fetchPastBookings(): Promise<Booking[]> {
  const { data } = await axiosInstance.get<RawBooking[]>(`${BASE}/me/past`);
  return data.map(mapRawBooking);
}

export async function fetchCancelledBookings(): Promise<Booking[]> {
  const { data } = await axiosInstance.get<RawBooking[]>(`${BASE}/me/cancelled`);
  return data.map(mapRawBooking);
}

export async function cancelBooking(
  bookingId: string,
  cancellationReason?: string,
): Promise<void> {
  try {
    await axiosInstance.post(`${BASE}/${bookingId}/cancel`, {
      cancellation_reason: cancellationReason?.trim() || null,
    });
  } catch (err: any) {
    console.error("cancelBooking failed:", JSON.stringify(err?.response?.data, null, 2));
    throw err;
  }
}

export interface ModifyBookingPayload {
  site_id:      number;
  building_id:  number;
  floor_id:     number;
  seat_id:      number;
  booking_date: string;
}

export async function modifyBooking(
  bookingId: string,
  payload: ModifyBookingPayload,
): Promise<void> {
  await axiosInstance.post(`${BASE}/${bookingId}/modify`, payload);
}

// ── Team / user ───────────────────────────────────────────────────────────────

export async function fetchCurrentUser() {
  const { data } = await axiosInstance.get("/auth/me");
  return data;
}

export async function fetchTeamGroups(): Promise<ApiTeamGroup[]> {
  const { data } = await axiosInstance.get<ApiTeamGroup[]>("/teams/me");
  return data;
}

// ── Summary aggregation ───────────────────────────────────────────────────────

// export function deriveBookingSummary(
//   current:       Booking[],
//   future:        Booking[],
//   past:          Booking[],
//   teamGroups:    ApiTeamGroup[] = [],
//   currentUserId: string        = "",
// ): BookingSummary {
//   const upcoming = [...current, ...future]
//     .filter((b) => b.status !== "cancelled")
//     .sort(
//       (a, b) =>
//         new Date(a.date + "T00:00:00").getTime() -
//         new Date(b.date + "T00:00:00").getTime(),
//     );

//   const nextBooking = upcoming[0];

//   const nextBookingDate = nextBooking
//     ? (() => {
//         const d     = new Date(nextBooking.date + "T00:00:00");
//         const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
//         return `Next: ${label} · ${nextBooking.seat}`;
//       })()
//     : null;

//   const now                = new Date();
//   const completedThisMonth = past.filter((b) => {
//     const d = new Date(b.date);
//     return (
//       d.getMonth()    === now.getMonth() &&
//       d.getFullYear() === now.getFullYear()
//     );
//   }).length;

//   const teamInOffice = teamGroups.reduce((acc, g) => {
//     const selfMember      = g.members.find((m) => m.user_id === currentUserId);
//     const selfBookedToday = selfMember?.seat != null;
//     return acc + g.booked_today_count - (selfBookedToday ? 1 : 0);
//   }, 0);

//   return {
//     upcomingCount:      upcoming.length,
//     nextBookingDate,
//     completedThisMonth,
//     daysInOffice:       completedThisMonth,
//     teamInOffice,
//   };
// }

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
  // Priority: today first, then earliest future date.
  const todayBooking  = upcoming.find((b) => b.date === todayIso);
  const futureBooking = upcoming.find((b) => b.date >  todayIso);
 
  const nextBookingDate = (() => {
    // if (todayBooking) {
    //   // There is a booking today — show it as "Today · Seat X"
    //   return `Today · ${todayBooking.seat}`;
    // }
    if (futureBooking) {
      // No booking today but one coming up — show formatted date
      const d     = new Date(futureBooking.date + "T00:00:00");
      const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      return `Next: ${label} · ${futureBooking.seat}`;
    }
    return null;
  })();
 
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
// bookings.service.ts  — add this new export

// export async function fetchSeatAmenities(
//   floorId: string,
//   seatId: string,
//   bookingDate: string,
// ): Promise<string[]> {
//   try {
//     const { data } = await axiosInstance.get<any[]>(
//       `/floors/${floorId}/seats`,
//       {
//         params: {
//           start_date: bookingDate,
//           end_date:   bookingDate,
//         },
//       },
//     );
//     const match = data.find(
//       (s) => String(s.seat_id) === String(seatId),
//     );
//     if (!match) return [];
//     // matched_amenities contains names like "Window View"; we need the keys.
//     // If your API returns amenity keys directly, use those. Otherwise derive
//     // keys from names by lowercasing + removing spaces — adjust to match your
//     // Preference.key values (e.g. "window", "dualMonitor", "cafeteria").
//     const names: string[] = match.matched_amenities ?? [];
//     return names.map((n: string) =>
//       n.toLowerCase().replace(/\s+/g, ""),  // "Window View" → "windowview"
//     );
//   } catch {
//     return [];
//   }
// }

// export async function fetchSeatAmenities(
//   floorId: string,
//   seatId: string,
//   bookingDate: string,
// ): Promise<string[]> {

//   // ── Add the mapping HERE, at the top of the function ──
//   const AMENITY_NAME_TO_KEY: Record<string, string> = {
//     "window view":   "window",
//     "window":        "window",
//     "cafeteria":     "cafeteria",
//     "dual monitor":  "dualMonitor",
//     "dual monitors": "dualMonitor",
//     "elevator":      "elevator",
//   };

//   try {
//     const { data } = await axiosInstance.get<any[]>(
//       `/floors/${floorId}/seats`,
//       {
//         params: {
//           start_date: bookingDate,
//           end_date:   bookingDate,
//         },
//       },
//     );
// console.log("fetchSeatAmenities raw data:", data);  // ← ADD THIS
//     const match = data.find(
//       (s) => String(s.seat_id) === String(seatId),
//     );
//     if (!match) return [];

//     const names: string[] = match.matched_amenities ?? [];

//     // ── Use the mapping HERE instead of the raw .map() ──
//     return names
//       .map((n: string) => AMENITY_NAME_TO_KEY[n.toLowerCase()] ?? null)
//       .filter(Boolean) as string[];

//   } catch {
//     return [];
//   }
// }

export async function fetchSeatAmenities(
  floorId: string,
  seatId: string,
  bookingDate: string,
): Promise<string[]> {
  try {
    // Step 1: fetch all preferences to get their ids AND keys
    const allPrefs = await fetchPreferences();
    // e.g. [{id: 1, key: "window", name: "Window View"}, ...]

    const allAmenityIds = allPrefs.map((p) => p.id);

    // Step 2: fetch seats passing ALL amenity ids so backend populates matched_amenities
    const { data } = await axiosInstance.get<any[]>(
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

    console.log("matched seat amenities:", match.matched_amenities);

    // Step 4: map display names → keys using the preferences list (no hardcoding)
    const names: string[] = match.matched_amenities ?? [];
    return names
      .map((name: string) => {
        const pref = allPrefs.find(
          (p) => p.name.toLowerCase() === name.toLowerCase()
        );
        return pref?.key ?? null;
      })
      .filter(Boolean) as string[];

  } catch {
    // console.error("fetchSeatAmenities failed:", e);
    return [];
  }
}