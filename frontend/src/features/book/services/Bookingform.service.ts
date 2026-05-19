// // // import { axiosInstance } from "@/lib/http/axios";
// // // import {
// // //   Site,
// // //   Building,
// // //   Floor,
// // //   Seat,
// // //   CreateBookingPayload,
// // //   CreateBookingResponse,
// // //   Preference,
// // // } from "../types/Bookingform.types";

// // // // ── Sites ─────────────────────────────────────────────────────────────────────

// // // export async function fetchSites(): Promise<Site[]> {
// // //   const { data } = await axiosInstance.get<any[]>("/sites");
// // //   return data.map((s) => ({
// // //     id: s.site_id,
// // //     name: s.site_name,
// // //     city: s.city ?? "",
// // //     country: s.country ?? "",
// // //     timezone: s.timezone ?? "",
// // //   }));
// // // }

// // // // ── Buildings ─────────────────────────────────────────────────────────────────

// // // export async function fetchBuildings(siteId: string): Promise<Building[]> {
// // //   const { data } = await axiosInstance.get<any[]>("/buildings", {
// // //     params: { site_id: siteId },
// // //   });
// // //   return data.map((b) => ({
// // //     id: b.building_id,
// // //     siteId: b.site_id,
// // //     name: b.building_name,
// // //   }));
// // // }

// // // // ── Floors ────────────────────────────────────────────────────────────────────

// // // export async function fetchFloors(buildingId: string): Promise<Floor[]> {
// // //   const { data } = await axiosInstance.get<any[]>(
// // //     `/buildings/${buildingId}/floors`
// // //   );
// // //   return data.map((f) => ({
// // //     id: f.floor_id,
// // //     buildingId: f.building_id ?? buildingId,
// // //     name: f.floor_name ?? f.floor_code ?? `Floor ${f.floor_id}`,
// // //     number: parseInt(f.floor_code ?? "0", 10),
// // //   }));
// // // }

// // // // ── Seat ID → SVG id mapping ─────────────────────────────────────────────────
// // // //
// // // // WHY seat_id and NOT seat_code:
// // // //
// // // // seat_code (e.g. "A-F2-001", "T3-7-001") is zone-relative — the last segment
// // // // is the seat number WITHIN that zone only. Every zone has its own seat "001",
// // // // "002" etc., so parsing seat_code causes many-to-one collisions on svgId "1".
// // // //
// // // // seat_id is the globally unique backend PK and maps 1-to-1 with SVG <g> nodes:
// // // //   seat_id=1  → <g id="1">
// // // //   seat_id=24 → <g id="s24">
// // // //   seat_id=N  → <g id="N">
// // // //
// // // // Always use seat_id to derive svgId.
// // // //
// // // export function seatIdToSvgId(seatId: string | number): string {
// // //   const num = parseInt(String(seatId), 10);
// // //   if (isNaN(num)) {
// // //     console.warn(`[seatIdToSvgId] cannot parse seat_id "${seatId}"`);
// // //     return String(seatId);
// // //   }
// // //   return num === 24 ? "s24" : String(num);
// // // }

// // // // Kept for backwards compatibility — always delegates to seatIdToSvgId
// // // export function seatCodeToSvgId(_seatCode: string, fallbackId: string | number): string {
// // //   return seatIdToSvgId(fallbackId);
// // // }

// // // // ── Normalise status ──────────────────────────────────────────────────────────

// // // export function normalizeStatus(
// // //   raw: string | undefined,
// // //   isBookable?: boolean
// // // ): "available" | "booked" | "unavailable" | "yours" {
// // //   switch ((raw ?? "").toUpperCase()) {
// // //     case "ACTIVE":
// // //     case "AVAILABLE": return "available";
// // //     case "BOOKED":
// // //     case "CONFIRMED": return "booked";
// // //     case "YOURS":     return "yours";
// // //     default:          return isBookable ? "available" : "unavailable";
// // //   }
// // // }

// // // // ── Seat Availability ─────────────────────────────────────────────────────────
// // // //
// // // // Backend route: GET /bookings/available
// // // // Params:
// // // //   floor_id     (int, required)
// // // //   booking_date (date string "YYYY-MM-DD", required)
// // // //
// // // // This is the SINGLE SOURCE OF TRUTH for seat availability on a given date.
// // // // Only seats returned here are available. Everything else is booked/unavailable.

// // // export interface SeatAvailability {
// // //   seat_id: string | number;
// // //   seat_code: string;
// // //   seat_type?: string;
// // //   seat_neighborhood?: string;
// // //   status: string;
// // //   is_bookable?: boolean;
// // // }

// // // export async function fetchAvailability(params: {
// // //   floorId: string;
// // //   fromDate: string;
// // // }): Promise<SeatAvailability[]> {
// // //   const { data } = await axiosInstance.get<SeatAvailability[]>("/bookings/available", {
// // //     params: {
// // //       floor_id:     params.floorId,
// // //       booking_date: params.fromDate,
// // //     },
// // //   });
// // //   return data;
// // // }

