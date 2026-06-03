
// "use client";

// // import AdminTopbar from "@/features/admin/components/AdminTopbar";
// import FloorTree from "@/features/adminlayouts1/components/FloorTree";
// import LayoutTable from "@/features/adminlayouts1/components/LayoutTable";
// import { getLayoutsByFloor } from "@/features/adminlayouts1/services/locationService";
// import { useLayoutSelection } from "@/features/adminlayouts1/hooks/useLayoutSelection";
// import Link from "next/link";
// import { useEffect, useState } from "react";
// import { Toaster , toast } from "sonner";
// import { useSearchParams } from "next/navigation";

// export default function FloorLayoutsPage() {
//   const { selection, setSelection } = useLayoutSelection();
//   const [layouts, setLayouts] = useState([]);
//   const [refreshKey, setRefreshKey] = useState(0);
//   const searchParams = useSearchParams();

// const siteIdParam = searchParams.get("siteId") ?? "";
// const buildingIdParam = searchParams.get("buildingId") ?? "";
// const floorIdParam = searchParams.get("floorId") ?? "";
// const layoutIdParam = searchParams.get("layoutId") ?? "";
// useEffect(() => {
//   if (!floorIdParam) return;

//   setSelection({
//     siteId: siteIdParam,
//     buildingId: buildingIdParam,
//     floorId: floorIdParam,

//     siteName: "",
//     buildingName: "",
//     floorName: "",
//   });
// }, []);

//   useEffect(() => {
//   const saved = localStorage.getItem("selectedLayoutFloor");

//   if (saved) {
//     setSelection(JSON.parse(saved));
//   }
// }, []);



//   const handleRefresh = () => {
//   setRefreshKey((prev) => prev + 1);
//    toast.success("Refreshed successfully");
// };

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

//   // setLayouts(filtered);
// };

//   return (
//     <>
//       {/* <AdminTopbar /> */}
//       <main className="flex-1 bg-[#f8fafc] p-6 space-y-6 overflow-y-auto">
//         <div className="flex items-center justify-between">
//           <div>
//             <h1 className="text-xl font-semibold">Floor Layout Management</h1>
//             <p className="text-sm text-muted-foreground">
//               Upload, manage and publish floor layouts
//             </p>
//           </div>
//           <div className="flex items-center gap-3">
//             <button 
//             onClick={handleRefresh}
//             className="flex items-center gap-2 border px-4 py-2 rounded-md text-sm">
//               ⟳ Refresh
//             </button>
//             <Link
//               href="/admin/layouts/upload"
//               className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm"
//             >
//               ⬆ Upload New Layout
//             </Link>
//           </div>
//         </div>

//             {/* FILTERS */}
//            {/* <LayoutFilters onChange={handleFilterChange} /> */}

//             {/* MAIN CONTENT */}
//             <div className="grid grid-cols-12 gap-6">

//             {/* LEFT (slightly bigger) */}
//               <div className="col-span-3">
//            <FloorTree  initialSiteId={siteIdParam}
//   initialBuildingId={buildingIdParam}
//   initialFloorId={floorIdParam}
//   onSelect={(data: any) => {
//   console.log("DATA FROM TREE:", data);

//   setSelection({
//     siteId: data.siteId || "",
//     buildingId: data.buildingId || "",
//     floorId: data.floorId || "",

//     siteName: data.siteName || data.office || "",
//     buildingName: data.buildingName || data.tower || "",
//     floorName: data.floorName || data.floor || "",
//   });
// }}
// />
//               </div>
              

//           {/* RIGHT */}
//              <div className="col-span-9">
//            <LayoutTable
//   key={refreshKey}
//   selection={selection}
//   refreshKey={refreshKey}
//   selectedLayoutId={layoutIdParam}
// />
//             <Toaster richColors position="top-right" />
//           </div>
//         </div>
//       </main>
//     </>
//   );
// }

"use client";

