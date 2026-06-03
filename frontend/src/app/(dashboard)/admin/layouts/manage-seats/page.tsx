// // // // // // // "use client";

// // // // // // // import { ArrowLeft, MoreHorizontal } from "lucide-react";
// // // // // // // import { useRouter } from "next/navigation";

// // // // // // // import LayoutPreview   from "@/features/managelayout/components/LayoutPreview";
// // // // // // // import SeatFiltersBar  from "@/features/managelayout1/components/SeatFiltersBar";
// // // // // // // import SeatTable       from "@/features/managelayout1/components/SeatTable";
// // // // // // // import EditSeatPanel   from "@/features/managelayout1/components/EditSeatPanel";
// // // // // // // import BulkEditModal   from "@/features/managelayout1/components/BulkEditModal";
// // // // // // // import ViewToggle      from "@/features/managelayout1/components/ViewToggle";
// // // // // // // import { useManageSeats } from "@/features/managelayout1/hooks/Usemanageseats";
// // // // // // // import LayoutStatCards from "@/features/managelayout/components/Layoutstatcards";

// // // // // // // export default function ManageSeatsPage() {
// // // // // // //   const router = useRouter();

// // // // // // //   const {
// // // // // // //     layout,
// // // // // // //     layoutLoading,
// // // // // // //     layoutError,
// // // // // // //     stats,
// // // // // // //     statsLoading,
// // // // // // //     seats,           // ← add this
// // // // // // //     filteredSeats,
// // // // // // //     filters,
// // // // // // //     updateFilter,
// // // // // // //     resetFilters,
// // // // // // //     seatTypes,
// // // // // // //     preferences,
// // // // // // //     selected,
// // // // // // //     toggleSelect,
// // // // // // //     selectAll,
// // // // // // //     clearSelection,
// // // // // // //     isAllSelected,
// // // // // // //     isIndeterminate,
// // // // // // //     editingSeat,
// // // // // // //     openEditPanel,
// // // // // // //     closeEditPanel,
// // // // // // //     saveSeat,
// // // // // // //     bulkOpen,
// // // // // // //     openBulkEdit,
// // // // // // //     closeBulkEdit,
// // // // // // //     saveBulk,
// // // // // // //     view,
// // // // // // //     setView,
// // // // // // //   } = useManageSeats();

// // // // // // //   if (layoutLoading) {
// // // // // // //     return (
// // // // // // //       <div className="flex items-center justify-center h-screen bg-[#F8F8FC]">
// // // // // // //         <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
// // // // // // //       </div>
// // // // // // //     );
// // // // // // //   }

// // // // // // //   if (layoutError || !layout) {
// // // // // // //     return (
// // // // // // //       <div className="flex items-center justify-center h-screen bg-[#F8F8FC]">
// // // // // // //         <div className="text-center">
// // // // // // //           <p className="text-sm text-red-500 mb-3">Failed to load layout.</p>
// // // // // // //           <button onClick={() => router.back()} className="text-xs text-indigo-600 underline">
// // // // // // //             Go back
// // // // // // //           </button>
// // // // // // //         </div>
// // // // // // //       </div>
// // // // // // //     );
// // // // // // //   }

// // // // // // //   const panelOpen = !!editingSeat;

// // // // // // //   return (
// // // // // // //     <div className="flex flex-col min-h-screen bg-[#F8F8FC]">

// // // // // // //       {/* Header */}
// // // // // // //       <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
// // // // // // //         <div>
// // // // // // //           <h1 className="text-xl font-bold text-gray-900 leading-none">Manage Seats</h1>
// // // // // // //           <p className="text-xs text-gray-400 mt-0.5">
// // // // // // //             Configure seat details, settings and amenities for this layout
// // // // // // //           </p>
// // // // // // //         </div>
// // // // // // //         <div className="flex items-center gap-2">
// // // // // // //           <button
// // // // // // //             onClick={() => router.back()}
// // // // // // //             className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium border border-gray-200 bg-white text-gray-500 rounded-lg hover:bg-gray-50 hover:text-gray-700 transition-colors"
// // // // // // //           >
// // // // // // //             <ArrowLeft size={14} />
// // // // // // //             Back to Layout
// // // // // // //           </button>
// // // // // // //           <button className="flex items-center gap-2 px-4 py-2 text-xs font-semibold border border-gray-200 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
// // // // // // //             <MoreHorizontal size={14} />
// // // // // // //             More Actions
// // // // // // //           </button>
// // // // // // //         </div>
// // // // // // //       </div>

// // // // // // //       {/* Main content */}
// // // // // // //       <main className="flex-1 overflow-y-auto px-6 pt-5 pb-6 space-y-5">

// // // // // // //         <LayoutStatCards stats={stats} loading={statsLoading} />

// // // // // // //         <div className="flex items-end justify-between gap-4 flex-wrap">
// // // // // // //           <SeatFiltersBar
// // // // // // //             filters={filters}
// // // // // // //             seatTypes={seatTypes}
// // // // // // //             preferences={preferences}
// // // // // // //             onUpdate={updateFilter}
// // // // // // //             onReset={resetFilters}
// // // // // // //           />
// // // // // // //           <ViewToggle view={view} onChange={setView} />
// // // // // // //         </div>

