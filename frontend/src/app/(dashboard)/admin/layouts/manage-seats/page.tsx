// // // // // // "use client";

// // // // // // /**
// // // // // //  * ManageSeatsPage
// // // // // //  *
// // // // // //  * Route: /admin/floor-layouts/[layoutId]/manage-seats
// // // // // //  *
// // // // // //  * Wires together:
// // // // // //  *  - LayoutStatCards    (existing component)
// // // // // //  *  - LayoutPreview      (existing component, shown in map view)
// // // // // //  *  - SeatTable          (new component, shown in list view)
// // // // // //  *  - EditSeatPanel      (new right-side panel)
// // // // // //  *  - BulkEditModal      (new modal)
// // // // // //  *  - SeatFiltersBar     (new filters strip)
// // // // // //  *  - ViewToggle         (new map/list toggle)
// // // // // //  */

// // // // // // import React, { useState, useCallback } from "react";
// // // // // // import { useParams, useRouter } from "next/navigation";
// // // // // // import { ArrowLeft, MoreHorizontal } from "lucide-react";
// // // // // // import { BulkEditModal, BulkUpdatePayload, EditSeatPanel, Layout, Seat, SeatFiltersBar, SeatTable, SeatUpdatePayload, usePreferences, useSeats, ViewMode, ViewToggle } from "@/features/managelayout1";
// // // // // // import LayoutStatCards from "@/features/managelayout/components/Layoutstatcards";
// // // // // // import LayoutPreview from "@/features/managelayout/components/LayoutPreview";

// // // // // // // Existing components (paths relative to your project)


// // // // // // // ─── Props (or use useParams internally) ────────────────────────────────────
// // // // // // interface Props {
// // // // // //   layout: Layout;          // pass in from parent or fetch here
// // // // // // }

// // // // // // export default function ManageSeatsPage({ layout }: Props) {
// // // // // //   const router = useRouter();

// // // // // //   // ── View state ─────────────────────────────────────────────────────────────
// // // // // //   const [view, setView] = useState<ViewMode>("map");

// // // // // //   // ── Edit panel state ───────────────────────────────────────────────────────
// // // // // //   const [editingSeat, setEditingSeat] = useState<Seat | null>(null);

// // // // // //   // ── Bulk modal state ───────────────────────────────────────────────────────
// // // // // //   const [bulkOpen, setBulkOpen] = useState(false);

// // // // // //   // ── Data ───────────────────────────────────────────────────────────────────
// // // // // //   const {
// // // // // //     filteredSeats, stats, loading, statsLoading,
// // // // // //     filters, updateFilter, resetFilters, seatTypes,
// // // // // //     selected, toggleSelect, selectAll, clearSelection,
// // // // // //     isAllSelected, isIndeterminate,
// // // // // //     saveSeat, saveBulk,
// // // // // //   } = useSeats(layout.layout_id);

// // // // // //   const { preferences } = usePreferences();

// // // // // //   // ── Handlers ───────────────────────────────────────────────────────────────
// // // // // //   const handleEditSeat = useCallback((seat: Seat) => {
// // // // // //     setEditingSeat(seat);
// // // // // //   }, []);

// // // // // //   // When a seat is clicked in the map view, find it in seats list
// // // // // //   const handleMapSeatClick = useCallback((svgId: string, allSeats: Seat[]) => {
// // // // // //     const seat = allSeats.find((s) => s.seat_svg_id === svgId) ?? null;
// // // // // //     setEditingSeat(seat);
// // // // // //   }, []);

// // // // // //   const handleSaveSeat = useCallback(async (payload: SeatUpdatePayload) => {
// // // // // //     await saveSeat(payload);
// // // // // //   }, [saveSeat]);

// // // // // //   const handleBulkSave = useCallback(async (payload: BulkUpdatePayload) => {
// // // // // //     await saveBulk(payload);
// // // // // //     setBulkOpen(false);
// // // // // //   }, [saveBulk]);

// // // // // //   const panelOpen = !!editingSeat;

// // // // // //   return (
// // // // // //     <div className="flex flex-col min-h-screen bg-[#F8F8FC]">

// // // // // //       {/* ── Page header ──────────────────────────────────────────────────── */}
// // // // // //       <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
// // // // // //         <div className="flex items-center gap-3">
// // // // // //           <button
// // // // // //             onClick={() => router.back()}
// // // // // //             className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
// // // // // //           >
// // // // // //             <ArrowLeft size={14} />
// // // // // //             Back to Layout
// // // // // //           </button>
// // // // // //           <span className="text-gray-300 select-none">·</span>
// // // // // //           <div>
// // // // // //             <h1 className="text-xl font-bold text-gray-900 leading-none">Manage Seats</h1>
// // // // // //             <p className="text-xs text-gray-400 mt-0.5">Configure seat details, settings and amenities for this layout</p>
// // // // // //           </div>
// // // // // //         </div>

// // // // // //         <div className="flex items-center gap-2">
// // // // // //           <button className="flex items-center gap-2 px-4 py-2 text-xs font-semibold border border-gray-200 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
// // // // // //             <MoreHorizontal size={14} />
// // // // // //             More Actions
// // // // // //           </button>
// // // // // //         </div>
// // // // // //       </div>

// // // // // //       {/* ── Stat cards ───────────────────────────────────────────────────── */}
// // // // // //       <div className="px-6 pt-5">
// // // // // //         <LayoutStatCards stats={stats} loading={statsLoading} />
// // // // // //       </div>

