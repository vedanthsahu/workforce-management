"use client";

import { Search } from "lucide-react";
import { FloorSite, FloorBuilding } from "../types/floor.types";

// Internal value for the hidden "All Active/Inactive Offices" placeholder;
// it can't be picked, so it never reaches onSiteChange.
const SCOPED_ALL = "__scoped_all__";

type Props = {
  sites: FloorSite[];
  buildings: FloorBuilding[];
  selectedSite: string;
  selectedBuilding: string;
  onSiteChange: (value: string) => void;
  onBuildingChange: (value: string) => void;
  search: string;
  setSearch: (value: string) => void;
  // When a status card is active and no office is chosen, shown in the
  // dropdown as a placeholder (e.g. "All Active Offices") but not listed as
  // an option -- so picking "All Offices" is always a real change.
  scopedAllLabel?: string;
};

export default function FloorFilters({
  sites,
  buildings,
  selectedSite,
  selectedBuilding,
  onSiteChange,
  onBuildingChange,
  search,
  setSearch,
  scopedAllLabel,
}: Props) {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">

      <select
        value={selectedSite || (scopedAllLabel ? SCOPED_ALL : "")}
        onChange={(e) => onSiteChange(e.target.value)}
        className="h-10 px-4 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
      >
        {scopedAllLabel && <option value={SCOPED_ALL} disabled hidden>{scopedAllLabel}</option>}
        <option value="">All Offices</option>
        {sites.map((site) => (
          <option key={site.site_id} value={site.site_id} className="text-gray-900">{site.site_name}</option>
        ))}
      </select>

      <select
        value={selectedBuilding}
        disabled={!selectedSite}
        onChange={(e) => onBuildingChange(e.target.value)}
        title={selectedSite ? undefined : "Select an Office first to filter by building"}
        className="h-10 px-4 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 text-gray-900"
      >
        <option value="">All Buildings</option>
        {buildings.map((building) => (
          <option key={building.building_id} value={building.building_id}>{building.building_name}</option>
        ))}
      </select>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 w-50 pl-9 pr-3 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Search by floor name..."
        />
      </div>

    </div>
  );
}