// // // // // // //         <div className="flex gap-5 items-start w-full">
// // // // // // //           <div className="flex flex-col flex-1 min-w-0">
// // // // // // //             {view === "map" ? (
// // // // // // //               <div className="bg-white rounded-xl border border-gray-200 p-4">
// // // // // // //                 {/* ✅ Now passes seats, preferences, and saveSeat so map is interactive */}
// // // // // // //                 <LayoutPreview
// // // // // // //                   layout={layout}
// // // // // // //                   canvasHeight={420}
// // // // // // //                   seats={seats}
// // // // // // //                   preferences={preferences}
// // // // // // //                   onSeatSave={saveSeat}
// // // // // // //                   filteredSeats={view === "map" ? filteredSeats : undefined}
// // // // // // //                 />
// // // // // // //               </div>
// // // // // // //             ) : (
// // // // // // //               <div className="bg-white rounded-xl border border-gray-200 p-4">
// // // // // // //                 <SeatTable
// // // // // // //                   seats={filteredSeats}
// // // // // // //                   preferences={preferences}
// // // // // // //                   selected={selected}
// // // // // // //                   isAllSelected={isAllSelected}
// // // // // // //                   isIndeterminate={isIndeterminate}
// // // // // // //                   onToggleSelect={toggleSelect}
// // // // // // //                   onSelectAll={selectAll}
// // // // // // //                   onClearSelection={clearSelection}
// // // // // // //                   onEditSeat={openEditPanel}
// // // // // // //                   onBulkEdit={openBulkEdit}
// // // // // // //                 />
// // // // // // //               </div>
// // // // // // //             )}
// // // // // // //           </div>

// // // // // // //           {panelOpen && (
// // // // // // //             <div className="flex-shrink-0 sticky top-[73px] max-h-[calc(100vh-90px)] overflow-y-auto">
// // // // // // //               <EditSeatPanel
// // // // // // //                 seat={editingSeat}
// // // // // // //                 preferences={preferences}
// // // // // // //                 onSave={saveSeat}
// // // // // // //                 onClose={closeEditPanel}
// // // // // // //               />
// // // // // // //             </div>
// // // // // // //           )}
// // // // // // //         </div>
// // // // // // //       </main>

// // // // // // //       <BulkEditModal
// // // // // // //         open={bulkOpen}
// // // // // // //         onClose={closeBulkEdit}
// // // // // // //         selectedIds={[...selected]}
// // // // // // //         layoutId={layout.layout_id}
// // // // // // //         preferences={preferences}
// // // // // // //         onSave={saveBulk}
// // // // // // //       />
// // // // // // //     </div>
// // // // // // //   );
// // // // // // // }

// // // // // // "use client";

// // // // // // import { ArrowLeft, MoreHorizontal } from "lucide-react";
// // // // // // import { useRouter } from "next/navigation";

// // // // // // import LayoutPreview   from "@/features/managelayout/components/LayoutPreview";
// // // // // // import SeatFiltersBar  from "@/features/managelayout1/components/SeatFiltersBar";
// // // // // // import SeatTable       from "@/features/managelayout1/components/SeatTable";
// // // // // // import EditSeatPanel   from "@/features/managelayout1/components/EditSeatPanel";
// // // // // // import BulkEditModal   from "@/features/managelayout1/components/BulkEditModal";
// // // // // // import ViewToggle      from "@/features/managelayout1/components/ViewToggle";
// // // // // // import { useManageSeats } from "@/features/managelayout1/hooks/Usemanageseats";
// // // // // // import LayoutStatCards from "@/features/managelayout/components/Layoutstatcards";

// // // // // // export default function ManageSeatsPage() {
// // // // // //   const router = useRouter();

// // // // // //   const {
// // // // // //     layout,
// // // // // //     layoutLoading,
// // // // // //     layoutError,
// // // // // //     stats,
// // // // // //     statsLoading,
// // // // // //     seats,
// // // // // //     filteredSeats,
// // // // // //     filters,
// // // // // //     updateFilter,
// // // // // //     resetFilters,
// // // // // //     seatTypes,
// // // // // //     preferences,
// // // // // //     selected,
// // // // // //     toggleSelect,
// // // // // //     selectAll,
// // // // // //     clearSelection,
// // // // // //     isAllSelected,
// // // // // //     isIndeterminate,
// // // // // //     editingSeat,
// // // // // //     openEditPanel,
// // // // // //     closeEditPanel,
// // // // // //     saveSeat,
// // // // // //     bulkOpen,
// // // // // //     openBulkEdit,
// // // // // //     closeBulkEdit,
// // // // // //     saveBulk,
// // // // // //     view,
// // // // // //     setView,
// // // // // //   } = useManageSeats();

// // // // // //   if (layoutLoading) {
// // // // // //     return (
// // // // // //       <div className="flex items-center justify-center h-screen bg-[#F8F8FC]">
// // // // // //         <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
// // // // // //       </div>
// // // // // //     );
// // // // // //   }

// // // // // //   if (layoutError || !layout) {
// // // // // //     return (
// // // // // //       <div className="flex items-center justify-center h-screen bg-[#F8F8FC]">
// // // // // //         <div className="text-center">
// // // // // //           <p className="text-sm text-red-500 mb-3">Failed to load layout.</p>
// // // // // //           <button onClick={() => router.back()} className="text-xs text-indigo-600 underline">
// // // // // //             Go back
// // // // // //           </button>
// // // // // //         </div>
// // // // // //       </div>
// // // // // //     );
// // // // // //   }

