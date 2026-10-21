"use client";

import { Search } from "lucide-react";
import { SiteOption } from "../types/building.types";

// Internal value for the hidden "All Active/Inactive Offices" placeholder;
// it can't be picked, so it never reaches setSelectedSiteId.
const SCOPED_ALL = "__scoped_all__";

type Props = {
  sites: SiteOption[];
  selectedSiteId: string;
  setSelectedSiteId: (value: string) => void;
  search: string;
  setSearch: (value: string) => void;
  // When a status card is active and no office is chosen, shown in the
  // dropdown as a placeholder (e.g. "All Active Offices") but not listed as
  // an option -- so picking "All Offices" is always a real change.
  scopedAllLabel?: string;
};

export default function BuildingFilters({
  sites, selectedSiteId, setSelectedSiteId, search, setSearch, scopedAllLabel,
}: Props) {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">

      <select
        value={selectedSiteId || (scopedAllLabel ? SCOPED_ALL : "")}
        onChange={(e) => setSelectedSiteId(e.target.value)}
        className="h-10 px-4 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {scopedAllLabel && <option value={SCOPED_ALL} disabled hidden>{scopedAllLabel}</option>}
        <option value=""  >All Offices</option>
        {sites.map((site) => (
          <option key={site.site_id} value={String(site.site_id)}>{site.site_name}</option>
        ))}
      </select>

      <div className="relative">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-auto pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Search by building name..."
        />
      </div>

    </div>
  );
}
