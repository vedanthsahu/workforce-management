"use client";

import { useEffect, useState } from "react";
import { Office , OfficeStatsSummary,} from "../types/office.types";
import { officeService } from "../services/office.service";

export default function useOffices() {

  //OFFICE DATA STATE
  const [offices, setOffices] = useState<Office[]>([]);

  //  LOADING STATE
  const [loading, setLoading] = useState(true);

  // ERROR STATE
  const [error, setError] = useState<string | null>(null);

  const [stats, setStats] = useState<OfficeStatsSummary | null>(null);

  //  REUSABLE FETCH FUNCTION
  const fetchOffices = async () => {
    try {

      setLoading(true);

      const data = await officeService.getSites({
        page: 1,
        limit: 10,
      });

      setOffices(data);

    } catch (err) {

      console.error("OFFICE API ERROR:", err);

      setError("Failed to fetch offices");

    } finally {

      setLoading(false);

    }
  };
  const fetchStats = async () => {
  try {

    const data =
      await officeService.getOfficeStats();

    setStats(data);

  } catch (err) {

    console.error("STATS API ERROR:", err);

  }
};

  //  INITIAL API CALL
  useEffect(() => {
    fetchOffices();
    fetchStats();
  }, []);

  //  RETURN EVERYTHING
  return {
    offices,
    loading,
    error,
    fetchOffices, // REFRESH AFTER UPDATE
    stats,
  };
}