"use client";

import { useCallback, useEffect, useState } from "react";
import { securityService } from "../services/security.service";
import { mapApiGuestVisitToVisitor } from "../utils/security.utils";
import type { Visitor, VisitorStatus } from "../types/security.types";

interface UseVisitorSearchOptions {
  initialStatus?: VisitorStatus | "ALL";
  siteId?: string;
}

/**
 * Standalone, searchable guest-visit list hook.
 * Not used by the dashboard right now (useSecurityDashboard covers that, since
 * GET /guest-visits already returns the summary + items together) — kept here
 * in case another page needs a plain filtered visit list of its own.
 */
export const useVisitorSearch = (options: UseVisitorSearchOptions = {}) => {
  const { initialStatus = "ALL", siteId } = options;

  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<VisitorStatus | "ALL">(initialStatus);

  const fetchVisitors = useCallback(async () => {
    try {
      setLoading(true);
      const response = await securityService.getGuestVisits({
        site_id: siteId,
        search: search || undefined,
        visit_status: status,
        limit: 100,
        offset: 0,
      });
      const mapped = response.items.map(mapApiGuestVisitToVisitor);
      setVisitors(mapped);
      setTotal(mapped.length);
    } catch (error) {
      console.error("Error fetching visitors", error);
    } finally {
      setLoading(false);
    }
  }, [siteId, search, status]);

  useEffect(() => {
    fetchVisitors();
  }, [fetchVisitors]);

  return { visitors, total, loading, search, setSearch, status, setStatus, fetchVisitors };
};  