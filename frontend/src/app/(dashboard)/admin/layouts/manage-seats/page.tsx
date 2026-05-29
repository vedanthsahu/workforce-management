"use client";

import { ArrowLeft, MoreHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";

import LayoutPreview   from "@/features/managelayout/components/LayoutPreview";
import SeatFiltersBar  from "@/features/managelayout1/components/SeatFiltersBar";
import SeatTable       from "@/features/managelayout1/components/SeatTable";
import EditSeatPanel   from "@/features/managelayout1/components/EditSeatPanel";
import BulkEditModal   from "@/features/managelayout1/components/BulkEditModal";
import ViewToggle      from "@/features/managelayout1/components/ViewToggle";
import { useManageSeats } from "@/features/managelayout1/hooks/Usemanageseats";
import LayoutStatCards from "@/features/managelayout/components/Layoutstatcards";

export default function ManageSeatsPage() {
  const router = useRouter();

  const {
    layout,
    layoutLoading,
    layoutError,
    stats,
    statsLoading,
    seats,           // ← add this
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

  if (layoutLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#F8F8FC]">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (layoutError || !layout) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#F8F8FC]">
        <div className="text-center">
          <p className="text-sm text-red-500 mb-3">Failed to load layout.</p>
          <button onClick={() => router.back()} className="text-xs text-indigo-600 underline">
            Go back
          </button>
        </div>
      </div>
    );
  }

  const panelOpen = !!editingSeat;

  return (
    <div className="flex flex-col min-h-screen bg-[#F8F8FC]">

      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 leading-none">Manage Seats</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Configure seat details, settings and amenities for this layout
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium border border-gray-200 bg-white text-gray-500 rounded-lg hover:bg-gray-50 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft size={14} />
            Back to Layout
          </button>
          <button className="flex items-center gap-2 px-4 py-2 text-xs font-semibold border border-gray-200 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
            <MoreHorizontal size={14} />
            More Actions
          </button>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto px-6 pt-5 pb-6 space-y-5">

        <LayoutStatCards stats={stats} loading={statsLoading} />

        <div className="flex items-end justify-between gap-4 flex-wrap">
          <SeatFiltersBar
            filters={filters}
            seatTypes={seatTypes}
            preferences={preferences}
            onUpdate={updateFilter}
            onReset={resetFilters}
          />
          <ViewToggle view={view} onChange={setView} />
        </div>

        <div className="flex gap-5 items-start w-full">
          <div className="flex flex-col flex-1 min-w-0">
            {view === "map" ? (
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                {/* ✅ Now passes seats, preferences, and saveSeat so map is interactive */}
                <LayoutPreview
                  layout={layout}
                  canvasHeight={420}
                  seats={seats}
                  preferences={preferences}
                  onSeatSave={saveSeat}
                  filteredSeats={view === "map" ? filteredSeats : undefined}
                />
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-4">
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
              </div>
            )}
          </div>

          {panelOpen && (
            <div className="flex-shrink-0 sticky top-[73px] max-h-[calc(100vh-90px)] overflow-y-auto">
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

      <BulkEditModal
        open={bulkOpen}
        onClose={closeBulkEdit}
        selectedIds={[...selected]}
        layoutId={layout.layout_id}
        preferences={preferences}
        onSave={saveBulk}
      />
    </div>
  );
}