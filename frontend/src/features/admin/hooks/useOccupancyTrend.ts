"use client";

import { useEffect, useState } from "react";
import { adminService } from "../services/admin.service";
import { getWeekRange, mapOccupancyRangeToTrend } from "../utils/dashboard.utils";
import type { OccupancyTrendPoint, WeekFilter } from "../types/admin.types";

export function useOccupancyTrend() {
  const [selectedWeek, setSelectedWeek] = useState<WeekFilter>("this-week");
  const [trendData, setTrendData] = useState<OccupancyTrendPoint[]>([]);

  useEffect(() => {
    const { startDate, endDate } = getWeekRange(selectedWeek);

    adminService
      .getOccupancyRange(startDate, endDate)
      .then((res) => setTrendData(mapOccupancyRangeToTrend(res)))
      .catch((err) => console.error(err));
  }, [selectedWeek]);

  return { trendData, selectedWeek, setSelectedWeek };
}
