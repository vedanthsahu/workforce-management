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

export interface AdminPersonSuggestion {
  name: string | null;
  email: string | null;
}

export interface AdminSeatSuggestion {
  seat_code: string;
  seat_type: string | null;
}

export const adminBookingsService = {
  async list(params: AdminBookingListParams = {}): Promise<AdminBookingListResponse> {
    const { data } = await axiosInstance.get("/admin/bookings", { params });

    return data;
  },

  // Ranked, search-as-you-type matches (best first) for the filter dropdowns.
  // An empty `q` lists everyone (up to `limit`), used to preload the dropdown.
  async suggestPeople(
    q: string,
    bookingType: AdminBookingApiType,
    limit?: number,
    signal?: AbortSignal,
  ): Promise<AdminPersonSuggestion[]> {
    const { data } = await axiosInstance.get("/admin/bookings/suggest/people", {
      params: { q, bookingType, limit },
      signal,
    });

    return data;
  },

  async suggestSeats(q: string, limit?: number, signal?: AbortSignal): Promise<AdminSeatSuggestion[]> {
    const { data } = await axiosInstance.get("/admin/bookings/suggest/seats", {
      params: { q, limit },
      signal,
    });

    return data;
  },
};
