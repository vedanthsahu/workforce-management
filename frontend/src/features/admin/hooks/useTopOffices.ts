"use client";

import { useEffect, useState } from "react";
import { adminService } from "../services/admin.service";
import { mapHierarchyToTopOffices } from "../utils/dashboard.utils";
import type { TopOffice } from "../types/admin.types";

export function useTopOffices(date?: string) {
  const [topOffices, setTopOffices] = useState<TopOffice[]>([]);

  useEffect(() => {
    adminService
      .getOccupancyHierarchy({ date })
      .then((res) => setTopOffices(mapHierarchyToTopOffices(res)))
      .catch((err) => console.error(err));
  }, [date]);

  return { topOffices };
}
