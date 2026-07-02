
"use client";

import { useEffect, useState } from "react";
import { adminService } from "../services/admin.service";
import { getWeekRange, mapOccupancyRangeToTrend } from "../utils/dashboard.utils";
import type { OccupancyTrendPoint, WeekFilter } from "../types/admin.types";

export function useOccupancyTrend(date?: string) {
  const [selectedWeek, setSelectedWeek] = useState<WeekFilter>("this-week");
  const [trendData, setTrendData] = useState<OccupancyTrendPoint[]>([]);

  useEffect(() => {
    const { startDate, endDate, targetDate } = getWeekRange(selectedWeek, date);

    adminService
      .getOccupancyRange(startDate, endDate)
      .then((res) => setTrendData(mapOccupancyRangeToTrend(res, targetDate)))
      .catch((err) => console.error(err));
  }, [selectedWeek, date]);

  return { trendData, selectedWeek, setSelectedWeek };
}