// // // // // //       {/* ── Filters + view toggle ─────────────────────────────────────────── */}
// // // // // //       <div className="px-6 pt-4 flex items-end justify-between gap-4 flex-wrap">
// // // // // //         <SeatFiltersBar
// // // // // //           filters={filters}
// // // // // //           seatTypes={seatTypes}
// // // // // //           preferences={preferences}
// // // // // //           onUpdate={updateFilter}
// // // // // //           onReset={resetFilters}
// // // // // //         />
// // // // // //         <ViewToggle view={view} onChange={setView} />
// // // // // //       </div>

// // // // // //       {/* ── Main content area ─────────────────────────────────────────────── */}
// // // // // //       <div className="flex flex-1 gap-0 px-6 pt-4 pb-6">

// // // // // //         {/* Left / center: map or list */}
// // // // // //         <div className={`flex-1 min-w-0 transition-all ${panelOpen ? "mr-5" : ""}`}>
// // // // // //           {view === "map" ? (
// // // // // //             // ── Map view (LayoutPreview + seat click wired via callback) ──
// // // // // //             <div className="bg-white rounded-xl border border-gray-200 p-4">
// // // // // //               {/* 
// // // // // //                 Pass a custom onSeatClick to LayoutPreview that opens the edit panel.
// // // // // //                 The existing LayoutPreview opens a SeatDialog; you can swap it to call
// // // // // //                 handleMapSeatClick(svgId, seats) instead, or keep both.
// // // // // //                 For now we render LayoutPreview as-is; clicking a seat opens the existing
// // // // // //                 SeatDialog. To wire the panel instead, modify LayoutPreview's onMapClick
// // // // // //                 to call props.onSeatClick?.(svgId) and pass:
// // // // // //                   onSeatClick={(id) => handleMapSeatClick(id, allSeats)}
// // // // // //               */}
// // // // // //               <LayoutPreview layout={layout} />
// // // // // //             </div>
// // // // // //           ) : (
// // // // // //             // ── List view ─────────────────────────────────────────────────
// // // // // //             <div className="bg-white rounded-xl border border-gray-200 p-4">
// // // // // //               <SeatTable
// // // // // //                 seats={filteredSeats}
// // // // // //                 preferences={preferences}
// // // // // //                 selected={selected}
// // // // // //                 isAllSelected={isAllSelected}
// // // // // //                 isIndeterminate={isIndeterminate}
// // // // // //                 onToggleSelect={toggleSelect}
// // // // // //                 onSelectAll={selectAll}
// // // // // //                 onClearSelection={clearSelection}
// // // // // //                 onEditSeat={handleEditSeat}
// // // // // //                 onBulkEdit={() => setBulkOpen(true)}
// // // // // //               />
// // // // // //             </div>
// // // // // //           )}
// // // // // //         </div>

// // // // // //         {/* Right: edit panel (slides in) */}
// // // // // //         {panelOpen && (
// // // // // //           <EditSeatPanel
// // // // // //             seat={editingSeat}
// // // // // //             preferences={preferences}
// // // // // //             onSave={handleSaveSeat}
// // // // // //             onClose={() => setEditingSeat(null)}
// // // // // //           />
// // // // // //         )}
// // // // // //       </div>

// // // // // //       {/* ── Bulk edit modal ───────────────────────────────────────────────── */}
// // // // // //       <BulkEditModal
// // // // // //         open={bulkOpen}
// // // // // //         onClose={() => setBulkOpen(false)}
// // // // // //         selectedIds={[...selected]}
// // // // // //         layoutId={layout.layout_id}
// // // // // //         preferences={preferences}
// // // // // //         onSave={handleBulkSave}
// // // // // //       />
// // // // // //     </div>
// // // // // //   );
// // // // // // }

// // // // // "use client";

// // // // // import { ArrowLeft, MoreHorizontal } from "lucide-react";
// // // // // import { useRouter } from "next/navigation";


// // // // // import LayoutPreview   from "@/features/managelayout/components/LayoutPreview";

// // // // // import SeatFiltersBar from "@/features/managelayout1/components/SeatFiltersBar";
// // // // // import SeatTable      from "@/features/managelayout1/components/SeatTable";
// // // // // import EditSeatPanel  from "@/features/managelayout1/components/EditSeatPanel";
// // // // // import BulkEditModal  from "@/features/managelayout1/components/BulkEditModal";
// // // // // import ViewToggle     from "@/features/managelayout1/components/ViewToggle";

// // // // // import { useManageSeats } from "@/features/managelayout1/hooks/Usemanageseats";
// // // // // import LayoutStatCards from "@/features/managelayout/components/Layoutstatcards";

// // // // // export default function ManageSeatsPage() {
// // // // //   const router = useRouter();

// // // // //   const {
// // // // //     // layout
// // // // //     layout,
// // // // //     layoutLoading,
// // // // //     layoutError,

// // // // //     // stats
// // // // //     stats,
// // // // //     statsLoading,

// // // // //     // seats + filters
// // // // //     filteredSeats,
// // // // //     filters,
// // // // //     updateFilter,
// // // // //     resetFilters,
// // // // //     seatTypes,

// // // // //     // preferences
// // // // //     preferences,

// // // // //     // selection
// // // // //     selected,
// // // // //     toggleSelect,
// // // // //     selectAll,
// // // // //     clearSelection,
// // // // //     isAllSelected,
// // // // //     isIndeterminate,

// // // // //     // edit panel
// // // // //     editingSeat,
// // // // //     openEditPanel,
// // // // //     closeEditPanel,
// // // // //     saveSeat,

// // // // //     // bulk
// // // // //     bulkOpen,
// // // // //     openBulkEdit,
// // // // //     closeBulkEdit,
// // // // //     saveBulk,

