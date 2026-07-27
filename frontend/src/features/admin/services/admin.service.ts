import { axiosInstance } from "@/lib/http/axios";
import type {
  AdminActivitiesResponse,
  DashboardFilters,
  DashboardSummary,
  OccupancyHierarchyItem,
  OccupancyRangeItem,
} from "../types/admin.types";

export const adminService = {
  async getDashboardSummary(params?: DashboardFilters): Promise<DashboardSummary> {
    const { data } = await axiosInstance.get<DashboardSummary>(
      "/admin/dashboard/summary",
      { params }
    );

    return data;
  },

  async getOccupancyRange(startDate: string, endDate: string): Promise<OccupancyRangeItem[]> {
    const { data } = await axiosInstance.get<OccupancyRangeItem[]>(
      "/admin/occupancy/date-range",
      { params: { startDate, endDate } }
    );

    return data;
  },

  async getOccupancyHierarchy(params: {
    date?: string;
    siteId?: number;
    buildingId?: number;
  }): Promise<OccupancyHierarchyItem[]> {
    const { data } = await axiosInstance.get<OccupancyHierarchyItem[]>(
      "/admin/occupancy/hierarchy",
      { params }
    );

    return data;
  },

  async getAdminActivities(params?: {
    date?: string;
    siteId?: number;
    buildingId?: number;
    floorId?: number;
  }): Promise<AdminActivitiesResponse> {
    const { data } = await axiosInstance.get<AdminActivitiesResponse>(
      "/admin/activities",
      { params }
    );

    return data;
  },
};