// // // // // //   const panelOpen = !!editingSeat;

// // // // // //   return (
// // // // // //     <div className="flex flex-col min-h-screen bg-[#F8F8FC]">

// // // // // //       {/* Header */}
// // // // // //       <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
// // // // // //         <div>
// // // // // //           <h1 className="text-xl font-bold text-gray-900 leading-none">Manage Seats</h1>
// // // // // //           <p className="text-xs text-gray-400 mt-0.5">
// // // // // //             Configure seat details, settings and amenities for this layout
// // // // // //           </p>
// // // // // //         </div>
// // // // // //         <div className="flex items-center gap-2">
// // // // // //           <button
// // // // // //             onClick={() => router.back()}
// // // // // //             className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium border border-gray-200 bg-white text-gray-500 rounded-lg hover:bg-gray-50 hover:text-gray-700 transition-colors"
// // // // // //           >
// // // // // //             <ArrowLeft size={14} />
// // // // // //             Back to Layout
// // // // // //           </button>
// // // // // //           <button className="flex items-center gap-2 px-4 py-2 text-xs font-semibold border border-gray-200 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
// // // // // //             <MoreHorizontal size={14} />
// // // // // //             More Actions
// // // // // //           </button>
// // // // // //         </div>
// // // // // //       </div>

// // // // // //       {/* Main content */}
// // // // // //       <main className="flex-1 overflow-y-auto px-6 pt-5 pb-6 space-y-5">

// // // // // //         <LayoutStatCards stats={stats} loading={statsLoading} />

// // // // // //         <div className="flex items-end justify-between gap-4 flex-wrap">
// // // // // //           <SeatFiltersBar
// // // // // //             filters={filters}
// // // // // //             seatTypes={seatTypes}
// // // // // //             preferences={preferences}
// // // // // //             onUpdate={updateFilter}
// // // // // //             onReset={resetFilters}
// // // // // //           />
// // // // // //           <ViewToggle view={view} onChange={setView} />
// // // // // //         </div>

// // // // // //         {/* Table/Map + Sidebar row */}
// // // // // //         <div className="flex gap-5 items-start w-full min-h-0">

// // // // // //           {/* Left: table or map — shrinks when panel opens */}
// // // // // //           <div className={`flex flex-col min-w-0 transition-all duration-200 ${panelOpen ? "flex-1" : "w-full"}`}>
// // // // // //             {view === "map" ? (
// // // // // //               <div className="bg-white rounded-xl border border-gray-200 p-4">
// // // // // //                 <LayoutPreview
// // // // // //                   layout={layout}
// // // // // //                   canvasHeight={420}
// // // // // //                   seats={seats}
// // // // // //                   preferences={preferences}
// // // // // //                   onSeatSave={saveSeat}
// // // // // //                   filteredSeats={filteredSeats}
// // // // // //                 />
// // // // // //               </div>
// // // // // //             ) : (
// // // // // //               <div className="bg-white rounded-xl border border-gray-200 p-4">
// // // // // //                 <SeatTable
// // // // // //                   seats={filteredSeats}
// // // // // //                   preferences={preferences}
// // // // // //                   selected={selected}
// // // // // //                   isAllSelected={isAllSelected}
// // // // // //                   isIndeterminate={isIndeterminate}
// // // // // //                   onToggleSelect={toggleSelect}
// // // // // //                   onSelectAll={selectAll}
// // // // // //                   onClearSelection={clearSelection}
// // // // // //                   onEditSeat={openEditPanel}
// // // // // //                   onBulkEdit={openBulkEdit}
// // // // // //                 />
// // // // // //               </div>
// // // // // //             )}
// // // // // //           </div>

// // // // // //           {/* Right: edit panel — fixed width, sticky within the scroll container */}
// // // // // //           {panelOpen && (
// // // // // //             <div className="w-[340px] flex-shrink-0 sticky top-[73px] self-start max-h-[calc(100vh-90px)] overflow-y-auto rounded-xl">
// // // // // //               <EditSeatPanel
// // // // // //                 seat={editingSeat}
// // // // // //                 preferences={preferences}
// // // // // //                 onSave={saveSeat}
// // // // // //                 onClose={closeEditPanel}
// // // // // //               />
// // // // // //             </div>
// // // // // //           )}
// // // // // //         </div>
// // // // // //       </main>

// // // // // //       <BulkEditModal
// // // // // //         open={bulkOpen}
// // // // // //         onClose={closeBulkEdit}
// // // // // //         selectedIds={[...selected]}
// // // // // //         layoutId={layout.layout_id}
// // // // // //         preferences={preferences}
// // // // // //         onSave={saveBulk}
// // // // // //       />
// // // // // //     </div>
// // // // // //   );
// // // // // // }

// // // // // "use client";

// // // // // import { ArrowLeft, MoreHorizontal } from "lucide-react";
// // // // // import { useRouter } from "next/navigation";

