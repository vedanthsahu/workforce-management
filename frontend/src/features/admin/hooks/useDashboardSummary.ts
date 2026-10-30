"use client";

import { useEffect, useState } from "react";
import { getApiErrorMessage } from "@/lib/apiError";
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
        if (!cancelled) setError(getApiErrorMessage(err, "We couldn't load the dashboard data. Please try again."));
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
