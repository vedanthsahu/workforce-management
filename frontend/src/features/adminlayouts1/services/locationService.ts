import { axiosInstance } from "@/lib/http/axios";
import { LayoutApiResponse, Site, Building, Floor } from "@/features/adminlayouts1/types/layout.types";

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