import { axiosInstance } from "@/lib/http/axios";
import type {
  BlockCategory,
  BlockableFloorLayout,
  BlockedSeatFilters,
  BlockedSeatListResponse,
  CreateBlockedSeatsPayload,
  LocationOption,
  SeatOption,
} from "../types/blockedSeats.types";

interface CacheEntry<T> {
  value?: T;
  promise?: Promise<T>;
  expiresAt: number;
}

const LOCATION_CACHE_MS = 5 * 60 * 1000;
const LAYOUT_CACHE_MS = 15 * 1000;
const LIST_CACHE_MS = 15 * 1000;
const locationCache = new Map<string, CacheEntry<LocationOption[]>>();
const layoutCache = new Map<string, CacheEntry<BlockableFloorLayout>>();
const listCache = new Map<string, CacheEntry<BlockedSeatListResponse>>();

const cachedRequest = <T>(
  cache: Map<string, CacheEntry<T>>,
  key: string,
  ttl: number,
  request: () => Promise<T>,
): Promise<T> => {
  const existing = cache.get(key);
  if (existing?.value && existing.expiresAt > Date.now()) {
    return Promise.resolve(existing.value);
  }
  if (existing?.promise) return existing.promise;

  const promise = request()
    .then((value) => {
      cache.set(key, { value, expiresAt: Date.now() + ttl });
      return value;
    })
    .catch((error: unknown) => {
      cache.delete(key);
      throw error;
    });
  cache.set(key, { promise, expiresAt: 0 });
  return promise;
};

const cachedLocationValue = (key: string) => {
  const entry = locationCache.get(key);
  return entry?.value && entry.expiresAt > Date.now()
    ? entry.value
    : undefined;
};

const blockedSeatListKey = (
  category: BlockCategory,
  filters: BlockedSeatFilters,
  page: number,
  limit: number,
) =>
  JSON.stringify({
    category,
    search: filters.search.trim(),
    siteId: filters.siteId,
    buildingId: filters.buildingId,
    floorId: filters.floorId,
    blockType: filters.blockType,
    date: filters.date,
    page,
    limit,
  });

export const blockedSeatsService = {
  getCachedList(
    category: BlockCategory,
    filters: BlockedSeatFilters,
    page = 1,
    limit = 10,
  ): BlockedSeatListResponse | undefined {
    const entry = listCache.get(
      blockedSeatListKey(category, filters, page, limit),
    );
    return entry?.value && entry.expiresAt > Date.now()
      ? entry.value
      : undefined;
  },
  list(
    category: BlockCategory,
    filters: BlockedSeatFilters,
    page = 1,
    limit = 10,
  ): Promise<BlockedSeatListResponse> {
    const key = blockedSeatListKey(category, filters, page, limit);
    return cachedRequest(listCache, key, LIST_CACHE_MS, async () => {
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
    });
  },
  async create(payload: CreateBlockedSeatsPayload): Promise<void> {
    await axiosInstance.post("/admin/blocked-seats", payload);
    listCache.clear();
    layoutCache.clear();
  },
  async cancel(blockId: string, reason: string): Promise<void> {
    await axiosInstance.post(`/admin/blocked-seats/${blockId}/cancel`, {
      reason,
    });
    listCache.clear();
    layoutCache.clear();
  },
  getCachedSites(): LocationOption[] | undefined {
    return cachedLocationValue("sites");
  },
  getSites(): Promise<LocationOption[]> {
    return cachedRequest(locationCache, "sites", LOCATION_CACHE_MS, async () => {
      const { data } = await axiosInstance.get("/sites", {
        params: { status: "ACTIVE" },
      });
      return data.map((item: { site_id: string; site_name: string }) => ({
        id: item.site_id,
        name: item.site_name,
      }));
    });
  },
  getCachedBuildings(siteId: string): LocationOption[] | undefined {
    return cachedLocationValue(`buildings:${siteId}`);
  },
  getBuildings(siteId: string): Promise<LocationOption[]> {
    const key = `buildings:${siteId}`;
    return cachedRequest(locationCache, key, LOCATION_CACHE_MS, async () => {
      const { data } = await axiosInstance.get("/buildings", {
        params: { site_id: siteId, status: "ACTIVE" },
      });
      return data.map(
        (item: { building_id: string; building_name: string }) => ({
          id: item.building_id,
          name: item.building_name,
        }),
      );
    });
  },
  getCachedFloors(buildingId: string): LocationOption[] | undefined {
    return cachedLocationValue(`floors:${buildingId}`);
  },
  getFloors(buildingId: string): Promise<LocationOption[]> {
    const key = `floors:${buildingId}`;
    return cachedRequest(locationCache, key, LOCATION_CACHE_MS, async () => {
      const { data } = await axiosInstance.get(
        `/buildings/${buildingId}/floors`,
        { params: { status: "ACTIVE" } },
      );
      return data.map((item: { floor_id: string; floor_name: string }) => ({
        id: item.floor_id,
        name: item.floor_name ?? item.floor_id,
      }));
    });
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
  getBlockableLayout(
    floorId: string,
    blockedFrom: string,
    blockedTo: string,
  ): Promise<BlockableFloorLayout> {
    const key = `${floorId}:${blockedFrom}:${blockedTo}`;
    return cachedRequest(
      layoutCache,
      key,
      LAYOUT_CACHE_MS,
      async () => {
        const { data } = await axiosInstance.get(
          `/admin/blocked-seats/floors/${floorId}/layout-resources`,
          { params: { blockedFrom, blockedTo } },
        );
        return data;
      },
    );
  },
};
