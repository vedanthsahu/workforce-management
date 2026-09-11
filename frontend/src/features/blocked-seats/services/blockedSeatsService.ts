import { axiosInstance } from "@/lib/http/axios";
import type {
  BlockCategory,
  BlockedSeatFilters,
  BlockedSeatListResponse,
  CreateBlockedSeatsPayload,
  LocationOption,
  SeatOption,
} from "../types/blockedSeats.types";

export const blockedSeatsService = {
  async list(
    category: BlockCategory,
    filters: BlockedSeatFilters,
    page = 1,
    limit = 20,
  ): Promise<BlockedSeatListResponse> {
    const { data } = await axiosInstance.get("/admin/blocked-seats", {
      params: {
        category,
        search: filters.search.trim() || undefined,
        siteId: filters.siteId || undefined,
        buildingId: filters.buildingId || undefined,
        floorId: filters.floorId || undefined,
        blockType: filters.blockType || undefined,
        date: filters.date || undefined,
        page,
        limit,
      },
    });
    return data;
  },
  async create(payload: CreateBlockedSeatsPayload): Promise<void> {
    await axiosInstance.post("/admin/blocked-seats", payload);
  },
  async cancel(blockId: string, reason: string): Promise<void> {
    await axiosInstance.post(`/admin/blocked-seats/${blockId}/cancel`, {
      reason,
    });
  },
  async getSites(): Promise<LocationOption[]> {
    const { data } = await axiosInstance.get("/sites", {
      params: { status: "ACTIVE" },
    });
    return data.map((item: { site_id: string; site_name: string }) => ({
      id: item.site_id,
      name: item.site_name,
    }));
  },
  async getBuildings(siteId: string): Promise<LocationOption[]> {
    const { data } = await axiosInstance.get("/buildings", {
      params: { site_id: siteId, status: "ACTIVE" },
    });
    return data.map((item: { building_id: string; building_name: string }) => ({
      id: item.building_id,
      name: item.building_name,
    }));
  },
  async getFloors(buildingId: string): Promise<LocationOption[]> {
    const { data } = await axiosInstance.get(
      `/buildings/${buildingId}/floors`,
      { params: { status: "ACTIVE" } },
    );
    return data.map((item: { floor_id: string; floor_name: string }) => ({
      id: item.floor_id,
      name: item.floor_name ?? item.floor_id,
    }));
  },
  async getSeats(
    floorId: string,
    startDate: string,
    endDate: string,
  ): Promise<SeatOption[]> {
    const { data } = await axiosInstance.get(`/floors/${floorId}/seats`, {
      params: { start_date: startDate, end_date: endDate, calendar_mode: true },
    });
    return data.items.map(
      (item: {
        seat_id: string;
        seat_code: string;
        is_bookable?: boolean;
        availability: {
          booked_dates?: string[];
          bookedDates?: string[];
          blocked_dates?: string[];
          blockedDates?: string[];
          unavailable_dates?: string[];
          unavailableDates?: string[];
          daily_statuses?: Array<{ status: string }>;
          dailyStatuses?: Array<{ status: string }>;
        };
      }) => {
        const dailyStatuses =
          item.availability.daily_statuses ??
          item.availability.dailyStatuses ??
          [];
        const hasBooking = Boolean(
          (item.availability.booked_dates ?? item.availability.bookedDates)
            ?.length || dailyStatuses.some((day) => day.status === "BOOKED"),
        );
        const hasBlock = Boolean(
          (item.availability.blocked_dates ?? item.availability.blockedDates)
            ?.length || dailyStatuses.some((day) => day.status === "BLOCKED"),
        );
        const isUnavailable =
          item.is_bookable === false ||
          Boolean(
            (
              item.availability.unavailable_dates ??
              item.availability.unavailableDates
            )?.length,
          ) ||
          dailyStatuses.some((day) => day.status === "UNAVAILABLE");
        return {
          seat_id: item.seat_id,
          seat_code: item.seat_code,
          hasBooking,
          hasBlock,
          isUnavailable,
          selectable: !hasBlock && !isUnavailable,
        };
      },
    );
  },
};
