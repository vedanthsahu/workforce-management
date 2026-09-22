import { useCallback, useEffect, useState } from "react";
import { amenitiesService } from "../services/amenitiesService";
import { AmenitiesResponse } from "../types/amenities.types";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

export const useAmenities = () => {
  const [data, setData] =
    useState<AmenitiesResponse | null>(null);

  // Only true until the first request resolves -- a search/status refetch
  // after that never flips it back on, so the table and stat cards keep
  // showing the current data (instead of flashing back to skeletons) while
  // the debounced search quietly narrows the list underneath.
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 350);

  const [status, setStatus] = useState("");

  const [page, setPage] = useState(1);

  const limit = 50;

  const fetchAmenities = useCallback(async () => {
    try {
      const response =
        await amenitiesService.getAmenities({
          page,
          limit,
          search: debouncedSearch || undefined,
          status: status || undefined,
        });

      setData(response);
    } catch (error) {
      console.error(
        "Error fetching amenities",
        error
      );
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, status]);

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

    page,
    setPage,

    fetchAmenities,
  };
};