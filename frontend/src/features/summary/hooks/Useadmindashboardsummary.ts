import { useCallback, useEffect, useState,useMemo } from "react";
import { adminDashboardService } from "@/features/summary/services/Admindashboardservice";
import { AdminDashboardSummary, AdminDashboardSummaryParams, SummaryCardItem } from "@/features/summary/types/Admin dashboard.types";

export const useAdminDashboardSummary = (initialParams?: AdminDashboardSummaryParams) => {
  const [data, setData] = useState<AdminDashboardSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState<string | null>(initialParams?.date ?? null);
  const [siteId, setSiteId] = useState<number | null>(initialParams?.site_id ?? null);
  const [floorId, setFloorId] = useState<number | null>(initialParams?.floor_id ?? null);

  const fetchSummary = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminDashboardService.getSummary({
        date: date || undefined,
        site_id: siteId ?? undefined,
        floor_id: floorId ?? undefined,
      });
      setData(response);
    } catch (err) {
      console.error("Error fetching admin dashboard summary", err);
      setError("Failed to load dashboard summary");
    } finally {
      setLoading(false);
    }
  }, [date, siteId, floorId]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  // CARD DATA — maps the raw summary into the shape the UI renders, kept here so the
  // component stays presentation-only.
  const cards: SummaryCardItem[] = useMemo(
    () => [
      { key: "total_offices", label: "Total Offices", value: data?.total_offices },
      { key: "total_buildings", label: "Total Buildings", value: data?.total_buildings },
      { key: "total_floors", label: "Total Floors", value: data?.total_floors },
      { key: "total_seats", label: "Total Seats", value: data?.total_seats },
    ],
    [data]
  );

  return {
    data,
    cards,
    loading,
    error,
    date,
    setDate,
    siteId,
    setSiteId,
    floorId,
    setFloorId,
    fetchSummary,
  };
};