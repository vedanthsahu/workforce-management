// // "use client";

// // import { SidebarProvider } from "@/components/ui/sidebar";
// // import { AppSidebar } from "@/features/dashboard/components/AppSidebar";
// // import { useSearchParams } from "next/navigation";

// // import LayoutPreview from "@/features/managelayout/components/LayoutPreview";
// // import LayoutDetails from "@/features/managelayout/components/LayoutDetails";
// // import ManageLayoutHeader from "@/features/managelayout/components/ManageLayoutHeader";
// // import LayoutFilters from "@/features/managelayout/components/LayoutFilters";
// // import AdminTopbar from "@/features/admin/components/AdminTopbar";
// // import { useState } from "react";

// // export default function ManageLayoutPage() {
// //   const params = useSearchParams();
  

// //   const layoutId = params.get("layoutId");
// //   const floorId = params.get("floorId");

// //   return (
    
// //       <div className="flex h-screen w-full">

      
// //         {/* RIGHT SIDE */}
// //         <div className="flex flex-col flex-1 min-w-0">

// //           {/* Topbar */}
// //           <AdminTopbar />

// //           {/* MAIN CONTENT */}
// //           <main className="flex-1 bg-gray-50 p-6 space-y-6 overflow-y-auto">

// //             {/* HEADER */}
// //             <ManageLayoutHeader />

// //             {/* FILTERS */}
// //             <LayoutFilters />

// //             {/* MAIN GRID */}
// //             <div className="grid grid-cols-12 gap-6 w-full">

// //               {/* LEFT SIDE */}
// //               <div className="col-span-8">
// //                 <LayoutPreview />
// //               </div>

// //               {/* RIGHT SIDE */}
// //               <div className="col-span-4">
// //                 <LayoutDetails />
// //               </div>

// //             </div>

// //           </main>

// //         </div>
// //       </div>
   
// //   );
// // }

// "use client";

// import { useSearchParams } from "next/navigation";
// import { useCascadeLocation, useFloorLayouts } from "@/features/managelayout/hooks/useLayoutDetails";

// import LayoutPreview from "@/features/managelayout/components/LayoutPreview";
// import LayoutDetails from "@/features/managelayout/components/LayoutDetails";
// import ManageLayoutHeader from "@/features/managelayout/components/ManageLayoutHeader";
// import LayoutFilters from "@/features/managelayout/components/LayoutFilters";
// import AdminTopbar from "@/features/admin/components/AdminTopbar";

// export default function ManageLayoutPage() {
//   const params = useSearchParams();
//   const layoutId = params.get("layoutId");
//   const floorId = params.get("floorId");

//   // ── cascade location ───────────────────────────────────────────────────────
//   const {
//     sites,
//     buildings,
//     floors,
//     selectedSiteId,
//     selectedBuildingId,
//     selectedFloorId,
//     setSelectedSiteId,
//     setSelectedBuildingId,
//     setSelectedFloorId,
//     loadingSites,
//     loadingBuildings,
//     loadingFloors,
//   } = useCascadeLocation();

//   // ── layouts for selected floor ─────────────────────────────────────────────
//   const {
//     layouts,
//     selectedLayoutId,
//     selectedLayout,
//     setSelectedLayoutId,
//     loading: loadingLayouts,
//   } = useFloorLayouts(selectedFloorId);

//   return (
//     <div className="flex h-screen w-full">
//       {/* RIGHT SIDE */}
//       <div className="flex flex-col flex-1 min-w-0">

//         {/* Topbar */}
//         <AdminTopbar />

//         {/* MAIN CONTENT */}
//         <main className="flex-1 bg-gray-50 p-6 space-y-6 overflow-y-auto">

//           {/* HEADER */}
//           <ManageLayoutHeader />

//           {/* FILTERS — now fully wired */}
//           <LayoutFilters
//             sites={sites}
//             buildings={buildings}
//             floors={floors}
//             layouts={layouts}
//             selectedSiteId={selectedSiteId}
//             selectedBuildingId={selectedBuildingId}
//             selectedFloorId={selectedFloorId}
//             selectedLayoutId={selectedLayoutId}
//             onSiteChange={setSelectedSiteId}
//             onBuildingChange={setSelectedBuildingId}
//             onFloorChange={setSelectedFloorId}
//             onLayoutChange={setSelectedLayoutId}
//             loadingSites={loadingSites}
//             loadingBuildings={loadingBuildings}
//             loadingFloors={loadingFloors}
//             loadingLayouts={loadingLayouts}
//           />

//           {/* MAIN GRID */}
//           <div className="grid grid-cols-12 gap-6 w-full">

//             {/* CANVAS */}
//             <div className="col-span-8">
//               <LayoutPreview layout={selectedLayout} />
//             </div>

//             {/* DETAILS PANEL */}
//             <div className="col-span-4">
//               <LayoutDetails  />
//             </div>

//           </div>
//         </main>
//       </div>
//     </div>
//   );
// }

"use client";

import { useSearchParams } from "next/navigation";
import {
  useCascadeLocation,
  useFloorLayouts,
} from "@/features/managelayout/hooks/useLayoutDetails";

import LayoutPreview from "@/features/managelayout/components/LayoutPreview";
import LayoutDetails from "@/features/managelayout/components/LayoutDetails";
import ManageLayoutHeader from "@/features/managelayout/components/ManageLayoutHeader";
import LayoutFilters from "@/features/managelayout/components/LayoutFilters";
import AdminTopbar from "@/features/admin/components/AdminTopbar";

export default function ManageLayoutPage() {
  const params = useSearchParams();

  // read once — these are stable since query params don't change after mount
  const initialSiteId     = params.get("siteId")     ?? "";
  const initialBuildingId = params.get("buildingId") ?? "";
  const initialFloorId    = params.get("floorId")    ?? "";
  const initialLayoutId   = params.get("layoutId")   ?? "";

  const {
    sites,
    buildings,
    floors,
    selectedSiteId,
    selectedBuildingId,
    selectedFloorId,
    setSelectedSiteId,
    setSelectedBuildingId,
    setSelectedFloorId,
    loadingSites,
    loadingBuildings,
    loadingFloors,
  } = useCascadeLocation({ initialSiteId, initialBuildingId, initialFloorId });

  const {
    layouts,
    selectedLayoutId,
    selectedLayout,
    setSelectedLayoutId,
    loading: loadingLayouts,
  } = useFloorLayouts(selectedFloorId, { initialLayoutId });

  return (
    <div className="flex h-screen w-full">
      <div className="flex flex-col flex-1 min-w-0">

        <AdminTopbar />

        <main className="flex-1 bg-gray-50 p-6 space-y-6 overflow-y-auto">

          <ManageLayoutHeader />

          <LayoutFilters
            sites={sites}
            buildings={buildings}
            floors={floors}
            layouts={layouts}
            selectedSiteId={selectedSiteId}
            selectedBuildingId={selectedBuildingId}
            selectedFloorId={selectedFloorId}
            selectedLayoutId={selectedLayoutId}
            onSiteChange={setSelectedSiteId}
            onBuildingChange={setSelectedBuildingId}
            onFloorChange={setSelectedFloorId}
            onLayoutChange={setSelectedLayoutId}
            loadingSites={loadingSites}
            loadingBuildings={loadingBuildings}
            loadingFloors={loadingFloors}
            loadingLayouts={loadingLayouts}
          />

          <div className="grid grid-cols-12 gap-6 w-full">
            <div className="col-span-8">
              <LayoutPreview layout={selectedLayout} />
            </div>
            <div className="col-span-4">
              <LayoutDetails />
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}