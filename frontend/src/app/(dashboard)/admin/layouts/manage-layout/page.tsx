// // // // // "use client";

// // // // // import { useEffect } from "react";
// // // // // import { useSearchParams } from "next/navigation";

// // // // // import {
// // // // //   useCascadeLocation,
// // // // //   useFloorLayouts,
// // // // //   useLayoutSeatStats,
// // // // // } from "@/features/managelayout/hooks/useLayoutDetails";
// // // // // import { useSeatsStore } from "@/store/seatStore";

// // // // // import LayoutPreview      from "@/features/managelayout/components/LayoutPreview";
// // // // // import LayoutSidebar      from "@/features/managelayout/components/LayoutSidebar";
// // // // // import ManageLayoutHeader from "@/features/managelayout/components/ManageLayoutHeader";
// // // // // import LayoutFilters      from "@/features/managelayout/components/LayoutFilters";
// // // // // import AdminTopbar        from "@/features/admin/components/AdminTopbar";
// // // // // import LayoutStatCards    from "@/features/managelayout/components/Layoutstatcards";

// // // // // export default function ManageLayoutPage() {
// // // // //   const params = useSearchParams();

// // // // //   const initialSiteId     = params.get("siteId")     ?? "";
// // // // //   const initialBuildingId = params.get("buildingId") ?? "";
// // // // //   const initialFloorId    = params.get("floorId")    ?? "";
// // // // //   const initialLayoutId   = params.get("layoutId")   ?? "";

// // // // //   const {
// // // // //     sites, buildings, floors,
// // // // //     selectedSiteId, selectedBuildingId, selectedFloorId,
// // // // //     setSelectedSiteId, setSelectedBuildingId, setSelectedFloorId,
// // // // //     loadingSites, loadingBuildings, loadingFloors,
// // // // //   } = useCascadeLocation({ initialSiteId, initialBuildingId, initialFloorId });

// // // // //   const {
// // // // //     layouts, selectedLayoutId, selectedLayout,
// // // // //     setSelectedLayoutId, loading: loadingLayouts,
// // // // //   } = useFloorLayouts(selectedFloorId, { initialLayoutId });

// // // // //   const { stats: seatStats, loading: loadingStats } = useLayoutSeatStats(
// // // // //     selectedLayout?.layout_id ?? null
// // // // //   );

// // // // //   // ── Zustand store ──────────────────────────────────────────────────────
// // // // //   const { seats, stats, fetchSeats } = useSeatsStore();

// // // // //   // ── Fetch seats when layout changes ───────────────────────────────────
// // // // //   useEffect(() => {
// // // // //     if (selectedLayout?.layout_id) {
// // // // //       fetchSeats(selectedLayout.layout_id);
// // // // //     }
// // // // //   }, [selectedLayout?.layout_id]);

// // // // //   return (
// // // // //     <div className="flex h-screen w-full">
// // // // //       <div className="flex flex-col flex-1 min-w-0">

// // // // //         <AdminTopbar />

// // // // //         <main className="flex-1 bg-gray-50 p-6 space-y-5 overflow-y-auto">

// // // // //           <ManageLayoutHeader layout={selectedLayout} />

// // // // //           <LayoutFilters
// // // // //             sites={sites}
// // // // //             buildings={buildings}
// // // // //             floors={floors}
// // // // //             layouts={layouts}
// // // // //             selectedSiteId={selectedSiteId}
// // // // //             selectedBuildingId={selectedBuildingId}
// // // // //             selectedFloorId={selectedFloorId}
// // // // //             selectedLayoutId={selectedLayoutId}
// // // // //             onSiteChange={setSelectedSiteId}
// // // // //             onBuildingChange={setSelectedBuildingId}
// // // // //             onFloorChange={setSelectedFloorId}
// // // // //             onLayoutChange={setSelectedLayoutId}
// // // // //             loadingSites={loadingSites}
// // // // //             loadingBuildings={loadingBuildings}
// // // // //             loadingFloors={loadingFloors}
// // // // //             loadingLayouts={loadingLayouts}
// // // // //           />

// // // // //           {/* ✅ Uses stats from Zustand so it updates instantly after seat save */}
// // // // //           <LayoutStatCards stats={stats ?? seatStats} loading={loadingStats} />

