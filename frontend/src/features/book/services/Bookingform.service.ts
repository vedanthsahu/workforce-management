import axios from "axios";
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
  QuickPickSeat,
  NextBooking,
} from "../types/Bookingform.types";

// Every backend error (whatever HTTPException it started as) is normalized
// server-side into {"error": {"code", "message"}} (see main.py's
// http_exception_handler) — but a caught error might still be a plain
// string detail, a differently-shaped body, or no response at all (a
// network failure). This pulls out the real message wherever it lives, so a
// genuine business-rule conflict (e.g. "you already have a booking that
// day" from the availability endpoint itself, not just from creating the
// booking) never falls through to Axios's own generic
// "Request failed with status code {n}".
export function extractApiErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as
      | { detail?: { message?: string } | string; message?: string; error?: { message?: string } }
      | undefined;
    const extracted =
      (typeof data?.detail === "object" ? data?.detail?.message : typeof data?.detail === "string" ? data.detail : null)
      ?? data?.error?.message
      ?? data?.message
      ?? null;
    return extracted ?? fallback;
  }
  return err instanceof Error ? err.message : fallback;
}

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
  status?: string | null;
}

interface RawFloor {
  floor_id: string;
  building_id?: string;
  floor_name?: string;
  floor_code?: string;
  status?: string | null;
  published_layout_exists?: boolean | null;
  layout_file_url?: string | null;
  active_layout?: { layout_file_url?: string | null };
  scheduled_layout?: {
    layout_file_url?: string | null;
    effective_from?: string | null;
  } | null;
}

// ── Sites ─────────────────────────────────────────────────────────────────────

export async function fetchSites(): Promise<Site[]> {
  // bookable_only: skip offices with no active building/floor -- nothing to book there.
  const { data } = await axiosInstance.get<RawSite[]>("/sites", {
    params: { status: "ACTIVE", bookable_only: true },
  });
  return data.map((s) => ({
    id: s.site_id,
    name: s.site_name,
    city: s.city ?? "",
    country: s.country ?? "",
    timezone: s.timezone ?? "",
  }));
}

// fetchSites above only ever returns ACTIVE sites, so a saved work
// preference (or a modify-booking/prefill deep link) pointing at a site
// that's since gone INACTIVE silently disappears from that list with no way
// to tell "inactive" apart from "no longer exists". GET /sites/{id} returns
// every site regardless of status, so this is used specifically to check
// whether a missing site id is inactive (vs. genuinely gone) so the UI can
// show an appropriate message instead of a silent empty seat map.
export async function fetchSiteStatus(siteId: string): Promise<string | null> {
  const { data } = await axiosInstance.get<{ status?: string | null }>(`/sites/${siteId}`);
  return data.status ?? null;
}

// ── Buildings ─────────────────────────────────────────────────────────────────

export async function fetchBuildings(siteId: string): Promise<Building[]> {
  // bookable_only: skip buildings with no active floor.
  const { data } = await axiosInstance.get<RawBuilding[]>("/buildings", {
    params: { site_id: siteId, status: "ACTIVE", bookable_only: true },
  });
  return data.map((b) => ({
    id: b.building_id,
    siteId: b.site_id,
    name: b.building_name,
  }));
}

// fetchBuildings only returns buildings a user can book. A saved preference (or
// deep link) pointing at one that isn't in that list is either inactive or has
// no active floor -- and the two deserve different messages. There's no
// single-building endpoint, but GET /buildings without a status filter lists
// every building of the office with its status, so find it there. Returns null
// when the building doesn't exist (any longer).
export async function fetchBuildingStatus(
  siteId: string,
  buildingId: string,
): Promise<{ name: string; status: string | null } | null> {
  const { data } = await axiosInstance.get<RawBuilding[]>("/buildings", {
    params: { site_id: siteId },
  });
  const match = data.find((b) => String(b.building_id) === buildingId);
  return match ? { name: match.building_name, status: match.status ?? null } : null;
}