// // // // //     // view toggle
// // // // //     view,
// // // // //     setView,
// // // // //   } = useManageSeats();

// // // // //   // ── Loading / error states ────────────────────────────────────────────────
// // // // //   if (layoutLoading) {
// // // // //     return (
// // // // //       <div className="flex items-center justify-center h-screen bg-[#F8F8FC]">
// // // // //         <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
// // // // //       </div>
// // // // //     );
// // // // //   }

// // // // //   if (layoutError || !layout) {
// // // // //     return (
// // // // //       <div className="flex items-center justify-center h-screen bg-[#F8F8FC]">
// // // // //         <div className="text-center">
// // // // //           <p className="text-sm text-red-500 mb-3">Failed to load layout.</p>
// // // // //           <button
// // // // //             onClick={() => router.back()}
// // // // //             className="text-xs text-indigo-600 underline"
// // // // //           >
// // // // //             Go back
// // // // //           </button>
// // // // //         </div>
// // // // //       </div>
// // // // //     );
// // // // //   }

// // // // //   const panelOpen = !!editingSeat;

// // // // //   return (
// // // // //     <div className="flex flex-col min-h-screen bg-[#F8F8FC]">

// // // // //       {/* ── Header ──────────────────────────────────────────────────────── */}
// // // // //       <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
// // // // //         <div className="flex items-center gap-3">
// // // // //           <button
// // // // //             onClick={() => router.back()}
// // // // //             className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
// // // // //           >
// // // // //             <ArrowLeft size={14} />
// // // // //             Back to Layout
// // // // //           </button>
// // // // //           <span className="text-gray-300 select-none">/</span>
// // // // //           <div>
// // // // //             <h1 className="text-xl font-bold text-gray-900 leading-none">Manage Seats</h1>
// // // // //             <p className="text-xs text-gray-400 mt-0.5">
// // // // //               Configure seat details, settings and amenities for this layout
// // // // //             </p>
// // // // //           </div>
// // // // //         </div>
// // // // //         <button className="flex items-center gap-2 px-4 py-2 text-xs font-semibold border border-gray-200 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
// // // // //           <MoreHorizontal size={14} />
// // // // //           More Actions
// // // // //         </button>
// // // // //       </div>

// // // // //       {/* ── Stat cards ──────────────────────────────────────────────────── */}
// // // // //       <div className="px-6 pt-5">
// // // // //         <LayoutStatCards stats={stats} loading={statsLoading} />
// // // // //       </div>

// // // // //       {/* ── Filters + view toggle ────────────────────────────────────────── */}
// // // // //       <div className="px-6 pt-4 flex items-end justify-between gap-4 flex-wrap">
// // // // //         <SeatFiltersBar
// // // // //           filters={filters}
// // // // //           seatTypes={seatTypes}
// // // // //           preferences={preferences}
// // // // //           onUpdate={updateFilter}
// // // // //           onReset={resetFilters}
// // // // //         />
// // // // //         <ViewToggle view={view} onChange={setView} />
// // // // //       </div>

// // // // //       {/* ── Content ─────────────────────────────────────────────────────── */}
// // // // //       <div className="flex flex-1 gap-0 px-6 pt-4 pb-6">

// // // // //         <div className={`flex-1 min-w-0 ${panelOpen ? "mr-5" : ""}`}>
// // // // //           {view === "map" ? (
// // // // //             <div className="bg-white rounded-xl border border-gray-200 p-4">
// // // // //               <LayoutPreview layout={layout} />
// // // // //             </div>
// // // // //           ) : (
// // // // //             <div className="bg-white rounded-xl border border-gray-200 p-4">
// // // // //               <SeatTable
// // // // //                 seats={filteredSeats}
// // // // //                 preferences={preferences}
// // // // //                 selected={selected}
// // // // //                 isAllSelected={isAllSelected}
// // // // //                 isIndeterminate={isIndeterminate}
// // // // //                 onToggleSelect={toggleSelect}
// // // // //                 onSelectAll={selectAll}
// // // // //                 onClearSelection={clearSelection}
// // // // //                 onEditSeat={openEditPanel}
// // // // //                 onBulkEdit={openBulkEdit}
// // // // //               />
// // // // //             </div>
// // // // //           )}
// // // // //         </div>

// // // // //         {panelOpen && (
// // // // //           <EditSeatPanel
// // // // //             seat={editingSeat}
// // // // //             preferences={preferences}
// // // // //             onSave={saveSeat}
// // // // //             onClose={closeEditPanel}
// // // // //           />
// // // // //         )}
// // // // //       </div>

// // // // //       {/* ── Bulk edit modal ──────────────────────────────────────────────── */}
// // // // //       <BulkEditModal
// // // // //         open={bulkOpen}
// // // // //         onClose={closeBulkEdit}
// // // // //         selectedIds={[...selected]}
// // // // //         layoutId={layout.layout_id}
// // // // //         preferences={preferences}
// // // // //         onSave={saveBulk}
// // // // //       />
// // // // //     </div>
// // // // //   );
// // // // // }

// // // // "use client";

// // // // import { ArrowLeft, MoreHorizontal } from "lucide-react";
// // // // import { useRouter } from "next/navigation";

// // // // import LayoutPreview   from "@/features/managelayout/components/LayoutPreview";
// // // // import SeatFiltersBar  from "@/features/managelayout1/components/SeatFiltersBar";
// // // // import SeatTable       from "@/features/managelayout1/components/SeatTable";
// // // // import EditSeatPanel   from "@/features/managelayout1/components/EditSeatPanel";
// // // // import BulkEditModal   from "@/features/managelayout1/components/BulkEditModal";
// // // // import ViewToggle      from "@/features/managelayout1/components/ViewToggle";
// // // // import { useManageSeats } from "@/features/managelayout1/hooks/Usemanageseats";
// // // // import LayoutStatCards from "@/features/managelayout/components/Layoutstatcards";