// // // // // import LayoutPreview   from "@/features/managelayout/components/LayoutPreview";
// // // // // import SeatFiltersBar  from "@/features/managelayout1/components/SeatFiltersBar";
// // // // // import SeatTable       from "@/features/managelayout1/components/SeatTable";
// // // // // import EditSeatPanel   from "@/features/managelayout1/components/EditSeatPanel";
// // // // // import BulkEditModal   from "@/features/managelayout1/components/BulkEditModal";
// // // // // import ViewToggle      from "@/features/managelayout1/components/ViewToggle";
// // // // // import { useManageSeats } from "@/features/managelayout1/hooks/Usemanageseats";
// // // // // import LayoutStatCards from "@/features/managelayout/components/Layoutstatcards";

// // // // // export default function ManageSeatsPage() {
// // // // //   const router = useRouter();

// // // // //   const {
// // // // //     layout,
// // // // //     layoutLoading,
// // // // //     layoutError,
// // // // //     stats,
// // // // //     statsLoading,
// // // // //     seats,
// // // // //     filteredSeats,
// // // // //     filters,
// // // // //     updateFilter,
// // // // //     resetFilters,
// // // // //     seatTypes,
// // // // //     preferences,
// // // // //     selected,
// // // // //     toggleSelect,
// // // // //     selectAll,
// // // // //     clearSelection,
// // // // //     isAllSelected,
// // // // //     isIndeterminate,
// // // // //     editingSeat,
// // // // //     openEditPanel,
// // // // //     closeEditPanel,
// // // // //     saveSeat,
// // // // //     bulkOpen,
// // // // //     openBulkEdit,
// // // // //     closeBulkEdit,
// // // // //     saveBulk,
// // // // //     view,
// // // // //     setView,
// // // // //   } = useManageSeats();

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
// // // // //           <button onClick={() => router.back()} className="text-xs text-indigo-600 underline">
// // // // //             Go back
// // // // //           </button>
// // // // //         </div>
// // // // //       </div>
// // // // //     );
// // // // //   }

// // // // //   const panelOpen = !!editingSeat;
// // // // //   const HEADER_H  = 73; // px — height of sticky header

// // // // //   return (
// // // // //     <div className="flex flex-col h-screen bg-[#F8F8FC]">

// // // // //       {/* ── Sticky header ───────────────────────────────────────────────── */}
// // // // //       <div className="flex-shrink-0 sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
// // // // //         <div>
// // // // //           <h1 className="text-xl font-bold text-gray-900 leading-none">Manage Seats</h1>
// // // // //           <p className="text-xs text-gray-400 mt-0.5">
// // // // //             Configure seat details, settings and amenities for this layout
// // // // //           </p>
// // // // //         </div>
// // // // //         <div className="flex items-center gap-2">
// // // // //           <button
// // // // //             onClick={() => router.back()}
// // // // //             className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium border border-gray-200 bg-white text-gray-500 rounded-lg hover:bg-gray-50 hover:text-gray-700 transition-colors"
// // // // //           >
// // // // //             <ArrowLeft size={14} />
// // // // //             Back to Layout
// // // // //           </button>
// // // // //           <button className="flex items-center gap-2 px-4 py-2 text-xs font-semibold border border-gray-200 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
// // // // //             <MoreHorizontal size={14} />
// // // // //             More Actions
// // // // //           </button>
// // // // //         </div>
// // // // //       </div>

// // // // //       {/* ── Body: left scrolls, right sidebar is fixed ──────────────────── */}
// // // // //       <div className="flex flex-1 min-h-0">

// // // // //         {/* Left — scrollable content area */}
// // // // //         <div className="flex-1 min-w-0 overflow-y-auto px-6 pt-5 pb-6 space-y-5">

// // // // //           <LayoutStatCards stats={stats} loading={statsLoading} />

// // // // //           <div className="flex items-end justify-between gap-4 flex-wrap">
// // // // //             <SeatFiltersBar
// // // // //               filters={filters}
// // // // //               seatTypes={seatTypes}
// // // // //               preferences={preferences}
// // // // //               onUpdate={updateFilter}
// // // // //               onReset={resetFilters}
// // // // //             />
// // // // //             <ViewToggle view={view} onChange={setView} />
// // // // //           </div>

// // // // //           {view === "map" ? (
// // // // //             <div className="bg-white rounded-xl border border-gray-200 p-4">
// // // // //               <LayoutPreview
// // // // //                 layout={layout}
// // // // //                 canvasHeight={420}
// // // // //                 seats={seats}
// // // // //                 preferences={preferences}
// // // // //                 onSeatSave={saveSeat}
// // // // //                 filteredSeats={filteredSeats}
// // // // //               />
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

// // // // //         {/* Right — sticky sidebar, does not scroll with the page */}
// // // // //         {panelOpen && (
// // // // //           <div
// // // // //             className="flex-shrink-0 w-[340px] border-l border-gray-200 bg-white overflow-y-auto"
// // // // //             style={{ height: `calc(100vh - ${HEADER_H}px)`, position: "sticky", top: HEADER_H }}
// // // // //           >
// // // // //             <EditSeatPanel
// // // // //               seat={editingSeat}
// // // // //               preferences={preferences}
// // // // //               onSave={saveSeat}
// // // // //               onClose={closeEditPanel}
// // // // //             />
// // // // //           </div>
// // // // //         )}
// // // // //       </div>

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
// // // //     seats,
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
// // // //           <button onClick={() => router.back()} className="text-xs text-indigo-600 underline">
// // // //             Go back
// // // //           </button>
// // // //         </div>
// // // //       </div>
// // // //     );
// // // //   }

