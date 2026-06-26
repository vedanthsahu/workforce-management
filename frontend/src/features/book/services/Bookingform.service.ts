import { axiosInstance } from "@/lib/http/axios";
import {
  Site,
  Building,
  Floor,
  Seat,
  CreateBookingPayload,
  CreateGuestBookingPayload,
  CreateBookingResponse,
  Preference,
  PreferenceMatchStatus,
  UiState,
  FetchSeatsParams,
} from "../types/Bookingform.types";

// ── Raw API shapes ────────────────────────────────────────────────────────────

interface RawSite {
  site_id: string;
  site_name: string;
  city?: string;
  country?: string;
  timezone?: string;
}

interface RawBuilding {
  building_id: string;
  site_id: string;
  building_name: string;
}

interface RawFloor {
  floor_id: string;
  building_id?: string;
  floor_name?: string;
  floor_code?: string;
  layout_file_url?: string | null;
  active_layout?: { layout_file_url?: string | null };
}

interface RawPreference {
  id: string;
  key: string;
  name: string;
  category?: string | null;
  description?: string | null;
  icon?: string | null;
}

// ── Sites ─────────────────────────────────────────────────────────────────────

export async function fetchSites(): Promise<Site[]> {
  const { data } = await axiosInstance.get<RawSite[]>("/sites", {
    params: { status: "ACTIVE" },
  });
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
  const { data } = await axiosInstance.get<RawBuilding[]>("/buildings", {
    params: { site_id: siteId, status: "ACTIVE" },
  });
  return data.map((b) => ({
    id: b.building_id,
    siteId: b.site_id,
    name: b.building_name,
  }));
}

// ── Floors ────────────────────────────────────────────────────────────────────
// GET /buildings/{building_id}/floors already returns layout_file_url and
// active_layout, so we extract layoutFileUrl here and drop the separate
// fetchFloorLayout / PATCH call entirely.

export async function fetchFloors(buildingId: string): Promise<Floor[]> {
  const { data } = await axiosInstance.get<RawFloor[]>(
    `/buildings/${buildingId}/floors`,
    { params: { status: "ACTIVE" } },
  );
  return data.map((f) => ({
    id: f.floor_id,
    buildingId: f.building_id ?? buildingId,
    name: f.floor_name ?? f.floor_code ?? `Floor ${f.floor_id}`,
    number: parseInt(f.floor_code ?? "0", 10),
    // Prefer active_layout URL; fall back to top-level layout_file_url
    layoutFileUrl:
      f.active_layout?.layout_file_url ?? f.layout_file_url ?? undefined,
  }));
}

// ── Seat Code → SVG id mapping ────────────────────────────────────────────────
// The SVG <g id="..."> values match seat_code directly (e.g. "A1", "B3").
// No numeric parsing or hardcoded exceptions needed.

export function seatCodeToSvgId(seatCode: string): string {
  return seatCode;
}

// ── Normalise range availability status → seat status ────────────────────────