// // // // export default function ManageSeatsPage() {
// // // //   const router = useRouter();

// // // //   const {
// // // //     layout,
// // // //     layoutLoading,
// // // //     layoutError,
// // // //     stats,
// // // //     statsLoading,
// // // //     filteredSeats,
// // // //     filters,
// // // //     updateFilter,
// // // //     resetFilters,
// // // //     seatTypes,
// // // //     preferences,
// // // //     selected,
// // // //     toggleSelect,
// // // //     selectAll,
// // // //     clearSelection,
// // // //     isAllSelected,
// // // //     isIndeterminate,
// // // //     editingSeat,
// // // //     openEditPanel,
// // // //     closeEditPanel,
// // // //     saveSeat,
// // // //     bulkOpen,
// // // //     openBulkEdit,
// // // //     closeBulkEdit,
// // // //     saveBulk,
// // // //     view,
// // // //     setView,
// // // //   } = useManageSeats();

// // // //   if (layoutLoading) {
// // // //     return (
// // // //       <div className="flex items-center justify-center h-screen bg-[#F8F8FC]">
// // // //         <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
// // // //       </div>
// // // //     );
// // // //   }

// // // //   if (layoutError || !layout) {
// // // //     return (
// // // //       <div className="flex items-center justify-center h-screen bg-[#F8F8FC]">
// // // //         <div className="text-center">
// // // //           <p className="text-sm text-red-500 mb-3">Failed to load layout.</p>
// // // //           <button
// // // //             onClick={() => router.back()}
// // // //             className="text-xs text-indigo-600 underline"
// // // //           >
// // // //             Go back
// // // //           </button>
// // // //         </div>
// // // //       </div>
// // // //     );
// // // //   }

// // // //   const panelOpen = !!editingSeat;

// // // //   return (
// // // //     <div className="flex flex-col h-screen overflow-hidden bg-[#F8F8FC]">

// // // //       {/* ── Header ──────────────────────────────────────────────────────── */}
// // // //       <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
// // // //         <div className="flex items-center gap-3">
// // // //           <button
// // // //             onClick={() => router.back()}
// // // //             className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
// // // //           >
// // // //             <ArrowLeft size={14} />
// // // //             Back to Layout
// // // //           </button>
// // // //           <span className="text-gray-300 select-none">/</span>
// // // //           <div>
// // // //             <h1 className="text-xl font-bold text-gray-900 leading-none">Manage Seats</h1>
// // // //             <p className="text-xs text-gray-400 mt-0.5">
// // // //               Configure seat details, settings and amenities for this layout
// // // //             </p>
// // // //           </div>
// // // //         </div>
// // // //         <button className="flex items-center gap-2 px-4 py-2 text-xs font-semibold border border-gray-200 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
// // // //           <MoreHorizontal size={14} />
// // // //           More Actions
// // // //         </button>
// // // //       </div>

// // // //       {/* ── Stat cards ──────────────────────────────────────────────────── */}
// // // //       <div className="flex-shrink-0 px-6 pt-5">
// // // //         <LayoutStatCards stats={stats} loading={statsLoading} />
// // // //       </div>

// // // //       {/* ── Filters + view toggle ────────────────────────────────────────── */}
// // // //       <div className="flex-shrink-0 px-6 pt-4 flex items-end justify-between gap-4 flex-wrap">
// // // //         <SeatFiltersBar
// // // //           filters={filters}
// // // //           seatTypes={seatTypes}
// // // //           preferences={preferences}
// // // //           onUpdate={updateFilter}
// // // //           onReset={resetFilters}
// // // //         />
// // // //         <ViewToggle view={view} onChange={setView} />
// // // //       </div>

// // // //       {/* ── Content ─────────────────────────────────────────────────────── */}
// // // //       <div className="flex flex-1 min-h-0 gap-0 px-6 pt-4 pb-6 overflow-hidden">

// // // //         {/* Scrollable main area */}
// // // //         <div className={`flex flex-col flex-1 min-w-0 min-h-0 overflow-y-auto ${panelOpen ? "mr-5" : ""}`}>
// // // //           {view === "map" ? (
// // // //             <div className="bg-white rounded-xl border border-gray-200 p-4 flex-1 min-h-[500px] flex flex-col">
// // // //               <LayoutPreview layout={layout} />
// // // //             </div>
// // // //           ) : (
// // // //             <div className="bg-white rounded-xl border border-gray-200 p-4">
// // // //               <SeatTable
// // // //                 seats={filteredSeats}
// // // //                 preferences={preferences}
// // // //                 selected={selected}
// // // //                 isAllSelected={isAllSelected}
// // // //                 isIndeterminate={isIndeterminate}
// // // //                 onToggleSelect={toggleSelect}
// // // //                 onSelectAll={selectAll}
// // // //                 onClearSelection={clearSelection}
// // // //                 onEditSeat={openEditPanel}
// // // //                 onBulkEdit={openBulkEdit}
// // // //               />
// // // //             </div>
// // // //           )}
// // // //         </div>

// // // //         {/* Edit panel — fixed height, scrolls internally */}
// // // //         {panelOpen && (
// // // //           <div className="flex-shrink-0 overflow-y-auto">
// // // //             <EditSeatPanel
// // // //               seat={editingSeat}
// // // //               preferences={preferences}
// // // //               onSave={saveSeat}
// // // //               onClose={closeEditPanel}
// // // //             />
// // // //           </div>
// // // //         )}
// // // //       </div>

