// "use client";

// // This file is the content that used to live in page.tsx.
// // It was extracted so that page.tsx can wrap it in <Suspense>,
// // which is required when using useSearchParams() in Next.js App Router.

// import FloorTree   from "@/features/adminlayouts1/components/FloorTree";
// import LayoutTable from "@/features/adminlayouts1/components/LayoutTable";
// import { useLayoutSelection } from "@/features/adminlayouts1/hooks/useLayoutSelection";
// import { useLayoutsStore }    from "@/store/useLayoutsStore";
// import Link        from "next/link";
// import { useEffect, useCallback } from "react";
// import { toast }   from "sonner";
// import { useSearchParams, useRouter } from "next/navigation";

// const DEFAULT_SELECTION = {
//   siteId: "", buildingId: "", floorId: "",
//   siteName: "", buildingName: "", floorName: "",
// };

// function readSavedSelection() {
//   if (typeof window === "undefined") return null;
//   try {
//     const saved = localStorage.getItem("selectedLayoutFloor");
//     return saved ? JSON.parse(saved) : null;
//   } catch { return null; }
// }

// export default function FloorLayoutsPage() {
//   const router       = useRouter();
//   const searchParams = useSearchParams();

//   const siteIdParam     = searchParams.get("siteId")     ?? "";
//   const buildingIdParam = searchParams.get("buildingId") ?? "";
//   const floorIdParam    = searchParams.get("floorId")    ?? "";
//   const layoutIdParam   = searchParams.get("layoutId")   ?? "";

//   // Lazy initializer — correct value on first render, no extra renders
//   // Priority: URL params > localStorage > default
//   const { selection, setSelection } = useLayoutSelection(() => {
//     if (floorIdParam) {
//       return { ...DEFAULT_SELECTION, siteId: siteIdParam, buildingId: buildingIdParam, floorId: floorIdParam };
//     }
//     return readSavedSelection() ?? DEFAULT_SELECTION;
//   });

//   const { fetchLayouts, invalidateAll } = useLayoutsStore();

//   // Persist selection to localStorage whenever it changes
//   useEffect(() => {
//     if (selection.floorId) {
//       localStorage.setItem("selectedLayoutFloor", JSON.stringify(selection));
//     }
//   }, [selection]);

//   // Prefetch upload route on mount so the Link click is instant
//   useEffect(() => {
//     router.prefetch("/admin/layouts/upload");
//   }, [router]);

//   // Pre-warm cache on mount if we already know the floor
//   useEffect(() => {
//     if (selection.floorId) {
//       fetchLayouts(selection.floorId);
//     }
//   // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   const handleFloorSelect = useCallback((data: any) => {
//     const next = {
//       siteId:       data.siteId       || "",
//       buildingId:   data.buildingId   || "",
//       floorId:      data.floorId      || "",
//       siteName:     data.siteName     || data.office   || "",
//       buildingName: data.buildingName || data.tower    || "",
//       floorName:    data.floorName    || data.floor    || "",
//     };
//     setSelection(next);
//     fetchLayouts(next.floorId); // cache hit = instant, miss = fetch
//   }, [setSelection, fetchLayouts]);

//   const handleRefresh = useCallback(() => {
//     invalidateAll();
//     if (selection.floorId) fetchLayouts(selection.floorId);
//     toast.success("Refreshed successfully");
//   }, [invalidateAll, fetchLayouts, selection.floorId]);

//   return (
//     <main className="flex-1 bg-[#f8fafc] p-6 space-y-6 overflow-y-auto">

//       <div className="flex items-center justify-between">
//         <div>
//           {/* <h1 className="text-xl font-semibold">Floor Layout Management</h1>
//           <p className="text-sm text-muted-foreground">
//             Upload, manage and publish floor layouts
//           </p> */}
//           <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Floor Layout Management</h1>
//           <p className="text-xs sm:text-sm text-gray-500 mt-1">
//             Upload, manage and publish floor layouts.
//           </p>
//         </div>
//         <div className="flex items-center gap-3">
//           <button
//             onClick={handleRefresh}
//             className="flex items-center gap-2 border px-4 py-2 rounded-md text-sm hover:bg-gray-50 transition-colors"
//           >
//             ⟳ Refresh
//           </button>
//           <Link
//             href="/admin/layouts/upload"
//             className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm hover:bg-indigo-700 transition-colors"
//           >
//             ⬆ Upload New Layout
//           </Link>
//         </div>
//       </div>

