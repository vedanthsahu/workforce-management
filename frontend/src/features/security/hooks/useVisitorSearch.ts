"use client";

import { useCallback, useEffect, useState } from "react";
import { securityService } from "../services/security.service";
import { mapApiVisitorToVisitor } from "../utils/security.utils";
import type { Visitor, VisitorStatus } from "../types/security.types";

interface UseVisitorSearchOptions {
  initialStatus?: VisitorStatus | "ALL";
  date?: string;
  siteId?: string;
}

export const useVisitorSearch = (options: UseVisitorSearchOptions = {}) => {
  const { initialStatus = "ALL", date, siteId } = options;

  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<VisitorStatus | "ALL">(initialStatus);
  const [page, setPage] = useState(1);
  const limit = 10;

  const fetchVisitors = useCallback(async () => {
    try {
      setLoading(true);
      const response = await securityService.getVisitors({
        date,
        site_id: siteId,
        search: search || undefined,
        status,
        page,
        limit,
      });
      setVisitors(response.items.map(mapApiVisitorToVisitor));
      setTotal(response.total);
    } catch (error) {
      console.error("Error fetching visitors", error);
    } finally {
      setLoading(false);
    }
  }, [date, siteId, search, status, page]);

  useEffect(() => {
    fetchVisitors();
  }, [fetchVisitors]);

  return {
    visitors,
    total,
    loading,
    search,
    setSearch,
    status,
    setStatus,
    page,
    setPage,
    limit,
    fetchVisitors,
  };
};