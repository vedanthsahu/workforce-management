"use client";

import FloorTree   from "@/features/adminlayouts1/components/FloorTree";
import LayoutTable from "@/features/adminlayouts1/components/LayoutTable";
import { useLayoutSelection, LayoutSelection } from "@/features/adminlayouts1/hooks/useLayoutSelection";
import { DEFAULT_LAYOUT_SELECTION as DEFAULT_SELECTION } from "@/features/adminlayouts1/utils/layoutTable.utils";
import { useLayoutsStore }    from "@/store/useLayoutsStore";
import Link        from "next/link";
import { useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";

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
    return DEFAULT_SELECTION;
  });

  const { fetchLayouts, invalidateFloor, layouts, activeFloorId } = useLayoutsStore();

  // A floor can only have one SCHEDULED layout queued up at a time (see
  // LayoutTable.tsx's own SCHEDULED handling) -- uploading another on top
  // of it would leave two competing "next" layouts for the same floor.
  // Gated on activeFloorId matching the current selection so this doesn't
  // read the previous floor's layouts for a beat while the new floor's
  // fetch is still in flight.
  const hasScheduledLayoutForSelectedFloor =
    selection.floorId !== "" &&
    activeFloorId === selection.floorId &&
    layouts.some((l) => l.status === "SCHEDULED");

  // Restore selection from localStorage after hydration (client-only)
  const restoredRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current || floorIdParam) return;
    restoredRef.current = true;
    try {
      const saved = localStorage.getItem("selectedLayoutFloor");
      if (saved) {
        const parsed: LayoutSelection = JSON.parse(saved);
        setSelection(parsed);
        if (parsed.floorId) fetchLayouts(parsed.floorId);
      }
    } catch { /* ignore corrupted data */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const handleFloorSelect = useCallback((data: LayoutSelection) => {
    setSelection(data);
    fetchLayouts(data.floorId);
  }, [setSelection, fetchLayouts]);

  // Carry the tree's current office/building/floor selection into the
  // upload page so it lands pre-populated instead of starting blank.
  // UploadLayoutPage/LayoutForm already know how to resolve names and
  // auto-generate the layout name from these same three params.
  const uploadHref = selection.floorId
    ? `/admin/layouts/upload?${new URLSearchParams({
        siteId: selection.siteId,
        buildingId: selection.buildingId,
        floorId: selection.floorId,
      }).toString()}`
    : "/admin/layouts/upload";

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
          {hasScheduledLayoutForSelectedFloor ? (
            <button
              type="button"
              disabled
              title="This floor already has a scheduled layout queued up -- cancel it or wait for it to take effect before uploading a new one."
              className="bg-gray-200 text-gray-400 px-4 py-2 rounded-md text-sm cursor-not-allowed"
            >
              ⬆ Upload New Layout
            </button>
          ) : (
            <Link
              href={uploadHref}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm hover:bg-indigo-700 transition-colors"
            >
              ⬆ Upload New Layout
            </Link>
          )}
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