//       <div className="grid grid-cols-12 gap-6">
//         <div className="col-span-3">
//           <FloorTree
//             initialSiteId={siteIdParam     || selection.siteId}
//             initialBuildingId={buildingIdParam || selection.buildingId}
//             initialFloorId={floorIdParam    || selection.floorId}
//             onSelect={handleFloorSelect}
//           />
//         </div>
//         <div className="col-span-9">
//           <LayoutTable
//             selection={selection}
//             selectedLayoutId={layoutIdParam}
//           />
//         </div>
//       </div>

//     </main>
//   );
// }

"use client";

import FloorTree   from "@/features/adminlayouts1/components/FloorTree";
import LayoutTable from "@/features/adminlayouts1/components/LayoutTable";
import { useLayoutSelection } from "@/features/adminlayouts1/hooks/useLayoutSelection";
import { useLayoutsStore }    from "@/store/useLayoutsStore";
import Link        from "next/link";
import { useEffect, useCallback } from "react";
import { toast }   from "sonner";
import { useSearchParams, useRouter } from "next/navigation";

const DEFAULT_SELECTION = {
  siteId: "", buildingId: "", floorId: "",
  siteName: "", buildingName: "", floorName: "",
};

function readSavedSelection() {
  if (typeof window === "undefined") return null;
  try {
    const saved = localStorage.getItem("selectedLayoutFloor");
    return saved ? JSON.parse(saved) : null;
  } catch { return null; }
}

export default function FloorLayoutsPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const siteIdParam     = searchParams.get("siteId")     ?? "";
  const buildingIdParam = searchParams.get("buildingId") ?? "";
  const floorIdParam    = searchParams.get("floorId")    ?? "";
  const layoutIdParam   = searchParams.get("layoutId")   ?? "";

  const { selection, setSelection } = useLayoutSelection(() => {
    if (floorIdParam) {
      return { ...DEFAULT_SELECTION, siteId: siteIdParam, buildingId: buildingIdParam, floorId: floorIdParam };
    }
    return readSavedSelection() ?? DEFAULT_SELECTION;
  });

  const { fetchLayouts, invalidateFloor, invalidateAll } = useLayoutsStore();

  // Persist selection to localStorage whenever it changes
  useEffect(() => {
    if (selection.floorId) {
      localStorage.setItem("selectedLayoutFloor", JSON.stringify(selection));
    }
  }, [selection]);

  // Prefetch upload route on mount
  useEffect(() => {
    router.prefetch("/admin/layouts/upload");
  }, [router]);

  // Pre-warm cache on mount if we already know the floor
  useEffect(() => {
    if (selection.floorId) {
      fetchLayouts(selection.floorId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When returning from publish, floorIdParam will be present in the URL.
  // Invalidate that floor's cache and force a fresh fetch so the status
  // badge updates immediately without a manual refresh.
  useEffect(() => {
    if (!floorIdParam) return;
    invalidateFloor(floorIdParam);
    fetchLayouts(floorIdParam);
  // Re-run only when the URL floor param changes (i.e. on navigation back)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [floorIdParam]);

  const handleFloorSelect = useCallback((data: any) => {
    const next = {
      siteId:       data.siteId       || "",
      buildingId:   data.buildingId   || "",
      floorId:      data.floorId      || "",
      siteName:     data.siteName     || data.office   || "",
      buildingName: data.buildingName || data.tower    || "",
      floorName:    data.floorName    || data.floor    || "",
    };
    setSelection(next);
    fetchLayouts(next.floorId);
  }, [setSelection, fetchLayouts]);

  const handleRefresh = useCallback(() => {
    invalidateAll();
    if (selection.floorId) fetchLayouts(selection.floorId);
    toast.success("Refreshed successfully");
  }, [invalidateAll, fetchLayouts, selection.floorId]);

  return (
    <main className="flex-1 bg-[#f8fafc] p-6 space-y-6 overflow-y-auto">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Floor Layout Management</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Upload, manage and publish floor layouts.
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

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-3">
          <FloorTree
            initialSiteId={siteIdParam     || selection.siteId}
            initialBuildingId={buildingIdParam || selection.buildingId}
            initialFloorId={floorIdParam    || selection.floorId}
            onSelect={handleFloorSelect}
          />
        </div>
        <div className="col-span-9">
          <LayoutTable
            selection={selection}
            selectedLayoutId={layoutIdParam}
          />
        </div>
      </div>

    </main>
  );
}