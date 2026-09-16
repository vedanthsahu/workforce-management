import { axiosInstance } from "@/lib/http/axios";

import { AdminBookingApiStatus, AdminBookingApiType, AdminBookingListResponse } from "../types/adminBooking.types";

export interface AdminBookingListParams {
  startDate?: string;
  endDate?: string;
  siteId?: string;
  buildingId?: string;
  floorId?: string;
  bookingType?: AdminBookingApiType;
  bookingStatus?: AdminBookingApiStatus;
  search?: string;
  seatCode?: string;
  bookedByUserId?: string;
  page?: number;
  limit?: number;
}

export const adminBookingsService = {
  async list(params: AdminBookingListParams = {}): Promise<AdminBookingListResponse> {
    const { data } = await axiosInstance.get("/admin/bookings", { params });

    return data;
  },
};