// // // //       {/* ── Bulk edit modal ──────────────────────────────────────────────── */}
// // // //       <BulkEditModal
// // // //         open={bulkOpen}
// // // //         onClose={closeBulkEdit}
// // // //         selectedIds={[...selected]}
// // // //         layoutId={layout.layout_id}
// // // //         preferences={preferences}
// // // //         onSave={saveBulk}
// // // //       />
// // // //     </div>
// // // //   );
// // // // }

// // // "use client";

// // // import { ArrowLeft, MoreHorizontal } from "lucide-react";
// // // import { useRouter } from "next/navigation";

// // // import LayoutPreview   from "@/features/managelayout/components/LayoutPreview";
// // // import SeatFiltersBar  from "@/features/managelayout1/components/SeatFiltersBar";
// // // import SeatTable       from "@/features/managelayout1/components/SeatTable";
// // // import EditSeatPanel   from "@/features/managelayout1/components/EditSeatPanel";
// // // import BulkEditModal   from "@/features/managelayout1/components/BulkEditModal";
// // // import ViewToggle      from "@/features/managelayout1/components/ViewToggle";
// // // import { useManageSeats } from "@/features/managelayout1/hooks/Usemanageseats";
// // // import LayoutStatCards from "@/features/managelayout/components/Layoutstatcards";

// // // export default function ManageSeatsPage() {
// // //   const router = useRouter();

// // //   const {
// // //     layout,
// // //     layoutLoading,
// // //     layoutError,
// // //     stats,
// // //     statsLoading,
// // //     filteredSeats,
// // //     filters,
// // //     updateFilter,
// // //     resetFilters,
// // //     seatTypes,
// // //     preferences,
// // //     selected,
// // //     toggleSelect,
// // //     selectAll,
// // //     clearSelection,
// // //     isAllSelected,
// // //     isIndeterminate,
// // //     editingSeat,
// // //     openEditPanel,
// // //     closeEditPanel,
// // //     saveSeat,
// // //     bulkOpen,
// // //     openBulkEdit,
// // //     closeBulkEdit,
// // //     saveBulk,
// // //     view,
// // //     setView,
// // //   } = useManageSeats();

// // //   if (layoutLoading) {
// // //     return (
// // //       <div className="flex items-center justify-center h-screen bg-[#F8F8FC]">
// // //         <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
// // //       </div>
// // //     );
// // //   }

// // //   if (layoutError || !layout) {
// // //     return (
// // //       <div className="flex items-center justify-center h-screen bg-[#F8F8FC]">
// // //         <div className="text-center">
// // //           <p className="text-sm text-red-500 mb-3">Failed to load layout.</p>
// // //           <button
// // //             onClick={() => router.back()}
// // //             className="text-xs text-indigo-600 underline"
// // //           >
// // //             Go back
// // //           </button>
// // //         </div>
// // //       </div>
// // //     );
// // //   }

// // //   const panelOpen = !!editingSeat;

// // //   return (
// // //     <div className="flex flex-col h-screen overflow-hidden bg-[#F8F8FC]">

// // //       {/* ── Header ──────────────────────────────────────────────────────── */}
// // //       <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
// // //         <div className="flex items-center gap-3">
// // //           <button
// // //             onClick={() => router.back()}
// // //             className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
// // //           >
// // //             <ArrowLeft size={14} />
// // //             Back to Layout
// // //           </button>
// // //           <span className="text-gray-300 select-none">/</span>
// // //           <div>
// // //             <h1 className="text-xl font-bold text-gray-900 leading-none">Manage Seats</h1>
// // //             <p className="text-xs text-gray-400 mt-0.5">
// // //               Configure seat details, settings and amenities for this layout
// // //             </p>
// // //           </div>
// // //         </div>
// // //         <button className="flex items-center gap-2 px-4 py-2 text-xs font-semibold border border-gray-200 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
// // //           <MoreHorizontal size={14} />
// // //           More Actions
// // //         </button>
// // //       </div>

// // //       {/* ── Stat cards ──────────────────────────────────────────────────── */}
// // //       <div className="flex-shrink-0 px-6 pt-5">
// // //         <LayoutStatCards stats={stats} loading={statsLoading} />
// // //       </div>

// // //       {/* ── Filters + view toggle ────────────────────────────────────────── */}
// // //       <div className="flex-shrink-0 px-6 pt-4 flex items-end justify-between gap-4 flex-wrap">
// // //         <SeatFiltersBar
// // //           filters={filters}
// // //           seatTypes={seatTypes}
// // //           preferences={preferences}
// // //           onUpdate={updateFilter}
// // //           onReset={resetFilters}
// // //         />
// // //         <ViewToggle view={view} onChange={setView} />
// // //       </div>

// // //       {/* ── Content ─────────────────────────────────────────────────────── */}
// // //       <div className="flex flex-1 min-h-0 gap-0 px-6 pt-4 pb-6 overflow-hidden">

// // //         {/* Scrollable main area */}
// // //         <div className={`flex flex-col flex-1 min-w-0 min-h-0 ${view === "map" ? "overflow-hidden" : "overflow-y-auto"} ${panelOpen ? "mr-5" : ""}`}>

// // //           {view === "map" ? (
// // //             /* ── Map view: fills all remaining height, scrollable inside ── */
// // //             <div className="flex flex-col flex-1 min-h-0 bg-white rounded-xl border border-gray-200 overflow-hidden">
// // //               {/* inner scroll container so the map can be bigger than viewport */}
// // //               <div className="flex-1 min-h-0 overflow-auto w-full">
// // //                 <div className="w-full min-h-full" style={{ minHeight: "600px" }}>
// // //                   <LayoutPreview layout={layout} />
// // //                 </div>
// // //               </div>
// // //             </div>

