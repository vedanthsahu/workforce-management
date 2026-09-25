import { useCallback, useEffect, useState } from "react";
import { amenitiesService } from "../services/amenitiesService";
import { AmenitiesResponse } from "../types/amenities.types";

// Search is applied client-side (see admin/amenities/page.tsx, matching the
// offices/buildings/floors pages), so this always fetches the full tenant
// list -- 200 is the backend's max page size (Query(..., le=200)), well
// above any tenant's real amenity count.
// const FETCH_ALL_LIMIT = 200;

export const useAmenities = () => {
  const [data, setData] =
    useState<AmenitiesResponse | null>(null);

  // Only true until the first request resolves -- a status refetch after
  // that never flips it back on, so the table and stat cards keep showing
  // the current data (instead of flashing back to skeletons) while search
  // narrows the list underneath.
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");

  const [status, setStatus] = useState("");

  // Backend's max page size (see preferences.py: le=200) -- fetched once
  // up front so `search` can filter entirely client-side afterward, the
  // same pattern useBuildings/useOffices use for their search boxes.
  // Refetching from the server per keystroke (the previous behavior) put
  // both AmenitiesCards and AmenitiesTable into their loading/skeleton
  // state on every character typed, reading as the whole page reloading.
  const limit = 200;

  const fetchAmenities = useCallback(async () => {
    try {
      const firstPage = await amenitiesService.getAmenities({
        page: 1,
        limit,
        status: status || undefined,
      });
      const remainingPages = await Promise.all(
        Array.from({ length: Math.max(firstPage.total_pages - 1, 0) }, (_, index) =>
          amenitiesService.getAmenities({
            page: index + 2,
            limit,
            status: status || undefined,
          })
        )
      );

      setData({
        ...firstPage,
        items: [firstPage, ...remainingPages].flatMap((response) => response.items),
        page: 1,
        limit: firstPage.total || limit,
        total_pages: firstPage.total ? 1 : 0,
      });
    } catch (error) {
      console.error(
        "Error fetching amenities",
        error
      );
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    fetchAmenities();
  }, [fetchAmenities]);

  return {
    data,
    loading,

    search,
    setSearch,

    status,
    setStatus,

    fetchAmenities,
  };
};