// // // // ── Seats ─────────────────────────────────────────────────────────────────────
// // // //
// // // // NOTE: fetchSeats (GET /floors/:id/seats) is intentionally NOT used for
// // // // availability checks anymore. It returns ALL seats regardless of booking
// // // // status and caused UI mismatches. Use fetchSeatsWithAvailability instead.

// // // export interface FetchSeatsParams {
// // //   floorId: string;
// // //   fromDate: string;
// // //   toDate: string;
// // //   preferences?: string[];
// // // }

// // // // ── Seats + Availability ──────────────────────────────────────────────────────
// // // //
// // // // /bookings/available is the sole source of truth.
// // // //
// // // // Rule:
// // // //   - Seat returned by /available  → status from backend (available/yours/etc.)
// // // //   - Seat NOT returned            → "booked" (backend excluded it intentionally)
// // // //
// // // // We get the full seat list from /floors/:id/seats only to know which SVG
// // // // nodes exist on this floor, then we overlay availability on top.
// // // // The availability status always wins — no fallback to the seats-list status.

// // // export async function fetchSeatsWithAvailability(
// // //   params: FetchSeatsParams
// // // ): Promise<Seat[]> {
// // //   // Step 1 — get the full seat roster for this floor (for SVG node list only)
// // //   const { data: seatListRaw } = await axiosInstance.get<any[]>(
// // //     `/floors/${params.floorId}/seats`,
// // //     {
// // //       params: {
// // //         fromDate: params.fromDate,
// // //         toDate:   params.toDate,
// // //         ...(params.preferences?.length
// // //           ? { preferences: params.preferences.join(",") }
// // //           : {}),
// // //       },
// // //     }
// // //   );

// // //   // Step 2 — get availability (source of truth for status)
// // //   const availability = await fetchAvailability({
// // //     floorId:  params.floorId,
// // //     fromDate: params.fromDate,
// // //   });

// // //   // Build svgId → availability entry map from /available response.
// // //   // Key insight: use seat_id (globally unique PK) not seat_code (zone-relative).
// // //   const availMap = new Map<string, SeatAvailability>();
// // //   availability.forEach((a) => {
// // //     const svgId = seatIdToSvgId(a.seat_id);  // seat_id=1 → "1", seat_id=24 → "s24"
// // //     availMap.set(svgId, a);
// // //     console.log(
// // //       `[fetchAvailability] seat_id="${a.seat_id}" seat_code="${a.seat_code}" → svgId="${svgId}" status="${a.status}"`
// // //     );
// // //   });

// // //   // Normalise selected preferences to lowercase for comparison
// // //   const selectedPrefs = (params.preferences ?? []).map((p) => p.toLowerCase());

// // //   // Step 3 — map every seat from the roster, overlaying availability status
// // //   return seatListRaw.map((s) => {
// // //     const seatCode = s.seat_code ?? "";
// // //     const svgId    = seatIdToSvgId(s.seat_id);  // use seat_id, not seat_code

// // //     // Look up this seat in /available
// // //     const availEntry = availMap.get(svgId);

// // //     // ⚠️  KEY RULE: if not in availMap, backend excluded it → it is booked.
// // //     // Never fall back to the /floors/seats status — that endpoint doesn't
// // //     // reflect per-date booking state.
// // //     // const status: "available" | "booked" | "unavailable" | "yours" = availEntry
// // //     //   ? normalizeStatus(availEntry.status, availEntry.is_bookable)
// // //     //   : "booked";
// // //     const status: "available" | "booked" | "unavailable" | "yours" = availEntry
// // //   ? normalizeStatus(availEntry.status, availEntry.is_bookable)
// // //   : "unavailable";  // ← was "booked"

// // //     // Build amenities list from seat_type and seat_neighborhood.
// // //     // These are used to match against user-selected preferences.
// // //     const amenities: string[] = [];
// // //     const seatType         = (availEntry?.seat_type         ?? s.seat_type         ?? "").toLowerCase();
// // //     const seatNeighborhood = (availEntry?.seat_neighborhood ?? s.seat_neighborhood ?? "").toLowerCase();
// // //     if (seatType)         amenities.push(seatType);
// // //     if (seatNeighborhood) amenities.push(seatNeighborhood);

// // //     // Seat matches preferences when it is available AND at least one selected
// // //     // preference matches this seat's amenity tokens (type or neighborhood).
// // //     const matchesPreferences =
// // //       status === "available" &&
// // //       selectedPrefs.length > 0 &&
// // //       selectedPrefs.some((pref) =>
// // //         amenities.some((a) => a.includes(pref) || pref.includes(a))
// // //       );

// // //     console.log(
// // //       `[fetchSeatsWithAvailability] seat_code="${seatCode}" svgId="${svgId}" ` +
// // //       `inAvailable=${!!availEntry} status="${status}" ` +
// // //       `amenities=${JSON.stringify(amenities)} matchesPreferences=${matchesPreferences}`
// // //     );

