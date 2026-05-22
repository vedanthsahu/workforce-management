// "use client";

// import { SidebarProvider } from "@/components/ui/sidebar";
// import { AppSidebar } from "@/features/dashboard/components/AppSidebar";
// import AdminTopbar from "@/features/admin/components/AdminTopbar";

// import LayoutFilters from "@/features/adminlayouts1/components/LayoutFilters";
// import FloorTree from "@/features/adminlayouts1/components/FloorTree";
// import LayoutTable from "@/features/adminlayouts1/components/LayoutTable";

// import { getLayoutsByFloor } from "@/features/adminlayouts1/services/locationService";


// import { useLayoutSelection } from "@/features/adminlayouts1/hooks/useLayoutSelection";


// import { LayoutSelection } from "@/features/adminlayouts1/hooks/useLayoutSelection";

// import Link from "next/dist/client/link";
// import { useState } from "react";


// export default function FloorLayoutsPage() {
//   const { selection, setSelection } = useLayoutSelection();
//   const [layouts, setLayouts] = useState([]);

//   const handleFilterChange = async (filters: any) => {
//   // only call API when floor is selected
//   if (!filters.floorId) {
//     setLayouts([]);
//     return;
//   }

//   const data = await getLayoutsByFloor(filters.floorId);

//   // apply status filter here
//   const filtered = filters.status
//     ? data.filter((l: any) => l.status === filters.status)
//     : data;

//   setLayouts(filtered);
// };

//   return (
//     <SidebarProvider>
//       <div className="flex h-screen w-full">

//         <AppSidebar user={null} />

//         <div className="flex flex-col flex-1 min-w-0">
//           <AdminTopbar />

//           <main className="flex-1 bg-[#f8fafc] p-6 space-y-6">

//             {/* HEADER */}
//             <div className="flex items-center justify-between">

//               <div>
//                 <h1 className="text-xl font-semibold">
//                   Floor Layout Management
//                 </h1>
//                 <p className="text-sm text-muted-foreground">
//                   Upload, manage and publish floor layouts
//                 </p>
//               </div>

//               <div className="flex items-center gap-3">

//                 <button className="flex items-center gap-2 border px-4 py-2 rounded-md text-sm">
//                   ⟳ Refresh
//                 </button>

//                 <Link
//   href="/admin/layouts/upload"
//   className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm"
// >
//                   ⬆ Upload New Layout
//                 </Link>

//               </div>
//             </div>

//             {/* FILTERS */}
//            <LayoutFilters onChange={handleFilterChange} />

//             {/* MAIN CONTENT */}
//             <div className="grid grid-cols-12 gap-6">

//             {/* LEFT (slightly bigger) */}
//               <div className="col-span-3">
//            <FloorTree
//   onSelect={(data: any) =>
//     setSelection({
//       siteId: data.siteId || "",
//       buildingId: data.buildingId || "",
//       floorId: data.floorId || "",

//       siteName: data.siteName || data.office || "",
//       buildingName: data.buildingName || data.tower || "",
//       floorName: data.floorName || data.floor || "",
//     })
//   }
// />
//               </div>

//           {/* RIGHT */}
//              <div className="col-span-9">
//             <LayoutTable selection={selection} />
            
//                 </div>

// </div>

//           </main>
//         </div>
//       </div>
//     </SidebarProvider>
//   );
// }

"use client";

import AdminTopbar from "@/features/admin/components/AdminTopbar";
import LayoutFilters from "@/features/adminlayouts1/components/LayoutFilters";
import FloorTree from "@/features/adminlayouts1/components/FloorTree";
import LayoutTable from "@/features/adminlayouts1/components/LayoutTable";
import { getLayoutsByFloor } from "@/features/adminlayouts1/services/locationService";
import { useLayoutSelection } from "@/features/adminlayouts1/hooks/useLayoutSelection";
import Link from "next/link";
import { useState } from "react";

export default function FloorLayoutsPage() {
  const { selection, setSelection } = useLayoutSelection();
  const [layouts, setLayouts] = useState([]);

  const handleFilterChange = async (filters: any) => {
  // only call API when floor is selected
  if (!filters.floorId) {
    setLayouts([]);
    return;
  }

  const data = await getLayoutsByFloor(filters.floorId);

  // apply status filter here
  const filtered = filters.status
    ? data.filter((l: any) => l.status === filters.status)
    : data;

  // setLayouts(filtered);
};

  return (
    <>
      <AdminTopbar />
      <main className="flex-1 bg-[#f8fafc] p-6 space-y-6 overflow-y-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Floor Layout Management</h1>
            <p className="text-sm text-muted-foreground">
              Upload, manage and publish floor layouts
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 border px-4 py-2 rounded-md text-sm">
              ⟳ Refresh
            </button>
            <Link
              href="/admin/layouts/upload"
              className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm"
            >
              ⬆ Upload New Layout
            </Link>
          </div>
        </div>

            {/* FILTERS */}
           {/* <LayoutFilters onChange={handleFilterChange} /> */}

            {/* MAIN CONTENT */}
            <div className="grid grid-cols-12 gap-6">

            {/* LEFT (slightly bigger) */}
              <div className="col-span-3">
           <FloorTree onSelect={(data: any) => {
  console.log("DATA FROM TREE:", data);

  setSelection({
    siteId: data.siteId || "",
    buildingId: data.buildingId || "",
    floorId: data.floorId || "",

    siteName: data.siteName || data.office || "",
    buildingName: data.buildingName || data.tower || "",
    floorName: data.floorName || data.floor || "",
  });
}}
/>
              </div>

          {/* RIGHT */}
             <div className="col-span-9">
            <LayoutTable selection={selection} />
          </div>
        </div>
      </main>
    </>
  );
}