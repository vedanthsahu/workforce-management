import { useCallback, useEffect, useState } from "react";
import { auditService } from "../services/audit.service";
import { AuditLogFilters, AuditLogListResponse } from "../types/audit.types";
import { AUDIT_PAGE_SIZES } from "../utils/constants";

// The table has no sort-by-column UI -- always newest first.
const SORT_BY = "occurred_at";
const SORT_DIR = "desc";

export function useAuditLogs(appliedFilters: AuditLogFilters) {
  const [response, setResponse] = useState<AuditLogListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(AUDIT_PAGE_SIZES[0]);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await auditService.list({
        search: appliedFilters.search.trim() || undefined,
        action: appliedFilters.action !== "All" ? appliedFilters.action : undefined,
        module: appliedFilters.module !== "All" ? appliedFilters.module : undefined,
        entity: appliedFilters.entity !== "All" ? appliedFilters.entity : undefined,
        status: appliedFilters.status !== "All" ? appliedFilters.status : undefined,
        startDate: appliedFilters.dateFrom || undefined,
        endDate: appliedFilters.dateTo || undefined,
        sortBy: SORT_BY,
        sortDir: SORT_DIR,
        page,
        limit: pageSize,
      });
      setResponse(res);
    } catch (error) {
      console.error("Error fetching audit logs", error);
      setResponse(null);
    } finally {
      setLoading(false);
    }
  }, [appliedFilters, page, pageSize]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Any filter change (not page/pageSize) should snap back to page 1.
  useEffect(() => {
    setPage(1);
  }, [appliedFilters]);

  return { response, loading, page, setPage, pageSize, setPageSize, refetch: fetchLogs };
}
