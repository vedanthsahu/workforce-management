"use client";

import { useEffect, useState } from "react";
import { adminService } from "../services/admin.service";
import type { DashboardSummary } from "../types/admin.types";

export const useAdminDashboard = () => {
  const [statsData, setStatsData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await adminService.getDashboardSummary();
        setStatsData(data);
      } catch (err: any) {
        console.error(err);
        setError("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return {
    statsData,
    loading,
    error,
  };
};