// // // // //           <div className="flex gap-6 w-full items-start">

// // // // //             <div className="flex-1 min-w-0">
// // // // //               {/* ✅ seats from Zustand — updates instantly when ManageSeatsPage saves */}
// // // // //               {/* ✅ no onSeatSave — read-only, no dialog */}
// // // // //               <LayoutPreview
// // // // //                 layout={selectedLayout}
// // // // //                 seats={seats}
// // // // //               />
// // // // //             </div>

// // // // //             <div className="w-[300px] flex-shrink-0">
// // // // //               <LayoutSidebar
// // // // //                 layout={selectedLayout}
// // // // //                 selectedLayoutId={selectedLayoutId}
// // // // //                 selectedFloorId={selectedFloorId}
// // // // //                 selectedBuildingId={selectedBuildingId}
// // // // //                 selectedSiteId={selectedSiteId}
// // // // //               />
// // // // //             </div>

// // // // //           </div>

// // // // //         </main>
// // // // //       </div>
// // // // //     </div>
// // // // //   );
// // // // // }

// // // // "use client";

// // // // import { useEffect } from "react";
// // // // import { useSearchParams } from "next/navigation";

// // // // import {
// // // //   useCascadeLocation,
// // // //   useFloorLayouts,
// // // //   useLayoutSeatStats,
// // // //   usePublishLayout,
// // // // } from "@/features/managelayout/hooks/useLayoutDetails";
// // // // import { useSeatsStore } from "@/store/seatStore";

// // // // import LayoutPreview      from "@/features/managelayout/components/LayoutPreview";
// // // // import LayoutSidebar      from "@/features/managelayout/components/LayoutSidebar";
// // // // import ManageLayoutHeader from "@/features/managelayout/components/ManageLayoutHeader";
// // // // import LayoutFilters      from "@/features/managelayout/components/LayoutFilters";
// // // // import AdminTopbar        from "@/features/admin/components/AdminTopbar";
// // // // import LayoutStatCards    from "@/features/managelayout/components/Layoutstatcards";

// // // // export default function ManageLayoutPage() {
// // // //   const params = useSearchParams();

// // // //   const initialSiteId     = params.get("siteId")     ?? "";
// // // //   const initialBuildingId = params.get("buildingId") ?? "";
// // // //   const initialFloorId    = params.get("floorId")    ?? "";
// // // //   const initialLayoutId   = params.get("layoutId")   ?? "";

// // // //   const {
// // // //     sites, buildings, floors,
// // // //     selectedSiteId, selectedBuildingId, selectedFloorId,
// // // //     setSelectedSiteId, setSelectedBuildingId, setSelectedFloorId,
// // // //     loadingSites, loadingBuildings, loadingFloors,
// // // //   } = useCascadeLocation({ initialSiteId, initialBuildingId, initialFloorId });

// // // //   const {
// // // //     layouts, selectedLayoutId, selectedLayout,
// // // //     setSelectedLayoutId, setSelectedLayout, loading: loadingLayouts,
// // // //   } = useFloorLayouts(selectedFloorId, { initialLayoutId });

// // // //   const { stats: seatStats, loading: loadingStats } = useLayoutSeatStats(
// // // //     selectedLayout?.layout_id ?? null
// // // //   );

// // // //   const { seats, stats, fetchSeats } = useSeatsStore();

// // // //   const effectiveStats = stats ?? seatStats;

// // // //   const { publishing, publishError, canPublish, allConfigured, publishLayout } =
// // // //     usePublishLayout(
// // // //       selectedLayout,
// // // //       effectiveStats,
// // // //       (updated) => setSelectedLayout(updated),
// // // //     );

// // // //   useEffect(() => {
// // // //     if (selectedLayout?.layout_id) {
// // // //       fetchSeats(selectedLayout.layout_id);
// // // //     }
// // // //   }, [selectedLayout?.layout_id]);

// // // //   return (
// // // //     <div className="flex h-screen w-full">
// // // //       <div className="flex flex-col flex-1 min-w-0">

// // // //         <AdminTopbar />

// // // //         <main className="flex-1 bg-gray-50 p-6 space-y-5 overflow-y-auto">