// Why an office / building drops out of the bookable lists. The bookable_only
// lists silently leave out anything with no active building, no active floor,
// or no floor with a published layout, so work out which one it is from the
// unfiltered lists (every building / floor with its status and
// published_layout_exists) to give the user a precise message.
export type UnbookableReason =
  | "NO_ACTIVE_BUILDING"
  | "NO_ACTIVE_FLOOR"
  | "NO_PUBLISHED_LAYOUT"
  | "UNKNOWN";

const isActiveStatus = (status?: string | null) =>
  String(status ?? "").toUpperCase() === "ACTIVE";

export async function diagnoseSiteUnbookable(siteId: string): Promise<UnbookableReason> {
  const [{ data: buildings }, { data: floors }] = await Promise.all([
    axiosInstance.get<RawBuilding[]>("/buildings", { params: { site_id: siteId } }),
    axiosInstance.get<RawFloor[]>("/floors", { params: { site_id: siteId } }),
  ]);
  const activeBuildingIds = new Set(
    buildings.filter((b) => isActiveStatus(b.status)).map((b) => String(b.building_id)),
  );
  if (activeBuildingIds.size === 0) return "NO_ACTIVE_BUILDING";
  const usable = floors.filter(
    (f) => isActiveStatus(f.status) && activeBuildingIds.has(String(f.building_id)),
  );
  if (usable.length === 0) return "NO_ACTIVE_FLOOR";
  if (!usable.some((f) => f.published_layout_exists)) return "NO_PUBLISHED_LAYOUT";
  return "UNKNOWN";
}

export async function diagnoseBuildingUnbookable(buildingId: string): Promise<UnbookableReason> {
  const { data: floors } = await axiosInstance.get<RawFloor[]>("/floors", {
    params: { building_id: buildingId },
  });
  const active = floors.filter((f) => isActiveStatus(f.status));
  if (active.length === 0) return "NO_ACTIVE_FLOOR";
  if (!active.some((f) => f.published_layout_exists)) return "NO_PUBLISHED_LAYOUT";
  return "UNKNOWN";
}

// Same idea for a floor: GET /buildings/{id}/floors without a status filter
// lists every floor with its status.
export async function fetchFloorStatus(
  buildingId: string,
  floorId: string,
): Promise<{ name: string; status: string | null } | null> {
  const { data } = await axiosInstance.get<RawFloor[]>(`/buildings/${buildingId}/floors`);
  const match = data.find((f) => String(f.floor_id) === floorId);
  return match
    ? { name: match.floor_name ?? match.floor_code ?? `Floor ${floorId}`, status: match.status ?? null }
    : null;
}

// ── Floors ────────────────────────────────────────────────────────────────────
// GET /buildings/{building_id}/floors already returns layout_file_url and
// active_layout, so we extract layoutFileUrl here and drop the separate
// fetchFloorLayout / PATCH call entirely.

export async function fetchFloors(buildingId: string): Promise<Floor[]> {
  const { data } = await axiosInstance.get<RawFloor[]>(
    `/buildings/${buildingId}/floors`,
    // bookable_only: skip floors with no published layout -- nothing to book there.
    { params: { status: "ACTIVE", bookable_only: true } },
  );
  return data.map((f) => ({
    id: f.floor_id,
    buildingId: f.building_id ?? buildingId,
    name: f.floor_name ?? f.floor_code ?? `Floor ${f.floor_id}`,
    number: parseInt(f.floor_code ?? "0", 10),
    // Prefer active_layout URL; fall back to top-level layout_file_url
    layoutFileUrl:
      f.active_layout?.layout_file_url ?? f.layout_file_url ?? undefined,
    scheduledLayoutFileUrl: f.scheduled_layout?.layout_file_url ?? undefined,
    scheduledLayoutEffectiveFrom: f.scheduled_layout?.effective_from ?? undefined,
  }));
}

