"use client";

import { useEffect, useRef, useState, useMemo, memo, useCallback } from "react";
import { ChevronDown, ChevronRight, Building2, Search, X, Loader2 } from "lucide-react";
import {
  getSites,
  getBuildings,
  getFloors,
} from "@/features/adminlayouts1/services/locationService";
import {
  Site,
  Building,
  Floor,
} from "@/features/adminlayouts1/types/layout.types";

type Props = {
  onSelect: (data: {
    siteId:       string;
    buildingId:   string;
    floorId:      string;
    siteName:     string;
    buildingName: string;
    floorName:    string;
  }) => void;
  initialSiteId?:     string;
  initialBuildingId?: string;
  initialFloorId?:    string;
};

interface FlatFloor {
  floor_id:     string;
  floor_name:   string;
  siteId:       string;
  siteName:     string;
  buildingId:   string;
  buildingName: string;
}

const FloorTree = memo(function FloorTree({
  onSelect,
  initialSiteId,
  initialBuildingId,
  initialFloorId,
}: Props) {
  const [expandedOffices, setExpandedOffices] = useState<Set<string>>(new Set());
  const [expandedTowers,  setExpandedTowers]  = useState<Set<string>>(new Set());
  const [selectedFloor,   setSelectedFloor]   = useState<string>("");
  const [search,          setSearch]          = useState("");

  const [sites,     setSites]     = useState<Site[]>([]);
  const [buildings, setBuildings] = useState<Record<string, Building[]>>({});
  const [floors,    setFloors]    = useState<Record<string, Floor[]>>({});

  const [loadingSites,         setLoadingSites]         = useState(true);
  const [loadingBuildingsFor,  setLoadingBuildingsFor]  = useState<Set<string>>(new Set());
  const [loadingFloorsFor,     setLoadingFloorsFor]     = useState<Set<string>>(new Set());
  const [isSearchLoading,      setIsSearchLoading]      = useState(false);

  // Always-fresh refs so callbacks with stable identities never read stale state
  const sitesRef                  = useRef<Site[]>([]);
  const buildingsRef              = useRef<Record<string, Building[]>>({});
  const floorsRef                 = useRef<Record<string, Floor[]>>({});
  const inFlightBuildingFetches   = useRef<Map<string, Promise<Building[]>>>(new Map());
  const inFlightFloorFetches      = useRef<Map<string, Promise<Floor[]>>>(new Map());

  // Stable ref for onSelect so effects never go stale
  const onSelectRef = useRef(onSelect);
  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);

  useEffect(() => { sitesRef.current = sites; }, [sites]);
  useEffect(() => { buildingsRef.current = buildings; }, [buildings]);
  useEffect(() => { floorsRef.current = floors; }, [floors]);

  // ── Boot: load sites only. Buildings/floors are fetched on demand ────────
  // (per-site on expand, per-building on expand) instead of preloading the
  // entire hierarchy — avoids firing one request per site/building on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingSites(true);
      try {
        const sitesData = await getSites();
        if (!cancelled) setSites(sitesData);
      } catch (err) {
        console.error("[FloorTree] getSites:", err);
      } finally {
        if (!cancelled) setLoadingSites(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── On-demand fetchers (cached, deduped against concurrent calls) ────────
  const fetchBuildingsForSite = useCallback((siteId: string): Promise<Building[]> => {
    const cached = buildingsRef.current[siteId];
    if (cached) return Promise.resolve(cached);

    const inFlight = inFlightBuildingFetches.current.get(siteId);
    if (inFlight) return inFlight;

    setLoadingBuildingsFor((prev) => new Set(prev).add(siteId));
    const promise = getBuildings(siteId)
      .then((blds) => {
        setBuildings((prev) => ({ ...prev, [siteId]: blds }));
        return blds;
      })
      .catch((err) => {
        // Not cached on failure — leaves it retryable on the next expand/search.
        console.error("[FloorTree] getBuildings:", err);
        return [] as Building[];
      })
      .finally(() => {
        setLoadingBuildingsFor((prev) => {
          const next = new Set(prev);
          next.delete(siteId);
          return next;
        });
        inFlightBuildingFetches.current.delete(siteId);
      });

    inFlightBuildingFetches.current.set(siteId, promise);
    return promise;
  }, []);

  const fetchFloorsForBuilding = useCallback((buildingId: string): Promise<Floor[]> => {
    const cached = floorsRef.current[buildingId];
    if (cached) return Promise.resolve(cached);

    const inFlight = inFlightFloorFetches.current.get(buildingId);
    if (inFlight) return inFlight;

    setLoadingFloorsFor((prev) => new Set(prev).add(buildingId));
    const promise = getFloors(buildingId)
      .then((flrs) => {
        setFloors((prev) => ({ ...prev, [buildingId]: flrs }));
        return flrs;
      })
      .catch((err) => {
        console.error("[FloorTree] getFloors:", err);
        return [] as Floor[];
      })
      .finally(() => {
        setLoadingFloorsFor((prev) => {
          const next = new Set(prev);
          next.delete(buildingId);
          return next;
        });
        inFlightFloorFetches.current.delete(buildingId);
      });

    inFlightFloorFetches.current.set(buildingId, promise);
    return promise;
  }, []);

  // Loads everything (all buildings for all sites, all floors for all buildings)
  // — only invoked when the user actually searches, since search needs to match
  // against floor names it may not have fetched yet. Cheap on repeat calls:
  // already-cached sites/buildings/floors resolve instantly.
  const loadEverythingForSearch = useCallback(async (): Promise<FlatFloor[]> => {
    const buildingResults = await Promise.all(
      sitesRef.current.map(async (site) => ({
        site,
        blds: await fetchBuildingsForSite(site.site_id),
      }))
    );

    const allBuildingEntries = buildingResults.flatMap(({ site, blds }) =>
      blds.map((building) => ({ site, building }))
    );

    const floorResults = await Promise.all(
      allBuildingEntries.map(async ({ site, building }) => ({
        site,
        building,
        flrs: await fetchFloorsForBuilding(building.building_id),
      }))
    );

    const flat: FlatFloor[] = [];
    for (const { site, building, flrs } of floorResults) {
      for (const floor of flrs) {
        flat.push({
          floor_id:     floor.floor_id,
          floor_name:   floor.floor_name,
          siteId:       site.site_id,
          siteName:     site.site_name,
          buildingId:   building.building_id,
          buildingName: building.building_name,
        });
      }
    }
    return flat;
  }, [fetchBuildingsForSite, fetchFloorsForBuilding]);

  // ── Restore expand/select state immediately (cheap, synchronous) ─────────
  useEffect(() => {
    if (!initialSiteId) return;
    setExpandedOffices((prev) => new Set(prev).add(initialSiteId));
    if (initialBuildingId) {
      setExpandedTowers((prev) => new Set(prev).add(initialBuildingId));
    }
    setSelectedFloor(initialFloorId || "");
  }, [initialSiteId, initialBuildingId, initialFloorId]);

  // ── Fetch just the initial site→building→floor path (not everything) so
  // the parent gets the resolved names for the restored selection. ─────────
  useEffect(() => {
    if (!initialSiteId || !initialBuildingId || !initialFloorId) return;
    if (sites.length === 0) return;
    const site = sites.find((s) => s.site_id === initialSiteId);
    if (!site) return;

    let cancelled = false;
    (async () => {
      const blds = await fetchBuildingsForSite(initialSiteId);
      const building = blds.find((b) => b.building_id === initialBuildingId);
      if (cancelled || !building) return;

      const flrs = await fetchFloorsForBuilding(initialBuildingId);
      const floor = flrs.find((f) => f.floor_id === initialFloorId);
      if (cancelled || !floor) return;

      onSelectRef.current({
        siteId:       initialSiteId,
        buildingId:   initialBuildingId,
        floorId:      initialFloorId,
        siteName:     site.site_name,
        buildingName: building.building_name,
        floorName:    floor.floor_name,
      });
    })();

    return () => { cancelled = true; };
  }, [sites, initialSiteId, initialBuildingId, initialFloorId, fetchBuildingsForSite, fetchFloorsForBuilding]);

  // ── Search ───────────────────────────────────────────────────────────────
  const handleSearch = useCallback((value: string) => {
    setSearch(value);

    if (!value.trim()) {
      setExpandedOffices(new Set());
      setExpandedTowers(new Set());
      return;
    }

    setIsSearchLoading(true);
    loadEverythingForSearch()
      .then((flat) => {
        const q       = value.toLowerCase();
        const matches = flat.filter((f) => f.floor_name.toLowerCase().includes(q));
        if (matches.length === 0) return;
        setExpandedOffices(new Set(matches.map((m) => m.siteId)));
        setExpandedTowers(new Set(matches.map((m) => m.buildingId)));
      })
      .finally(() => setIsSearchLoading(false));
  }, [loadEverythingForSearch]);

  // ── Derived: flattened floors from whatever is currently loaded ──────────
  const allFloorsFlat = useMemo<FlatFloor[]>(() => {
    const flat: FlatFloor[] = [];
    for (const site of sites) {
      for (const building of buildings[site.site_id] || []) {
        for (const floor of floors[building.building_id] || []) {
          flat.push({
            floor_id:     floor.floor_id,
            floor_name:   floor.floor_name,
            siteId:       site.site_id,
            siteName:     site.site_name,
            buildingId:   building.building_id,
            buildingName: building.building_name,
          });
        }
      }
    }
    return flat;
  }, [sites, buildings, floors]);

  const matchingFloorIds: Set<string> | null = search.trim()
    ? new Set(
        allFloorsFlat
          .filter((f) => f.floor_name.toLowerCase().includes(search.toLowerCase()))
          .map((f) => f.floor_id)
      )
    : null;

  // ── Expand / collapse — fetches children lazily on first expand ─────────
  const toggleOffice = useCallback((siteId: string) => {
    setExpandedOffices((prev) => {
      const next = new Set(prev);
      if (prev.has(siteId)) {
        next.delete(siteId);
      } else {
        next.add(siteId);
        fetchBuildingsForSite(siteId);
      }
      return next;
    });
  }, [fetchBuildingsForSite]);

  const toggleTower = useCallback((buildingId: string) => {
    setExpandedTowers((prev) => {
      const next = new Set(prev);
      if (prev.has(buildingId)) {
        next.delete(buildingId);
      } else {
        next.add(buildingId);
        fetchFloorsForBuilding(buildingId);
      }
      return next;
    });
  }, [fetchFloorsForBuilding]);

  const isBusy = loadingSites || isSearchLoading;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="bg-white border rounded-lg p-4">
      <h3 className="font-medium mb-3">Floors</h3>

      {/* Search */}
      <div className="relative mb-4">
        {isBusy ? (
          <Loader2 className="absolute left-3 top-3 w-4 h-4 text-muted-foreground animate-spin" />
        ) : (
          <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
        )}
        <input
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder={
            loadingSites ? "Loading sites…" : isSearchLoading ? "Searching…" : "Search floors..."
          }
          disabled={loadingSites}
          className="w-full h-10 pl-9 pr-8 border rounded-md text-sm disabled:opacity-50 disabled:cursor-wait"
        />
        {search && !isBusy && (
          <button
            onClick={() => handleSearch("")}
            className="absolute right-3 top-3 text-muted-foreground hover:text-gray-700"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Empty search state */}
      {!isBusy && matchingFloorIds !== null && matchingFloorIds.size === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No floors match &quot;{search}&quot;
        </p>
      )}

      {/* Tree */}
      <div className="text-sm space-y-3">
        {sites.map((site) => {
          const siteHasMatch =
            !matchingFloorIds ||
            allFloorsFlat.some(
              (f) => f.siteId === site.site_id && matchingFloorIds.has(f.floor_id)
            );
          if (!siteHasMatch) return null;

          return (
            <div key={site.site_id}>
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => toggleOffice(site.site_id)}
              >
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{site.site_name}</span>
                </div>
                {expandedOffices.has(site.site_id)
                  ? <ChevronDown  className="w-4 h-4" />
                  : <ChevronRight className="w-4 h-4" />}
              </div>

              {expandedOffices.has(site.site_id) && (
                <div className="ml-5 mt-2 space-y-2">
                  {loadingBuildingsFor.has(site.site_id) && !buildings[site.site_id] && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> Loading buildings…
                    </div>
                  )}

                  {(buildings[site.site_id] || []).map((building) => {
                    const buildingHasMatch =
                      !matchingFloorIds ||
                      allFloorsFlat.some(
                        (f) =>
                          f.buildingId === building.building_id &&
                          matchingFloorIds.has(f.floor_id)
                      );
                    if (!buildingHasMatch) return null;

                    return (
                      <div key={building.building_id}>
                        <div
                          className="flex items-center justify-between cursor-pointer"
                          onClick={() => toggleTower(building.building_id)}
                        >
                          <span>{building.building_name}</span>
                          {expandedTowers.has(building.building_id)
                            ? <ChevronDown  className="w-4 h-4" />
                            : <ChevronRight className="w-4 h-4" />}
                        </div>

                        {expandedTowers.has(building.building_id) && (
                          <div className="ml-5 mt-2 space-y-1">
                            {loadingFloorsFor.has(building.building_id) && !floors[building.building_id] && (
                              <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
                                <Loader2 className="w-3 h-3 animate-spin" /> Loading floors…
                              </div>
                            )}

                            {(floors[building.building_id] || [])
                              .filter((f) =>
                                !matchingFloorIds || matchingFloorIds.has(f.floor_id)
                              )
                              .map((floor) => (
                                <div
                                  key={floor.floor_id}
                                  onClick={() => {
                                    setSelectedFloor(floor.floor_id);
                                    onSelect({
                                      siteId:       site.site_id,
                                      buildingId:   building.building_id,
                                      floorId:      floor.floor_id,
                                      siteName:     site.site_name,
                                      buildingName: building.building_name,
                                      floorName:    floor.floor_name,
                                    });
                                  }}
                                  className={`cursor-pointer px-2 py-1 rounded transition-colors ${
                                    selectedFloor === floor.floor_id
                                      ? "bg-indigo-100 text-indigo-600 font-medium"
                                      : matchingFloorIds?.has(floor.floor_id)
                                      ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                                      : "hover:bg-gray-100"
                                  }`}
                                >
                                  {floor.floor_name}
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default FloorTree;