// // // //           <ManageLayoutHeader
// // // //             layout={selectedLayout}
// // // //             stats={effectiveStats}
// // // //             canPublish={canPublish}
// // // //             allConfigured={allConfigured}
// // // //             onPublish={publishLayout}
// // // //             publishing={publishing}
// // // //             publishError={publishError}
// // // //           />

// // // //           <LayoutFilters
// // // //             sites={sites}
// // // //             buildings={buildings}
// // // //             floors={floors}
// // // //             layouts={layouts}
// // // //             selectedSiteId={selectedSiteId}
// // // //             selectedBuildingId={selectedBuildingId}
// // // //             selectedFloorId={selectedFloorId}
// // // //             selectedLayoutId={selectedLayoutId}
// // // //             onSiteChange={setSelectedSiteId}
// // // //             onBuildingChange={setSelectedBuildingId}
// // // //             onFloorChange={setSelectedFloorId}
// // // //             onLayoutChange={setSelectedLayoutId}
// // // //             loadingSites={loadingSites}
// // // //             loadingBuildings={loadingBuildings}
// // // //             loadingFloors={loadingFloors}
// // // //             loadingLayouts={loadingLayouts}
// // // //           />

// // // //           <LayoutStatCards stats={effectiveStats} loading={loadingStats} />

// // // //           <div className="flex gap-6 w-full items-start">

// // // //             <div className="flex-1 min-w-0">
// // // //               <LayoutPreview
// // // //                 layout={selectedLayout}
// // // //                 seats={seats}
// // // //               />
// // // //             </div>

// // // //             <div className="w-[300px] flex-shrink-0">
// // // //               <LayoutSidebar
// // // //                 layout={selectedLayout}
// // // //                 selectedLayoutId={selectedLayoutId}
// // // //                 selectedFloorId={selectedFloorId}
// // // //                 selectedBuildingId={selectedBuildingId}
// // // //                 selectedSiteId={selectedSiteId}
// // // //               />
// // // //             </div>

// // // //           </div>

// // // //         </main>
// // // //       </div>
// // // //     </div>
// // // //   );
// // // // }

// // // "use client";

// // // import { useEffect } from "react";
// // // import { useSearchParams } from "next/navigation";

// // // import {
// // //   useCascadeLocation,
// // //   useFloorLayouts,
// // //   useLayoutSeatStats,
// // //   usePublishLayout,
// // // } from "@/features/managelayout/hooks/useLayoutDetails";
// // // import { useSeatsStore } from "@/store/seatStore";

// // // import LayoutPreview      from "@/features/managelayout/components/LayoutPreview";
// // // import LayoutSidebar      from "@/features/managelayout/components/LayoutSidebar";
// // // import ManageLayoutHeader from "@/features/managelayout/components/ManageLayoutHeader";
// // // import LayoutFilters      from "@/features/managelayout/components/LayoutFilters";
// // // import AdminTopbar        from "@/features/admin/components/AdminTopbar";
// // // import LayoutStatCards    from "@/features/managelayout/components/Layoutstatcards";

// // // export default function ManageLayoutPage() {
// // //   const params = useSearchParams();

// // //   const initialSiteId     = params.get("siteId")     ?? "";
// // //   const initialBuildingId = params.get("buildingId") ?? "";
// // //   const initialFloorId    = params.get("floorId")    ?? "";
// // //   const initialLayoutId   = params.get("layoutId")   ?? "";

// // //   const {
// // //     sites, buildings, floors,
// // //     selectedSiteId, selectedBuildingId, selectedFloorId,
// // //     setSelectedSiteId, setSelectedBuildingId, setSelectedFloorId,
// // //     loadingSites, loadingBuildings, loadingFloors,
// // //   } = useCascadeLocation({ initialSiteId, initialBuildingId, initialFloorId });

// // //   const {
// // //     layouts, selectedLayoutId, selectedLayout,
// // //     setSelectedLayoutId, setSelectedLayout,
// // //     patchLayout,                              // ← destructure new
// // //     loading: loadingLayouts,
// // //   } = useFloorLayouts(selectedFloorId, { initialLayoutId });

// // //   const { stats: seatStats, loading: loadingStats } = useLayoutSeatStats(
// // //     selectedLayout?.layout_id ?? null
// // //   );