// // //     return {
// // //       id:                 String(s.seat_id),
// // //       svgId,
// // //       label:              seatCode || `Seat ${s.seat_id}`,
// // //       row:                0,
// // //       col:                0,
// // //       status,
// // //       matchesPreferences,
// // //       amenities,
// // //     };
// // //   });
// // // }

// // // // ── Create booking ────────────────────────────────────────────────────────────

// // // export async function createBooking(
// // //   payload: CreateBookingPayload
// // // ): Promise<CreateBookingResponse> {
// // //   const { data } = await axiosInstance.post<CreateBookingResponse>(
// // //     "/bookings",
// // //     payload
// // //   );
// // //   return data;
// // // }

// // // // ── Preferences ───────────────────────────────────────────────────────────────

// // // export async function fetchPreferences(): Promise<Preference[]> {
// // //   const { data } = await axiosInstance.get<{ amenities: any[] }>("/preferences");
// // //   return data.amenities.map((a) => ({
// // //     id:          a.id,
// // //     key:         a.key,
// // //     name:        a.name,
// // //     category:    a.category    ?? null,
// // //     description: a.description ?? null,
// // //     icon:        a.icon        ?? null,
// // //   }));
// // // }

// // import { axiosInstance } from "@/lib/http/axios";
// // import {
// //   Site,
// //   Building,
// //   Floor,
// //   Seat,
// //   CreateBookingPayload,
// //   CreateBookingResponse,
// //   Preference,
// //   PreferenceMatchStatus,
// //   UiState,
// // } from "../types/Bookingform.types";

// // // ── Sites ─────────────────────────────────────────────────────────────────────

// // export async function fetchSites(): Promise<Site[]> {
// //   const { data } = await axiosInstance.get<any[]>("/sites");
// //   return data.map((s) => ({
// //     id: s.site_id,
// //     name: s.site_name,
// //     city: s.city ?? "",
// //     country: s.country ?? "",
// //     timezone: s.timezone ?? "",
// //   }));
// // }

// // // ── Buildings ─────────────────────────────────────────────────────────────────

// // export async function fetchBuildings(siteId: string): Promise<Building[]> {
// //   const { data } = await axiosInstance.get<any[]>("/buildings", {
// //     params: { site_id: siteId },
// //   });
// //   return data.map((b) => ({
// //     id: b.building_id,
// //     siteId: b.site_id,
// //     name: b.building_name,
// //   }));
// // }

// // // ── Floors ────────────────────────────────────────────────────────────────────

// // export async function fetchFloors(buildingId: string): Promise<Floor[]> {
// //   const { data } = await axiosInstance.get<any[]>(
// //     `/buildings/${buildingId}/floors`
// //   );
// //   return data.map((f) => ({
// //     id: f.floor_id,
// //     buildingId: f.building_id ?? buildingId,
// //     name: f.floor_name ?? f.floor_code ?? `Floor ${f.floor_id}`,
// //     number: parseInt(f.floor_code ?? "0", 10),
// //   }));
// // }

// // // ── Seat ID → SVG id mapping ─────────────────────────────────────────────────

// // export function seatIdToSvgId(seatId: string | number): string {
// //   const num = parseInt(String(seatId), 10);
// //   if (isNaN(num)) {
// //     console.warn(`[seatIdToSvgId] cannot parse seat_id "${seatId}"`);
// //     return String(seatId);
// //   }
// //   return num === 24 ? "s24" : String(num);
// // }

// // export function seatCodeToSvgId(
// //   _seatCode: string,
// //   fallbackId: string | number
// // ): string {
// //   return seatIdToSvgId(fallbackId);
// // }

// // // ── Normalise status ──────────────────────────────────────────────────────────

// // export function normalizeStatus(
// //   raw: string | undefined,
// //   isBookable?: boolean
// // ): "available" | "booked" | "unavailable" | "yours" {
// //   switch ((raw ?? "").toUpperCase()) {
// //     case "ACTIVE":
// //     case "AVAILABLE":
// //       return "available";
// //     case "BOOKED":
// //     case "CONFIRMED":
// //       return "booked";
// //     case "YOURS":
// //       return "yours";
// //     default:
// //       return isBookable ? "available" : "unavailable";
// //   }
// // }

// // // ── Seat Availability (new enriched backend shape) ────────────────────────────
// // //
// // // The /bookings/available endpoint now returns amenity match data alongside
// // // availability status. This is the single source of truth for seat state.

// // export interface SeatAvailability {
// //   // Core identification
// //   seat_id: string | number;
// //   seat_code: string;
// //   seat_type?: string;
// //   seat_neighborhood?: string;

// //   // Availability
// //   status: string;
// //   is_bookable?: boolean;

