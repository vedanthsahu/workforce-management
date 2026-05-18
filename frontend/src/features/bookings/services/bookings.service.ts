// import { axiosInstance } from "@/lib/http/axios";
// import { Booking, BookingSummary, RawBooking } from "../types/bookings.types";
// import type { ApiTeamGroup } from "@/features/dashboard/types/dashboard.types";

// const BASE = "/bookings";


// // ── Status normaliser ─────────────────────────────────────────────────────────
// function normaliseStatus(raw: string): "confirmed" | "cancelled" | "pending" {
//   const s = raw.toUpperCase();
//   if (s === "CONFIRMED" || s === "ACTIVE") return "confirmed";
//   if (s === "CANCELLED" || s === "CANCELED") return "cancelled";
//   return "pending";
// }

// // ── Mapper ────────────────────────────────────────────────────────────────────
// function mapRawBooking(raw: RawBooking): Booking {
//   const bookedDate = new Date(raw.created_at);
//   const bookedOn = bookedDate.toLocaleDateString("en-US", {
//     month: "short",
//     day: "numeric",
//   });

//   const status = normaliseStatus(raw.booking_status);

//   // Build tags — status first, then any server-supplied extras
//   const tagList: { label: string; variant: "confirmed" | "manager" | "sprint" | "zone" | "recurring" }[] = [];

//   if (status === "confirmed") {
//     tagList.push({ label: "Confirmed", variant: "confirmed" });
//   }

//   for (const t of raw.tags ?? []) {
//     if (t === "confirmed") continue; // already added above
//     if (t === "manager_booked")     tagList.push({ label: "Manager booked",    variant: "manager"  });
//     else if (t === "sprint_day")    tagList.push({ label: "Sprint day",         variant: "sprint"   });
//     else if (t === "engineering_zone") tagList.push({ label: "Engineering zone", variant: "zone"   });
//     else                            tagList.push({ label: t,                    variant: "zone"     });
//   }

//   return {
//     id:               raw.booking_id,
//     location:         raw.site_name     ?? "Office",
//     floor:            raw.floor_name    ?? (raw.floor_id ? `Floor ${raw.floor_id}` : ""),
//     seat:             raw.seat_code     ?? raw.seat_id,
//     date:             raw.booking_date,
//     startTime:        raw.start_time    ?? "9:00 AM",
//     endTime:          raw.end_time      ?? "6:00 PM",
//     isFullDay:        raw.is_full_day   ?? false,
//     status,
//     bookedOn,
//     tags:             tagList,
//     isRecurring:      raw.is_recurring  ?? false,
//     recurringPattern: raw.recurring_pattern,
//   };
// }

// // ── API calls ─────────────────────────────────────────────────────────────────

// export async function fetchPastBookings(): Promise<Booking[]> {
//   const { data } = await axiosInstance.get<RawBooking[]>(`${BASE}/me/past`);
//   return data.map(mapRawBooking);
// }

// export async function fetchCurrentBookings(): Promise<Booking[]> {
//   const { data } = await axiosInstance.get<RawBooking[]>(`${BASE}/me/current`);
//   return data.map(mapRawBooking);
// }

// export async function fetchFutureBookings(): Promise<Booking[]> {
//   const { data } = await axiosInstance.get<RawBooking[]>(`${BASE}/me/future`);
//   return data.map(mapRawBooking);
// }

// export async function fetchCancelledBookings(): Promise<Booking[]> {
//   const { data } = await axiosInstance.get<RawBooking[]>(`${BASE}/me/cancelled`);
//   return data.map(mapRawBooking);
// }

// /** Cancel a booking via POST /{id}/cancel with an optional reason. */
// // export async function cancelBooking(
// //   bookingId: string,
// //   cancellationReason?: string,
// // ): Promise<void> {
// //   await axiosInstance.post(`${BASE}/${bookingId}/cancel`, {
// //     cancellation_reason: cancellationReason ?? null,
// //   });
// // }

// // export async function cancelBooking(
// //   bookingId: string,
// //   cancellationReason?: string,
// // ): Promise<void> {
// //   const body = cancellationReason?.trim()
// //     ? { cancellation_reason: cancellationReason.trim() }
// //     : {};

// //   await axiosInstance.post(`${BASE}/${bookingId}/cancel`, body);
// // }

// // export async function cancelBooking(
// //   bookingId: string,
// //   cancellationReason?: string,
// // ): Promise<void> {
// //   await axiosInstance.post(`${BASE}/${bookingId}/cancel`, {
// //     cancellation_reason: cancellationReason?.trim() || null,
// //   });
// // }

// export async function cancelBooking(
//   bookingId: string,
//   cancellationReason?: string,
// ): Promise<void> {
//   console.log("Cancelling booking ID:", bookingId); // ← check this value
//   try {
//     await axiosInstance.post(`${BASE}/${bookingId}/cancel`, {
//       cancellation_reason: cancellationReason?.trim() || null,
//     });
//   } catch (err: any) {
//     console.error("cancelBooking failed:", JSON.stringify(err?.response?.data, null, 2));
//     throw err;
//   }
// }

