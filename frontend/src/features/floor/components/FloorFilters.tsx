"use client";

import { Search } from "lucide-react";
import { FloorSite, FloorBuilding } from "../types/floor.types";

type Props = {
  sites: FloorSite[];
  buildings: FloorBuilding[];
  selectedSite: string;
  selectedBuilding: string;
  onSiteChange: (value: string) => void;
  onBuildingChange: (value: string) => void;
  search: string;
  setSearch: (value: string) => void;
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
}: Props) {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">

      <select
        value={selectedSite}
        onChange={(e) => onSiteChange(e.target.value)}
        className="h-10 px-4 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
      >
        <option value="" disabled hidden>All Sites</option>
        {sites.map((site) => (
          <option key={site.site_id} value={site.site_id} className="text-gray-900">{site.site_name}</option>
        ))}
      </select>

      <select
        value={selectedBuilding}
        disabled={!selectedSite}
        onChange={(e) => onBuildingChange(e.target.value)}
        className="h-10 px-4 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 text-gray-900"
      >
        <option value="" disabled hidden>All Buildings</option>
        {buildings.map((building) => (
          <option key={building.building_id} value={building.building_id}>{building.building_name}</option>
        ))}
      </select>

      <div className="relative">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-auto pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Search floors by floor code or floor name"
        />
      </div>

    </div>
  );
}