// // //   const { seats, stats, fetchSeats } = useSeatsStore();

// // //   const effectiveStats = stats ?? seatStats;

// // //   const { publishing, publishError, canPublish, allConfigured, publishLayout } =
// // //     usePublishLayout(
// // //       selectedLayout,
// // //       effectiveStats,
// // //       (updated) => patchLayout(updated),      // ← was setSelectedLayout(updated)
// // //     );

// // //   useEffect(() => {
// // //     if (selectedLayout?.layout_id) {
// // //       fetchSeats(selectedLayout.layout_id);
// // //     }
// // //   }, [selectedLayout?.layout_id]);

// // //   return (
// // //     <div className="flex h-screen w-full">
// // //       <div className="flex flex-col flex-1 min-w-0">

// // //         <AdminTopbar />

// // //         <main className="flex-1 bg-gray-50 p-6 space-y-5 overflow-y-auto">

// // //           <ManageLayoutHeader
// // //             layout={selectedLayout}
// // //             stats={effectiveStats}
// // //             canPublish={canPublish}
// // //             allConfigured={allConfigured}
// // //             onPublish={publishLayout}
// // //             publishing={publishing}
// // //             publishError={publishError}
// // //           />

// // //           <LayoutFilters
// // //             sites={sites}
// // //             buildings={buildings}
// // //             floors={floors}
// // //             layouts={layouts}
// // //             selectedSiteId={selectedSiteId}
// // //             selectedBuildingId={selectedBuildingId}
// // //             selectedFloorId={selectedFloorId}
// // //             selectedLayoutId={selectedLayoutId}
// // //             onSiteChange={setSelectedSiteId}
// // //             onBuildingChange={setSelectedBuildingId}
// // //             onFloorChange={setSelectedFloorId}
// // //             onLayoutChange={setSelectedLayoutId}
// // //             loadingSites={loadingSites}
// // //             loadingBuildings={loadingBuildings}
// // //             loadingFloors={loadingFloors}
// // //             loadingLayouts={loadingLayouts}
// // //           />

// // //           <LayoutStatCards stats={effectiveStats} loading={loadingStats} />

// // //           <div className="flex gap-6 w-full items-start">

// // //             <div className="flex-1 min-w-0">
// // //               <LayoutPreview
// // //                 layout={selectedLayout}
// // //                 seats={seats}
// // //               />
// // //             </div>

// // //             <div className="w-[300px] flex-shrink-0">
// // //               <LayoutSidebar
// // //                 layout={selectedLayout}
// // //                 selectedLayoutId={selectedLayoutId}
// // //                 selectedFloorId={selectedFloorId}
// // //                 selectedBuildingId={selectedBuildingId}
// // //                 selectedSiteId={selectedSiteId}
// // //               />
// // //             </div>

// // //           </div>

// // //         </main>
// // //       </div>
// // //     </div>
// // //   );
// // // }

// // "use client";

// // import { useEffect } from "react";
// // import { useSearchParams } from "next/navigation";

// // import {
// //   useCascadeLocation,
// //   useFloorLayouts,
// //   useLayoutSeatStats,
// //   usePublishLayout,
// // } from "@/features/managelayout/hooks/useLayoutDetails";
// // import { useSeatsStore } from "@/store/seatStore";

// // import LayoutPreview      from "@/features/managelayout/components/LayoutPreview";
// // import LayoutSidebar      from "@/features/managelayout/components/LayoutSidebar";
// // import ManageLayoutHeader from "@/features/managelayout/components/ManageLayoutHeader";
// // import LayoutFilters      from "@/features/managelayout/components/LayoutFilters";
// // import AdminTopbar        from "@/features/admin/components/AdminTopbar";
// // import LayoutStatCards    from "@/features/managelayout/components/Layoutstatcards";

// // export default function ManageLayoutPage() {
// //   const params = useSearchParams();

// //   const initialSiteId     = params.get("siteId")     ?? "";
// //   const initialBuildingId = params.get("buildingId") ?? "";
// //   const initialFloorId    = params.get("floorId")    ?? "";
// //   const initialLayoutId   = params.get("layoutId")   ?? "";

