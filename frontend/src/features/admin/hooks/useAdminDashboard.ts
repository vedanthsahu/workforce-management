"use client";

import { useEffect, useState } from "react";
import { adminService } from "../services/admin.service";
import type { DashboardSummary } from "../types/admin.types";

export const useAdminDashboard = (
  date?: string,
  site_id?: number,
  floor_id?: number
) => {
  const [statsData, setStatsData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [buildings, setBuildings] = useState<any[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await adminService.getDashboardSummary({
  date,
  site_id,
  floor_id,
});
        setStatsData(data);
      } catch (err: any) {
        console.error(err);
        setError("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };
    const fetchBuildings = async () => {
  try {
    const data = await adminService.getBuildings(5); // 👈 static for now
    setBuildings(data);
  } catch (err) {
    console.error(err);
  }
};

    fetchStats();
    fetchBuildings();
  }, [date, site_id, floor_id]);

  return {
    statsData,
    loading,
    error,
    buildings,
  };
};