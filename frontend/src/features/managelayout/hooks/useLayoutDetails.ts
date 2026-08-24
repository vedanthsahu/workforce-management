import { useState, useEffect, useCallback, useRef } from "react";
import { Building, Floor, Layout, LayoutSeatStats, Site } from "../types/layout.types";
import {
  activateLayout,
  fetchBuildings,
  fetchFloors,
  fetchLayoutSeatStats,
  fetchSites,
  getLayoutsByFloor,
} from "../services/layoutService";
import { useSeatsStore } from "@/store/seatStore";
import { bulkConfigureSeats, SeatBulkEntry } from "@/features/managelayout1/services/seatService";

// ─────────────────────────────────────────────────────────────────────────────
// useLayoutSeatStats
// ─────────────────────────────────────────────────────────────────────────────

interface UseLayoutSeatStatsResult {
  stats:   LayoutSeatStats | null;
  loading: boolean;
  error:   boolean;
}

export function useLayoutSeatStats(layoutId: string | null): UseLayoutSeatStatsResult {
  const [stats,   setStats]   = useState<LayoutSeatStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(false);

  useEffect(() => {
    if (!layoutId) {
      setStats(null);
      return;
    }
    setLoading(true);
    setError(false);

    fetchLayoutSeatStats(layoutId)
      .then(setStats)
      .catch((err) => {
        console.error("[useLayoutSeatStats]", err);
        setError(true);
      })
      .finally(() => setLoading(false));
  }, [layoutId]);

  return { stats, loading, error };
}

// ─────────────────────────────────────────────────────────────────────────────
// usePublishLayout
// ─────────────────────────────────────────────────────────────────────────────

interface UsePublishLayoutReturn {
  publishing:    boolean;
  publishError:  boolean;
  canPublish:    boolean;
  allConfigured: boolean;
  publishLayout: () => Promise<void>;
}

export function usePublishLayout(
  layout:           Layout | null,
  stats:            LayoutSeatStats | null,
  onPublishSuccess: () => void,
): UsePublishLayoutReturn {
  const [publishing,   setPublishing]   = useState(false);
  const [publishError, setPublishError] = useState(false);

  const { isDirty, dirtyMappingIds, seats, clearDirty, fetchSeats } = useSeatsStore();

  const allConfigured =
    stats != null &&
    stats.total_seats > 0 &&
    stats.configured_seats === stats.total_seats;

  const canPublish =
    !!layout &&
    allConfigured &&
    (
      layout.status === "DRAFT" ||
      layout.status === "ARCHIVED" ||
      (layout.is_published && isDirty)
    );

  const publishLayout = useCallback(async () => {
    if (!layout?.layout_id) return;
    setPublishing(true);
    setPublishError(false);
    try {
      if (layout.is_published && dirtyMappingIds.size > 0) {
        // Already the live layout: PATCH /layout-seats/bulk-configuration
        // itself cascades every edited mapping into the live `seats` table
        // in the same transaction when the parent layout is PUBLISHED (see
        // dev-notes/backend/CURRENT.md) — there is no separate "push these
        // edits live" call, and activateLayout is a no-op for an
        // already-published layout, so it's not called at all here. One
        // request, each dirty seat carrying its own fields (no more
        // grouping-by-identical-payload — the new payload shape allows
        // per-seat overrides in a single call).
        const dirtySeats = seats.filter((s) => dirtyMappingIds.has(s.layout_seat_mapping_id));
        const entries: SeatBulkEntry[] = dirtySeats.map((seat) => ({
          layout_seat_mapping_id: Number(seat.layout_seat_mapping_id),
          seat_type:   seat.seat_type   ?? "STANDARD",
          status:      seat.status      ?? "ACTIVE",
          is_bookable: seat.is_bookable ?? true,
          is_reserved: seat.is_reserved,
          amenity_ids: seat.amenity_ids.map(Number),
        }));

        await bulkConfigureSeats({ seats: entries });

        // Pull canonical server state now that layout_seat_mappings/seats
        // have been synced, rather than trusting the local optimistic values.
        await fetchSeats(layout.layout_id);
      } else {
        // First (or re-)promotion of a DRAFT/ARCHIVED layout to PUBLISHED.
        // Seat data was already written immediately while the layout was a
        // draft, so this call carries no seat payload of its own.
        await activateLayout(layout.layout_id);
      }

      clearDirty();
      onPublishSuccess();
    } catch (err) {
      console.error("[publishLayout]", err);
      setPublishError(true);
    } finally {
      setPublishing(false);
    }
  }, [layout, dirtyMappingIds, seats, onPublishSuccess, clearDirty, fetchSeats]);

  return { publishing, publishError, canPublish, allConfigured, publishLayout };
}