// // //           ) : (
// // //             /* ── List view ─────────────────────────────────────────────── */
// // //             <div className="bg-white rounded-xl border border-gray-200 p-4">
// // //               <SeatTable
// // //                 seats={filteredSeats}
// // //                 preferences={preferences}
// // //                 selected={selected}
// // //                 isAllSelected={isAllSelected}
// // //                 isIndeterminate={isIndeterminate}
// // //                 onToggleSelect={toggleSelect}
// // //                 onSelectAll={selectAll}
// // //                 onClearSelection={clearSelection}
// // //                 onEditSeat={openEditPanel}
// // //                 onBulkEdit={openBulkEdit}
// // //               />
// // //             </div>
// // //           )}
// // //         </div>

// // //         {/* Edit panel — fixed width, scrolls internally if tall */}
// // //         {panelOpen && (
// // //           <div className="flex-shrink-0 overflow-y-auto">
// // //             <EditSeatPanel
// // //               seat={editingSeat}
// // //               preferences={preferences}
// // //               onSave={saveSeat}
// // //               onClose={closeEditPanel}
// // //             />
// // //           </div>
// // //         )}
// // //       </div>

// // //       {/* ── Bulk edit modal ──────────────────────────────────────────────── */}
// // //       <BulkEditModal
// // //         open={bulkOpen}
// // //         onClose={closeBulkEdit}
// // //         selectedIds={[...selected]}
// // //         layoutId={layout.layout_id}
// // //         preferences={preferences}
// // //         onSave={saveBulk}
// // //       />
// // //     </div>
// // //   );
// // // }

// // "use client";

// // import { ArrowLeft, MoreHorizontal } from "lucide-react";
// // import { useRouter } from "next/navigation";

// // import LayoutPreview   from "@/features/managelayout/components/LayoutPreview";
// // import SeatFiltersBar  from "@/features/managelayout1/components/SeatFiltersBar";
// // import SeatTable       from "@/features/managelayout1/components/SeatTable";
// // import EditSeatPanel   from "@/features/managelayout1/components/EditSeatPanel";
// // import BulkEditModal   from "@/features/managelayout1/components/BulkEditModal";
// // import ViewToggle      from "@/features/managelayout1/components/ViewToggle";
// // import { useManageSeats } from "@/features/managelayout1/hooks/Usemanageseats";
// // import LayoutStatCards from "@/features/managelayout/components/Layoutstatcards";

// // export default function ManageSeatsPage() {
// //   const router = useRouter();

// //   const {
// //     layout,
// //     layoutLoading,
// //     layoutError,
// //     stats,
// //     statsLoading,
// //     filteredSeats,
// //     filters,
// //     updateFilter,
// //     resetFilters,
// //     seatTypes,
// //     preferences,
// //     selected,
// //     toggleSelect,
// //     selectAll,
// //     clearSelection,
// //     isAllSelected,
// //     isIndeterminate,
// //     editingSeat,
// //     openEditPanel,
// //     closeEditPanel,
// //     saveSeat,
// //     bulkOpen,
// //     openBulkEdit,
// //     closeBulkEdit,
// //     saveBulk,
// //     view,
// //     setView,
// //   } = useManageSeats();

// //   if (layoutLoading) {
// //     return (
// //       <div className="flex items-center justify-center h-screen bg-[#F8F8FC]">
// //         <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
// //       </div>
// //     );
// //   }

// //   if (layoutError || !layout) {
// //     return (
// //       <div className="flex items-center justify-center h-screen bg-[#F8F8FC]">
// //         <div className="text-center">
// //           <p className="text-sm text-red-500 mb-3">Failed to load layout.</p>
// //           <button
// //             onClick={() => router.back()}
// //             className="text-xs text-indigo-600 underline"
// //           >
// //             Go back
// //           </button>
// //         </div>
// //       </div>
// //     );
// //   }

// //   const panelOpen = !!editingSeat;

// //   return (
// //     <div className="flex flex-col h-screen overflow-hidden bg-[#F8F8FC]">

// //       {/* ── Header ──────────────────────────────────────────────────────── */}
// //       <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
// //         <div className="flex items-center gap-3">
// //           <button
// //             onClick={() => router.back()}
// //             className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
// //           >
// //             <ArrowLeft size={14} />
// //             Back to Layout
// //           </button>
// //           <span className="text-gray-300 select-none">/</span>
// //           <div>
// //             <h1 className="text-xl font-bold text-gray-900 leading-none">Manage Seats</h1>
// //             <p className="text-xs text-gray-400 mt-0.5">
// //               Configure seat details, settings and amenities for this layout
// //             </p>
// //           </div>
// //         </div>
// //         <button className="flex items-center gap-2 px-4 py-2 text-xs font-semibold border border-gray-200 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
// //           <MoreHorizontal size={14} />
// //           More Actions
// //         </button>
// //       </div>

// //       {/* ── Stat cards ──────────────────────────────────────────────────── */}
// //       <div className="flex-shrink-0 px-6 pt-5">
// //         <LayoutStatCards stats={stats} loading={statsLoading} />
// //       </div>

// //       {/* ── Filters + view toggle ────────────────────────────────────────── */}
// //       <div className="flex-shrink-0 px-6 pt-4 flex items-end justify-between gap-4 flex-wrap">
// //         <SeatFiltersBar
// //           filters={filters}
// //           seatTypes={seatTypes}
// //           preferences={preferences}
// //           onUpdate={updateFilter}
// //           onReset={resetFilters}
// //         />
// //         <ViewToggle view={view} onChange={setView} />
// //       </div>

