// services/layoutService.ts

import { axiosInstance } from "@/lib/http/axios";

export const getLayoutsByFloor = async (floorId: string) => {
  const res = await axiosInstance.get(
    `/admin/floor-layouts/floors/${floorId}`
  );
  return res.data;
};

export const activateLayout = async (layoutId: string) => {
  const res = await axiosInstance.post(
    `/admin/floor-layouts/${layoutId}/activate`
  );
  return res.data;
};