// // // //   const panelOpen = !!editingSeat;

// // // //   return (
// // // //     <div className="flex flex-col min-h-screen bg-[#F8F8FC]">

// // // //       {/* Header */}
// // // //       <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
// // // //         <div>
// // // //           <h1 className="text-xl font-bold text-gray-900 leading-none">Manage Seats</h1>
// // // //           <p className="text-xs text-gray-400 mt-0.5">
// // // //             Configure seat details, settings and amenities for this layout
// // // //           </p>
// // // //         </div>
// // // //         <div className="flex items-center gap-2">
// // // //           <button
// // // //             onClick={() => router.back()}
// // // //             className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium border border-gray-200 bg-white text-gray-500 rounded-lg hover:bg-gray-50 hover:text-gray-700 transition-colors"
// // // //           >
// // // //             <ArrowLeft size={14} />
// // // //             Back to Layout
// // // //           </button>
// // // //           <button className="flex items-center gap-2 px-4 py-2 text-xs font-semibold border border-gray-200 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
// // // //             <MoreHorizontal size={14} />
// // // //             More Actions
// // // //           </button>
// // // //         </div>
// // // //       </div>

// // // //       {/* Main content — normal page scroll */}
// // // //       <main className="flex-1 overflow-y-auto px-6 pt-5 pb-6 space-y-5">

// // // //         <LayoutStatCards stats={stats} loading={statsLoading} />

// // // //         <div className="flex items-end justify-between gap-4 flex-wrap">
// // // //           {/* <SeatFiltersBar
// // // //             filters={filters}
// // // //             seatTypes={seatTypes}
// // // //             preferences={preferences}
// // // //             onUpdate={updateFilter}
// // // //             onReset={resetFilters}
// // // //           /> */}
// // // //           <SeatFiltersBar
// // // //   filters={filters}
// // // //   seatTypes={seatTypes.filter((type): type is string => type !== null)}
// // // //   preferences={preferences}
// // // //   onUpdate={updateFilter}
// // // //   onReset={resetFilters}
// // // // />
// // // //           <ViewToggle view={view} onChange={setView} />
// // // //         </div>

// // // //         {/* Table/Map row — sidebar is ONLY at this level */}
// // // //         <div className="flex gap-5 items-start">

// // // //           {/* Left: table or map */}
// // // //           <div className="flex-1 min-w-0">
// // // //             {view === "map" ? (
// // // //               <div className="bg-white rounded-xl border border-gray-200 p-4">
// // // //                 <LayoutPreview
// // // //                   layout={layout}
// // // //                   canvasHeight={420}
// // // //                   seats={seats}
// // // //                   preferences={preferences}
// // // //                   onSeatSave={saveSeat}
// // // //                   filteredSeats={filteredSeats}
// // // //                 />
// // // //               </div>
// // // //             ) : (
// // // //               <div className="bg-white rounded-xl border border-gray-200 p-4 overflow-x-auto">
// // // //                 <SeatTable
// // // //                   seats={filteredSeats}
// // // //                   preferences={preferences}
// // // //                   selected={selected}
// // // //                   isAllSelected={isAllSelected}
// // // //                   isIndeterminate={isIndeterminate}
// // // //                   onToggleSelect={toggleSelect}
// // // //                   onSelectAll={selectAll}
// // // //                   onClearSelection={clearSelection}
// // // //                   onEditSeat={openEditPanel}
// // // //                   onBulkEdit={openBulkEdit}
// // // //                 />
// // // //               </div>
// // // //             )}
// // // //           </div>

// // // //           {/* Right: edit sidebar — sticky only within this row */}
// // // //           {panelOpen && (
// // // //             <div className="w-[340px] flex-shrink-0 sticky top-[73px] self-start max-h-[calc(100vh-90px)] overflow-y-auto">
// // // //               <EditSeatPanel
// // // //                 seat={editingSeat}
// // // //                 preferences={preferences}
// // // //                 onSave={saveSeat}
// // // //                 onClose={closeEditPanel}
// // // //               />
// // // //             </div>
// // // //           )}
// // // //         </div>

// // // //       </main>

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
// // //     seats,
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
// // //           <button onClick={() => router.back()} className="text-xs text-indigo-600 underline">
// // //             Go back
// // //           </button>
// // //         </div>
// // //       </div>
// // //     );
// // //   }

// // //   const panelOpen = !!editingSeat;

// // //   return (
// // //     // Full viewport height, no overflow on the outer shell
// // //     <div className="flex flex-col h-screen bg-[#F8F8FC]">