// //   // Preference matching (new fields)
// //   matched_amenity_ids?: number[];
// //   matched_amenity_names?: string[];   // resolved amenity display names
// //   matched_amenity_count?: number;
// //   requested_amenity_count?: number;
// //   preference_match_status?: PreferenceMatchStatus; // "FULL_MATCH" | "PARTIAL_MATCH" | "NO_MATCH"
// //   ui_state?: UiState;                 // "BEST_MATCH" | "AVAILABLE" | "UNAVAILABLE"
// // }

// // export interface FetchSeatsParams {
// //   floorId: string;
// //   fromDate: string;
// //   toDate: string;
// //   preferences?: string[];
// //   amenityIds?: number[];   // numeric IDs — sent to backend as amenity_ids[]
// // }

// // export async function fetchAvailability(params: {
// //   floorId: string;
// //   fromDate: string;
// //   amenityIds?: number[];
// // }): Promise<SeatAvailability[]> {
// //   const { data } = await axiosInstance.get<SeatAvailability[]>(
// //     "/bookings/available",
// //     {
// //       params: {
// //         floor_id: params.floorId,
// //         booking_date: params.fromDate,
// //         // Send amenity_ids as repeated query params: ?amenity_ids=1&amenity_ids=3
// //         ...(params.amenityIds?.length
// //           ? { amenity_ids: params.amenityIds }
// //           : {}),
// //       },
// //       // axios serialises array params as amenity_ids[]=1 by default;
// //       // use paramsSerializer to emit amenity_ids=1&amenity_ids=3 instead.
// //       paramsSerializer: (p) => {
// //         const parts: string[] = [];
// //         Object.entries(p).forEach(([key, value]) => {
// //           if (Array.isArray(value)) {
// //             value.forEach((v) => parts.push(`${key}=${encodeURIComponent(v)}`));
// //           } else {
// //             parts.push(`${key}=${encodeURIComponent(String(value))}`);
// //           }
// //         });
// //         return parts.join("&");
// //       },
// //     }
// //   );
// //   return data;
// // }

// // // ── Seats + Availability ──────────────────────────────────────────────────────

// // // export async function fetchSeatsWithAvailability(
// // //   params: FetchSeatsParams
// // // ): Promise<Seat[]> {
// // //   // Step 1 — full seat roster for SVG node list
// // //   const { data: seatListRaw } = await axiosInstance.get<any[]>(
// // //     `/floors/${params.floorId}/seats`,
// // //     {
// // //       params: {
// // //         fromDate: params.fromDate,
// // //         toDate: params.toDate,
// // //         ...(params.preferences?.length
// // //           ? { preferences: params.preferences.join(",") }
// // //           : {}),
// // //       },
// // //     }
// // //   );

// // //   // Step 2 — availability (source of truth), now with amenity match data
// // //   const availability = await fetchAvailability({
// // //     floorId: params.floorId,
// // //     fromDate: params.fromDate,
// // //     amenityIds: params.amenityIds,
// // //   });
// // // export async function fetchSeatsWithAvailability(
// // //   params: FetchSeatsParams
// // // ): Promise<Seat[]> {
// // //   // Step 1 — full seat roster for SVG node list
// // //   const { data: seatListRaw } = await axiosInstance.get<any[]>(
// // //     `/floors/${params.floorId}/seats`,
// // //     {
// // //       params: {
// // //         fromDate: params.fromDate,
// // //         toDate: params.toDate,
// // //         // Send amenity IDs instead of preference strings
// // //         ...(params.amenityIds?.length
// // //           ? { amenity_ids: params.amenityIds }
// // //           : {}),
// // //       },
// // //     }
// // //   );

// // // export async function fetchSeatsWithAvailability(
// // //   params: FetchSeatsParams
// // // ): Promise<Seat[]> {
// // //   // Step 1 — just fetch the seat roster, no extra params
// // //   const { data: seatListRaw } = await axiosInstance.get<any[]>(
// // //     `/floors/${params.floorId}/seats`
// // //     // ← remove params entirely; this endpoint only needs the floor_id in the path
// // //   );

// // //   // Step 2 — availability with amenity IDs
// // //   const availability = await fetchAvailability({
// // //     floorId: params.floorId,
// // //     fromDate: params.fromDate,
// // //     amenityIds: params.amenityIds,
// // //   });

// // //   // Build svgId → availability entry map
// // //   const availMap = new Map<string, SeatAvailability>();
// // //   availability.forEach((a) => {
// // //     const svgId = seatIdToSvgId(a.seat_id);
// // //     availMap.set(svgId, a);
// // //     console.log(
// // //       `[fetchAvailability] seat_id="${a.seat_id}" → svgId="${svgId}" ` +
// // //         `status="${a.status}" match="${a.preference_match_status ?? "–"}"`
// // //     );
// // //   });

// // //   const selectedPrefs = (params.preferences ?? []).map((p) => p.toLowerCase());

