"use client";

import { useDashboardSummary } from "./useDashboardSummary";
import { useOccupancyTrend } from "./useOccupancyTrend";
import { useRecentBookings } from "./useRecentBookings";
import { useTopOffices } from "./useTopOffices";

export const useAdminDashboard = (
  date?: string,
  site_id?: number,
  floor_id?: number
) => {
  const { data: statsData, loading, error } = useDashboardSummary({ date, site_id, floor_id });
  const { trendData, selectedWeek, setSelectedWeek } = useOccupancyTrend();
  const { topOffices } = useTopOffices(date);
  const { recentBookings } = useRecentBookings(date);

  return {
    statsData,
    loading,
    error,
    trendData,
    selectedWeek,
    setSelectedWeek,
    topOffices,
    recentBookings,
  };
};
