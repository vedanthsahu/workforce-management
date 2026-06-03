"use client";

import { useEffect, useRef, useState } from "react";
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

export default function FloorTree({
  onSelect,
  initialSiteId,
  initialBuildingId,
  initialFloorId,
}: Props) {
  const [expandedOffices, setExpandedOffices] = useState<Set<string>>(new Set());
  const [expandedTowers, setExpandedTowers]   = useState<Set<string>>(new Set());
  const [selectedFloor, setSelectedFloor]     = useState<string>("");
  const [search, setSearch]                   = useState("");
  const [isPreloading, setIsPreloading]       = useState(true);

  const [sites, setSites]           = useState<Site[]>([]);
  const [buildings, setBuildings]   = useState<Record<string, Building[]>>({});
  const [floors, setFloors]         = useState<Record<string, Floor[]>>({});
  const [allFloorsFlat, setAllFloorsFlat] = useState<FlatFloor[]>([]);

  // Always-fresh refs so handlers never close over stale state
  const allFloorsFlatRef = useRef<FlatFloor[]>([]);
  const buildingsRef     = useRef<Record<string, Building[]>>({});
  const floorsRef        = useRef<Record<string, Floor[]>>({});

  useEffect(() => { allFloorsFlatRef.current = allFloorsFlat; }, [allFloorsFlat]);
  useEffect(() => { buildingsRef.current     = buildings;     }, [buildings]);
  useEffect(() => { floorsRef.current        = floors;        }, [floors]);

  // ── Boot: load sites + preload ALL buildings/floors in parallel ──────────
  useEffect(() => {
    bootData();
  }, []);

  const bootData = async () => {
    setIsPreloading(true);
    try {
      const sitesData = await getSites();
      setSites(sitesData);

      // Fetch all buildings in parallel across all sites
      const buildingResults = await Promise.all(
        sitesData.map((site: Site) =>
          getBuildings(site.site_id).then((blds: Building[]) => ({ site, blds }))
        )
      );

      const newBuildings: Record<string, Building[]> = {};
      for (const { site, blds } of buildingResults) {
        newBuildings[site.site_id] = blds;
      }
      setBuildings(newBuildings);
      buildingsRef.current = newBuildings;

      // Flatten all building entries with their parent site
      const allBuildingEntries = buildingResults.flatMap(
        ({ site, blds }: { site: Site; blds: Building[] }) =>
          blds.map((b: Building) => ({ site, building: b }))
      );

      // Fetch all floors in parallel across all buildings
      const floorResults = await Promise.all(
        allBuildingEntries.map(
          ({ site, building }: { site: Site; building: Building }) =>
            getFloors(building.building_id).then((flrs: Floor[]) => ({
              site,
              building,
              flrs,
            }))
        )
      );

      const newFloors: Record<string, Floor[]> = {};
      const flat: FlatFloor[] = [];

      for (const { site, building, flrs } of floorResults) {
        newFloors[building.building_id] = flrs;
        flat.push(
          ...flrs.map((f: Floor) => ({
            floor_id:     f.floor_id,
            floor_name:   f.floor_name,
            siteId:       site.site_id,
            siteName:     site.site_name,
            buildingId:   building.building_id,
            buildingName: building.building_name,
          }))
        );
      }

      setFloors(newFloors);
      floorsRef.current = newFloors;

      setAllFloorsFlat(flat);
      allFloorsFlatRef.current = flat;
    } finally {
      setIsPreloading(false);
    }
  };

  // ── Restore initial selection ────────────────────────────────────────────
  useEffect(() => {
    if (!initialSiteId) return;
    setExpandedOffices((prev) => new Set([...prev, initialSiteId]));
    if (initialBuildingId) {
      setExpandedTowers((prev) => new Set([...prev, initialBuildingId]));
    }
    setSelectedFloor(initialFloorId || "");
  }, [initialSiteId, initialBuildingId, initialFloorId]);

  // ── Search: runs on every keystroke, data already in refs ───────────────
  const handleSearch = (value: string) => {
    setSearch(value);

    if (!value.trim()) {
      setExpandedOffices(new Set());
      setExpandedTowers(new Set());
      return;
    }

    const q = value.toLowerCase();
    const matches = allFloorsFlatRef.current.filter((f) =>
      f.floor_name.toLowerCase().includes(q)
    );

    if (matches.length === 0) return;

    setExpandedOffices(new Set(matches.map((m) => m.siteId)));
    setExpandedTowers(new Set(matches.map((m) => m.buildingId)));
  };

  // ── Derived: matching floor IDs for render-time filtering ───────────────
  const matchingFloorIds: Set<string> | null = search.trim()
    ? new Set(
        allFloorsFlat
          .filter((f) => f.floor_name.toLowerCase().includes(search.toLowerCase()))
          .map((f) => f.floor_id)
      )
    : null;

  // ── Manual expand/collapse ───────────────────────────────────────────────
  const toggleOffice = (siteId: string) => {
    setExpandedOffices((prev) => {
      const next = new Set(prev);
      prev.has(siteId) ? next.delete(siteId) : next.add(siteId);
      return next;
    });
  };

  const toggleTower = (buildingId: string) => {
    setExpandedTowers((prev) => {
      const next = new Set(prev);
      prev.has(buildingId) ? next.delete(buildingId) : next.add(buildingId);
      return next;
    });
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="bg-white border rounded-lg p-4">
      <h3 className="font-medium mb-3">Floors</h3>

      {/* Search */}
      <div className="relative mb-4">
        {isPreloading ? (
          <Loader2 className="absolute left-3 top-3 w-4 h-4 text-muted-foreground animate-spin" />
        ) : (
          <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
        )}
        <input
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder={isPreloading ? "Loading floors…" : "Search floors..."}
          disabled={isPreloading}
          className="w-full h-10 pl-9 pr-8 border rounded-md text-sm disabled:opacity-50 disabled:cursor-wait"
        />
        {search && !isPreloading && (
          <button
            onClick={() => handleSearch("")}
            className="absolute right-3 top-3 text-muted-foreground hover:text-gray-700"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Empty state */}
      {!isPreloading && matchingFloorIds !== null && matchingFloorIds.size === 0 && (
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
              {/* Site row */}
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => toggleOffice(site.site_id)}
              >
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{site.site_name}</span>
                </div>
                {expandedOffices.has(site.site_id) ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </div>

              {/* Buildings */}
              {expandedOffices.has(site.site_id) && (
                <div className="ml-5 mt-2 space-y-2">
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
                        {/* Building row */}
                        <div
                          className="flex items-center justify-between cursor-pointer"
                          onClick={() => toggleTower(building.building_id)}
                        >
                          <span>{building.building_name}</span>
                          {expandedTowers.has(building.building_id) ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </div>

                        {/* Floors */}
                        {expandedTowers.has(building.building_id) && (
                          <div className="ml-5 mt-2 space-y-1">
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
}