
import { axiosInstance } from "@/lib/http/axios";
import { AdminDashboardSummary, AdminDashboardSummaryParams } from "@/features/summary/types/Admin dashboard.types";

export const adminDashboardService = {
  // GET ADMIN DASHBOARD SUMMARY
  async getSummary(params?: AdminDashboardSummaryParams): Promise<AdminDashboardSummary> {
    const { data } = await axiosInstance.get("/admin/dashboard/summary", { params });
    return data;
  },
};