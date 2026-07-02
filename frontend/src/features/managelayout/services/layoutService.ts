import { axiosInstance } from "@/lib/http/axios";
import { Building, Floor, Layout, LayoutSeatStats, Site } from "../types/layout.types";

// ─────────────────────────────────────────────────────────────────────────────
// Location services
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchSites(): Promise<Site[]> {
  const { data } = await axiosInstance.get<any[]>("/sites");
  return data.map((s) => ({
    id: String(s.site_id),       // ← String() back
    name: s.site_name,
    city: s.city ?? "",
    country: s.country ?? "",
    timezone: s.timezone ?? "",
  }));
}

export async function fetchBuildings(siteId: string): Promise<Building[]> {
  const { data } = await axiosInstance.get<any[]>("/buildings", {
    params: { site_id: siteId },
  });
  return data.map((b) => ({
    id: String(b.building_id),   // ← String() back
    siteId: String(b.site_id),   // ← String() back
    name: b.building_name,
  }));
}

export async function fetchFloors(buildingId: string): Promise<Floor[]> {
  const { data } = await axiosInstance.get<any[]>(
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

export async function activateLayout(layoutId: string): Promise<Layout> {
  const { data } = await axiosInstance.post<Layout>(
    `/admin/floor-layouts/${layoutId}/activate`
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

export async function fetchAllPreferences(): Promise<Preference[]> {
  const { data } = await axiosInstance.get<{ amenities: any[] } | any[]>("/preferences");
  const raw: any[] = Array.isArray(data) ? data : (data as any).amenities ?? [];
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
  items: any[];
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