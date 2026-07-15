import { axiosInstance } from "@/lib/http/axios";

import { AdminActivityListResponse } from "../types/adminBooking.types";

export interface AdminActivityListParams {
  siteId?: string;
  buildingId?: string;
  floorId?: string;
  /** ISO yyyy-mm-dd. Backend only supports a single exact date, not a range. */
  date?: string;
}

export const adminActivitiesService = {
  async list(params: AdminActivityListParams = {}): Promise<AdminActivityListResponse> {
    const { data } = await axiosInstance.get("/admin/activities", { params });

    return data;
  },
};
