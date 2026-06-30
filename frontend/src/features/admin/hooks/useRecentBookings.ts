

"use client";

import { useEffect, useState } from "react";
import { adminService } from "../services/admin.service";
import { mapActivitiesToRecent } from "../utils/dashboard.utils";
import type { AdminActivityItem, RecentBooking } from "../types/admin.types";

const RECENT_BOOKINGS_LIMIT = 5;

// The backend only returns activities for a single date at a time, defaulting
// to today. To show a true "recent activity" feed we fetch the last N days
// in parallel and merge them client-side, ordered by creation time.
const LOOKBACK_DAYS = 14;

function isoDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

export function useRecentBookings() {
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([]);

  useEffect(() => {
    let cancelled = false;
    const today = new Date();
    const dates = Array.from({ length: LOOKBACK_DAYS }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      return isoDate(d);
    });

    Promise.all(dates.map((date) => adminService.getAdminActivities({ date })))
      .then((responses) => {
        if (cancelled) return;

        const allItems: AdminActivityItem[] = responses.flatMap((res) => res.items);
        allItems.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        setRecentBookings(mapActivitiesToRecent(allItems).slice(0, RECENT_BOOKINGS_LIMIT));
      })
      .catch((err) => console.error(err));

    return () => {
      cancelled = true;
    };
  }, []);

  return { recentBookings };
}