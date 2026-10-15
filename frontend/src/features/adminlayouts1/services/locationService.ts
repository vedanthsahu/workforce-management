import { axiosInstance } from "@/lib/http/axios";
import { LayoutApiResponse, Site, Building, Floor } from "@/features/adminlayouts1/types/layout.types";

export interface DefaultOfficePreference {
  siteId: string | null;
  siteName: string | null;
  buildingId: string | null;
  buildingName: string | null;
  floorId: string | null;
  floorName: string | null;
}

// The same saved office/building/floor the Profile page's "Seat Preferences"
// section shows (see userProfile/services/profile.service..ts's
// mapPreferences) -- GET /dashboard/me's work_preferences, not a separate
// setting. Used to auto-expand (and, when a floor was saved, auto-select)
// the Floor Layout tree to the admin's own default location on first load,
// instead of it just sitting blank.
export const getDefaultOfficePreference = async (): Promise<DefaultOfficePreference> => {
  try {
    const res = await axiosInstance.get("/dashboard/me");
    const wp = res.data?.work_preferences;
    return {
      siteId: wp?.site_id ?? null,
      siteName: wp?.site_name ?? null,
      buildingId: wp?.building_id ?? null,
      buildingName: wp?.building_name ?? null,
      floorId: wp?.floor_id ?? null,
      floorName: wp?.floor_name ?? null,
    };
  } catch {
    return { siteId: null, siteName: null, buildingId: null, buildingName: null, floorId: null, floorName: null };
  }
};

export const getSites = async (): Promise<Site[]> => {
  const res = await axiosInstance.get(`/sites`);
  return res.data;
};

export const getBuildings = async (siteId: string): Promise<Building[]> => {
  const res = await axiosInstance.get(`/buildings`, {
    params: { site_id: siteId },
  });
  return res.data;
};

export const getFloors = async (buildingId: string): Promise<Floor[]> => {
  const res = await axiosInstance.get(`/buildings/${buildingId}/floors`);
  return res.data;
};

export const getLayoutsByFloor = async (
  floorId: string
): Promise<LayoutApiResponse[]> => {
  const res = await axiosInstance.get(
    `/admin/floor-layouts/floors/${floorId}`
  );
  console.log(res.data)
  return res.data;
};

export const deleteLayout = async (layoutId: string): Promise<void> => {
  await axiosInstance.delete(`/admin/floor-layouts/${layoutId}`);
};

// Change the effective_date of a layout that's already SCHEDULED -- not a
// new schedule, not a publish. The backend refuses this (409) once
// bookings could already exist against the current effective_from.
export const rescheduleLayout = async (
  layoutId: string,
  effectiveDate: string
): Promise<LayoutApiResponse> => {
  const res = await axiosInstance.patch(
    `/admin/floor-layouts/${layoutId}/schedule`,
    { effective_date: effectiveDate }
  );
  return res.data;
};