// // //       {/* Header — fixed height, never scrolls */}
// // //       <div className="flex-shrink-0 z-10 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
// // //         <div>
// // //           <h1 className="text-xl font-bold text-gray-900 leading-none">Manage Seats</h1>
// // //           <p className="text-xs text-gray-400 mt-0.5">
// // //             Configure seat details, settings and amenities for this layout
// // //           </p>
// // //         </div>
// // //         <div className="flex items-center gap-2">
// // //           <button
// // //             onClick={() => router.back()}
// // //             className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium border border-gray-200 bg-white text-gray-500 rounded-lg hover:bg-gray-50 hover:text-gray-700 transition-colors"
// // //           >
// // //             <ArrowLeft size={14} />
// // //             Back to Layout
// // //           </button>
// // //           <button className="flex items-center gap-2 px-4 py-2 text-xs font-semibold border border-gray-200 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
// // //             <MoreHorizontal size={14} />
// // //             More Actions
// // //           </button>
// // //         </div>
// // //       </div>

// // //       {/* Everything below the header scrolls as one outer column */}
// // //       <div className="flex-1 overflow-y-auto px-6 pt-5 pb-6 flex flex-col gap-5 min-h-0">

// // //         {/* Stat cards — scrolls with page */}
// // //         <div className="flex-shrink-0">
// // //           <LayoutStatCards stats={stats} loading={statsLoading} />
// // //         </div>

// // //         {/* Filters + view toggle — scrolls with page */}
// // //         <div className="flex-shrink-0 flex items-end justify-between gap-4 flex-wrap">
// // //           <SeatFiltersBar
// // //             filters={filters}
// // //             seatTypes={seatTypes.filter((type): type is string => type !== null)}
// // //             preferences={preferences}
// // //             onUpdate={updateFilter}
// // //             onReset={resetFilters}
// // //           />
// // //           <ViewToggle view={view} onChange={setView} />
// // //         </div>

// // //         {/* Table/map + sidebar row — fills remaining height, each column scrolls independently */}
// // //         <div className="flex gap-5 items-start flex-1 min-h-0">

// // //           {/* Left: table or map — scrolls independently */}
// // //           <div className="flex-1 min-w-0 h-full overflow-y-auto">
// // //             {view === "map" ? (
// // //               <div className="bg-white rounded-xl border border-gray-200 p-4">
// // //                 <LayoutPreview
// // //                   layout={layout}
// // //                   canvasHeight={420}
// // //                   seats={seats}
// // //                   preferences={preferences}
// // //                   onSeatSave={saveSeat}
// // //                   filteredSeats={filteredSeats}
// // //                 />
// // //               </div>
// // //             ) : (
// // //               <div className="bg-white rounded-xl border border-gray-200 p-4">
// // //                 <SeatTable
// // //                   seats={filteredSeats}
// // //                   preferences={preferences}
// // //                   selected={selected}
// // //                   isAllSelected={isAllSelected}
// // //                   isIndeterminate={isIndeterminate}
// // //                   onToggleSelect={toggleSelect}
// // //                   onSelectAll={selectAll}
// // //                   onClearSelection={clearSelection}
// // //                   onEditSeat={openEditPanel}
// // //                   onBulkEdit={openBulkEdit}
// // //                 />
// // //               </div>
// // //             )}
// // //           </div>

// // //           {/* Right: edit sidebar — scrolls independently, never moves */}
// // //           {panelOpen && (
// // //             <div className="w-[340px] flex-shrink-0 h-full overflow-y-auto">
// // //               <EditSeatPanel
// // //                 seat={editingSeat}
// // //                 preferences={preferences}
// // //                 onSave={saveSeat}
// // //                 onClose={closeEditPanel}
// // //               />
// // //             </div>
// // //           )}

// // //         </div>
// // //       </div>

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
// //     seats,
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
// //           <button onClick={() => router.back()} className="text-xs text-indigo-600 underline">
// //             Go back
// //           </button>
// //         </div>
// //       </div>
// //     );
// //   }

// //   const panelOpen = !!editingSeat;

// //   return (
// //     <div className="flex flex-col h-screen bg-[#F8F8FC]">

// //       {/* Header — fixed height, never scrolls */}
// //       <div className="flex-shrink-0 z-10 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
// //         <div>
// //           <h1 className="text-xl font-bold text-gray-900 leading-none">Manage Seats</h1>
// //           <p className="text-xs text-gray-400 mt-0.5">
// //             Configure seat details, settings and amenities for this layout
// //           </p>
// //         </div>
// //         <div className="flex items-center gap-2">
// //           <button
// //             onClick={() => router.back()}
// //             className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium border border-gray-200 bg-white text-gray-500 rounded-lg hover:bg-gray-50 hover:text-gray-700 transition-colors"
// //           >
// //             <ArrowLeft size={14} />
// //             Back to Layout
// //           </button>
// //           <button className="flex items-center gap-2 px-4 py-2 text-xs font-semibold border border-gray-200 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
// //             <MoreHorizontal size={14} />
// //             More Actions
// //           </button>
// //         </div>
// //       </div>

// //       {/* Body — fills remaining height, NO page-level overflow */}
// //       <div className="flex-1 min-h-0 flex flex-col px-6 pt-5 pb-6 gap-5">

// //         {/* Stat cards */}
// //         <div className="flex-shrink-0">
// //           <LayoutStatCards stats={stats} loading={statsLoading} />
// //         </div>

// //         {/* Filters + view toggle */}
// //         <div className="flex-shrink-0 flex items-end justify-between gap-4 flex-wrap">
// //           <SeatFiltersBar
// //             filters={filters}
// //             seatTypes={seatTypes.filter((type): type is string => type !== null)}
// //             preferences={preferences}
// //             onUpdate={updateFilter}
// //             onReset={resetFilters}
// //           />
// //           <ViewToggle view={view} onChange={setView} />
// //         </div>

