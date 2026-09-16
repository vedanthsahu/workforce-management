import { axiosInstance } from "@/lib/http/axios";
import { Building, Floor, Layout, LayoutPolicy, LayoutSeatStats, Site } from "../types/layout.types";

interface RawSite {
  site_id: number | string;
  site_name: string;
  city?: string;
  country?: string;
  timezone?: string;
}

interface RawBuilding {
  building_id: number | string;
  site_id: number | string;
  building_name: string;
}

interface RawFloor {
  floor_id: number | string;
  building_id?: number | string;
  floor_name?: string;
  floor_code?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Location services
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchSites(): Promise<Site[]> {
  const { data } = await axiosInstance.get<RawSite[]>("/sites");
  return data.map((s) => ({
    id: String(s.site_id),       // ← String() back
    name: s.site_name,
    city: s.city ?? "",
    country: s.country ?? "",
    timezone: s.timezone ?? "",
  }));
}

export async function fetchBuildings(siteId: string): Promise<Building[]> {
  const { data } = await axiosInstance.get<RawBuilding[]>("/buildings", {
    params: { site_id: siteId },
  });
  return data.map((b) => ({
    id: String(b.building_id),   // ← String() back
    siteId: String(b.site_id),   // ← String() back
    name: b.building_name,
  }));
}

export async function fetchFloors(buildingId: string): Promise<Floor[]> {
  const { data } = await axiosInstance.get<RawFloor[]>(
    `/buildings/${buildingId}/floors`
  );
  return data.map((f) => ({
    id: String(f.floor_id),                                        // ← String() back
    buildingId: String(f.building_id ?? buildingId),               // ← String() back
    name: f.floor_name ?? f.floor_code ?? `Floor ${f.floor_id}`,
    number: parseInt(f.floor_code ?? "0", 10),
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Layout services
// ─────────────────────────────────────────────────────────────────────────────

export async function getLayoutsByFloor(floorId: string): Promise<Layout[]> {
  const { data } = await axiosInstance.get<Layout[]>(
    `/admin/floor-layouts/floors/${floorId}`
  );
  return data;
}

export async function activateLayout(
  layoutId: string,
  effectiveDate?: string,
): Promise<Layout> {
  // Omitted (or a today/past date, though this UI never offers one) =
  // publish immediately. A future date schedules the layout instead of
  // publishing it now -- see backend/services/floor_layout_service.py.
  const { data } = await axiosInstance.post<Layout>(
    `/admin/floor-layouts/${layoutId}/activate`,
    effectiveDate ? { effective_date: effectiveDate } : undefined,
  );
  return data;
}

export async function fetchLayoutPolicy(): Promise<LayoutPolicy> {
  const { data } = await axiosInstance.get<LayoutPolicy>("/business-rules/layout-policy");
  return data;
}

// Change the effective_date of a layout that's already SCHEDULED (not a
// new schedule, not a publish) -- see PATCH /admin/floor-layouts/{id}/schedule.
// The backend rejects this once bookings could already exist against the
// current effective_from (409 floor_layout_schedule_locked).
export async function rescheduleLayout(
  layoutId: string,
  effectiveDate: string,
): Promise<Layout> {
  const { data } = await axiosInstance.patch<Layout>(
    `/admin/floor-layouts/${layoutId}/schedule`,
    { effective_date: effectiveDate },
  );
  return data;
}

// Cancel a SCHEDULED layout (or discard a DRAFT/ARCHIVED one). Same
// 409 floor_layout_schedule_locked guard as reschedule for a SCHEDULED
// layout too close to its effective date.
export async function discardLayout(layoutId: string): Promise<Layout> {
  const { data } = await axiosInstance.delete<Layout>(
    `/admin/floor-layouts/${layoutId}`,
  );
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Preferences / Amenities
// ─────────────────────────────────────────────────────────────────────────────

export interface Preference {
  preference_id: string;
  preference_name: string;
  preference_type: string;
  description: string;
  icon_name: string;
}

interface RawPreference {
  id: number | string;
  name: string;
  category: string;
  description?: string;
  icon?: string;
}

export async function fetchAllPreferences(): Promise<Preference[]> {
  const { data } = await axiosInstance.get<{ amenities: RawPreference[] } | RawPreference[]>("/preferences");
  const raw: RawPreference[] = Array.isArray(data) ? data : data.amenities ?? [];
  return raw.map((item) => ({
    preference_id:   String(item.id),
    preference_name: item.name,
    preference_type: item.category,
    description:     item.description ?? "",
    icon_name:       item.icon ?? "",
  }));
}

export interface LayoutSeatsApiResponse {
  layout_id: string;
  total_seats: number;
  configured_seats: number;
  pending_seats: number;           // API uses "pending" not "unconfigured"
  items: { is_bookable: boolean }[];
}

export async function fetchLayoutSeatStats(layoutId: string): Promise<LayoutSeatStats> {
  const { data } = await axiosInstance.get<LayoutSeatsApiResponse>(
    `/admin/floor-layouts/${layoutId}/seats`
  );

  const items = data.items ?? []; // guard against null/undefined

  return {
    layout_id:          data.layout_id,
    total_seats:        data.total_seats,
    configured_seats:   data.configured_seats,
    unconfigured_seats: data.pending_seats,
    non_bookable_seats: items.filter((s) => !s.is_bookable).length,
    bookable_seats:     items.filter((s) => s.is_bookable).length,
  };
}