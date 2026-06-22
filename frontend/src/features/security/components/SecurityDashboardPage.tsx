"use client";

import { useSecurityDashboard } from "../hooks/useSecurityDashboard";
import { StatCards } from "./StatCards";
import { SiteSelector } from "./SiteSelector";
import { VisitorTable } from "./VisitorTable";

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
    pageStart,
    pageEnd,
    search,
    setSearch,
    loading,
    error,
    refetch,
    patchVisitor,
  } = useSecurityDashboard();

  return (
    <div className="space-y-4">
      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Dashboard</h1>
          <p className="text-[12px] text-gray-400">Overview of today&apos;s visitor activity</p>
        </div>

        <SiteSelector selectedSiteId={selectedSiteId} onChange={setSelectedSiteId} />
      </div>

      {/* ── Error banner ─────────────────────────────────────────── */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* ── Stat cards ───────────────────────────────────────────── */}
      {summary && <StatCards summary={summary} />}

      {/* ── Today's expected visitors table ─────────────────────── */}
      <VisitorTable
        title="Today's Visitors"
        count={totalVisitors}
        visitors={expectedVisitors}
        loading={loading}
        search={search}
        onSearchChange={setSearch}
        onRefresh={refetch}
        onPatchVisitor={patchVisitor}
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