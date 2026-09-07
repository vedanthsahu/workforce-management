"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

import {
  useCascadeLocation,
  useFloorLayouts,
  useLayoutSeatStats,
} from "@/features/managelayout/hooks/useLayoutDetails";
import { useSeatsStore } from "@/store/seatStore";

import LayoutPreview      from "@/features/managelayout/components/LayoutPreview";
import LayoutSidebar      from "@/features/managelayout/components/LayoutSidebar";
import ManageLayoutHeader from "@/features/managelayout/components/ManageLayoutHeader";
import LayoutFilters      from "@/features/managelayout/components/LayoutFilters";
import LayoutStatCards    from "@/features/managelayout/components/Layoutstatcards";

function ManageLayoutPage() {
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
    loading: loadingLayouts,
  } = useFloorLayouts(selectedFloorId, { initialLayoutId });

  const { stats: seatStats, loading: loadingStats } = useLayoutSeatStats(
    selectedLayout?.layout_id ?? null
  );

  const { seats, stats, fetchSeats } = useSeatsStore();

  const effectiveStats = stats ?? seatStats;

  useEffect(() => {
    if (selectedLayout?.layout_id) {
      fetchSeats(selectedLayout.layout_id);
    }
  }, [selectedLayout?.layout_id, fetchSeats]);

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
    // syncUrl is a plain (non-memoized) function recreated every render, and
    // params changes identity right after syncUrl() writes the URL — adding
    // either would make this effect re-run far more often than intended.
    // This is a one-way sync (selection state -> URL); it deliberately does
    // not react to URL changes on their own (e.g. browser back/forward).
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

          <ManageLayoutHeader layout={selectedLayout} />

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

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-gray-500">Loading...</div>}>
      <ManageLayoutPage />
    </Suspense>
  );
}