// export interface ModifyBookingPayload {
//   site_id: number;
//   building_id: number;
//   floor_id: number;
//   seat_id: number;
//   booking_date: string; // ISO date string "YYYY-MM-DD"
// }

// /** Modify a booking via POST /{id}/modify. */
// export async function modifyBooking(
//   bookingId: string,
//   payload: ModifyBookingPayload,
// ): Promise<void> {
//   await axiosInstance.post(`${BASE}/${bookingId}/modify`, payload);
// }

// // ── Team fetch ────────────────────────────────────────────────────────────────

// export async function fetchCurrentUser() {
//   const { data } = await axiosInstance.get("/auth/me");
//   return data;
// }

// export async function fetchTeamGroups(): Promise<ApiTeamGroup[]> {
//   const { data } = await axiosInstance.get<ApiTeamGroup[]>("/teams/me");
//   return data;
// }

// // ── Summary aggregation ───────────────────────────────────────────────────────
// export function deriveBookingSummary(
//   current: Booking[],
//   future: Booking[],
//   past: Booking[],
//   teamGroups: ApiTeamGroup[] = [],
//   currentUserId: string = "",
// ): BookingSummary {
//   const upcoming = [...current, ...future];
//   const nextBooking = upcoming[0];

//   const nextBookingDate = nextBooking
//     ? (() => {
//         const d = new Date(nextBooking.date);
//         const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
//         return `Next: ${label} · ${nextBooking.seat}`;
//       })()
//     : null;

//   const now = new Date();
//   const completedThisMonth = past.filter((b) => {
//     const d = new Date(b.date);
//     return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
//   }).length;

//   // Exact same logic as deriveStats in dashboard.service.ts
//   const teamInOffice = teamGroups.reduce((acc, g) => {
//     const selfMember = g.members.find((m) => m.user_id === currentUserId);
//     const selfBookedToday = selfMember?.seat != null;
//     return acc + g.booked_today_count - (selfBookedToday ? 1 : 0);
//   }, 0);

//   return {
//     upcomingCount:     upcoming.length,
//     nextBookingDate,
//     completedThisMonth,
//     daysInOffice:      completedThisMonth,
//     teamInOffice,
//   };
// }

import { axiosInstance } from "@/lib/http/axios";
import { Booking, BookingSummary, RawBooking } from "../types/bookings.types";
import type { ApiTeamGroup } from "@/features/dashboard/types/dashboard.types";

const BASE = "/bookings";

// ── Status normaliser ─────────────────────────────────────────────────────────

function normaliseStatus(raw: string): "confirmed" | "cancelled" | "pending" {
  const s = raw.toUpperCase();
  if (s === "CONFIRMED" || s === "ACTIVE")    return "confirmed";
  if (s === "CANCELLED" || s === "CANCELED")  return "cancelled";
  return "pending";
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
    if (t === "confirmed")          continue;
    if (t === "manager_booked")     tagList.push({ label: "Manager booked",     variant: "manager"  });
    else if (t === "sprint_day")    tagList.push({ label: "Sprint day",          variant: "sprint"   });
    else if (t === "engineering_zone") tagList.push({ label: "Engineering zone", variant: "zone"     });
    else                            tagList.push({ label: t,                     variant: "zone"     });
  }

  return {
    id:               raw.booking_id,
    location:         raw.site_name   ?? "Office",
    floor:            raw.floor_name  ?? (raw.floor_id ? `Floor ${raw.floor_id}` : ""),
    seat:             raw.seat_code   ?? raw.seat_id,
    date:             raw.booking_date,
    startTime:        raw.start_time  ?? "9:00 AM",
    endTime:          raw.end_time    ?? "6:00 PM",
    isFullDay:        raw.is_full_day ?? false,
    status,
    bookedOn,
    tags:             tagList,
    isRecurring:      raw.is_recurring      ?? false,
    recurringPattern: raw.recurring_pattern,
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
  booking_date: string; // "YYYY-MM-DD"
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

export function deriveBookingSummary(
  current:       Booking[],
  future:        Booking[],
  past:          Booking[],
  teamGroups:    ApiTeamGroup[] = [],
  currentUserId: string        = "",
): BookingSummary {
  const upcoming    = [...current, ...future].filter((b) => b.status !== "cancelled");
  const nextBooking = upcoming[0];

  const nextBookingDate = nextBooking
    ? (() => {
        const d     = new Date(nextBooking.date);
        const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        return `Next: ${label} · ${nextBooking.seat}`;
      })()
    : null;

  const now                = new Date();
  const completedThisMonth = past.filter((b) => {
    const d = new Date(b.date);
    return (
      d.getMonth()     === now.getMonth() &&
      d.getFullYear()  === now.getFullYear()
    );
  }).length;

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