// features/adminlayouts1/stores/useLayoutsStore.ts
//
// Zustand store for floor layouts — mirrors the useSeatsStore pattern.
//
// WHY A STORE INSTEAD OF useRef:
// - Cache survives component unmounts (navigating away and back is instant)
// - Any component can read/invalidate the cache (e.g. upload page can clear it)
// - Visible in Zustand DevTools for debugging
// - Single source of truth — no prop-drilling of cache refs

import { create } from "zustand";
import { getLayoutsByFloor } from "@/features/adminlayouts1/services/locationService";
import { LayoutApiResponse } from "@/features/adminlayouts1/types/layout.types";

interface LayoutsState {
  // Cache: floorId → layouts array
  cache:        Record<string, LayoutApiResponse[]>;

  // Currently displayed floor
  activeFloorId: string | null;
  layouts:       LayoutApiResponse[];
  loading:       boolean;

  // Actions
  fetchLayouts:      (floorId: string) => Promise<void>;
  invalidateFloor:   (floorId: string) => void;   // clear one floor from cache
  invalidateAll:     () => void;                  // clear entire cache (on Refresh)
  reset:             () => void;                  // full reset
}

export const useLayoutsStore = create<LayoutsState>((set, get) => ({
  cache:         {},
  activeFloorId: null,
  layouts:       [],
  loading:       false,

  fetchLayouts: async (floorId: string) => {
    const { cache } = get();

    // ── Cache hit: serve immediately, no loading state ─────────────────
    if (cache[floorId]) {
      set({ layouts: cache[floorId], activeFloorId: floorId });
      return;
    }

    // ── Cache miss: fetch and store ────────────────────────────────────
    set({ loading: true, activeFloorId: floorId });
    try {
      const data = await getLayoutsByFloor(floorId);
      set((state) => ({
        layouts: data,
        loading: false,
        cache:   { ...state.cache, [floorId]: data }, // add to cache
      }));
    } catch (err) {
      console.error("[layoutsStore] fetchLayouts:", err);
      set({ loading: false, layouts: [] });
    }
  },

  // Call this after uploading a new layout for a specific floor
  // so the next fetch gets fresh data instead of stale cache
  invalidateFloor: (floorId: string) => {
    set((state) => {
      const newCache = { ...state.cache };
      delete newCache[floorId];
      return { cache: newCache };
    });
  },

  // Call this when the user clicks Refresh — clears everything
  invalidateAll: () => set({ cache: {} }),

  reset: () => set({ cache: {}, activeFloorId: null, layouts: [], loading: false }),
}));