// //         {/* Table + sidebar row — fills ALL remaining height */}
// //         <div className="flex gap-5 flex-1 min-h-0">

// //           {/* Left: table or map — same height as sidebar, scrolls only inside */}
// //           <div className="flex-1 min-w-0 min-h-0 bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col">
// //             <div className="flex-1 min-h-0 overflow-y-auto p-4">
// //               {view === "map" ? (
// //                 <LayoutPreview
// //                   layout={layout}
// //                   canvasHeight={420}
// //                   seats={seats}
// //                   preferences={preferences}
// //                   onSeatSave={saveSeat}
// //                   filteredSeats={filteredSeats}
// //                 />
// //               ) : (
// //                 <SeatTable
// //                   seats={filteredSeats}
// //                   preferences={preferences}
// //                   selected={selected}
// //                   isAllSelected={isAllSelected}
// //                   isIndeterminate={isIndeterminate}
// //                   onToggleSelect={toggleSelect}
// //                   onSelectAll={selectAll}
// //                   onClearSelection={clearSelection}
// //                   onEditSeat={openEditPanel}
// //                   onBulkEdit={openBulkEdit}
// //                 />
// //               )}
// //             </div>
// //           </div>

// //           {/* Right: edit panel — same height as table, scrolls only inside */}
// //           {panelOpen && (
// //             <div className="w-[340px] flex-shrink-0 min-h-0 bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col">
// //               <div className="flex-1 min-h-0 overflow-y-auto">
// //                 <EditSeatPanel
// //                   seat={editingSeat}
// //                   preferences={preferences}
// //                   onSave={saveSeat}
// //                   onClose={closeEditPanel}
// //                 />
// //               </div>
// //             </div>
// //           )}

// //         </div>
// //       </div>

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
// import { useRef, useLayoutEffect, useState } from "react";

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
//   const panelRef = useRef<HTMLDivElement>(null);
//   const [tableHeight, setTableHeight] = useState<number | undefined>(undefined);

//   const {
//     layout,
//     layoutLoading,
//     layoutError,
//     stats,
//     statsLoading,
//     seats,
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

//   const panelOpen = !!editingSeat;

//   // After every render, sync the table height to the panel's natural height
//   useLayoutEffect(() => {
//     if (panelOpen && panelRef.current) {
//       setTableHeight(panelRef.current.offsetHeight);
//     } else {
//       setTableHeight(undefined);
//     }
//   });

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
//           <button onClick={() => router.back()} className="text-xs text-indigo-600 underline">
//             Go back
//           </button>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="flex flex-col h-screen bg-[#F8F8FC]">

//       {/* Header */}
//       <div className="flex-shrink-0 z-10 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
//         <div>
//           <h1 className="text-xl font-bold text-gray-900 leading-none">Manage Seats</h1>
//           <p className="text-xs text-gray-400 mt-0.5">
//             Configure seat details, settings and amenities for this layout
//           </p>
//         </div>
//         <div className="flex items-center gap-2">
//           <button
//             onClick={() => router.back()}
//             className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium border border-gray-200 bg-white text-gray-500 rounded-lg hover:bg-gray-50 hover:text-gray-700 transition-colors"
//           >
//             <ArrowLeft size={14} />
//             Back to Layout
//           </button>
//           <button className="flex items-center gap-2 px-4 py-2 text-xs font-semibold border border-gray-200 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
//             <MoreHorizontal size={14} />
//             More Actions
//           </button>
//         </div>
//       </div>

//       {/* Scrollable page body */}
//       <div className="flex-1 overflow-y-auto px-6 pt-5 pb-6 flex flex-col gap-5">

//         {/* Stat cards */}
//         <div className="flex-shrink-0">
//           <LayoutStatCards stats={stats} loading={statsLoading} />
//         </div>

//         {/* Filters + view toggle */}
//         <div className="flex-shrink-0 flex items-end justify-between gap-4 flex-wrap">
//           <SeatFiltersBar
//             filters={filters}
//             seatTypes={seatTypes.filter((type): type is string => type !== null)}
//             preferences={preferences}
//             onUpdate={updateFilter}
//             onReset={resetFilters}
//           />
//           <ViewToggle view={view} onChange={setView} />
//         </div>

//         {/* Table + sidebar */}
//         <div className="flex gap-5 items-start">

//           {/* Left: table — height locked to panel's natural height, scrolls inside */}
//           <div
//             className="flex-1 min-w-0 bg-white rounded-xl border border-gray-200 flex flex-col overflow-hidden"
//             style={{ height: tableHeight ?? "auto" }}
//           >
//             <div className="flex-1 overflow-y-auto p-4">
//               {view === "map" ? (
//                 <LayoutPreview
//                   layout={layout}
//                   canvasHeight={420}
//                   seats={seats}
//                   preferences={preferences}
//                   onSeatSave={saveSeat}
//                   filteredSeats={filteredSeats}
//                 />
//               ) : (
//                 <SeatTable
//                   seats={filteredSeats}
//                   preferences={preferences}
//                   selected={selected}
//                   isAllSelected={isAllSelected}
//                   isIndeterminate={isIndeterminate}
//                   onToggleSelect={toggleSelect}
//                   onSelectAll={selectAll}
//                   onClearSelection={clearSelection}
//                   onEditSeat={openEditPanel}
//                   onBulkEdit={openBulkEdit}
//                 />
//               )}
//             </div>
//           </div>

