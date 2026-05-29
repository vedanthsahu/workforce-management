import { useState, useEffect } from "react";
import { Building, Floor, Layout, LayoutSeatStats, Site } from "../types/layout.types";
import {
  fetchBuildings,
  fetchFloors,
  fetchLayoutSeatStats,
  fetchSites,
  getLayoutsByFloor,
} from "../services/layoutService";

// ─────────────────────────────────────────────────────────────────────────────
// useLayoutSeatStats — static mock, swap for real fetch when API is ready
// ─────────────────────────────────────────────────────────────────────────────

function getMockStats(layoutId: string): LayoutSeatStats {
  return {
    layout_id:          layoutId,
    total_seats:        48,
    configured_seats:   42,
    unconfigured_seats: 6,
    non_bookable_seats: 4,
    bookable_seats:     38,
  };
}

interface UseLayoutSeatStatsResult {
  stats: LayoutSeatStats | null;
  loading: boolean;
  error: boolean;
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
// useCascadeLocation
// ─────────────────────────────────────────────────────────────────────────────

interface UseCascadeLocationOptions {
  initialSiteId?: string;
  initialBuildingId?: string;
  initialFloorId?: string;
}

interface UseCascadeLocationReturn {
  sites: Site[];
  buildings: Building[];
  floors: Floor[];
  selectedSiteId: string;
  selectedBuildingId: string;
  selectedFloorId: string;
  setSelectedSiteId: (id: string) => void;
  setSelectedBuildingId: (id: string) => void;
  setSelectedFloorId: (id: string) => void;
  loadingSites: boolean;
  loadingBuildings: boolean;
  loadingFloors: boolean;
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

  // load sites on mount
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
  }, []);

  // load buildings when site changes
  useEffect(() => {
    if (!selectedSiteId) return;
    setBuildings([]);
    setFloors([]);
    if (selectedSiteId !== initialSiteId) {
      setSelectedBuildingId("");
      setSelectedFloorId("");
    }
    setLoadingBuildings(true);
    fetchBuildings(selectedSiteId)
      .then((data) => {
        setBuildings(data);
        if (!initialBuildingId && data.length > 0) {
          setSelectedBuildingId(String(data[0].id));
        } else if (initialBuildingId) {
          setSelectedBuildingId(initialBuildingId);
        }
      })
      .catch(console.error)
      .finally(() => setLoadingBuildings(false));
  }, [selectedSiteId]);

  // load floors when building changes
  useEffect(() => {
    if (!selectedBuildingId) return;
    setFloors([]);
    if (selectedBuildingId !== initialBuildingId) {
      setSelectedFloorId("");
    }
    setLoadingFloors(true);
    fetchFloors(selectedBuildingId)
      .then((data) => {
        setFloors(data);
        if (!initialFloorId && data.length > 0) {
          setSelectedFloorId(String(data[0].id));
        } else if (initialFloorId) {
          setSelectedFloorId(initialFloorId);
        }
      })
      .catch(console.error)
      .finally(() => setLoadingFloors(false));
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
  layouts: Layout[];
  selectedLayoutId: string;
  selectedLayout: Layout | null;
  setSelectedLayoutId: (id: string) => void;
  loading: boolean;
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
  }, [floorId]);

  const selectedLayout = layouts.find((l) => l.layout_id === selectedLayoutId) ?? null;

  return {
    layouts,
    selectedLayoutId,
    selectedLayout,
    setSelectedLayoutId,
    loading,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// useLayoutSvg
// ─────────────────────────────────────────────────────────────────────────────

interface UseLayoutSvgReturn {
  svgContent: string | null;
  loading: boolean;
  error: boolean;
}

export function useLayoutSvg(fileUrl: string | null): UseLayoutSvgReturn {
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(false);

  useEffect(() => {
    if (!fileUrl || !fileUrl.startsWith("https://")) {
      setSvgContent(null);
      setError(false);
      return;
    }
    setSvgContent(null);
    setError(false);
    setLoading(true);
    fetch(fileUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((text) => {
        const fluid = text
          .replace(/\bwidth="[^"]*"/, 'width="100%"')
          .replace(/\bheight="[^"]*"/, 'height="100%"');
        setSvgContent(fluid);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [fileUrl]);

  return { svgContent, loading, error };
}