// //   const {
// //     sites, buildings, floors,
// //     selectedSiteId, selectedBuildingId, selectedFloorId,
// //     setSelectedSiteId, setSelectedBuildingId, setSelectedFloorId,
// //     loadingSites, loadingBuildings, loadingFloors,
// //   } = useCascadeLocation({ initialSiteId, initialBuildingId, initialFloorId });

// //   const {
// //     layouts, selectedLayoutId, selectedLayout,
// //     setSelectedLayoutId, setSelectedLayout,
// //     patchLayout,
// //     patchAllLayouts,   // ← add this
// //     loading: loadingLayouts,
// //   } = useFloorLayouts(selectedFloorId, { initialLayoutId });

// //   const { stats: seatStats, loading: loadingStats } = useLayoutSeatStats(
// //     selectedLayout?.layout_id ?? null
// //   );

// //   const { seats, stats, fetchSeats } = useSeatsStore();

// //   const effectiveStats = stats ?? seatStats;

// //   // const { publishing, publishError, canPublish, allConfigured, publishLayout } =
// //   //   usePublishLayout(
// //   //     selectedLayout,
// //   //     effectiveStats,
// //   //     (updated) => patchLayout(updated),
// //   //     patchAllLayouts,   // ← add this
// //   //   );

// //   const { publishing, publishError, canPublish, allConfigured, publishLayout } =
// //   usePublishLayout(
// //     selectedLayout,
// //     effectiveStats,
// //     (updated) => patchLayout(updated),
// //     patchAllLayouts,
// //   );

// //   useEffect(() => {
// //     if (selectedLayout?.layout_id) {
// //       fetchSeats(selectedLayout.layout_id);
// //     }
// //   }, [selectedLayout?.layout_id]);

// //   return (
// //     <div className="flex h-screen w-full">
// //       <div className="flex flex-col flex-1 min-w-0">

// //         <AdminTopbar />

// //         <main className="flex-1 bg-gray-50 p-6 space-y-5 overflow-y-auto">

// //           <ManageLayoutHeader
// //             layout={selectedLayout}
// //             stats={effectiveStats}
// //             canPublish={canPublish}
// //             allConfigured={allConfigured}
// //             onPublish={publishLayout}
// //             publishing={publishing}
// //             publishError={publishError}
// //           />

// //           <LayoutFilters
// //             sites={sites}
// //             buildings={buildings}
// //             floors={floors}
// //             layouts={layouts}
// //             selectedSiteId={selectedSiteId}
// //             selectedBuildingId={selectedBuildingId}
// //             selectedFloorId={selectedFloorId}
// //             selectedLayoutId={selectedLayoutId}
// //             onSiteChange={setSelectedSiteId}
// //             onBuildingChange={setSelectedBuildingId}
// //             onFloorChange={setSelectedFloorId}
// //             onLayoutChange={setSelectedLayoutId}
// //             loadingSites={loadingSites}
// //             loadingBuildings={loadingBuildings}
// //             loadingFloors={loadingFloors}
// //             loadingLayouts={loadingLayouts}
// //           />

// //           <LayoutStatCards stats={effectiveStats} loading={loadingStats} />

// //           <div className="flex gap-6 w-full items-start">

// //             <div className="flex-1 min-w-0">
// //               {/* <LayoutPreview
// //                 layout={selectedLayout}
// //                 seats={seats}
// //               /> */}
// //               <LayoutPreview
// //   layout={selectedLayout}
// //   seats={seats}
// //   onSeatSave={async (payload) => {
// //     // your existing seat save logic
// //     //markDirty();  // ← mark layout as edited
// //   }}
// // />
// //             </div>

// //             <div className="w-[300px] flex-shrink-0">
// //               <LayoutSidebar
// //                 layout={selectedLayout}
// //                 selectedLayoutId={selectedLayoutId}
// //                 selectedFloorId={selectedFloorId}
// //                 selectedBuildingId={selectedBuildingId}
// //                 selectedSiteId={selectedSiteId}
// //               />
// //             </div>

// //           </div>

// //         </main>
// //       </div>
// //     </div>
// //   );
// // }


// "use client";

// import { useEffect } from "react";
// import { useSearchParams, useRouter } from "next/navigation";