// A floor mid-transition can have a currently-live layout (layoutFileUrl)
// and a separate one queued to take over on a future date
// (scheduledLayoutFileUrl / scheduledLayoutEffectiveFrom). The floors API
// itself doesn't resolve "which layout applies on date X" -- it just
// reports both, same as the backend's own date-window checks -- so pick
// here, the same way, instead of always rendering whichever one happens
// to be PUBLISHED right now regardless of the date actually being booked.
export function resolveFloorLayoutUrl(
  floor: Pick<Floor, "layoutFileUrl" | "scheduledLayoutFileUrl" | "scheduledLayoutEffectiveFrom">,
  bookingDate: string | null | undefined,
): string | undefined {
  if (
    bookingDate &&
    floor.scheduledLayoutFileUrl &&
    floor.scheduledLayoutEffectiveFrom &&
    new Date(bookingDate) >= new Date(floor.scheduledLayoutEffectiveFrom)
  ) {
    return floor.scheduledLayoutFileUrl;
  }
  return floor.layoutFileUrl;
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
  calendarMode?: boolean;
  spaceType?: string;
}): Promise<AvailableSeatResponse[]> {
  const { data } = await axiosInstance.get<
    AvailableSeatResponse[] | { items: AvailableSeatResponse[] }
  >(
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
        ...(params.calendarMode
          ? { calendar_mode: true }
          : {}),
        ...(params.spaceType
          ? { space_type: params.spaceType }
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
  console.log("[fetchAvailability] API response shape:", typeof data, Array.isArray(data), JSON.stringify(Object.keys(data ?? {})));
  return Array.isArray(data) ? data : data?.items ?? [];
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
    spaceType: params.spaceType,
  });

  const selectedPrefs = (params.preferences ?? []).map((p) => p.toLowerCase());
  const currentSeatId = params.currentSeatId ?? null;

  return rawSeats.map((a) => {
    // Use seat_code (or code) as the SVG id — matches <g id="..."> in the SVG directly.
    const seatCode = a.code || a.seat_code || String(a.seat_id);
    const svgId = seatCodeToSvgId(seatCode);

    const status = (() => {
      const raw = normalizeRangeStatus(a.availability?.status);
      // When modifying a booking, the backend excludes that booking from its
      // own conflict check (see exclude_booking_id in locations.py), so the
      // seat comes back "available", not "unavailable" -- match on
      // currentSeatId alone rather than requiring raw === "unavailable".
      if (currentSeatId && String(a.seat_id) === String(currentSeatId)) {
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

// ── Create guest booking — POST /guest-visits (seat_id given) ─────────────────
// Merged into the guest-visit creation endpoint: seat_id present means
// "create the visit and book this seat for it", replacing the old, separate
// POST /guest-bookings.

export async function createGuestBooking(
  payload: CreateGuestBookingPayload
): Promise<CreateBookingResponse> {
  const { data } = await axiosInstance.post<CreateBookingResponse>(
    "/guest-visits",
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

interface RawAdminAmenity {
  amenity_id: string;
  amenity_key: string;
  amenity_name: string;
  category_name?: string | null;
  description?: string | null;
  icon_name?: string | null;
  applicable_seat_types?: string[] | null;
}

export async function fetchPreferences(): Promise<Preference[]> {
  const { data } = await axiosInstance.get<{ items: RawAdminAmenity[] }>(
    "/amenities",
    { params: { status: "active", limit: 200 } },
  );
  return data.items.map((a) => ({
    id: a.amenity_id,
    key: a.amenity_key,
    name: a.amenity_name,
    category: a.category_name ?? null,
    description: a.description ?? null,
    icon: a.icon_name ?? null,
    applicable_seat_types: a.applicable_seat_types ?? null,
  }));
}

// ── Saved location/amenity preferences — GET /dashboard/me ──────────────────
// Used to auto-fill the booking form for the logged-in user's own booking.
// Returns null when the user has never saved a preference (site_id unset),
// so the caller can leave the form untouched in that case.

interface RawWorkPreferences {
  site_id?: string | null;
  site_name?: string | null;
  building_id?: string | null;
  building_name?: string | null;
  floor_id?: string | null;
  floor_name?: string | null;
  amenities?: { id: string }[];
}

interface RawDashboardMe {
  work_preferences?: RawWorkPreferences | null;
}

export interface MyWorkPreferences {
  siteId: string | null;
  siteName: string | null;
  buildingId: string | null;
  buildingName: string | null;
  floorId: string | null;
  floorName: string | null;
  amenityIds: string[];
}

function parseWorkPreferences(data: RawDashboardMe): MyWorkPreferences | null {
  const wp = data.work_preferences;
  if (!wp?.site_id) return null;

  return {
    siteId: wp.site_id,
    siteName: wp.site_name ?? null,
    buildingId: wp.building_id ?? null,
    buildingName: wp.building_name ?? null,
    floorId: wp.floor_id ?? null,
    floorName: wp.floor_name ?? null,
    amenityIds: (wp.amenities ?? []).map((a) => a.id),
  };
}

export async function fetchMyWorkPreferences(): Promise<MyWorkPreferences | null> {
  const { data } = await axiosInstance.get<RawDashboardMe>("/dashboard/me");
  return parseWorkPreferences(data);
}

// ── Saved location/amenity preferences for a specific employee ──────────────
// GET /preferences/{userId} — used when a facilitator/admin books a seat on
// behalf of that employee. Replaces the old /dashboard/employee/{userId},
// which built a full dashboard payload just to read this one field off it.

export async function fetchEmployeeWorkPreferences(
  userId: string
): Promise<MyWorkPreferences | null> {
  const { data } = await axiosInstance.get<RawWorkPreferences>(
    `/preferences/${userId}`
  );
  return parseWorkPreferences({ work_preferences: data });
}

// ── Sidebar: quick-pick seats — GET /dashboard/me ────────────────────────────
// Reuses the same favorite_seat/second_favorite_seat fields as the dashboard's
// favourite-seat widget (most-booked / 2nd most-booked CONFIRMED seat).

interface RawFavouriteSeat {
  seat_id: string;
  seat_code?: string | null;
  floor_id?: string | null;
  floor_name?: string | null;
  building_id?: string | null;
  building_name?: string | null;
  site_id?: string | null;
  site_name?: string | null;
}

interface RawDashboardMeFavourites {
  favorite_seat: RawFavouriteSeat | null;
  second_favorite_seat?: RawFavouriteSeat | null;
  third_favorite_seat?: RawFavouriteSeat | null;
}

function toQuickPick(
  seat: RawFavouriteSeat | null | undefined,
  tag: QuickPickSeat["tag"]
): QuickPickSeat | null {
  if (!seat) return null;
  return {
    id: seat.seat_id,
    label: seat.seat_code ?? seat.seat_id,
    tag,
    floor: seat.floor_name ?? (seat.floor_id ? `Floor ${seat.floor_id}` : ""),
    siteId: seat.site_id ?? null,
    buildingId: seat.building_id ?? null,
    floorId: seat.floor_id ?? null,
  };
}

// Up to 3 quick picks now (favourite + 2 "frequently booked" runners-up,
// see fetch_favorite_seat's LIMIT 3 in user_repository.py) -- the 2nd and
// 3rd share the same "frequent" styling, only the top seat gets the
// distinct favourite treatment.
export async function fetchQuickPickSeats(): Promise<QuickPickSeat[]> {
  const { data } = await axiosInstance.get<RawDashboardMeFavourites>("/dashboard/me");
  return [
    toQuickPick(data.favorite_seat, "favourite"),
    toQuickPick(data.second_favorite_seat ?? null, "frequent"),
    toQuickPick(data.third_favorite_seat ?? null, "frequent"),
  ].filter((p): p is QuickPickSeat => p !== null);
}

// Whether a quick-pick seat is actually free for the given date(s) --
// shared by useBookingSidebar (filters the list down to only seats worth
// offering as a shortcut) and BookingSidebar's own click-time re-check
// (guards against the date changing, or a race, between that filtering and
// the actual click).
// A seat only has availability rows for the dates its own layout covers. When
// the floor switches to a scheduled layout inside the range, the seat reports
// "FULLY_AVAILABLE" for just the covered days -- so FULLY_AVAILABLE alone is
// not proof the whole range is bookable. The favourite may not even exist in
// the scheduled layout, so every requested date must be covered.
export function seatCoversRange(
  availability: Pick<SeatAvailabilitySummary, "total_requested_days"> | null | undefined,
  fromDate: string,
  toDate: string,
): boolean {
  if (!availability) return false;
  const from = Date.parse(`${fromDate}T00:00:00Z`);
  const to = Date.parse(`${toDate}T00:00:00Z`);
  if (Number.isNaN(from) || Number.isNaN(to) || to < from) return false;
  const requestedDays = Math.round((to - from) / 86400000) + 1;
  return availability.total_requested_days >= requestedDays;
}

export async function isQuickPickSeatAvailable(
  seat: QuickPickSeat,
  fromDate: string,
  toDate: string
): Promise<boolean> {
  if (!seat.floorId) return false;
  const seats = await fetchAvailability({ floorId: seat.floorId, fromDate, toDate });
  const match = seats.find((s) => String(s.seat_id) === String(seat.id));
  return (
    match?.availability?.status === "FULLY_AVAILABLE" &&
    seatCoversRange(match.availability, fromDate, toDate)
  );
}

// ── Sidebar: next booking — GET /bookings/me/future ─────────────────────────

interface RawFutureBooking {
  booking_id: string;
  seat_code?: string | null;
  site_name?: string | null;
  building_name?: string | null;
  floor_name?: string | null;
  booking_date: string;
  from_date?: string | null;
  to_date?: string | null;
  booking_status: string;
}

export async function fetchNextBooking(): Promise<NextBooking | null> {
  const { data } = await axiosInstance.get<RawFutureBooking[]>("/bookings/me/future");

  const today = new Date();
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowIso = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;

  const active = data.filter((b) => (b.booking_status ?? "").toUpperCase() !== "CANCELLED");

  const matchesDate = (b: RawFutureBooking, iso: string) => {
    const from = b.from_date ?? b.booking_date;
    const to = b.to_date ?? b.booking_date;
    return iso >= from && iso <= to;
  };

  // Prefer tomorrow specifically -- that's the common case and reads best
  // ("Tomorrow's Booking"). If nothing lands there, fall back to whichever
  // still-upcoming (today or later) booking starts soonest, so the sidebar
  // has something useful to show instead of going empty the moment the
  // admin's next booking is two days out rather than one.
  const tomorrowMatch = active.find((b) => matchesDate(b, tomorrowIso));
  if (tomorrowMatch) {
    return {
      bookingId: tomorrowMatch.booking_id,
      seatCode: tomorrowMatch.seat_code ?? null,
      siteName: tomorrowMatch.site_name ?? null,
      buildingName: tomorrowMatch.building_name ?? null,
      floorName: tomorrowMatch.floor_name ?? null,
      bookingDate: tomorrowIso,
      isTomorrow: true,
    };
  }

  const upcoming = active
    .filter((b) => (b.from_date ?? b.booking_date) >= todayIso)
    .sort((a, b) => (a.from_date ?? a.booking_date).localeCompare(b.from_date ?? b.booking_date));
  const next = upcoming[0];
  if (!next) return null;

  return {
    bookingId: next.booking_id,
    seatCode: next.seat_code ?? null,
    siteName: next.site_name ?? null,
    buildingName: next.building_name ?? null,
    floorName: next.floor_name ?? null,
    bookingDate: next.from_date ?? next.booking_date,
    isTomorrow: false,
  };
}