// //       {/* ── Content ─────────────────────────────────────────────────────── */}
// //       <div className="flex flex-1 min-h-0 gap-0 px-6 pt-4 pb-6 overflow-hidden">

// //         {/* Scrollable main area */}
// //         <div
// //           className={`flex flex-col flex-1 min-w-0 min-h-0 ${
// //             view === "map" ? "overflow-hidden" : "overflow-y-auto"
// //           } ${panelOpen ? "mr-5" : ""}`}
// //         >
// //           {view === "map" ? (
// //             // ── Map view ────────────────────────────────────────────────
// //             // The white card fills all remaining height (flex-1 min-h-0).
// //             // LayoutPreview receives fillHeight=true so its canvas
// //             // stretches to fill the card instead of using a fixed 460px.
// //            // <div className="flex flex-col flex-1 min-h-0 bg-white rounded-xl border border-gray-200 overflow-hidden p-4">
// //            <div className="flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden p-4" style={{ flex: '1 1 0', minHeight: 580 }}>
// //               <LayoutPreview layout={layout} fillHeight />
// //             </div>

// //           ) : (
// //             // ── List view ────────────────────────────────────────────────
// //             <div className="bg-white rounded-xl border border-gray-200 p-4">
// //               <SeatTable
// //                 seats={filteredSeats}
// //                 preferences={preferences}
// //                 selected={selected}
// //                 isAllSelected={isAllSelected}
// //                 isIndeterminate={isIndeterminate}
// //                 onToggleSelect={toggleSelect}
// //                 onSelectAll={selectAll}
// //                 onClearSelection={clearSelection}
// //                 onEditSeat={openEditPanel}
// //                 onBulkEdit={openBulkEdit}
// //               />
// //             </div>
// //           )}
// //         </div>

// //         {/* Edit panel — fixed width, scrolls internally if tall */}
// //         {panelOpen && (
// //           <div className="flex-shrink-0 overflow-y-auto">
// //             <EditSeatPanel
// //               seat={editingSeat}
// //               preferences={preferences}
// //               onSave={saveSeat}
// //               onClose={closeEditPanel}
// //             />
// //           </div>
// //         )}
// //       </div>

// //       {/* ── Bulk edit modal ──────────────────────────────────────────────── */}
// //       <BulkEditModal
// //         open={bulkOpen}
// //         onClose={closeBulkEdit}
// //         selectedIds={[...selected]}
// //         layoutId={layout.layout_id}
// //         preferences={preferences}
// //         onSave={saveBulk}
// //       />
// //     </div>
// //   );
// // }

// "use client";

// import { ArrowLeft, MoreHorizontal } from "lucide-react";
// import { useRouter } from "next/navigation";

// import LayoutPreview   from "@/features/managelayout/components/LayoutPreview";
// import SeatFiltersBar  from "@/features/managelayout1/components/SeatFiltersBar";
// import SeatTable       from "@/features/managelayout1/components/SeatTable";
// import EditSeatPanel   from "@/features/managelayout1/components/EditSeatPanel";
// import BulkEditModal   from "@/features/managelayout1/components/BulkEditModal";
// import ViewToggle      from "@/features/managelayout1/components/ViewToggle";
// import { useManageSeats } from "@/features/managelayout1/hooks/Usemanageseats";
// import LayoutStatCards from "@/features/managelayout/components/Layoutstatcards";

// export default function ManageSeatsPage() {
//   const router = useRouter();

//   const {
//     layout,
//     layoutLoading,
//     layoutError,
//     stats,
//     statsLoading,
//     filteredSeats,
//     filters,
//     updateFilter,
//     resetFilters,
//     seatTypes,
//     preferences,
//     selected,
//     toggleSelect,
//     selectAll,
//     clearSelection,
//     isAllSelected,
//     isIndeterminate,
//     editingSeat,
//     openEditPanel,
//     closeEditPanel,
//     saveSeat,
//     bulkOpen,
//     openBulkEdit,
//     closeBulkEdit,
//     saveBulk,
//     view,
//     setView,
//   } = useManageSeats();

//   if (layoutLoading) {
//     return (
//       <div className="flex items-center justify-center h-screen bg-[#F8F8FC]">
//         <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
//       </div>
//     );
//   }

//   if (layoutError || !layout) {
//     return (
//       <div className="flex items-center justify-center h-screen bg-[#F8F8FC]">
//         <div className="text-center">
//           <p className="text-sm text-red-500 mb-3">Failed to load layout.</p>
//           <button
//             onClick={() => router.back()}
//             className="text-xs text-indigo-600 underline"
//           >
//             Go back
//           </button>
//         </div>
//       </div>
//     );
//   }

//   const panelOpen = !!editingSeat;

//   return (
//     <div className="flex flex-col h-screen overflow-hidden bg-[#F8F8FC]">

//       {/* ── Header ──────────────────────────────────────────────────────── */}
//       <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
//         <div className="flex items-center gap-3">
//           <button
//             onClick={() => router.back()}
//             className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
//           >
//             <ArrowLeft size={14} />
//             Back to Layout
//           </button>
//           <span className="text-gray-300 select-none">/</span>
//           <div>
//             <h1 className="text-xl font-bold text-gray-900 leading-none">Manage Seats</h1>
//             <p className="text-xs text-gray-400 mt-0.5">
//               Configure seat details, settings and amenities for this layout
//             </p>
//           </div>
//         </div>
//         <button className="flex items-center gap-2 px-4 py-2 text-xs font-semibold border border-gray-200 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
//           <MoreHorizontal size={14} />
//           More Actions
//         </button>
//       </div>

