import { axiosInstance } from "@/lib/http/axios";
import type { DashboardSummary } from "../types/admin.types";

export const adminService = {
  async getDashboardSummary(params?: {
  date?: string;
  site_id?: number;
  floor_id?: number;
}): Promise<DashboardSummary> {
  const { data } = await axiosInstance.get(
    "/admin/dashboard/summary",
    {
      params, // IMPORTANT
    }
  );

  return data;
},
  async getBuildings(siteId: number) {
  const { data } = await axiosInstance.get("/buildings", {
    params: { site_id: siteId },
  });

  return data;
}
};


