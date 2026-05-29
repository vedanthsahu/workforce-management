
import { axiosInstance } from "@/lib/http/axios";
import { LayoutApiResponse, LayoutTableItem } from "@/features/adminlayouts1/types/layout.types";


const BASE_URL = "http://localhost:8000"; // axios already has baseURL configured

export const getSites = async () => {
  const res = await axiosInstance.get(`/sites`);
  return res.data;
};

export const getBuildings = async (siteId: string) => {
  const res = await axiosInstance.get(`/buildings`, {
    params: { site_id: siteId },
  });
  return res.data;
};

export const getFloors = async (buildingId: string) => {
  const res = await axiosInstance.get(`/buildings/${buildingId}/floors`);
  return res.data;
};

export const getLayoutsByFloor = async (
  floorId: string
): Promise<LayoutApiResponse[]> => {
  const res = await axiosInstance.get(
    `/admin/floor-layouts/floors/${floorId}`
  );
  return res.data;
};