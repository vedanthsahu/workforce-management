"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Suspense, useRef, useLayoutEffect, useState } from "react";

import LayoutPreview   from "@/features/managelayout/components/LayoutPreview";
import SeatFiltersBar  from "@/features/managelayout1/components/SeatFiltersBar";
import SeatTable       from "@/features/managelayout1/components/SeatTable";
import EditSeatPanel   from "@/features/managelayout1/components/EditSeatPanel";
import BulkEditModal   from "@/features/managelayout1/components/BulkEditModal";
import ViewToggle      from "@/features/managelayout1/components/ViewToggle";
import { useManageSeats } from "@/features/managelayout1/hooks/Usemanageseats";
import LayoutStatCards from "@/features/managelayout/components/Layoutstatcards";
import { usePublishLayout } from "@/features/managelayout/hooks/useLayoutDetails";
import { useLayoutsStore } from "@/store/useLayoutsStore";
import { ManageSeatsSkeleton } from "@/features/managelayout1/components/ManageSeatsSkeleton";

function ManageSeatsPage() {
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);
  const [tableHeight, setTableHeight] = useState<number | undefined>(undefined);
  const [isMobile, setIsMobile] = useState(false);

  const { invalidateFloor } = useLayoutsStore();

  const {
    layout,
    layoutLoading,
    layoutError,
    siteId,
    buildingId,
    floorId,
    stats,
    statsLoading,
    seats,
    filteredSeats,
    filters,
    updateFilter,
    resetFilters,
    seatTypes,
    preferences,
    selected,
    toggleSelect,
    selectAll,
    clearSelection,
    isAllSelected,
    isIndeterminate,
    editingSeat,
    openEditPanel,
    closeEditPanel,
    saveSeat,
    bulkOpen,
    openBulkEdit,
    closeBulkEdit,
    saveBulk,
    view,
    setView,
  } = useManageSeats();

  const {
    publishing,
    canPublish,
    allConfigured,
    publishLayout,
  } = usePublishLayout(
    layout,
    stats,
    () => {
      // Invalidate the cache for this floor so FloorLayoutsPage
      // always fetches fresh data instead of serving stale status
      if (floorId) invalidateFloor(floorId);

      router.push(
        `/admin/layouts?siteId=${siteId}&buildingId=${buildingId}&floorId=${floorId}&layoutId=${layout?.layout_id}`
      );
    }
  );

  const panelOpen = !!editingSeat;

  useLayoutEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    setIsMobile(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useLayoutEffect(() => {
    if (!isMobile && panelOpen && panelRef.current) {
      setTableHeight(panelRef.current.offsetHeight);
    } else {
      setTableHeight(undefined);
    }
  });

  if (layoutLoading) {
    return <ManageSeatsSkeleton />;
  }

  return (
    <div className="flex h-screen w-full">
      <div className="flex flex-col flex-1 min-w-0">
        <main className="flex-1 bg-gray-50 p-6 space-y-5 overflow-y-auto">

          {/* Error banner — shown inline, not a dead-end */}
          {(layoutError || !layout) && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 flex items-center justify-between">
              <p className="text-sm text-red-600">Failed to load layout. The layout may have been removed or the server is slow.</p>
              <button onClick={() => router.back()} className="text-sm font-medium text-indigo-600 hover:text-indigo-800 underline whitespace-nowrap ml-4">
                Go back
              </button>
            </div>
          )}

          {/* HEADER */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Manage Seats</h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                Configure seat details, settings and amenities for this layout
              </p>
            </div>
            <div className="flex gap-3 items-center">
              <button
                onClick={() => router.back()}
                className="flex items-center gap-2 border border-gray-300 bg-white text-gray-700 px-4 py-2 rounded-md text-sm hover:bg-gray-50 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Layout
              </button>
              <button
                onClick={publishLayout}
                disabled={!canPublish || publishing}
                title={!allConfigured ? `Configure all seats before publishing` : undefined}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {publishing ? (
                  <>
                    <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Publishing...
                  </>
                ) : (
                  "Publish Layout"
                )}
              </button>
            </div>
          </div>

          {/* STAT CARDS */}
          <LayoutStatCards stats={stats} loading={statsLoading} />

          {/* FILTERS + VIEW TOGGLE */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div className="min-w-0 flex-1">
              <SeatFiltersBar
                filters={filters}
                seatTypes={seatTypes.filter((type): type is string => type !== null)}
                preferences={preferences}
                onUpdate={updateFilter}
                onReset={resetFilters}
              />
            </div>
            <div className="flex-shrink-0">
              <ViewToggle view={view} onChange={setView} />
            </div>
          </div>

          {/* TABLE + SIDEBAR */}
          <div className="flex flex-col lg:flex-row lg:items-start gap-5">

            <div
              className="w-full lg:flex-1 lg:min-w-0 bg-white rounded-xl border border-gray-200 flex flex-col overflow-hidden"
              style={{ height: tableHeight ?? "auto" }}
            >
              <div className="flex-1 overflow-y-auto p-4">
                {view === "map" ? (
                  <LayoutPreview
                    layout={layout}
                    canvasHeight={isMobile ? 300 : 420}
                    seats={seats}
                    preferences={preferences}
                    onSeatSave={saveSeat}
                    filteredSeats={filteredSeats}
                  />
                ) : (
                  <SeatTable
                    seats={filteredSeats}
                    preferences={preferences}
                    selected={selected}
                    isAllSelected={isAllSelected}
                    isIndeterminate={isIndeterminate}
                    onToggleSelect={toggleSelect}
                    onSelectAll={selectAll}
                    onClearSelection={clearSelection}
                    onEditSeat={openEditPanel}
                    onBulkEdit={openBulkEdit}
                  />
                )}
              </div>
            </div>

            {panelOpen && (
              <div
                ref={panelRef}
                className="w-full lg:w-[340px] lg:flex-shrink-0 bg-white rounded-xl border border-gray-200"
              >
                <EditSeatPanel
                  seat={editingSeat}
                  preferences={preferences}
                  onSave={saveSeat}
                  onClose={closeEditPanel}
                />
              </div>
            )}

          </div>

        </main>
      </div>

      {layout && (
        <BulkEditModal
          open={bulkOpen}
          onClose={closeBulkEdit}
          selectedIds={[...selected]}
          layoutId={layout.layout_id}
          preferences={preferences}
          onSave={saveBulk}
        />
      )}
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<ManageSeatsSkeleton />}>
      <ManageSeatsPage />
    </Suspense>
  );
}
