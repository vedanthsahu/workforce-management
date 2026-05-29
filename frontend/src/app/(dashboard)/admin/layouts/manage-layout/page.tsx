"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

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
import AdminTopbar        from "@/features/admin/components/AdminTopbar";
import LayoutStatCards    from "@/features/managelayout/components/Layoutstatcards";

export default function ManageLayoutPage() {
  const params = useSearchParams();

  const initialSiteId     = params.get("siteId")     ?? "";
  const initialBuildingId = params.get("buildingId") ?? "";
  const initialFloorId    = params.get("floorId")    ?? "";
  const initialLayoutId   = params.get("layoutId")   ?? "";

  const {
    sites, buildings, floors,
    selectedSiteId, selectedBuildingId, selectedFloorId,
    setSelectedSiteId, setSelectedBuildingId, setSelectedFloorId,
    loadingSites, loadingBuildings, loadingFloors,
  } = useCascadeLocation({ initialSiteId, initialBuildingId, initialFloorId });

  const {
    layouts, selectedLayoutId, selectedLayout,
    setSelectedLayoutId, loading: loadingLayouts,
  } = useFloorLayouts(selectedFloorId, { initialLayoutId });

  const { stats: seatStats, loading: loadingStats } = useLayoutSeatStats(
    selectedLayout?.layout_id ?? null
  );

  // ── Zustand store ──────────────────────────────────────────────────────
  const { seats, stats, fetchSeats } = useSeatsStore();

  // ── Fetch seats when layout changes ───────────────────────────────────
  useEffect(() => {
    if (selectedLayout?.layout_id) {
      fetchSeats(selectedLayout.layout_id);
    }
  }, [selectedLayout?.layout_id]);

  return (
    <div className="flex h-screen w-full">
      <div className="flex flex-col flex-1 min-w-0">

        <AdminTopbar />

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
            onSiteChange={setSelectedSiteId}
            onBuildingChange={setSelectedBuildingId}
            onFloorChange={setSelectedFloorId}
            onLayoutChange={setSelectedLayoutId}
            loadingSites={loadingSites}
            loadingBuildings={loadingBuildings}
            loadingFloors={loadingFloors}
            loadingLayouts={loadingLayouts}
          />

          {/* ✅ Uses stats from Zustand so it updates instantly after seat save */}
          <LayoutStatCards stats={stats ?? seatStats} loading={loadingStats} />

          <div className="flex gap-6 w-full items-start">

            <div className="flex-1 min-w-0">
              {/* ✅ seats from Zustand — updates instantly when ManageSeatsPage saves */}
              {/* ✅ no onSeatSave — read-only, no dialog */}
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