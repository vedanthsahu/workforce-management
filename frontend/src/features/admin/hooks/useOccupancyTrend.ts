
"use client";

import { useEffect, useState } from "react";
import { adminService } from "../services/admin.service";
import { getTrendRange, mapOccupancyRangeToTrend } from "../utils/dashboard.utils";
import type { OccupancyTrendPoint, TrendPeriod } from "../types/admin.types";

export function useOccupancyTrend(date?: string) {
  const [selectedPeriod, setSelectedPeriod] = useState<TrendPeriod>("this-week");
  const [trendData, setTrendData] = useState<OccupancyTrendPoint[]>([]);

  useEffect(() => {
    const { startDate, endDate, targetDate } = getTrendRange(selectedPeriod, date);

    adminService
      .getOccupancyRange(startDate, endDate)
      .then((res) => setTrendData(mapOccupancyRangeToTrend(res, selectedPeriod, targetDate)))
      .catch((err) => console.error(err));
  }, [selectedPeriod, date]);

  return { trendData, selectedPeriod, setSelectedPeriod };
}