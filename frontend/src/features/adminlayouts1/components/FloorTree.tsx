"use client";

import { useEffect, useRef, useState, useMemo, memo, useCallback } from "react";
import { ChevronDown, ChevronRight, Building2, Search, X, Loader2 } from "lucide-react";
import {
  getDefaultOfficePreference,
} from "@/features/adminlayouts1/services/locationService";
import { useLocationTreeStore } from "@/store/useLocationTreeStore";

type Props = {
  onSelect: (data: {
    siteId: string;
    buildingId: string;
    floorId: string;
    siteName: string;
    buildingName: string;
    floorName: string;
  }) => void;
  initialSiteId?: string;
  initialBuildingId?: string;
  initialFloorId?: string;
};

interface FlatFloor {
  floor_id: string;
  floor_name: string;
  siteId: string;
  siteName: string;
  buildingId: string;
  buildingName: string;
}

const FloorTree = memo(function FloorTree({
  onSelect,
  initialSiteId,
  initialBuildingId,
  initialFloorId,
}: Props) {
  const [expandedOffices, setExpandedOffices] = useState<Set<string>>(new Set());
  const [expandedTowers, setExpandedTowers] = useState<Set<string>>(new Set());
  const [selectedFloor, setSelectedFloor] = useState<string>("");
  const [search, setSearch] = useState("");
  const [isSearchLoading, setIsSearchLoading] = useState(false);

  // Hierarchy data + its fetchers now live in a shared store instead of
  // local state, so they survive this component unmounting -- a second
  // visit to this page in the same session reads straight from cache
  // instead of re-running the whole sites -> buildings -> floors fetch
  // chain from scratch (see useLocationTreeStore's own header comment).
  const sites = useLocationTreeStore((s) => s.sites);
  const sitesLoading = useLocationTreeStore((s) => s.sitesLoading);
  const buildings = useLocationTreeStore((s) => s.buildingsCache);
  const floors = useLocationTreeStore((s) => s.floorsCache);
  const loadingBuildingsFor = useLocationTreeStore((s) => s.loadingBuildingsFor);
  const loadingFloorsFor = useLocationTreeStore((s) => s.loadingFloorsFor);
  const fetchSites = useLocationTreeStore((s) => s.fetchSites);
  const fetchBuildingsForSite = useLocationTreeStore((s) => s.fetchBuildingsForSite);
  const fetchFloorsForBuilding = useLocationTreeStore((s) => s.fetchFloorsForBuilding);

  // Stable ref for onSelect so effects never go stale
  const onSelectRef = useRef(onSelect);
  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);

  // ── Boot: load sites (instant if another visit already cached them) ─────
  useEffect(() => {
    fetchSites();
  }, [fetchSites]);

  // Loads everything (all buildings for all sites, all floors for all buildings)
  // — only invoked when the user actually searches, since search needs to match
  // against floor names it may not have fetched yet. Cheap on repeat calls:
  // already-cached sites/buildings/floors resolve instantly.
  const loadEverythingForSearch = useCallback(async (): Promise<FlatFloor[]> => {
    const buildingResults = await Promise.all(
      sites.map(async (site) => ({
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
          floor_id: floor.floor_id,
          floor_name: floor.floor_name,
          siteId: site.site_id,
          siteName: site.site_name,
          buildingId: building.building_id,
          buildingName: building.building_name,
        });
      }
    }
    return flat;
  }, [sites, fetchBuildingsForSite, fetchFloorsForBuilding]);

  // ── Restore expand/select state immediately (cheap, synchronous) ─────────
  useEffect(() => {
    if (!initialSiteId) return;
    setExpandedOffices((prev) => new Set(prev).add(initialSiteId));
    if (initialBuildingId) {
      setExpandedTowers((prev) => new Set(prev).add(initialBuildingId));
    }
    setSelectedFloor(initialFloorId || "");
  }, [initialSiteId, initialBuildingId, initialFloorId]);

  // ── Fall back to the admin's own saved office/building/floor preference ──
  // Only when there's nothing else to restore (fresh login, no floor
  // selected yet -- see the effect above). Reuses the same GET /dashboard/me
  // work_preferences the Profile page's "Seat Preferences" section already
  // shows, rather than a separate tree-specific setting. If the admin has
  // no saved preference either, this just resolves to nulls and the tree
  // stays blank/collapsed, same as it always has. When a floor was saved
  // too, this also selects it (same as clicking it) so its layouts load
  // immediately instead of leaving "Select a floor to view layouts" up.
  useEffect(() => {
    if (initialSiteId) return;
    let cancelled = false;
    getDefaultOfficePreference().then(
      ({ siteId, siteName, buildingId, buildingName, floorId, floorName }) => {
        if (cancelled || !siteId) return;
        setExpandedOffices((prev) => new Set(prev).add(siteId));
        fetchBuildingsForSite(siteId);
        if (buildingId) {
          setExpandedTowers((prev) => new Set(prev).add(buildingId));
          fetchFloorsForBuilding(buildingId);
        }
        if (buildingId && floorId) {
          setSelectedFloor(floorId);
          onSelectRef.current({
            siteId,
            buildingId,
            floorId,
            siteName: siteName ?? "",
            buildingName: buildingName ?? "",
            floorName: floorName ?? "",
          });
        }
      }
    );
    return () => { cancelled = true; };
  }, [initialSiteId, fetchBuildingsForSite, fetchFloorsForBuilding]);

  // ── Fetch just the initial site→building→floor path (not everything) so
  // the parent gets the resolved names for the restored selection. ─────────
  // fetchBuildingsForSite/fetchFloorsForBuilding only need the ids we
  // already have as props -- neither actually depends on `sites` being
  // loaded first, so firing both together (instead of waiting on `sites`,
  // then awaiting buildings, then awaiting floors in sequence) turns a
  // 3-round-trip waterfall into one round trip's worth of wall-clock time.
  // `sites` is only consulted afterward, just to resolve the site's own
  // display name -- if it hasn't loaded yet by the time this resolves,
  // this effect re-runs once `sites` populates (it's a dependency below)
  // and re-fires onSelect with the name filled in; both fetches are
  // already cached by then, so that second pass is instant.
  useEffect(() => {
    if (!initialSiteId || !initialBuildingId || !initialFloorId) return;

    let cancelled = false;
    (async () => {
      const [blds, flrs] = await Promise.all([
        fetchBuildingsForSite(initialSiteId),
        fetchFloorsForBuilding(initialBuildingId),
      ]);
      if (cancelled) return;

      const building = blds.find((b) => b.building_id === initialBuildingId);
      const floor = flrs.find((f) => f.floor_id === initialFloorId);
      if (!building || !floor) return;

      const site = sites.find((s) => s.site_id === initialSiteId);
      onSelectRef.current({
        siteId: initialSiteId,
        buildingId: initialBuildingId,
        floorId: initialFloorId,
        siteName: site?.site_name ?? "",
        buildingName: building.building_name,
        floorName: floor.floor_name,
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
        const q = value.toLowerCase();
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
            floor_id: floor.floor_id,
            floor_name: floor.floor_name,
            siteId: site.site_id,
            siteName: site.site_name,
            buildingId: building.building_id,
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
  // The fetch call has to happen OUTSIDE the setState updater below, not
  // inside it -- an updater function must be pure (React can, and in Strict
  // Mode deliberately does, invoke it more than once to check exactly
  // this), and fetchBuildingsForSite/fetchFloorsForBuilding call the
  // store's own setState synchronously up front. Doing that from inside
  // another component's state updater is what produced "Cannot update a
  // component while rendering a different component".
  const toggleOffice = useCallback((siteId: string) => {
    const isExpanding = !expandedOffices.has(siteId);
    setExpandedOffices((prev) => {
      const next = new Set(prev);
      if (isExpanding) next.add(siteId); else next.delete(siteId);
      return next;
    });
    if (isExpanding) fetchBuildingsForSite(siteId);
  }, [expandedOffices, fetchBuildingsForSite]);

  const toggleTower = useCallback((buildingId: string) => {
    const isExpanding = !expandedTowers.has(buildingId);
    setExpandedTowers((prev) => {
      const next = new Set(prev);
      if (isExpanding) next.add(buildingId); else next.delete(buildingId);
      return next;
    });
    if (isExpanding) fetchFloorsForBuilding(buildingId);
  }, [expandedTowers, fetchFloorsForBuilding]);

  const isBusy = sitesLoading || isSearchLoading;

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
            sitesLoading ? "Loading sites…" : isSearchLoading ? "Searching…" : "Search floors..."
          }
          disabled={sitesLoading}
          className="w-full h-10 pl-9 pr-8 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-wait"
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
                  ? <ChevronDown className="w-4 h-4" />
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
                            ? <ChevronDown className="w-4 h-4" />
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
                                      siteId: site.site_id,
                                      buildingId: building.building_id,
                                      floorId: floor.floor_id,
                                      siteName: site.site_name,
                                      buildingName: building.building_name,
                                      floorName: floor.floor_name,
                                    });
                                  }}
                                  className={`cursor-pointer px-2 py-1 rounded transition-colors ${selectedFloor === floor.floor_id
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