export function normalizeRangeStatus(
  rangeStatus: string | undefined
): "available" | "booked" | "unavailable" | "yours" {
  switch ((rangeStatus ?? "").toUpperCase()) {
    case "FULLY_AVAILABLE":
    case "PARTIALLY_AVAILABLE":
      return "available";
    case "FULLY_BOOKED":
      return "booked";
    case "YOURS":
      return "yours";
    case "FULLY_UNAVAILABLE":
    case "UNAVAILABLE":
    default:
      return "unavailable";
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
  seat_code?: string;
  code?: string;
  seat_type?: string;
  seat_neighborhood?: string;
  matched_amenities: string[];
  matched_amenity_count: number;
  requested_amenity_count: number;
  preference_match_status: string;
  availability: SeatAvailabilitySummary;
}

// ── Seat Availability — GET /floors/{floor_id}/seats ─────────────────────────

export async function fetchAvailability(params: {
  floorId: string;
  fromDate: string;
  toDate?: string;
  amenityIds?: number[];
  modifyBookingId?: string | null;
  bookedForUserId?: string | null;
  isGuestBooking?: boolean;
  bookedForGuestId?: string | null;
}): Promise<AvailableSeatResponse[]> {
  const { data } = await axiosInstance.get<{ summary: { availableSeats: number }; items: AvailableSeatResponse[] }>(
    `/floors/${params.floorId}/seats`,
    {
      params: {
        start_date: params.fromDate,
        end_date: params.toDate ?? params.fromDate,
        ...(params.amenityIds?.length
          ? { amenity_ids: params.amenityIds }
          : {}),
        ...(params.modifyBookingId
          ? { modifyBookingId: params.modifyBookingId }
          : {}),
        ...(params.bookedForUserId
          ? { booked_for_user_id: Number(params.bookedForUserId) }
          : {}),
        ...(params.isGuestBooking
          ? { is_guest_booking: true }
          : {}),
        ...(params.bookedForGuestId
          ? { booked_for_guest_id: Number(params.bookedForGuestId) }
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
  return data.items;
}

// ── Seats + Availability ──────────────────────────────────────────────────────

export async function fetchSeatsWithAvailability(
  params: FetchSeatsParams
): Promise<Seat[]> {
  const rawSeats = await fetchAvailability({
    floorId: params.floorId,
    fromDate: params.fromDate,
    toDate: params.toDate ?? params.fromDate,
    amenityIds: params.amenityIds,
    modifyBookingId: params.modifyBookingId ?? null,
    bookedForUserId: params.bookedForUserId ?? null,
    isGuestBooking: params.isGuestBooking ?? false,
    bookedForGuestId: params.bookedForGuestId ?? null,
  });

  const selectedPrefs = (params.preferences ?? []).map((p) => p.toLowerCase());
  const currentSeatId = params.currentSeatId ?? null;

  return rawSeats.map((a) => {
    // Use seat_code (or code) as the SVG id — matches <g id="..."> in the SVG directly.
    const seatCode = a.code || a.seat_code || String(a.seat_id);
    const svgId = seatCodeToSvgId(seatCode);

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

    // Force NO_MATCH for seats that aren't selectable — the API sometimes
    // returns PARTIAL_MATCH / FULL_MATCH even for unavailable / booked seats.
    const preferenceMatchStatus: PreferenceMatchStatus =
      status !== "available" && status !== "yours"
        ? "NO_MATCH"
        : rawMatchStatus === "NOT_APPLICABLE" || rawMatchStatus === ""
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

    return {
      id: String(a.seat_id),
      svgId,
      label: seatCode,
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

// ── Create guest booking — POST /guest-bookings ───────────────────────────────

export async function createGuestBooking(
  payload: CreateGuestBookingPayload
): Promise<CreateBookingResponse> {
  const { data } = await axiosInstance.post<CreateBookingResponse>(
    "/guest-bookings",
    payload
  );
  return data;
}

// ── Modify booking — POST /bookings/{booking_id}/modify ──────────────────────

export interface ModifyBookingPayload {
  site_id:      number;
  building_id:  number;
  floor_id:     number;
  seat_id:      number;
  booking_date: string;
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

export async function modifyGuestBooking(
  bookingId: string,
  payload: ModifyBookingPayload
): Promise<CreateBookingResponse> {
  const { data } = await axiosInstance.post<CreateBookingResponse>(
    `/guest-bookings/${bookingId}/modify`,
    payload
  );
  return data;
}

// ── Preferences ───────────────────────────────────────────────────────────────

export async function fetchPreferences(): Promise<Preference[]> {
  const { data } = await axiosInstance.get<{ amenities: RawPreference[] }>("/preferences");
  return data.amenities.map((a) => ({
    id: a.id,
    key: a.key,
    name: a.name,
    category: a.category ?? null,
    description: a.description ?? null,
    icon: a.icon ?? null,
  }));
}
