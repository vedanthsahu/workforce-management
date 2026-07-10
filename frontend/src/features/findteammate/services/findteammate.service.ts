import { axiosInstance } from "@/lib/http/axios";
import type { ApiTeamGroup, RawTeammateBooking, UserBookingHistoryApiResponse } from "../types/findteammate.types";

export async function fetchAllTeamGroups(): Promise<ApiTeamGroup[]> {
  const { data } = await axiosInstance.get<ApiTeamGroup[]>("/teams/me");
  return data;
}

export async function fetchUserTodayBooking(userId: string): Promise<RawTeammateBooking | null> {
  const { data } = await axiosInstance.get<UserBookingHistoryApiResponse>(
    `/users/${userId}/bookings`
  );
  // API returns { hasTodayBooking, todayBooking, bookings } — use todayBooking directly
  return data.todayBooking ?? null;
}
