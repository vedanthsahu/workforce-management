import { axiosInstance } from "@/lib/http/axios";
import type { DashboardSummary } from "../types/admin.types";

export const adminService = {
  async getDashboardSummary(): Promise<DashboardSummary> {
    const { data } = await axiosInstance.get(
      "/admin/dashboard/summary"
    );

    return data;
  },
};