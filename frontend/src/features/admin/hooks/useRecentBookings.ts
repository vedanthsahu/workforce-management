"use client";

import { useEffect, useState } from "react";
import { adminService } from "../services/admin.service";
import { mapActivitiesToRecent } from "../utils/dashboard.utils";
import type { RecentBooking } from "../types/admin.types";

const RECENT_BOOKINGS_LIMIT = 20;

export function useRecentBookings() {
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    adminService
      .getAdminActivities()
      .then((res) => {
        if (cancelled) return;
        setRecentBookings(mapActivitiesToRecent(res.items).slice(0, RECENT_BOOKINGS_LIMIT));
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
