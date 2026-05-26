// // services/layoutService.ts

// import { axiosInstance } from "@/lib/http/axios";

// export const getLayoutsByFloor = async (floorId: string) => {
//   const res = await axiosInstance.get(
//     `/admin/floor-layouts/floors/${floorId}`
//   );
//   return res.data;
// };

// export const activateLayout = async (layoutId: string) => {
//   const res = await axiosInstance.post(
//     `/admin/floor-layouts/${layoutId}/activate`
//   );
//   return res.data;
// };

// import { axiosInstance } from "@/lib/http/axios";
// import { Building, Floor, Layout, Site } from "../types/layout.types";


// // ─────────────────────────────────────────────────────────────────────────────
// // Location services
// // ─────────────────────────────────────────────────────────────────────────────

// // export async function fetchSites(): Promise<Site[]> {
// //   const { data } = await axiosInstance.get<any[]>("/sites");
// //   return data.map((s) => ({
// //     id: String(s.site_id),
// //     name: s.site_name,
// //     city: s.city ?? "",
// //     country: s.country ?? "",
// //     timezone: s.timezone ?? "",
// //   }));
// // }

// // export async function fetchBuildings(siteId: string): Promise<Building[]> {
// //   const { data } = await axiosInstance.get<any[]>("/buildings", {
// //     params: { site_id: siteId },
// //   });
// //   return data.map((b) => ({
// //     id: String(b.building_id),
// //     siteId: String(b.site_id),
// //     name: b.building_name,
// //   }));
// // }

// // export async function fetchFloors(buildingId: string): Promise<Floor[]> {
// //   const { data } = await axiosInstance.get<any[]>(
// //     `/buildings/${buildingId}/floors`
// //   );
// //   return data.map((f) => ({
// //     id: String(f.floor_id),
// //     buildingId: String(f.building_id ?? buildingId),
// //     name: f.floor_name ?? f.floor_code ?? `Floor ${f.floor_id}`,
// //     number: parseInt(f.floor_code ?? "0", 10),
// //   }));
// // }
// export async function fetchSites(): Promise<Site[]> {
//   const { data } = await axiosInstance.get<any[]>("/sites");
//   return data.map((s) => ({
//     id: s.site_id,          // ← remove String()
//     name: s.site_name,
//     city: s.city ?? "",
//     country: s.country ?? "",
//     timezone: s.timezone ?? "",
//   }));
// }

// export async function fetchBuildings(siteId: string): Promise<Building[]> {
//   const { data } = await axiosInstance.get<any[]>("/buildings", {
//     params: { site_id: siteId },
//   });
//   return data.map((b) => ({
//     id: b.building_id,      // ← remove String()
//     siteId: b.site_id,      // ← remove String()
//     name: b.building_name,
//   }));
// }

// export async function fetchFloors(buildingId: string): Promise<Floor[]> {
//   const { data } = await axiosInstance.get<any[]>(
//     `/buildings/${buildingId}/floors`
//   );
//   return data.map((f) => ({
//     id: f.floor_id,                                          // ← remove String()
//     buildingId: f.building_id ?? buildingId,                 // ← remove String()
//     name: f.floor_name ?? f.floor_code ?? `Floor ${f.floor_id}`,
//     number: parseInt(f.floor_code ?? "0", 10),
//   }));
// }

// // getLayoutsByFloor and activateLayout stay the same
// // ─────────────────────────────────────────────────────────────────────────────
// // Layout services
// // ─────────────────────────────────────────────────────────────────────────────

// export async function getLayoutsByFloor(floorId: string): Promise<Layout[]> {
//   const { data } = await axiosInstance.get<Layout[]>(
//     `/admin/floor-layouts/floors/${floorId}`
//   );
//   return data;
// }

// export async function activateLayout(layoutId: string): Promise<Layout> {
//   const { data } = await axiosInstance.post<Layout>(
//     `/admin/floor-layouts/${layoutId}/activate`
//   );
//   return data;
// }

import { axiosInstance } from "@/lib/http/axios";
import { Building, Floor, Layout, Site } from "../types/layout.types";

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

// export async function fetchAllPreferences(): Promise<Preference[]> {
//   const { data } = await axiosInstance.get<Preference[]>("/preferences");
//   return data;
// }

// export async function fetchAllPreferences(): Promise<Preference[]> {
//   const { data } = await axiosInstance.get<{ amenities: Preference[] } | Preference[]>("/preferences");
//   // handle both shapes: { amenities: [...] } or plain [...]
//   console.log(data)
//   return Array.isArray(data) ? data : (data as any).amenities ?? [];
// }

// export async function fetchAllPreferences(): Promise<Preference[]> {
//   const { data } = await axiosInstance.get<{ amenities: any[] } | any[]>("/preferences");

//   const raw: any[] = Array.isArray(data) ? data : (data as any).amenities ?? [];

//   return raw.map((item) => ({
//     preference_id:   String(item.id),
//     preference_name: item.name,
//     preference_type: item.category,
//     description:     item.description ?? "",
//     icon_name:       item.icon ?? "",
//   }));
// }

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

export async function fetchSeatPreferences(svgId: string): Promise<string[]> {
  const { data } = await axiosInstance.get<{ preference_ids: string[] }>(
    `/admin/seat-preferences/${svgId}`
  );
  return data.preference_ids ?? [];
}

export async function saveSeatPreferences(
  seatSvgId: string,
  layoutId: string,
  preferenceIds: string[]
): Promise<void> {
  await axiosInstance.post("/admin/seat-preferences", {
    seat_svg_id: seatSvgId,
    layout_id:   layoutId,
    preference_ids: preferenceIds,
  });
}