// import {
//   useCascadeLocation,
//   useFloorLayouts,
//   useLayoutSeatStats,
//   usePublishLayout,
// } from "@/features/managelayout/hooks/useLayoutDetails";
// import { useSeatsStore } from "@/store/seatStore";

// import LayoutPreview      from "@/features/managelayout/components/LayoutPreview";
// import LayoutSidebar      from "@/features/managelayout/components/LayoutSidebar";
// import ManageLayoutHeader from "@/features/managelayout/components/ManageLayoutHeader";
// import LayoutFilters      from "@/features/managelayout/components/LayoutFilters";
// // import AdminTopbar        from "@/features/admin/components/AdminTopbar";
// import LayoutStatCards    from "@/features/managelayout/components/Layoutstatcards";

// export default function ManageLayoutPage() {
//   const params = useSearchParams();
//   const router = useRouter();

//   const initialSiteId     = params.get("siteId")     ?? "";
//   const initialBuildingId = params.get("buildingId") ?? "";
//   const initialFloorId    = params.get("floorId")    ?? "";
//   const initialLayoutId   = params.get("layoutId")   ?? "";

//   // ── helper: push all current selections into the URL ──────────────────
//   function syncUrl(overrides: {
//     siteId?:     string;
//     buildingId?: string;
//     floorId?:    string;
//     layoutId?:   string;
//   }) {
//     const next = new URLSearchParams({
//       siteId:     overrides.siteId     ?? selectedSiteId,
//       buildingId: overrides.buildingId ?? selectedBuildingId,
//       floorId:    overrides.floorId    ?? selectedFloorId,
//       layoutId:   overrides.layoutId   ?? selectedLayoutId,
//     });
//     router.replace(`?${next.toString()}`, { scroll: false });
//   }

//   const {
//     sites, buildings, floors,
//     selectedSiteId, selectedBuildingId, selectedFloorId,
//     setSelectedSiteId, setSelectedBuildingId, setSelectedFloorId,
//     loadingSites, loadingBuildings, loadingFloors,
//   } = useCascadeLocation({ initialSiteId, initialBuildingId, initialFloorId });

//   const {
//     layouts, selectedLayoutId, selectedLayout,
//     setSelectedLayoutId,
//     patchLayout,
//     patchAllLayouts,
//     loading: loadingLayouts,
//   } = useFloorLayouts(selectedFloorId, { initialLayoutId });

//   const { stats: seatStats, loading: loadingStats } = useLayoutSeatStats(
//     selectedLayout?.layout_id ?? null
//   );

//   const { seats, stats, fetchSeats } = useSeatsStore();

//   const effectiveStats = stats ?? seatStats;

//   const { publishing, publishError, canPublish, allConfigured, publishLayout } =
//     usePublishLayout(
//       selectedLayout,
//       effectiveStats,
//       (updated) => patchLayout(updated),
//       patchAllLayouts,
//     );

//   useEffect(() => {
//     if (selectedLayout?.layout_id) {
//       fetchSeats(selectedLayout.layout_id);
//     }
//   }, [selectedLayout?.layout_id]);

//   // ── sync URL whenever auto-selections settle (cascade picks first item) ─
//   useEffect(() => {
//     if (!selectedSiteId || !selectedBuildingId || !selectedFloorId || !selectedLayoutId) return;
//     const current = {
//       siteId:     params.get("siteId")     ?? "",
//       buildingId: params.get("buildingId") ?? "",
//       floorId:    params.get("floorId")    ?? "",
//       layoutId:   params.get("layoutId")   ?? "",
//     };
//     // Only push if something actually differs — avoids infinite loop
//     if (
//       current.siteId     !== selectedSiteId     ||
//       current.buildingId !== selectedBuildingId ||
//       current.floorId    !== selectedFloorId    ||
//       current.layoutId   !== selectedLayoutId
//     ) {
//       syncUrl({});
//     }
//   }, [selectedSiteId, selectedBuildingId, selectedFloorId, selectedLayoutId]);

//   // ── handlers that update state AND url together ────────────────────────
//   const handleSiteChange = (id: string) => {
//     setSelectedSiteId(id);
//     // building/floor/layout will cascade-reset; url synced by the effect above
//   };

//   const handleBuildingChange = (id: string) => {
//     setSelectedBuildingId(id);
//   };

