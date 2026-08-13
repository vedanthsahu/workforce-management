"use client";

import { ArrowLeft, CalendarDays } from "lucide-react";
import { useRouter } from "next/navigation";
import { Suspense, useRef, useLayoutEffect, useState } from "react";

import LayoutPreview from "@/features/managelayout/components/LayoutPreview";
import SeatFiltersBar from "@/features/managelayout1/components/SeatFiltersBar";
import SeatTable from "@/features/managelayout1/components/SeatTable";
import EditSeatPanel from "@/features/managelayout1/components/EditSeatPanel";
import BulkEditModal from "@/features/managelayout1/components/BulkEditModal";
import ViewToggle from "@/features/managelayout1/components/ViewToggle";
import { useManageSeats } from "@/features/managelayout1/hooks/Usemanageseats";
import LayoutStatCards from "@/features/managelayout/components/Layoutstatcards";
import { usePublishLayout } from "@/features/managelayout/hooks/useLayoutDetails";
import { useLayoutsStore } from "@/store/useLayoutsStore";
import { ManageSeatsSkeleton } from "@/features/managelayout1/components/ManageSeatsSkeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";
import { useNavigationGuardStore } from "@/store/useNavigationGuardStore";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

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
    hasActiveFilters,
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
    isDirty,
    discardChanges,
  } = useManageSeats();

  const {
    publishing,
    publishError,
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

  // Edits to an already-published layout are staged locally until the admin
  // publishes. There's no standalone "Discard" button on the page — discard
  // only happens through the shared leave-confirmation dialog below, so
  // trying to navigate away (sidebar, back button, browser back/refresh) is
  // the one and only place it's offered.
  const hasUnpublishedEdits = !!layout?.is_published && isDirty;
  useUnsavedChangesGuard(
    hasUnpublishedEdits,
    "You have unpublished seat changes. If you leave now, they will be lost.",
    discardChanges
  );
  const { requestNavigation } = useNavigationGuardStore();

  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  // Frontend-only for now, per explicit instruction — not sent to the
  // backend/publish API in any form. Purely a UI field until there's a
  // real "effective date" concept on the backend to wire it into.
  const [effectiveDate, setEffectiveDate] = useState(todayIso);

  const openPublishConfirm = () => {
    setEffectiveDate(todayIso());
    setShowPublishConfirm(true);
  };

  const handleConfirmPublish = async () => {
    await publishLayout();
    setShowPublishConfirm(false);
  };

  const panelOpen = !!editingSeat;

  useLayoutEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    setIsMobile(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Deliberately no dependency array: this re-measures the edit panel's
  // actual DOM height after every render, not just when isMobile/panelOpen
  // toggle — the panel's height also changes from its own content (e.g. a
  // validation message, a longer amenity list), which needs the same
  // resync. Safe from render loops: setTableHeight receives a plain number,
  // and React bails out of re-rendering when the value is unchanged.
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
                onClick={() => requestNavigation(() => router.back())}
                className="flex items-center gap-2 border border-gray-300 bg-white text-gray-700 px-4 py-2 rounded-md text-sm hover:bg-gray-50 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Layout
              </button>
              <button
                onClick={openPublishConfirm}
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

          {publishError && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-3 text-sm text-red-600">
              Failed to publish. Your pending changes are safe and were not lost — please try again.
            </div>
          )}

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
              <div className="flex-1 overflow-y-auto px-4 py-4">
                {view === "map" ? (
                  <LayoutPreview
                    layout={layout}
                    canvasHeight={isMobile ? 300 : 420}
                    seats={seats}
                    preferences={preferences}
                    onSeatSave={saveSeat}
                    filteredSeats={filteredSeats}
                    isFilterActive={hasActiveFilters}
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

      <ConfirmDialog
        open={showPublishConfirm}
        title={hasUnpublishedEdits ? "Publish pending seat changes?" : "Publish this layout?"}
        description={
          hasUnpublishedEdits
            ? "This will save your seat changes and make them live immediately for everyone booking this floor."
            : "This will make this layout the live layout for its floor."
        }
        confirmLabel={publishing ? "Publishing…" : "Yes, Publish"}
        loading={publishing}
        onConfirm={handleConfirmPublish}
        onClose={() => setShowPublishConfirm(false)}
      >
        <label htmlFor="publish-effective-date" className="text-[12.5px] font-medium text-gray-600 mb-1.5 block">
          Effective Date
        </label>
        <div className="relative">
          <CalendarDays
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <input
            id="publish-effective-date"
            type="date"
            value={effectiveDate}
            onChange={(e) => setEffectiveDate(e.target.value)}
            className="w-full h-9 pl-8 pr-3 rounded-lg border border-gray-200 bg-white text-[13px] text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
          />
        </div>
      </ConfirmDialog>
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
