"use client";

import { useEffect, useState } from "react";
import { getBuildings } from "../services/buildingService";
import { Building } from "../types/building";

export const useBuildings = () => {
  const [data, setData] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const res = await getBuildings();
      setData(res);
      setLoading(false);
    };

    fetchData();
  }, []);

  return { data, loading };
};