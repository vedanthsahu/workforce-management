// Zustand store for the Floor Layout tree's office/building/floor hierarchy
// -- mirrors useLayoutsStore's pattern (see its own header comment) for the
// same reason: FloorTree.tsx used to hold sites/buildings/floors in local
// component state, so every fresh mount (every page visit, every browser
// refresh) re-ran the whole sites -> buildings -> floors fetch chain from
// scratch, even seconds after the last visit. Moving it here means a
// second visit in the same session is instant.

import { create } from "zustand";
import { getSites, getBuildings, getFloors } from "@/features/adminlayouts1/services/locationService";
import { Site, Building, Floor } from "@/features/adminlayouts1/types/layout.types";

// In-flight promises are deliberately NOT store state -- they only dedupe
// concurrent calls for the same id (e.g. two components expanding the same
// node at once), the same role FloorTree's own useRef maps played before
// this moved out of the component. A module-level singleton is fine: this
// store itself is already a singleton for the whole app.
let sitesFetchPromise: Promise<Site[]> | null = null;
const inFlightBuildingFetches = new Map<string, Promise<Building[]>>();
const inFlightFloorFetches = new Map<string, Promise<Floor[]>>();

interface LocationTreeState {
  sites: Site[];
  sitesLoaded: boolean;
  sitesLoading: boolean;

  buildingsCache: Record<string, Building[]>;
  floorsCache: Record<string, Floor[]>;

  loadingBuildingsFor: Set<string>;
  loadingFloorsFor: Set<string>;

  fetchSites: () => Promise<Site[]>;
  fetchBuildingsForSite: (siteId: string) => Promise<Building[]>;
  fetchFloorsForBuilding: (buildingId: string) => Promise<Floor[]>;

  // Call after an office/building/floor is added, renamed, or its status
  // changed elsewhere in the app, so the next read picks up the change
  // instead of serving what's now stale.
  invalidateAll: () => void;
}

export const useLocationTreeStore = create<LocationTreeState>((set, get) => ({
  sites: [],
  sitesLoaded: false,
  sitesLoading: false,

  buildingsCache: {},
  floorsCache: {},

  loadingBuildingsFor: new Set(),
  loadingFloorsFor: new Set(),

  fetchSites: () => {
    const { sites, sitesLoaded } = get();
    if (sitesLoaded) return Promise.resolve(sites);
    if (sitesFetchPromise) return sitesFetchPromise;

    set({ sitesLoading: true });
    sitesFetchPromise = getSites()
      .then((data) => {
        set({ sites: data, sitesLoaded: true, sitesLoading: false });
        return data;
      })
      .catch((err) => {
        console.error("[locationTreeStore] fetchSites:", err);
        set({ sitesLoading: false });
        return [] as Site[];
      })
      .finally(() => {
        sitesFetchPromise = null;
      });
    return sitesFetchPromise;
  },

  fetchBuildingsForSite: (siteId: string) => {
    const cached = get().buildingsCache[siteId];
    if (cached) return Promise.resolve(cached);

    const inFlight = inFlightBuildingFetches.get(siteId);
    if (inFlight) return inFlight;

    set((state) => ({ loadingBuildingsFor: new Set(state.loadingBuildingsFor).add(siteId) }));
    const promise = getBuildings(siteId)
      .then((blds) => {
        set((state) => ({ buildingsCache: { ...state.buildingsCache, [siteId]: blds } }));
        return blds;
      })
      .catch((err) => {
        // Not cached on failure -- leaves it retryable on the next expand/search.
        console.error("[locationTreeStore] fetchBuildingsForSite:", err);
        return [] as Building[];
      })
      .finally(() => {
        set((state) => {
          const next = new Set(state.loadingBuildingsFor);
          next.delete(siteId);
          return { loadingBuildingsFor: next };
        });
        inFlightBuildingFetches.delete(siteId);
      });

    inFlightBuildingFetches.set(siteId, promise);
    return promise;
  },

  fetchFloorsForBuilding: (buildingId: string) => {
    const cached = get().floorsCache[buildingId];
    if (cached) return Promise.resolve(cached);

    const inFlight = inFlightFloorFetches.get(buildingId);
    if (inFlight) return inFlight;

    set((state) => ({ loadingFloorsFor: new Set(state.loadingFloorsFor).add(buildingId) }));
    const promise = getFloors(buildingId)
      .then((flrs) => {
        set((state) => ({ floorsCache: { ...state.floorsCache, [buildingId]: flrs } }));
        return flrs;
      })
      .catch((err) => {
        console.error("[locationTreeStore] fetchFloorsForBuilding:", err);
        return [] as Floor[];
      })
      .finally(() => {
        set((state) => {
          const next = new Set(state.loadingFloorsFor);
          next.delete(buildingId);
          return { loadingFloorsFor: next };
        });
        inFlightFloorFetches.delete(buildingId);
      });

    inFlightFloorFetches.set(buildingId, promise);
    return promise;
  },

  invalidateAll: () => {
    inFlightBuildingFetches.clear();
    inFlightFloorFetches.clear();
    sitesFetchPromise = null;
    set({
      sites: [],
      sitesLoaded: false,
      sitesLoading: false,
      buildingsCache: {},
      floorsCache: {},
      loadingBuildingsFor: new Set(),
      loadingFloorsFor: new Set(),
    });
  },
}));
