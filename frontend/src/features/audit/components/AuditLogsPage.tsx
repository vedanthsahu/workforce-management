"use client";

import { useMemo, useState } from "react";
import { Clock3, Download, KeyRound, MapPin, Sparkles } from "lucide-react";
import AuditLogFilters from "./AuditLogFilters";
import AuditStatCards from "./AuditStatCards";
import AuditLogsTable from "./AuditLogsTable";
import AuditLogDetailSheet from "./AuditLogDetailSheet";
import { AuditLogsSkeleton } from "./AuditLogsSkeleton";
import AmenitiesPagination from "@/features/amenities/components/AmenitiesPagination";
import { useAuditLogs } from "../hooks/useAuditLogs";
import { auditService } from "../services/audit.service";
import {
  AuditLog,
  AuditLogListItem,
  defaultAuditLogFilters,
} from "../types/audit.types";
import {
  affectedResourceLabel,
  auditActivityLabel,
  auditStatusLabel,
  formatAuditDateTime,
  mapAuditLogDetailToUi,
  mapAuditLogListItemToUi,
} from "../utils/mapAuditLog";
import { AUDIT_PAGE_SIZES } from "../utils/constants";

export default function AuditLogsPage() {
  // `filters` is the draft state the filter bar binds to. Like Bookings, all
  // fields are applied together only when the administrator selects Search.
  const [filters, setFilters] = useState(defaultAuditLogFilters());
  const [appliedFilters, setAppliedFilters] = useState(
    defaultAuditLogFilters(),
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AuditLog | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(false);
  const [exporting, setExporting] = useState(false);

  const { response, loading, page, setPage, pageSize, setPageSize } =
    useAuditLogs(appliedFilters);

  const items = useMemo(
    () => (response?.items ?? []).map(mapAuditLogListItemToUi),
    [response],
  );

  const summary = response?.summary;
  const stats = {
    total: summary?.total_events ?? 0,
    access: summary?.access_events ?? 0,
    business: summary?.business_events ?? 0,
    admin: summary?.admin_events ?? 0,
  };

  const pagination = response?.pagination;
  const total = pagination?.total ?? 0;
  const totalPages = Math.max(1, pagination?.total_pages ?? 1);
  const startIndex = (page - 1) * pageSize;

  const handleUpdateFilter = <K extends keyof typeof filters>(
    key: K,
    value: (typeof filters)[K],
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleSearch = () => {
    setAppliedFilters(filters);
  };

  const handleClear = () => {
    const defaults = defaultAuditLogFilters();
    setFilters(defaults);
    setAppliedFilters(defaults);
  };

  const applyQuickView = (updates: Partial<typeof filters>) => {
    const next = { ...defaultAuditLogFilters(), ...updates };
    setFilters(next);
    setAppliedFilters(next);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const isRelative = appliedFilters.timeMode === "relative";
      const common = {
        search: appliedFilters.search.trim() || undefined,
        action:
          appliedFilters.action !== "All" ? appliedFilters.action : undefined,
        module:
          appliedFilters.module !== "All" ? appliedFilters.module : undefined,
        entity:
          appliedFilters.entity !== "All" ? appliedFilters.entity : undefined,
        category:
          appliedFilters.category !== "All"
            ? appliedFilters.category
            : undefined,
        startDate: !isRelative
          ? appliedFilters.dateFrom || undefined
          : undefined,
        endDate: !isRelative ? appliedFilters.dateTo || undefined : undefined,
        lastSeconds: isRelative
          ? (appliedFilters.lastSeconds ?? undefined)
          : undefined,
        limit: 100,
      };
      const first = await auditService.list({ ...common, page: 1 });
      const rows = [...first.items];
      for (
        let pageNumber = 2;
        pageNumber <= first.pagination.total_pages;
        pageNumber += 1
      ) {
        const next = await auditService.list({ ...common, page: pageNumber });
        rows.push(...next.items);
      }
      const csvRows = rows
        .map(mapAuditLogListItemToUi)
        .map((item) => [
          formatAuditDateTime(item.occurredAt),
          item.actorName,
          item.actorEmail,
          item.actorRole,
          auditActivityLabel(item),
          affectedResourceLabel(item),
          auditStatusLabel(item.status),
          item.failureSummary,
        ]);
      const escape = (value: string) => `"${value.replaceAll('"', '""')}"`;
      const csv = [
        [
          "Time",
          "Performed By",
          "Email",
          "Role",
          "Activity",
          "Affected Resource",
          "Result",
          "Reason",
        ],
        ...csvRows,
      ]
        .map((row) => row.map((value) => escape(String(value))).join(","))
        .join("\r\n");
      const url = URL.createObjectURL(
        new Blob([csv], { type: "text/csv;charset=utf-8" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
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

  // Full-page skeleton only for the very first fetch (auto-search on mount
  // with today's default filters) -- later re-fetches (page change, new
  // search) keep the filters bar interactive and just show the lighter
  // inline loading state in the table body below, same split as
  // AdminBookingsPage/AdminBookingsSkeleton.
  if (loading && !response) {
    return <AuditLogsSkeleton />;
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto overflow-x-clip p-4 sm:p-6 space-y-4 sm:space-y-6 bg-[#f8fafc]">
      {/* HEADER */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">
            Audit Logs
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Review administrative and security activity
          </p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting || !response?.pagination.total}
          className="h-10 px-4 inline-flex items-center gap-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Download size={15} />
          {exporting ? "Exporting…" : "Export CSV"}
        </button>
      </div>

      {/* FILTERS CARD */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 sm:p-5">
        <AuditLogFilters
          filters={filters}
          onUpdate={handleUpdateFilter}
          onSearch={handleSearch}
          onClear={handleClear}
          filterOptions={response?.filter_options ?? []}
        />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium text-gray-500 mr-1">
          Quick views:
        </span>
        <button
          type="button"
          onClick={() =>
            applyQuickView({
              timeMode: "relative",
              dateFrom: "",
              dateTo: "",
              lastSeconds: 3600,
            })
          }
          className="h-8 px-3 inline-flex items-center gap-1.5 text-xs font-medium text-sky-700 bg-white border border-sky-200 rounded-lg hover:bg-sky-50 transition-colors"
        >
          <Clock3 size={13} />
          Last 1 Hour
        </button>
        <button
          type="button"
          onClick={() =>
            applyQuickView({ module: "AUTH", action: "user.access_updated" })
          }
          className="h-8 px-3 inline-flex items-center gap-1.5 text-xs font-medium text-indigo-700 bg-white border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors"
        >
          <KeyRound size={13} />
          User Access Changes
        </button>
        <button
          type="button"
          onClick={() => applyQuickView({ module: "LOCATION" })}
          className="h-8 px-3 inline-flex items-center gap-1.5 text-xs font-medium text-teal-700 bg-white border border-teal-200 rounded-lg hover:bg-teal-50 transition-colors"
        >
          <MapPin size={13} />
          Location Changes
        </button>
        <button
          type="button"
          onClick={() => applyQuickView({ module: "AMENITY" })}
          className="h-8 px-3 inline-flex items-center gap-1.5 text-xs font-medium text-violet-700 bg-white border border-violet-200 rounded-lg hover:bg-violet-50 transition-colors"
        >
          <Sparkles size={13} />
          Amenity Changes
        </button>
      </div>

      {/* STATS */}
      <AuditStatCards
        stats={stats}
        activeCategory={appliedFilters.category}
        onCategoryChange={(category) => {
          setFilters((current) => ({ ...current, category }));
          setAppliedFilters((current) => ({ ...current, category }));
        }}
      />

      {/* TABLE */}
      <div className="w-full bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">
            Recent Activity
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Select an activity to see who performed it, what was affected, and
            what changed.
          </p>
        </div>
        {loading ? (
          <p className="px-6 py-12 text-center text-gray-400 text-sm">
            Loading audit events…
          </p>
        ) : (
          <AuditLogsTable
            data={items}
            selectedId={selectedId}
            onSelect={handleSelectRow}
          />
        )}

        {/* FOOTER */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 sm:px-6 py-4 border-t shrink-0 text-xs sm:text-sm text-gray-500">
          <span>
            {total > 0 &&
              `Showing ${startIndex + 1} to ${Math.min(startIndex + pageSize, total)} of ${total} results`}
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
                  className="h-7 px-2 text-xs border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {AUDIT_PAGE_SIZES.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <AmenitiesPagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
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
