import { axiosInstance } from "@/lib/http/axios";
import type {
  BlockListScope,
  BlockableFloorLayout,
  BlockedSeatFilters,
  BlockedSeat,
  BlockedSeatHistoryItem,
  BlockedSeatListResponse,
  BlockedSeatSummary,
  BlockedSeatConflict,
  CreateBlockedSeatsPayload,
  FloorLayoutSchedule,
  LocationOption,
  UpdateBlockedSeatPayload,
} from "../types/blockedSeats.types";

interface CacheEntry<T> {
  value?: T;
  promise?: Promise<T>;
  expiresAt: number;
}

const LOCATION_CACHE_MS = 5 * 60 * 1000;
const LAYOUT_CACHE_MS = 15 * 1000;
const LIST_CACHE_MS = 15 * 1000;
const SUMMARY_CACHE_MS = 30 * 1000;
const locationCache = new Map<string, CacheEntry<LocationOption[]>>();
const layoutCache = new Map<string, CacheEntry<BlockableFloorLayout>>();
const listCache = new Map<string, CacheEntry<BlockedSeatListResponse>>();
const summaryCache = new Map<string, CacheEntry<BlockedSeatSummary>>();
const scheduleCache = new Map<string, CacheEntry<FloorLayoutSchedule>>();

const cachedRequest = <T>(
  cache: Map<string, CacheEntry<T>>,
  key: string,
  ttl: number,
  request: () => Promise<T>,
  refresh = false,
): Promise<T> => {
  const existing = cache.get(key);
  if (!refresh && existing?.value && existing.expiresAt > Date.now()) {
    return Promise.resolve(existing.value);
  }
  if (existing?.promise) return existing.promise;

  const promise = request()
    .then((value) => {
      if (cache.get(key)?.promise === promise) {
        cache.set(key, { value, expiresAt: Date.now() + ttl });
      }
      return value;
    })
    .catch((error: unknown) => {
      if (cache.get(key)?.promise === promise) cache.delete(key);
      throw error;
    });
  cache.set(key, { ...existing, promise, expiresAt: existing?.expiresAt ?? 0 });
  return promise;
};

const cachedLocationValue = (key: string) => {
  const entry = locationCache.get(key);
  return entry?.value && entry.expiresAt > Date.now() ? entry.value : undefined;
};

const blockedSeatListKey = (
  category: BlockListScope,
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
  getCachedSummary(): BlockedSeatSummary | undefined {
    const entry = summaryCache.get("summary");
    return entry?.value && entry.expiresAt > Date.now()
      ? entry.value
      : undefined;
  },
  summary(refresh = false): Promise<BlockedSeatSummary> {
    return cachedRequest(
      summaryCache,
      "summary",
      SUMMARY_CACHE_MS,
      async () => {
        try {
          const { data } = await axiosInstance.get("/admin/blocked-seats/summary");
          return data;
        } catch (error: unknown) {
          const status = (error as { response?: { status?: number } }).response?.status;
          if (status !== 404) throw error;
          // Keep counts available while a frontend deployment is briefly served
          // with an older backend that does not yet expose the summary endpoint.
          const { data } = await axiosInstance.get("/admin/blocked-seats", {
            params: {
              category: "active",
              page: 1,
              limit: 1,
              includeSummary: true,
            },
          });
          return data.summary;
        }
      },
      refresh,
    );
  },
  getCachedList(
    category: BlockListScope,
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
    category: BlockListScope,
    filters: BlockedSeatFilters,
    page = 1,
    limit = 10,
    refresh = false,
  ): Promise<BlockedSeatListResponse> {
    const key = blockedSeatListKey(category, filters, page, limit);
    return cachedRequest(
      listCache,
      key,
      LIST_CACHE_MS,
      async () => {
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
            includeSummary: false,
          },
        });
        return data;
      },
      refresh,
    );
  },
  async create(payload: CreateBlockedSeatsPayload): Promise<void> {
    await axiosInstance.post("/admin/blocked-seats", payload);
    listCache.clear();
    summaryCache.clear();
    layoutCache.clear();
  },
  async cancel(blockId: string, reason: string): Promise<void> {
    await axiosInstance.post(`/admin/blocked-seats/${blockId}/cancel`, { reason });
    listCache.clear();
    summaryCache.clear();
    layoutCache.clear();
  },
  async history(blockId: string): Promise<BlockedSeatHistoryItem[]> {
    const { data } = await axiosInstance.get(
      `/admin/blocked-seats/${blockId}/history`,
    );
    return data.items;
  },
  async update(
    blockId: string,
    payload: UpdateBlockedSeatPayload,
  ): Promise<BlockedSeat> {
    const { data } = await axiosInstance.patch(
      `/admin/blocked-seats/${blockId}`,
      payload,
    );
    listCache.clear();
    summaryCache.clear();
    layoutCache.clear();
    return data;
  },
  getCachedSites(): LocationOption[] | undefined {
    return cachedLocationValue("sites");
  },
  getSites(): Promise<LocationOption[]> {
    return cachedRequest(
      locationCache,
      "sites",
      LOCATION_CACHE_MS,
      async () => {
        const { data } = await axiosInstance.get("/sites", {
          params: { status: "ACTIVE" },
        });
        return data.map((item: { site_id: string; site_name: string }) => ({
          id: item.site_id,
          name: item.site_name,
        }));
      },
    );
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
  async getConflicts(
    floorId: string,
    seatIds: string[],
    blockedFrom: string,
    blockedTo: string,
    signal?: AbortSignal,
  ): Promise<BlockedSeatConflict[]> {
    const params = new URLSearchParams({ blockedFrom, blockedTo });
    seatIds.forEach((seatId) => params.append("seatId", seatId));
    params.append("view", "conflicts");
    const { data } = await axiosInstance.get(
      `/admin/blocked-seats/floors/${floorId}/layout-resources`,
      { params, signal },
    );
    if (!Array.isArray(data.conflicts)) {
      throw new Error(
        "The blocked-seat API is outdated. Restart or deploy the updated backend, then load the layout again.",
      );
    }
    return data.conflicts;
  },
  getBlockableLayout(
    floorId: string,
    blockedFrom: string,
    blockedTo: string,
    refresh = false,
    view: "resources" | "metadata" = "resources",
    signal?: AbortSignal,
  ): Promise<BlockableFloorLayout> {
    const key = `${view}:${floorId}:${blockedFrom}:${blockedTo}`;
    return cachedRequest(
      layoutCache,
      key,
      LAYOUT_CACHE_MS,
      async () => {
        const { data } = await axiosInstance.get(
          `/admin/blocked-seats/floors/${floorId}/layout-resources`,
          { params: { blockedFrom, blockedTo, view }, signal },
        );
        return data;
      },
      refresh,
    );
  },
  getFloorLayoutSchedule(floorId: string): Promise<FloorLayoutSchedule> {
    const currentDate = new Date().toLocaleDateString("en-CA");
    return cachedRequest(
      scheduleCache,
      floorId,
      LOCATION_CACHE_MS,
      async () => {
        const { data } = await axiosInstance.get(
          `/admin/blocked-seats/floors/${floorId}/layout-resources`,
          {
            params: {
              blockedFrom: currentDate,
              blockedTo: currentDate,
              view: "schedule",
            },
          },
        );
        return data;
      },
    );
  },
};
