

import { axiosInstance } from "@/lib/http/axios";
import {
  Site,
  Building,
  Floor,
  Seat,
  SeatAvailability,
  CreateBookingPayload,
  CreateBookingResponse,
  Preference,
  PreferenceMatchStatus,
  UiState,
  FetchSeatsParams,
} from "../types/Bookingform.types";

// ── Sites ─────────────────────────────────────────────────────────────────────

export async function fetchSites(): Promise<Site[]> {
  const { data } = await axiosInstance.get<any[]>("/sites");
  return data.map((s) => ({
    id: s.site_id,
    name: s.site_name,
    city: s.city ?? "",
    country: s.country ?? "",
    timezone: s.timezone ?? "",
  }));
}

// ── Buildings ─────────────────────────────────────────────────────────────────

export async function fetchBuildings(siteId: string): Promise<Building[]> {
  const { data } = await axiosInstance.get<any[]>("/buildings", {
    params: { site_id: siteId },
  });
  return data.map((b) => ({
    id: b.building_id,
    siteId: b.site_id,
    name: b.building_name,
  }));
}

// ── Floors ────────────────────────────────────────────────────────────────────

export async function fetchFloors(buildingId: string): Promise<Floor[]> {
  const { data } = await axiosInstance.get<any[]>(
    `/buildings/${buildingId}/floors`
  );
  return data.map((f) => ({
    id: f.floor_id,
    buildingId: f.building_id ?? buildingId,
    name: f.floor_name ?? f.floor_code ?? `Floor ${f.floor_id}`,
    number: parseInt(f.floor_code ?? "0", 10),
  }));
}

// ── Seat ID → SVG id mapping ──────────────────────────────────────────────────

export function seatIdToSvgId(seatId: string | number): string {
  const num = parseInt(String(seatId), 10);
  if (isNaN(num)) {
    console.warn(`[seatIdToSvgId] cannot parse seat_id "${seatId}"`);
    return String(seatId);
  }
  return num === 24 ? "s24" : String(num);
}

export function seatCodeToSvgId(
  _seatCode: string,
  fallbackId: string | number
): string {
  return seatIdToSvgId(fallbackId);
}

// ── Normalise range availability status → seat status ────────────────────────

export function normalizeRangeStatus(
  rangeStatus: string | undefined
): "available" | "booked" | "unavailable" | "yours" {
  switch ((rangeStatus ?? "").toUpperCase()) {
    case "FULLY_AVAILABLE":
      return "available";
    case "PARTIALLY_AVAILABLE":
      return "available";
    case "FULLY_BOOKED":
      return "booked";
    case "UNAVAILABLE":
      return "unavailable";
    case "YOURS":
      return "yours";
    default:
      return "unavailable";
  }
}

// ── Legacy single-date normalizer (kept for backward compat) ──────────────────

export function normalizeStatus(
  raw: string | undefined,
  selectable?: boolean
): "available" | "booked" | "unavailable" | "yours" {
  switch ((raw ?? "").toUpperCase()) {
    case "AVAILABLE":
      return selectable ? "available" : "unavailable";
    case "ACTIVE":
      return "available";
    case "BOOKED":
    case "CONFIRMED":
      return "booked";
    case "YOURS":
      return "yours";
    default:
      return selectable ? "available" : "unavailable";
  }
}

// ── Response shape from GET /floors/{floor_id}/seats ─────────────────────────

interface DailyStatus {
  booking_date: string;
  status: string;
}

interface SeatAvailabilitySummary {
  status: string;
  available_dates: string[];
  unavailable_dates: string[];
  booked_dates: string[];
  blocked_dates: string[];
  daily_statuses: DailyStatus[];
  total_requested_days: number;
  total_available_days: number;
  availability_percentage: number;
}

interface AvailableSeatResponse {
  seat_id: string;
  id?: string;
  tenant_id?: string;
  site_id?: string;
  building_id?: string;
  floor_id: string;
  seat_code?: string;
  code?: string;
  seat_type?: string;
  seat_neighborhood?: string;
  is_bookable?: boolean;
  x?: number | null;
  y?: number | null;
  w?: number | null;
  h?: number | null;
  rotation_angle?: number;
  matched_amenities: string[];
  matched_amenity_count: number;
  requested_amenity_count: number;
  preference_match_status: string;
  availability: SeatAvailabilitySummary;
}

// ── Seat Availability — GET /floors/{floor_id}/seats ──────────────────────────

export async function fetchAvailability(params: {
  floorId: string;
  fromDate: string;
  toDate?: string;
  amenityIds?: number[];
}): Promise<AvailableSeatResponse[]> {
  const { data } = await axiosInstance.get<AvailableSeatResponse[]>(
    `/floors/${params.floorId}/seats`,
    {
      params: {
        start_date: params.fromDate,
        end_date: params.toDate ?? params.fromDate,
        ...(params.amenityIds?.length
          ? { amenity_ids: params.amenityIds }
          : {}),
      },
      paramsSerializer: (p) => {
        const parts: string[] = [];
        Object.entries(p).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            value.forEach((v) =>
              parts.push(`${key}=${encodeURIComponent(v)}`)
            );
          } else {
            parts.push(`${key}=${encodeURIComponent(String(value))}`);
          }
        });
        return parts.join("&");
      },
    }
  );
  console.log("[fetchAvailability] raw response:", data);
  return data;
}