// // //   // Step 3 — map roster seats, overlaying availability + match data
// // //   return seatListRaw.map((s) => {
// // //     const seatCode = s.seat_code ?? "";
// // //     const svgId = seatIdToSvgId(s.seat_id);
// // //     const availEntry = availMap.get(svgId);

// // //     const status: "available" | "booked" | "unavailable" | "yours" = availEntry
// // //       ? normalizeStatus(availEntry.status, availEntry.is_bookable)
// // //       : "unavailable";

// // //     // Build amenities from backend match data (preferred) or fallback fields
// // //     const seatType = (
// // //       availEntry?.seat_type ??
// // //       s.seat_type ??
// // //       ""
// // //     ).toLowerCase();
// // //     const seatNeighborhood = (
// // //       availEntry?.seat_neighborhood ??
// // //       s.seat_neighborhood ??
// // //       ""
// // //     ).toLowerCase();

// // //     const amenities: string[] = [];
// // //     if (seatType) amenities.push(seatType);
// // //     if (seatNeighborhood) amenities.push(seatNeighborhood);

// // //     // Use backend-resolved matched amenity names when available
// // //     const matchedAmenityNames =
// // //       availEntry?.matched_amenity_names ??
// // //       // Fallback: derive from our local logic
// // //       (selectedPrefs.length > 0
// // //         ? amenities.filter((a) =>
// // //             selectedPrefs.some((p) => a.includes(p) || p.includes(a))
// // //           )
// // //         : []);

// // //     // Preference match status — use backend value when present,
// // //     // otherwise derive locally for backwards compatibility
// // //     const preferenceMatchStatus: PreferenceMatchStatus =
// // //       availEntry?.preference_match_status ??
// // //       (() => {
// // //         if (!selectedPrefs.length) return "NO_MATCH";
// // //         const matched = amenities.filter((a) =>
// // //           selectedPrefs.some((p) => a.includes(p) || p.includes(a))
// // //         ).length;
// // //         if (matched === 0) return "NO_MATCH";
// // //         if (matched >= selectedPrefs.length) return "FULL_MATCH";
// // //         return "PARTIAL_MATCH";
// // //       })();

// // //     const uiState: UiState =
// // //       availEntry?.ui_state ??
// // //       (() => {
// // //         if (status !== "available") return "UNAVAILABLE";
// // //         if (preferenceMatchStatus === "FULL_MATCH") return "BEST_MATCH";
// // //         return "AVAILABLE";
// // //       })();

// // //     const matchesPreferences =
// // //       status === "available" &&
// // //       (preferenceMatchStatus === "FULL_MATCH" ||
// // //         preferenceMatchStatus === "PARTIAL_MATCH");

// // //     console.log(
// // //       `[fetchSeatsWithAvailability] code="${seatCode}" svgId="${svgId}" ` +
// // //         `status="${status}" match="${preferenceMatchStatus}" ui="${uiState}"`
// // //     );

// // //     return {
// // //       id: String(s.seat_id),
// // //       svgId,
// // //       label: seatCode || `Seat ${s.seat_id}`,
// // //       row: 0,
// // //       col: 0,
// // //       status,
// // //       matchesPreferences,
// // //       amenities,
// // //       matchedAmenityNames,
// // //       matchedAmenityCount: availEntry?.matched_amenity_count ?? matchedAmenityNames.length,
// // //       requestedAmenityCount:
// // //         availEntry?.requested_amenity_count ?? selectedPrefs.length,
// // //       preferenceMatchStatus,
// // //       uiState,
// // //     };
// // //   });
// // // }


// // export async function fetchSeatsWithAvailability(
// //   params: FetchSeatsParams
// // ): Promise<Seat[]> {
// //   // Single call — /bookings/available is the only endpoint needed
// //   const availability = await fetchAvailability({
// //     floorId: params.floorId,
// //     fromDate: params.fromDate,
// //     amenityIds: params.amenityIds,
// //   });

// //   const selectedPrefs = (params.preferences ?? []).map((p) => p.toLowerCase());

// //   return availability.map((a) => {
// //     const svgId = seatIdToSvgId(a.seat_id);
// //     const status = normalizeStatus(a.status, a.is_bookable);

// //     const seatType = (a.seat_type ?? "").toLowerCase();
// //     const seatNeighborhood = (a.seat_neighborhood ?? "").toLowerCase();

// //     const amenities: string[] = [];
// //     if (seatType) amenities.push(seatType);
// //     if (seatNeighborhood) amenities.push(seatNeighborhood);

// //     const matchedAmenityNames =
// //       a.matched_amenity_names ??
// //       (selectedPrefs.length > 0
// //         ? amenities.filter((am) =>
// //             selectedPrefs.some((p) => am.includes(p) || p.includes(am))
// //           )
// //         : []);

