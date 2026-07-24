"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useSecurityDashboard } from "../hooks/useSecurityDashboard";
import { StatCards } from "./StatCards";
import { SiteSelector } from "./SiteSelector";
import { VisitorTable } from "./VisitorTable";

function StatCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <Skeleton className="h-1 w-full" />
          <div className="p-4 flex items-start justify-between">
            <div className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-7 w-10" />
              <Skeleton className="h-2.5 w-20" />
            </div>
            <Skeleton className="w-10 h-10 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

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
  } = useSecurityDashboard();

  return (
    <div className="space-y-4">
      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Dashboard</h1>
          <p className="text-[12px] text-gray-400">Overview of today&apos;s visitor activity</p>
        </div>

        <SiteSelector sites={sites} selectedSiteId={selectedSiteId} onChange={setSelectedSiteId} />
      </div>

      {/* ── Error banner ─────────────────────────────────────────── */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* ── Stat cards ───────────────────────────────────────────── */}
      {loading && !summary ? <StatCardsSkeleton /> : summary && <StatCards summary={summary} />}

      {/* ── Today's expected visitors table ─────────────────────── */}
      <VisitorTable
        title="Today's Visitors"
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