//       {/* ── Stat cards ──────────────────────────────────────────────────── */}
//       <div className="flex-shrink-0 px-6 pt-5">
//         <LayoutStatCards stats={stats} loading={statsLoading} />
//       </div>

//       {/* ── Filters + view toggle ────────────────────────────────────────── */}
//       <div className="flex-shrink-0 px-6 pt-4 flex items-end justify-between gap-4 flex-wrap">
//         <SeatFiltersBar
//           filters={filters}
//           seatTypes={seatTypes}
//           preferences={preferences}
//           onUpdate={updateFilter}
//           onReset={resetFilters}
//         />
//         <ViewToggle view={view} onChange={setView} />
//       </div>

//       {/* ── Content ─────────────────────────────────────────────────────── */}
//       <div className="flex flex-1 min-h-0 gap-0 px-6 pt-4 pb-6 overflow-hidden">

//         {/* Scrollable main area */}
//         <div
//           className={`flex flex-col flex-1 min-w-0 min-h-0 ${
//             view === "map" ? "overflow-hidden" : "overflow-y-auto"
//           } ${panelOpen ? "mr-5" : ""}`}
//         >
//           {view === "map" ? (

//             // ── Map view ─────────────────────────────────────────────────
//             // flex-1 + min-h-0 ensures the card stretches to fill all
//             // remaining height in the flex column. LayoutPreview gets
//             // fillHeight so its inner canvas does the same.
//             <div className="flex flex-col flex-1 min-h-0 bg-white rounded-xl border border-gray-200 overflow-hidden p-4">
//               <LayoutPreview layout={layout} fillHeight />
//             </div>

//           ) : (
//             // ── List view ────────────────────────────────────────────────
//             <div className="bg-white rounded-xl border border-gray-200 p-4">
//               <SeatTable
//                 seats={filteredSeats}
//                 preferences={preferences}
//                 selected={selected}
//                 isAllSelected={isAllSelected}
//                 isIndeterminate={isIndeterminate}
//                 onToggleSelect={toggleSelect}
//                 onSelectAll={selectAll}
//                 onClearSelection={clearSelection}
//                 onEditSeat={openEditPanel}
//                 onBulkEdit={openBulkEdit}
//               />
//             </div>
//           )}
//         </div>

//         {/* Edit panel — fixed width, scrolls internally if tall */}
//         {panelOpen && (
//           <div className="flex-shrink-0 overflow-y-auto">
//             <EditSeatPanel
//               seat={editingSeat}
//               preferences={preferences}
//               onSave={saveSeat}
//               onClose={closeEditPanel}
//             />
//           </div>
//         )}
//       </div>

//       {/* ── Bulk edit modal ──────────────────────────────────────────────── */}
//       <BulkEditModal
//         open={bulkOpen}
//         onClose={closeBulkEdit}
//         selectedIds={[...selected]}
//         layoutId={layout.layout_id}
//         preferences={preferences}
//         onSave={saveBulk}
//       />
//     </div>
//   );
// }

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
          <button
            onClick={() => router.back()}
            className="text-xs text-indigo-600 underline"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  const panelOpen = !!editingSeat;

  return (
    <div className="flex flex-col min-h-screen bg-[#F8F8FC]">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      {/* <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft size={14} />
            Back to Layout
          </button>
          <span className="text-gray-300 select-none">/</span>
          <div>
            <h1 className="text-xl font-bold text-gray-900 leading-none">Manage Seats</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Configure seat details, settings and amenities for this layout
            </p>
          </div>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 text-xs font-semibold border border-gray-200 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
          <MoreHorizontal size={14} />
          More Actions
        </button>
      </div> */}
      {/* ── Header ──────────────────────────────────────────────────────── */}
<div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
  
  {/* Left: title only */}
  <div>
    <h1 className="text-xl font-bold text-gray-900 leading-none">Manage Seats</h1>
    <p className="text-xs text-gray-400 mt-0.5">
      Configure seat details, settings and amenities for this layout
    </p>
  </div>

  {/* Right: Back + More Actions */}
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

      {/* ── Scrollable main content ──────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto px-6 pt-5 pb-6 space-y-5">

        {/* ── Stat cards ────────────────────────────────────────────────── */}
        <LayoutStatCards stats={stats} loading={statsLoading} />

        {/* ── Filters + view toggle ──────────────────────────────────────── */}
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

        {/* ── Content: main area + optional edit panel ──────────────────── */}
        <div className="flex gap-5 items-start w-full">

          {/* Main area */}
          <div className="flex flex-col flex-1 min-w-0">
            {/* {view === "map" ? (

              // ── Map view ───────────────────────────────────────────────
              // Fixed tall height so the canvas is enlarged, matching the
              // generous preview size used on ManageLayoutPage.
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden p-4" style={{ minHeight: "680px" }}>
                <LayoutPreview layout={layout} fillHeight />
              </div>

            ) : (
              // ── List view ──────────────────────────────────────────────
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
            )} */}
            {view === "map" ? (
  // ── Map view ─────────────────────────────────────────────────
  // canvasHeight={420} gives a compact but clear preview; the SVG
  // fitView logic scales the layout to fill it exactly.
  <div className="bg-white rounded-xl border border-gray-200 p-4">
    <LayoutPreview layout={layout} canvasHeight={420} />
  </div>
) : (
  // ── List view ────────────────────────────────────────────────
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

          {/* ── Edit panel — fixed width, sticks to top while scrolling ── */}
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

      {/* ── Bulk edit modal ────────────────────────────────────────────────── */}
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