// import AdminTopbar from "@/features/admin/components/AdminTopbar";
import FloorTree from "@/features/adminlayouts1/components/FloorTree";
import LayoutTable from "@/features/adminlayouts1/components/LayoutTable";
import { getLayoutsByFloor } from "@/features/adminlayouts1/services/locationService";
import { useLayoutSelection } from "@/features/adminlayouts1/hooks/useLayoutSelection";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Toaster, toast } from "sonner";
import { useSearchParams } from "next/navigation";

export default function FloorLayoutsPage() {
  const { selection, setSelection } = useLayoutSelection();
  const [layouts, setLayouts]       = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const searchParams = useSearchParams();

  const siteIdParam     = searchParams.get("siteId")     ?? "";
  const buildingIdParam = searchParams.get("buildingId") ?? "";
  const floorIdParam    = searchParams.get("floorId")    ?? "";
  const layoutIdParam   = searchParams.get("layoutId")   ?? "";

  // ── Restore selection on mount ─────────────────────────────────────────
  // Priority: URL params (coming back from manage-layout) > localStorage
  useEffect(() => {
    if (floorIdParam) {
      // Came back from manage-layout — restore from URL
      setSelection({
        siteId:      siteIdParam,
        buildingId:  buildingIdParam,
        floorId:     floorIdParam,
        siteName:    "",
        buildingName:"",
        floorName:   "",
      });
    } else {
      // Normal landing — restore last selection from localStorage if present
      const saved = localStorage.getItem("selectedLayoutFloor");
      if (saved) {
        try {
          setSelection(JSON.parse(saved));
        } catch {
          // ignore malformed data
        }
      }
    }
  // Run once on mount only
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Persist selection to localStorage whenever it changes ─────────────
  useEffect(() => {
    if (selection.floorId) {
      localStorage.setItem("selectedLayoutFloor", JSON.stringify(selection));
    }
  }, [selection]);

  // ── Handlers ───────────────────────────────────────────────────────────
  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
    toast.success("Refreshed successfully");
  };

  const handleFilterChange = async (filters: any) => {
    if (!filters.floorId) {
      setLayouts([]);
      return;
    }
    const data = await getLayoutsByFloor(filters.floorId);
    const filtered = filters.status
      ? data.filter((l: any) => l.status === filters.status)
      : data;
    // setLayouts(filtered);
  };

  return (
    <>
      {/* <AdminTopbar /> */}
      <main className="flex-1 bg-[#f8fafc] p-6 space-y-6 overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Floor Layout Management</h1>
            <p className="text-sm text-muted-foreground">
              Upload, manage and publish floor layouts
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 border px-4 py-2 rounded-md text-sm hover:bg-gray-50 transition-colors"
            >
              ⟳ Refresh
            </button>
            <Link
              href="/admin/layouts/upload"
              className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm hover:bg-indigo-700 transition-colors"
            >
              ⬆ Upload New Layout
            </Link>
          </div>
        </div>

        {/* Main content */}
        <div className="grid grid-cols-12 gap-6">

          {/* Left — floor tree */}
          <div className="col-span-3">
            <FloorTree
              initialSiteId={siteIdParam     || selection.siteId}
              initialBuildingId={buildingIdParam || selection.buildingId}
              initialFloorId={floorIdParam    || selection.floorId}
              onSelect={(data: any) => {
                setSelection({
                  siteId:      data.siteId      || "",
                  buildingId:  data.buildingId  || "",
                  floorId:     data.floorId     || "",
                  siteName:    data.siteName    || data.office   || "",
                  buildingName:data.buildingName|| data.tower    || "",
                  floorName:   data.floorName   || data.floor    || "",
                });
              }}
            />
          </div>

          {/* Right — layout table */}
          <div className="col-span-9">
            <LayoutTable
              key={refreshKey}
              selection={selection}
              refreshKey={refreshKey}
              selectedLayoutId={layoutIdParam}
            />
            <Toaster richColors position="top-right" />
          </div>

        </div>
      </main>
    </>
  );
}