// ─────────────────────────────────────────────────────────────────────────────
// useCascadeLocation
// ─────────────────────────────────────────────────────────────────────────────

interface UseCascadeLocationOptions {
  initialSiteId?:     string;
  initialBuildingId?: string;
  initialFloorId?:    string;
}

interface UseCascadeLocationReturn {
  sites:                Site[];
  buildings:            Building[];
  floors:               Floor[];
  selectedSiteId:       string;
  selectedBuildingId:   string;
  selectedFloorId:      string;
  setSelectedSiteId:     (id: string) => void;
  setSelectedBuildingId: (id: string) => void;
  setSelectedFloorId:    (id: string) => void;
  loadingSites:     boolean;
  loadingBuildings: boolean;
  loadingFloors:    boolean;
}

export function useCascadeLocation(
  options: UseCascadeLocationOptions = {}
): UseCascadeLocationReturn {
  const { initialSiteId = "", initialBuildingId = "", initialFloorId = "" } = options;

  const [sites,     setSites]     = useState<Site[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [floors,    setFloors]    = useState<Floor[]>([]);

  const [selectedSiteId,     setSelectedSiteId]     = useState(initialSiteId);
  const [selectedBuildingId, setSelectedBuildingId] = useState(initialBuildingId);
  const [selectedFloorId,    setSelectedFloorId]    = useState(initialFloorId);

  const [loadingSites,     setLoadingSites]     = useState(false);
  const [loadingBuildings, setLoadingBuildings] = useState(false);
  const [loadingFloors,    setLoadingFloors]    = useState(false);

  // Track the previous initialSiteId so we can detect navigation to a new context
  // (e.g. returning from manage-layout after changing office/building on the admin page)
  const prevInitialSiteId = useRef(initialSiteId);

  useEffect(() => {
    if (initialSiteId && initialSiteId !== prevInitialSiteId.current) {
      prevInitialSiteId.current = initialSiteId;
      setSelectedSiteId(initialSiteId);
      // Pre-seed building + floor immediately so the cascade effects below pick them up
      if (initialBuildingId) setSelectedBuildingId(initialBuildingId);
      if (initialFloorId)    setSelectedFloorId(initialFloorId);
    }
  }, [initialSiteId, initialBuildingId, initialFloorId]);

  // ── Load sites once on mount ───────────────────────────────────────────
  useEffect(() => {
    setLoadingSites(true);
    fetchSites()
      .then((data) => {
        setSites(data);
        if (!initialSiteId && data.length > 0) {
          setSelectedSiteId(String(data[0].id));
        }
      })
      .catch(console.error)
      .finally(() => setLoadingSites(false));
    // initialSiteId is intentionally excluded: this effect must run only
    // once on mount (as the comment above says). Changes to initialSiteId
    // after mount are already handled by the ref-tracking effect above,
    // which sets selectedSiteId/BuildingId/FloorId directly without
    // re-fetching the (site-independent) sites list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Load buildings whenever the selected site changes ─────────────────
  useEffect(() => {
    if (!selectedSiteId) return;
    setBuildings([]);
    setFloors([]);
    setLoadingBuildings(true);

    fetchBuildings(selectedSiteId)
      .then((data) => {
        setBuildings(data);

        const inList = (id: string) => data.some((b) => String(b.id) === id);

        if (selectedBuildingId && inList(selectedBuildingId)) {
          // Current selection is still valid for this site — keep it
        } else if (initialBuildingId && inList(initialBuildingId)) {
          setSelectedBuildingId(initialBuildingId);
        } else if (data.length > 0) {
          setSelectedBuildingId(String(data[0].id));
        } else {
          setSelectedBuildingId("");
        }
      })
      .catch(console.error)
      .finally(() => setLoadingBuildings(false));
    // selectedBuildingId and initialBuildingId are intentionally excluded.
    // selectedBuildingId is SET by this same effect (via setSelectedBuildingId
    // above) — adding it as a trigger would cause this effect to re-run
    // right after it just ran, double-fetching buildings for the same site.
    // initialBuildingId changes are already handled by the ref-tracking
    // effect above; this cascade should only re-run when selectedSiteId
    // itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSiteId]);

  // ── Load floors whenever the selected building changes ────────────────
  useEffect(() => {
    if (!selectedBuildingId) return;
    setFloors([]);
    setLoadingFloors(true);

    fetchFloors(selectedBuildingId)
      .then((data) => {
        setFloors(data);

        const inList = (id: string) => data.some((f) => String(f.id) === id);

        if (selectedFloorId && inList(selectedFloorId)) {
          // Current selection is still valid for this building — keep it
        } else if (initialFloorId && inList(initialFloorId)) {
          setSelectedFloorId(initialFloorId);
        } else if (data.length > 0) {
          setSelectedFloorId(String(data[0].id));
        } else {
          setSelectedFloorId("");
        }
      })
      .catch(console.error)
      .finally(() => setLoadingFloors(false));
    // Same reasoning as the buildings cascade above: selectedFloorId is set
    // by this same effect, and initialFloorId changes are handled by the
    // ref-tracking effect — this should only re-run when selectedBuildingId
    // itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBuildingId]);

  return {
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
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// useFloorLayouts
// ─────────────────────────────────────────────────────────────────────────────

interface UseFloorLayoutsOptions {
  initialLayoutId?: string;
}

interface UseFloorLayoutsReturn {
  layouts:             Layout[];
  selectedLayoutId:    string;
  selectedLayout:      Layout | null;
  setSelectedLayoutId: (id: string) => void;
  loading:             boolean;
}

export function useFloorLayouts(
  floorId: string,
  options: UseFloorLayoutsOptions = {}
): UseFloorLayoutsReturn {
  const { initialLayoutId = "" } = options;

  const [layouts,          setLayouts]          = useState<Layout[]>([]);
  const [selectedLayoutId, setSelectedLayoutId] = useState(initialLayoutId);
  const [loading,          setLoading]          = useState(false);

  useEffect(() => {
    if (!floorId) {
      setLayouts([]);
      setSelectedLayoutId("");
      return;
    }
    setLoading(true);
    setLayouts([]);
    setSelectedLayoutId("");

    getLayoutsByFloor(floorId)
      .then((data) => {
        setLayouts(data);
        if (initialLayoutId && data.find((l) => l.layout_id === initialLayoutId)) {
          setSelectedLayoutId(initialLayoutId);
        } else {
          const published  = data.find((l) => l.is_published);
          const autoSelect = published ?? data[0];
          if (autoSelect) setSelectedLayoutId(autoSelect.layout_id);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [floorId, initialLayoutId]);

  const selectedLayout = layouts.find((l) => l.layout_id === selectedLayoutId) ?? null;

  return {
    layouts,
    selectedLayoutId,
    selectedLayout,
    setSelectedLayoutId,
    loading,
  };
}
