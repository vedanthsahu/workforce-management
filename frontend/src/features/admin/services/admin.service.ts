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
      params, 
    }
  );

  return data;
},

  async getBuildings(siteId: number) {
  const { data } = await axiosInstance.get("/buildings", {
    params: { site_id: siteId },
  });

  return data;
},

async getOccupancyRange(startDate: string, endDate: string) {
  const { data } = await axiosInstance.get(
    "/admin/occupancy/date-range",
    {
      params: { startDate, endDate },
    }
  );

  return data;
},

async getOccupancyHierarchy(params: {
  date?: string;
  siteId?: number;
  buildingId?: number;
}) {
  const { data } = await axiosInstance.get(
    "/admin/occupancy/hierarchy",
    { params }
  );

  return data;
},

async getAdminBookings(params?: {
  date?: string;
  siteId?: number;
  buildingId?: number;
  floorId?: number;
  bookingStatus?: string;
  page?: number;
  limit?: number;
}) {
  const { data } = await axiosInstance.get("/admin/bookings", {
    params,
  });

  return data;
}

};