//   const handleFloorChange = (id: string) => {
//     setSelectedFloorId(id);
//   };

//   const handleLayoutChange = (id: string) => {
//     setSelectedLayoutId(id);
//     syncUrl({ layoutId: id });   // sync immediately — no cascade delay here
//   };

//   return (
//     <div className="flex h-screen w-full">
//       <div className="flex flex-col flex-1 min-w-0">

//         {/* <AdminTopbar /> */}

//         <main className="flex-1 bg-gray-50 p-6 space-y-5 overflow-y-auto">

//           <ManageLayoutHeader
//             layout={selectedLayout}
//             stats={effectiveStats}
//             canPublish={canPublish}
//             allConfigured={allConfigured}
//             onPublish={publishLayout}
//             publishing={publishing}
//             publishError={publishError}
//           />

//           <LayoutFilters
//             sites={sites}
//             buildings={buildings}
//             floors={floors}
//             layouts={layouts}
//             selectedSiteId={selectedSiteId}
//             selectedBuildingId={selectedBuildingId}
//             selectedFloorId={selectedFloorId}
//             selectedLayoutId={selectedLayoutId}
//             onSiteChange={handleSiteChange}
//             onBuildingChange={handleBuildingChange}
//             onFloorChange={handleFloorChange}
//             onLayoutChange={handleLayoutChange}
//             loadingSites={loadingSites}
//             loadingBuildings={loadingBuildings}
//             loadingFloors={loadingFloors}
//             loadingLayouts={loadingLayouts}
//           />

//           <LayoutStatCards stats={effectiveStats} loading={loadingStats} />

//           <div className="flex gap-6 w-full items-start">

//             <div className="flex-1 min-w-0">
//               <LayoutPreview
//                 layout={selectedLayout}
//                 seats={seats}
//               />
//             </div>

//             <div className="w-[300px] flex-shrink-0">
//               <LayoutSidebar
//                 layout={selectedLayout}
//                 selectedLayoutId={selectedLayoutId}
//                 selectedFloorId={selectedFloorId}
//                 selectedBuildingId={selectedBuildingId}
//                 selectedSiteId={selectedSiteId}
//               />
//             </div>

//           </div>

//         </main>
//       </div>
//     </div>
//   );
// }

"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

import {
  useCascadeLocation,
  useFloorLayouts,
  useLayoutSeatStats,
  usePublishLayout,
} from "@/features/managelayout/hooks/useLayoutDetails";
import { useSeatsStore } from "@/store/seatStore";

import LayoutPreview      from "@/features/managelayout/components/LayoutPreview";
import LayoutSidebar      from "@/features/managelayout/components/LayoutSidebar";
import ManageLayoutHeader from "@/features/managelayout/components/ManageLayoutHeader";
import LayoutFilters      from "@/features/managelayout/components/LayoutFilters";
import LayoutStatCards    from "@/features/managelayout/components/Layoutstatcards";