//           {/* Right: edit panel — fully unwrapped, natural height, no scroll */}
//           {panelOpen && (
//             <div
//               ref={panelRef}
//               className="w-[340px] flex-shrink-0 bg-white rounded-xl border border-gray-200"
//             >
//               <EditSeatPanel
//                 seat={editingSeat}
//                 preferences={preferences}
//                 onSave={saveSeat}
//                 onClose={closeEditPanel}
//               />
//             </div>
//           )}

//         </div>
//       </div>

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
import { useRef, useLayoutEffect, useState } from "react";

import LayoutPreview   from "@/features/managelayout/components/LayoutPreview";
import SeatFiltersBar  from "@/features/managelayout1/components/SeatFiltersBar";
import SeatTable       from "@/features/managelayout1/components/SeatTable";
import EditSeatPanel   from "@/features/managelayout1/components/EditSeatPanel";
import BulkEditModal   from "@/features/managelayout1/components/BulkEditModal";
import ViewToggle      from "@/features/managelayout1/components/ViewToggle";
import { useManageSeats } from "@/features/managelayout1/hooks/Usemanageseats";
import LayoutStatCards from "@/features/managelayout/components/Layoutstatcards";
import { usePublishLayout } from "@/features/managelayout/hooks/useLayoutDetails";

export default function ManageSeatsPage() {
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);
  const [tableHeight, setTableHeight] = useState<number | undefined>(undefined);
  const [isMobile, setIsMobile] = useState(false);

  const {
    layout,
    layoutLoading,
    layoutError,
     siteId,
  buildingId,
  floorId,
  layoutId,
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
  publishError,
  canPublish,
  allConfigured,
  publishLayout,
} = usePublishLayout(
  layout,
  stats,
   () => {
    // router.push("/admin/layouts");
     router.push(
      `/admin/layouts?siteId=${siteId}&buildingId=${buildingId}&floorId=${floorId}&layoutId=${layout?.layout_id}`
    );
  }
);
  const panelOpen = !!editingSeat;

  // Detect mobile breakpoint
  useLayoutEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    setIsMobile(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Sync table height to panel's natural height — only on desktop side-by-side layout
  useLayoutEffect(() => {
    if (!isMobile && panelOpen && panelRef.current) {
      setTableHeight(panelRef.current.offsetHeight);
    } else {
      setTableHeight(undefined);
    }
  });

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

  return (
    <div className="flex flex-col h-screen bg-[#F8F8FC]">

      {/* Header */}
      <div className="flex-shrink-0 z-10 bg-white border-b border-gray-200 px-4 lg:px-6 py-3 lg:py-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-base lg:text-xl font-bold text-gray-900 leading-none truncate">
            Manage Seats
          </h1>
          <p className="text-xs text-gray-400 mt-0.5 hidden sm:block">
            Configure seat details, settings and amenities for this layout
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 px-3 lg:px-4 py-2 text-xs font-medium border border-gray-200 bg-white text-gray-500 rounded-lg hover:bg-gray-50 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft size={14} />
            <span className="hidden sm:inline">Back to Layout</span>
          </button>
          {/* <button className="flex items-center gap-2 px-3 lg:px-4 py-2 text-xs font-semibold border border-gray-200 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
            <MoreHorizontal size={14} />
            <span className="hidden sm:inline">More Actions</span>
          </button> */}
          <button
  onClick={publishLayout}
  disabled={!canPublish || publishing}
  title={
    !allConfigured
      ? `Configure all seats before publishing`
      : undefined
  }
  className="flex items-center gap-2 px-3 lg:px-4 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
>
  {publishing ? (
    <>
      <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
      Publishing...
    </>
  ) : (
    <>
      
      <span className="hidden sm:inline">Publish Layout</span>
    </>
  )}
</button>
        </div>
      </div>

      {/* Scrollable page body */}
      <div className="flex-1 overflow-y-auto px-4 lg:px-6 pt-4 lg:pt-5 pb-6 flex flex-col gap-4 lg:gap-5">

        {/* Stat cards */}
        <div className="flex-shrink-0">
          <LayoutStatCards stats={stats} loading={statsLoading} />
        </div>

        {/* Filters + view toggle */}
        <div className="flex-shrink-0 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
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

        {/* Table + sidebar
            — Desktop (lg+): side by side, table height locked to panel
            — Mobile/tablet (<lg): stacked, panel slides below table
        */}
        <div className="flex flex-col lg:flex-row lg:items-start gap-4 lg:gap-5">

          {/* Table */}
          <div
            className="w-full lg:flex-1 lg:min-w-0 bg-white rounded-xl border border-gray-200 flex flex-col overflow-hidden"
            style={{ height: tableHeight ?? "auto" }}
          >
            <div className="flex-1 overflow-y-auto p-3 lg:p-4">
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

          {/* Edit panel
              — Desktop: fixed 340px beside the table
              — Mobile/tablet: full width below the table
          */}
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
      </div>

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