// //     const preferenceMatchStatus: PreferenceMatchStatus =
// //       a.preference_match_status ??
// //       (() => {
// //         if (!selectedPrefs.length) return "NO_MATCH";
// //         const matched = amenities.filter((am) =>
// //           selectedPrefs.some((p) => am.includes(p) || p.includes(am))
// //         ).length;
// //         if (matched === 0) return "NO_MATCH";
// //         if (matched >= selectedPrefs.length) return "FULL_MATCH";
// //         return "PARTIAL_MATCH";
// //       })();

// //     const uiState: UiState =
// //       a.ui_state ??
// //       (() => {
// //         if (status !== "available") return "UNAVAILABLE";
// //         if (preferenceMatchStatus === "FULL_MATCH") return "BEST_MATCH";
// //         return "AVAILABLE";
// //       })();

// //     const matchesPreferences =
// //       status === "available" &&
// //       (preferenceMatchStatus === "FULL_MATCH" ||
// //         preferenceMatchStatus === "PARTIAL_MATCH");

// //     return {
// //       id: String(a.seat_id),
// //       svgId,
// //       label: a.seat_code || `Seat ${a.seat_id}`,
// //       row: 0,
// //       col: 0,
// //       status,
// //       matchesPreferences,
// //       amenities,
// //       matchedAmenityNames,
// //       matchedAmenityCount: a.matched_amenity_count ?? matchedAmenityNames.length,
// //       requestedAmenityCount: a.requested_amenity_count ?? selectedPrefs.length,
// //       preferenceMatchStatus,
// //       uiState,
// //     };
// //   });
// // }

// // // ── Create booking ────────────────────────────────────────────────────────────

// // export async function createBooking(
// //   payload: CreateBookingPayload
// // ): Promise<CreateBookingResponse> {
// //   const { data } = await axiosInstance.post<CreateBookingResponse>(
// //     "/bookings",
// //     payload
// //   );
// //   return data;
// // }

// // // ── Preferences ───────────────────────────────────────────────────────────────

// // export async function fetchPreferences(): Promise<Preference[]> {
// //   const { data } = await axiosInstance.get<{ amenities: any[] }>("/preferences");
// //   return data.amenities.map((a) => ({
// //     id: a.id,
// //     key: a.key,
// //     name: a.name,
// //     category: a.category ?? null,
// //     description: a.description ?? null,
// //     icon: a.icon ?? null,
// //   }));
// // }

// import { axiosInstance } from "@/lib/http/axios";
// import {
//   Site,
//   Building,
//   Floor,
//   Seat,
//   SeatAvailability,
//   CreateBookingPayload,
//   CreateBookingResponse,
//   Preference,
//   PreferenceMatchStatus,
//   UiState,
//   FetchSeatsParams,
// } from "../types/Bookingform.types";

// // ── Sites ─────────────────────────────────────────────────────────────────────

// export async function fetchSites(): Promise<Site[]> {
//   const { data } = await axiosInstance.get<any[]>("/sites");
//   return data.map((s) => ({
//     id: s.site_id,
//     name: s.site_name,
//     city: s.city ?? "",
//     country: s.country ?? "",
//     timezone: s.timezone ?? "",
//   }));
// }

// // ── Buildings ─────────────────────────────────────────────────────────────────

// export async function fetchBuildings(siteId: string): Promise<Building[]> {
//   const { data } = await axiosInstance.get<any[]>("/buildings", {
//     params: { site_id: siteId },
//   });
//   return data.map((b) => ({
//     id: b.building_id,
//     siteId: b.site_id,
//     name: b.building_name,
//   }));
// }

// // ── Floors ────────────────────────────────────────────────────────────────────

// export async function fetchFloors(buildingId: string): Promise<Floor[]> {
//   const { data } = await axiosInstance.get<any[]>(
//     `/buildings/${buildingId}/floors`
//   );
//   return data.map((f) => ({
//     id: f.floor_id,
//     buildingId: f.building_id ?? buildingId,
//     name: f.floor_name ?? f.floor_code ?? `Floor ${f.floor_id}`,
//     number: parseInt(f.floor_code ?? "0", 10),
//   }));
// }

// // ── Seat ID → SVG id mapping ──────────────────────────────────────────────────

// export function seatIdToSvgId(seatId: string | number): string {
//   const num = parseInt(String(seatId), 10);
//   if (isNaN(num)) {
//     console.warn(`[seatIdToSvgId] cannot parse seat_id "${seatId}"`);
//     return String(seatId);
//   }
//   return num === 24 ? "s24" : String(num);
// }

// export function seatCodeToSvgId(
//   _seatCode: string,
//   fallbackId: string | number
// ): string {
//   return seatIdToSvgId(fallbackId);
// }

// // ── Normalise status ──────────────────────────────────────────────────────────

// export function normalizeStatus(
//   raw: string | undefined,
//   selectable?: boolean
// ): "available" | "booked" | "unavailable" | "yours" {
//   switch ((raw ?? "").toUpperCase()) {
//     case "AVAILABLE":
//       return selectable ? "available" : "unavailable";
//     case "ACTIVE":
//       return "available";
//     case "BOOKED":
//     case "CONFIRMED":
//       return "booked";
//     case "YOURS":
//       return "yours";
//     default:
//       return selectable ? "available" : "unavailable";
//   }
// }

