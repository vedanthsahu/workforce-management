"use client";

import { useMemo, useState } from "react";
import AuditLogFilters from "./AuditLogFilters";
import AuditStatCards from "./AuditStatCards";
import AuditLogsTable from "./AuditLogsTable";
import AuditLogDetailSheet from "./AuditLogDetailSheet";
import AmenitiesPagination from "@/features/amenities/components/AmenitiesPagination";
import { useAuditLogs } from "../hooks/useAuditLogs";
import { auditService } from "../services/audit.service";
import { AuditLog, AuditLogListItem, defaultAuditLogFilters } from "../types/audit.types";
import { mapAuditLogDetailToUi, mapAuditLogListItemToUi } from "../utils/mapAuditLog";
import { AUDIT_PAGE_SIZES } from "../utils/constants";

export default function AuditLogsPage() {
  const [filters, setFilters] = useState(defaultAuditLogFilters());

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AuditLog | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(false);

  const { response, loading, page, setPage, pageSize, setPageSize, sortBy, sortDir, toggleSort } =
    useAuditLogs(filters);

  const items = useMemo(() => (response?.items ?? []).map(mapAuditLogListItemToUi), [response]);

  const summary = response?.summary;
  const stats = {
    total: summary?.total_events ?? 0,
    successful: summary?.successful_events ?? 0,
    failed: summary?.failed_events ?? 0,
    uniqueUsers: summary?.unique_users ?? 0,
  };

  const pagination = response?.pagination;
  const total = pagination?.total ?? 0;
  const totalPages = Math.max(1, pagination?.total_pages ?? 1);
  const startIndex = (page - 1) * pageSize;

  const handleUpdateFilter = <K extends keyof typeof filters>(key: K, value: (typeof filters)[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleExport = () => {
    // Export isn't wired up until the real audit API supports it — no-op for now.
  };

  const handleSelectRow = (item: AuditLogListItem) => {
    setSelectedId(item.id);
    setDetail(null);
    setDetailError(false);
    setDetailLoading(true);

    auditService
      .getById(item.id)
      .then((raw) => setDetail(mapAuditLogDetailToUi(raw)))
      .catch((error) => {
        console.error("Error fetching audit log detail", error);
        setDetailError(true);
      })
      .finally(() => setDetailLoading(false));
  };

  const handleDetailOpenChange = (open: boolean) => {
    if (open) return;
    setSelectedId(null);
    setDetail(null);
    setDetailError(false);
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto overflow-x-clip p-4 sm:p-6 space-y-4 sm:space-y-6 bg-[#f8fafc]">
      {/* HEADER */}
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Audit Logs</h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">Track and monitor user activities and system changes</p>
      </div>

      {/* FILTERS CARD */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 sm:p-5">
        <AuditLogFilters filters={filters} onUpdate={handleUpdateFilter} onExport={handleExport} />
      </div>

      {/* STATS */}
      <AuditStatCards stats={stats} />

      {/* TABLE */}
      <div className="w-full bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col">
        {loading ? (
          <p className="px-6 py-12 text-center text-gray-400 text-sm">Loading audit events…</p>
        ) : (
          <AuditLogsTable
            data={items}
            selectedId={selectedId}
            onSelect={handleSelectRow}
            sortBy={sortBy}
            sortDir={sortDir}
            onToggleSort={toggleSort}
          />
        )}

        {/* FOOTER */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 sm:px-6 py-4 border-t shrink-0 text-xs sm:text-sm text-gray-500">
          <span>
            {total > 0 && `Showing ${startIndex + 1} to ${Math.min(startIndex + pageSize, total)} of ${total} results`}
          </span>
          <div className="flex items-center gap-3 self-center sm:self-auto">
            {total >= AUDIT_PAGE_SIZES[0] && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="h-7 px-2 text-xs border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
                >
                  {AUDIT_PAGE_SIZES.map((n) => (
                    <option key={n} value={n}>
                      {n} / page
                    </option>
                  ))}
                </select>
              </div>
            )}
            <AmenitiesPagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        </div>
      </div>

      {/* DETAIL DRAWER */}
      <AuditLogDetailSheet
        open={!!selectedId}
        log={detail}
        loading={detailLoading}
        error={detailError}
        onOpenChange={handleDetailOpenChange}
      />
    </div>
  );
}