export default function ManageLayoutPage() {
  const params = useSearchParams();
  const router = useRouter();

  const initialSiteId     = params.get("siteId")     ?? "";
  const initialBuildingId = params.get("buildingId") ?? "";
  const initialFloorId    = params.get("floorId")    ?? "";
  const initialLayoutId   = params.get("layoutId")   ?? "";

  // ── helper: push all current selections into the URL ──────────────────
  function syncUrl(overrides: {
    siteId?:     string;
    buildingId?: string;
    floorId?:    string;
    layoutId?:   string;
  }) {
    const next = new URLSearchParams();
    const s  = overrides.siteId     ?? selectedSiteId;
    const b  = overrides.buildingId ?? selectedBuildingId;
    const f  = overrides.floorId    ?? selectedFloorId;
    const l  = overrides.layoutId   ?? selectedLayoutId;
    if (s) next.set("siteId",     s);
    if (b) next.set("buildingId", b);
    if (f) next.set("floorId",    f);
    if (l) next.set("layoutId",   l);
    router.replace(`?${next.toString()}`, { scroll: false });
  }

  const {
    sites, buildings, floors,
    selectedSiteId, selectedBuildingId, selectedFloorId,
    setSelectedSiteId, setSelectedBuildingId, setSelectedFloorId,
    loadingSites, loadingBuildings, loadingFloors,
  } = useCascadeLocation({ initialSiteId, initialBuildingId, initialFloorId });

  const {
    layouts, selectedLayoutId, selectedLayout,
    setSelectedLayoutId,
    patchLayout,
    patchAllLayouts,
    loading: loadingLayouts,
  } = useFloorLayouts(selectedFloorId, { initialLayoutId });

  const { stats: seatStats, loading: loadingStats } = useLayoutSeatStats(
    selectedLayout?.layout_id ?? null
  );

  const { seats, stats, fetchSeats } = useSeatsStore();

  const effectiveStats = stats ?? seatStats;

  const { publishing, publishError, canPublish, allConfigured, publishLayout } =
    usePublishLayout(
      selectedLayout,
      effectiveStats,
      (updated) => patchLayout(updated),
      patchAllLayouts,
    );

  useEffect(() => {
    if (selectedLayout?.layout_id) {
      fetchSeats(selectedLayout.layout_id);
    }
  }, [selectedLayout?.layout_id]);

  // ── Sync URL whenever any selection changes ────────────────────────────
  // Runs on every change — guards against pushing identical URLs
  useEffect(() => {
    if (!selectedSiteId && !selectedBuildingId && !selectedFloorId && !selectedLayoutId) return;

    const current = {
      siteId:     params.get("siteId")     ?? "",
      buildingId: params.get("buildingId") ?? "",
      floorId:    params.get("floorId")    ?? "",
      layoutId:   params.get("layoutId")   ?? "",
    };

    if (
      (selectedSiteId     && current.siteId     !== selectedSiteId)     ||
      (selectedBuildingId && current.buildingId !== selectedBuildingId) ||
      (selectedFloorId    && current.floorId    !== selectedFloorId)    ||
      (selectedLayoutId   && current.layoutId   !== selectedLayoutId)
    ) {
      syncUrl({});
    }
  }, [selectedSiteId, selectedBuildingId, selectedFloorId, selectedLayoutId]);

  // ── Handlers ───────────────────────────────────────────────────────────
  const handleSiteChange = (id: string) => {
    setSelectedSiteId(id);
  };

  const handleBuildingChange = (id: string) => {
    setSelectedBuildingId(id);
  };

  const handleFloorChange = (id: string) => {
    setSelectedFloorId(id);
  };

  const handleLayoutChange = (id: string) => {
    setSelectedLayoutId(id);
    syncUrl({ layoutId: id });
  };

  return (
    <div className="flex h-screen w-full">
      <div className="flex flex-col flex-1 min-w-0">
        <main className="flex-1 bg-gray-50 p-6 space-y-5 overflow-y-auto">

          <ManageLayoutHeader
            layout={selectedLayout}
            stats={effectiveStats}
            canPublish={canPublish}
            allConfigured={allConfigured}
            onPublish={publishLayout}
            publishing={publishing}
            publishError={publishError}
          />

          <LayoutFilters
            sites={sites}
            buildings={buildings}
            floors={floors}
            layouts={layouts}
            selectedSiteId={selectedSiteId}
            selectedBuildingId={selectedBuildingId}
            selectedFloorId={selectedFloorId}
            selectedLayoutId={selectedLayoutId}
            onSiteChange={handleSiteChange}
            onBuildingChange={handleBuildingChange}
            onFloorChange={handleFloorChange}
            onLayoutChange={handleLayoutChange}
            loadingSites={loadingSites}
            loadingBuildings={loadingBuildings}
            loadingFloors={loadingFloors}
            loadingLayouts={loadingLayouts}
          />

          <LayoutStatCards stats={effectiveStats} loading={loadingStats} />

          <div className="flex gap-6 w-full items-start">

            <div className="flex-1 min-w-0">
              <LayoutPreview
                layout={selectedLayout}
                seats={seats}
              />
            </div>

            <div className="w-[300px] flex-shrink-0">
              <LayoutSidebar
                layout={selectedLayout}
                selectedLayoutId={selectedLayoutId}
                selectedFloorId={selectedFloorId}
                selectedBuildingId={selectedBuildingId}
                selectedSiteId={selectedSiteId}
              />
            </div>

          </div>

        </main>
      </div>
    </div>
  );
}