// ── Seats + Availability ──────────────────────────────────────────────────────

export async function fetchSeatsWithAvailability(
  params: FetchSeatsParams
): Promise<Seat[]> {
  const rawSeats = await fetchAvailability({
    floorId: params.floorId,
    fromDate: params.fromDate,
    toDate: (params as any).toDate ?? params.fromDate,
    amenityIds: params.amenityIds,
  });

  const selectedPrefs = (params.preferences ?? []).map((p) => p.toLowerCase());

  return rawSeats.map((a) => {
    const svgId = seatIdToSvgId(a.seat_id);

    const currentSeatId = (params as any).currentSeatId ?? null;

    const status = (() => {
      const raw = normalizeRangeStatus(a.availability?.status);
      if (
        currentSeatId &&
        String(a.seat_id) === String(currentSeatId) &&
        raw === "unavailable"
      ) {
        return "yours" as const;
      }
      return raw;
    })();

    const matchedAmenityNames: string[] = a.matched_amenities ?? [];

    const seatType         = (a.seat_type        ?? "").toLowerCase();
    const seatNeighborhood = (a.seat_neighborhood ?? "").toLowerCase();

    const amenities: string[] =
      matchedAmenityNames.length > 0
        ? matchedAmenityNames
        : [seatType, seatNeighborhood].filter(Boolean);

    const rawMatchStatus = (a.preference_match_status ?? "").toUpperCase();

    const preferenceMatchStatus: PreferenceMatchStatus =
      rawMatchStatus === "NOT_APPLICABLE" || rawMatchStatus === ""
        ? (() => {
            if (!selectedPrefs.length) return "NO_MATCH" as PreferenceMatchStatus;
            const matched = amenities.filter((am) =>
              selectedPrefs.some(
                (p) => am.toLowerCase().includes(p) || p.includes(am.toLowerCase())
              )
            ).length;
            if (matched === 0) return "NO_MATCH" as PreferenceMatchStatus;
            if (matched >= selectedPrefs.length)
              return "FULL_MATCH" as PreferenceMatchStatus;
            return "PARTIAL_MATCH" as PreferenceMatchStatus;
          })()
        : (rawMatchStatus as PreferenceMatchStatus);

    const uiState: UiState =
      status !== "available"
        ? "UNAVAILABLE"
        : preferenceMatchStatus === "FULL_MATCH"
          ? "BEST_MATCH"
          : "AVAILABLE";

    const matchesPreferences =
      status === "available" &&
      (preferenceMatchStatus === "FULL_MATCH" ||
        preferenceMatchStatus === "PARTIAL_MATCH");

    const availabilitySummary = a.availability ?? null;

    console.log(
      `[fetchSeatsWithAvailability] seat_id="${a.seat_id}" svgId="${svgId}" ` +
        `rangeStatus="${a.availability?.status}" → status="${status}" ` +
        `match="${preferenceMatchStatus}" ui="${uiState}" ` +
        `amenities=${JSON.stringify(amenities)} ` +
        `matchedNames=${JSON.stringify(matchedAmenityNames)} ` +
        `avail%=${a.availability?.availability_percentage ?? "n/a"}`
    );

    return {
      id: String(a.seat_id),
      svgId,
      label: a.code || a.seat_code || `Seat ${a.seat_id}`,
      row: 0,
      col: 0,
      status,
      matchesPreferences,
      amenities,
      matchedAmenityNames,
      matchedAmenityCount:   a.matched_amenity_count   ?? matchedAmenityNames.length,
      requestedAmenityCount: a.requested_amenity_count ?? selectedPrefs.length,
      preferenceMatchStatus,
      uiState,
      availabilitySummary,
    } as Seat & { availabilitySummary: SeatAvailabilitySummary | null };
  });
}

// ── Create booking — POST /bookings ───────────────────────────────────────────

export async function createBooking(
  payload: CreateBookingPayload
): Promise<CreateBookingResponse> {
  const { data } = await axiosInstance.post<CreateBookingResponse>(
    "/bookings",
    payload
  );
  return data;
}

// ── Modify booking — PATCH /bookings/{booking_id}/modify ──────────────────────
// Replaces the old cancel-then-create pattern.  The backend atomically updates
// the existing booking so history, audit trail, and booking_id are all preserved.

export interface ModifyBookingPayload {
  site_id:      number;
  building_id:  number;
  floor_id:     number;
  seat_id:      number;
  booking_date: string; // "YYYY-MM-DD"
}

export async function modifyBooking(
  bookingId: string,
  payload: ModifyBookingPayload
): Promise<CreateBookingResponse> {
  const { data } = await axiosInstance.post<CreateBookingResponse>(
    `/bookings/${bookingId}/modify`,
    payload
  );
  return data;
}

// ── Preferences ───────────────────────────────────────────────────────────────

export async function fetchPreferences(): Promise<Preference[]> {
  const { data } = await axiosInstance.get<{ amenities: any[] }>("/preferences");
  return data.amenities.map((a) => ({
    id: a.id,
    key: a.key,
    name: a.name,
    category: a.category ?? null,
    description: a.description ?? null,
    icon: a.icon ?? null,
  }));
}