// // ── Seat Availability — GET /floors/{floor_id}/seats ──────────────────────────

// export async function fetchAvailability(params: {
//   floorId: string;
//   fromDate: string;
//   amenityIds?: number[];
// }): Promise<SeatAvailability[]> {
//   const { data } = await axiosInstance.get<SeatAvailability[]>(
//     `/floors/${params.floorId}/seats`,
//     {
//       params: {
//         booking_date: params.fromDate,
//         ...(params.amenityIds?.length
//           ? { amenity_ids: params.amenityIds }
//           : {}),
//       },
//       // Serialize arrays as: amenity_ids=1&amenity_ids=2
//       paramsSerializer: (p) => {
//         const parts: string[] = [];
//         Object.entries(p).forEach(([key, value]) => {
//           if (Array.isArray(value)) {
//             value.forEach((v) =>
//               parts.push(`${key}=${encodeURIComponent(v)}`)
//             );
//           } else {
//             parts.push(`${key}=${encodeURIComponent(String(value))}`);
//           }
//         });
//         return parts.join("&");
//       },
//     }
//   );
//   return data;
// }

// // ── Seats + Availability ──────────────────────────────────────────────────────

// export async function fetchSeatsWithAvailability(
//   params: FetchSeatsParams
// ): Promise<Seat[]> {
//   const availability = await fetchAvailability({
//     floorId: params.floorId,
//     fromDate: params.fromDate,
//     amenityIds: params.amenityIds,
//   });

//   const selectedPrefs = (params.preferences ?? []).map((p) => p.toLowerCase());

//   return availability.map((a) => {
//     const svgId = seatIdToSvgId(a.seat_id);

//     // Derive status from `status` string + `selectable` flag
//     const status = normalizeStatus(a.status, a.selectable);

//     // Amenity display tags (may be absent from this endpoint)
//     const seatType = (a.seat_type ?? "").toLowerCase();
//     const seatNeighborhood = (a.seat_neighborhood ?? "").toLowerCase();
//     const amenities: string[] = [];
//     if (seatType) amenities.push(seatType);
//     if (seatNeighborhood) amenities.push(seatNeighborhood);

//     // Matched amenity names — use backend value when present
//     const matchedAmenityNames =
//       a.matched_amenity_names ??
//       (selectedPrefs.length > 0
//         ? amenities.filter((am) =>
//             selectedPrefs.some((p) => am.includes(p) || p.includes(am))
//           )
//         : []);

//     // Preference match status — always present from new endpoint
//     const preferenceMatchStatus: PreferenceMatchStatus =
//       a.preference_match_status ??
//       (() => {
//         if (!selectedPrefs.length) return "NO_MATCH";
//         const matched = amenities.filter((am) =>
//           selectedPrefs.some((p) => am.includes(p) || p.includes(am))
//         ).length;
//         if (matched === 0) return "NO_MATCH";
//         if (matched >= selectedPrefs.length) return "FULL_MATCH";
//         return "PARTIAL_MATCH";
//       })();

//     // UI state — always present from new endpoint; drives SVG coloring
//     const uiState: UiState =
//       a.ui_state ??
//       (() => {
//         if (status !== "available") return "UNAVAILABLE";
//         if (preferenceMatchStatus === "FULL_MATCH") return "BEST_MATCH";
//         return "AVAILABLE";
//       })();

//     const matchesPreferences =
//       status === "available" &&
//       (preferenceMatchStatus === "FULL_MATCH" ||
//         preferenceMatchStatus === "PARTIAL_MATCH");

//     console.log(
//       `[fetchSeatsWithAvailability] seat_id="${a.seat_id}" svgId="${svgId}" ` +
//         `status="${status}" selectable=${a.selectable} ` +
//         `match="${preferenceMatchStatus}" ui="${uiState}"`
//     );

//     return {
//       id: String(a.seat_id),
//       svgId,
//       label: a.code || `Seat ${a.seat_id}`,   // new endpoint uses `code` not `seat_code`
//       row: 0,
//       col: 0,
//       status,
//       matchesPreferences,
//       amenities,
//       matchedAmenityNames,
//       matchedAmenityCount: a.matched_amenity_count ?? matchedAmenityNames.length,
//       requestedAmenityCount: a.requested_amenity_count ?? selectedPrefs.length,
//       preferenceMatchStatus,
//       uiState,
//     };
//   });
// }

// // ── Create booking ────────────────────────────────────────────────────────────

// export async function createBooking(
//   payload: CreateBookingPayload
// ): Promise<CreateBookingResponse> {
//   const { data } = await axiosInstance.post<CreateBookingResponse>(
//     "/bookings",
//     payload
//   );
//   return data;
// }

// // ── Preferences ───────────────────────────────────────────────────────────────

