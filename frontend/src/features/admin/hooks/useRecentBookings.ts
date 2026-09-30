"use client";

import { useEffect, useState } from "react";
import { adminService } from "../services/admin.service";
import { mapActivitiesToRecent } from "../utils/dashboard.utils";
import { fetchActivityPolicy } from "@/features/configuration/services/configuration.service";
import type { RecentBooking } from "../types/admin.types";

export function useRecentBookings() {
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    // Row count is Configuration → Activity Table Record Count. If that
    // lookup fails, show every activity rather than an arbitrary cut-off.
    Promise.all([
      adminService.getAdminActivities(),
      fetchActivityPolicy().catch((err) => {
        console.error("Failed to load activity policy", err);
        return null;
      }),
    ])
      .then(([res, policy]) => {
        if (cancelled) return;
        const rows = mapActivitiesToRecent(res.items);
        setRecentBookings(policy ? rows.slice(0, policy.record_count) : rows);
      })
      .catch((err) => console.error(err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { recentBookings, loading };
}
