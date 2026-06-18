
"use client";

import { useSecurityDashboard } from "../hooks/useSecurityDashboard";
import { StatCards } from "./StatCards";
import { SiteSelector } from "./SiteSelector";
import { VisitorTable } from "./VisitorTable";

const PAGE_SIZE = 10;

export default function SecurityDashboardPage() {
  const {
    summary,
    sites,
    selectedSiteId,
    setSelectedSiteId,
    expectedVisitors,
    totalVisitors,
    totalPages,
    page,
    setPage,
    search,
    setSearch,
    loading,
    error,
    refetch,
  } = useSecurityDashboard();

  const pageStart = totalVisitors === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const pageEnd = Math.min(page * PAGE_SIZE, totalVisitors);

  return (
    <div className="space-y-4">
      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Dashboard</h1>
          <p className="text-[12px] text-gray-400">Overview of today's visitor activity</p>
        </div>

        <SiteSelector sites={sites} selectedSiteId={selectedSiteId} onChange={setSelectedSiteId} />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* ── Stat cards ───────────────────────────────────────────── */}
      {summary && <StatCards summary={summary} />}

      {/* ── Today's expected visitors table ─────────────────────── */}
      <VisitorTable
        title="Today's Expected Visitors"
        count={totalVisitors}   
        visitors={expectedVisitors}
        loading={loading}
        search={search}
        onSearchChange={setSearch}
        onRefresh={refetch}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        pageStart={pageStart}
        pageEnd={pageEnd}
        total={totalVisitors}
      />
    </div>
  );
}