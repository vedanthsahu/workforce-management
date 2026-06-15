"use client";

import { useEffect, useState } from "react";
import { adminService } from "../services/admin.service";
import { mapBookingsToRecent } from "../utils/dashboard.utils";
import type { RecentBooking } from "../types/admin.types";

const RECENT_BOOKINGS_LIMIT = 5;

export function useRecentBookings(date?: string) {
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([]);

  useEffect(() => {
    adminService
      .getAdminBookings({ date, page: 1, limit: RECENT_BOOKINGS_LIMIT })
      .then((res) => setRecentBookings(mapBookingsToRecent(res.items)))
      .catch((err) => console.error(err));
  }, [date]);

  return { recentBookings };
}