// export async function fetchPreferences(): Promise<Preference[]> {
//   const { data } = await axiosInstance.get<{ amenities: any[] }>("/preferences");
//   return data.amenities.map((a) => ({
//     id: a.id,
//     key: a.key,
//     name: a.name,
//     category: a.category ?? null,
//     description: a.description ?? null,
//     icon: a.icon ?? null,
//   }));
// }

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

// ── Normalise status ──────────────────────────────────────────────────────────

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

// ── Seat Availability — GET /floors/{floor_id}/seats ──────────────────────────

export async function fetchAvailability(params: {
  floorId: string;
  fromDate: string;
  amenityIds?: number[];
}): Promise<SeatAvailability[]> {
  const { data } = await axiosInstance.get<SeatAvailability[]>(
    `/floors/${params.floorId}/seats`,
    {
      params: {
        booking_date: params.fromDate,
        ...(params.amenityIds?.length
          ? { amenity_ids: params.amenityIds }
          : {}),
      },
      // Serialize arrays as: amenity_ids=1&amenity_ids=2
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
  console.log(data)
  return data;
}

// ── Seats + Availability ──────────────────────────────────────────────────────

export async function fetchSeatsWithAvailability(
  params: FetchSeatsParams
): Promise<Seat[]> {
  const availability = await fetchAvailability({
    floorId: params.floorId,
    fromDate: params.fromDate,
    amenityIds: params.amenityIds,
  });

  const selectedPrefs = (params.preferences ?? []).map((p) => p.toLowerCase());

  return availability.map((a) => {
    const svgId = seatIdToSvgId(a.seat_id);

    // Derive status from `status` string + `selectable` flag
    const status = normalizeStatus(a.status, a.selectable);

    // ── FIX: Use matched_amenity_names from backend as the primary source ──
    //
    // Previously, amenities[] was built only from seat_type and
    // seat_neighborhood — two optional fields that this endpoint does NOT
    // return — so both amenities[] and matchedAmenityNames[] were always
    // empty, making the tooltip amenity sections invisible.
    //
    // Now:
    //   1. matched_amenity_names  → used directly as matchedAmenityNames[]
    //   2. amenities[]            → prefer matched names for display; fall
    //                               back to seat_type / seat_neighborhood
    //                               only when the backend doesn't send names.

    // 1. Matched amenity names — backend value is authoritative
    const matchedAmenityNames: string[] = a.matched_amenity_names ?? [];

    // 2. Build the full amenities display list
    //    • If the backend provided matched names, use those directly so the
    //      tooltip always has something meaningful to show.
    //    • Otherwise fall back to the optional seat_type / seat_neighborhood
    //      fields (present on some endpoints, absent on others).
    const seatType        = (a.seat_type        ?? "").toLowerCase();
    const seatNeighborhood = (a.seat_neighborhood ?? "").toLowerCase();

    const amenities: string[] =
      matchedAmenityNames.length > 0
        ? matchedAmenityNames                            // primary: backend names
        : [seatType, seatNeighborhood].filter(Boolean);  // fallback: optional fields

    // Preference match status — always present from new endpoint
    const preferenceMatchStatus: PreferenceMatchStatus =
      a.preference_match_status ??
      (() => {
        if (!selectedPrefs.length) return "NO_MATCH";
        const matched = amenities.filter((am) =>
          selectedPrefs.some((p) => am.includes(p) || p.includes(am))
        ).length;
        if (matched === 0) return "NO_MATCH";
        if (matched >= selectedPrefs.length) return "FULL_MATCH";
        return "PARTIAL_MATCH";
      })();

    // UI state — always present from new endpoint; drives SVG coloring
    const uiState: UiState =
      a.ui_state ??
      (() => {
        if (status !== "available") return "UNAVAILABLE";
        if (preferenceMatchStatus === "FULL_MATCH") return "BEST_MATCH";
        return "AVAILABLE";
      })();

    const matchesPreferences =
      status === "available" &&
      (preferenceMatchStatus === "FULL_MATCH" ||
        preferenceMatchStatus === "PARTIAL_MATCH");

    console.log(
      `[fetchSeatsWithAvailability] seat_id="${a.seat_id}" svgId="${svgId}" ` +
        `status="${status}" selectable=${a.selectable} ` +
        `match="${preferenceMatchStatus}" ui="${uiState}" ` +
        `amenities=${JSON.stringify(amenities)} ` +
        `matchedNames=${JSON.stringify(matchedAmenityNames)}`
    );

    return {
      id: String(a.seat_id),
      svgId,
      label: a.code || `Seat ${a.seat_id}`,  // new endpoint uses `code` not `seat_code`
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
    };
  });
}

// ── Create booking ────────────────────────────────────────────────────────────

export async function createBooking(
  payload: CreateBookingPayload
): Promise<CreateBookingResponse> {
  const { data } = await axiosInstance.post<CreateBookingResponse>(
    "/bookings",
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