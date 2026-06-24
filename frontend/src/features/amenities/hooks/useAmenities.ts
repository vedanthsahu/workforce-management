import { useCallback, useEffect, useState } from "react";
import { amenitiesService } from "../services/amenitiesService";
import { AmenitiesResponse } from "../types/amenities.types";

export const useAmenities = () => {
  const [data, setData] =
    useState<AmenitiesResponse | null>(null);

  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");

  const [status, setStatus] = useState("");

  const [page, setPage] = useState(1);

  const limit = 50;

  const fetchAmenities = useCallback(async () => {
    try {
      setLoading(true);

      const response =
        await amenitiesService.getAmenities({
          page,
          limit,
          search: search || undefined,
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
  }, [page, search, status]);

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