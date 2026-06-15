"use client";

import { useEffect, useState } from "react";
import { adminService } from "../services/admin.service";
import type { DashboardFilters, DashboardSummary } from "../types/admin.types";

export function useDashboardSummary(filters: DashboardFilters) {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { date, site_id, floor_id } = filters;

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    adminService
      .getDashboardSummary({ date, site_id, floor_id })
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setError("Failed to load dashboard data");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [date, site_id, floor_id]);

  return { data, loading, error };
}
