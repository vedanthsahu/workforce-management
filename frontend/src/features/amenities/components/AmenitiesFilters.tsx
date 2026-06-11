"use client";

import { Search } from "lucide-react";

type Props = {
  search: string;
  setSearch: (value: string) => void;
  status: string;
  setStatus: (value: string) => void;
};

export default function AmenitiesFilters({
  search,
  setSearch,
  status,
  setStatus,
}: Props) {
  return (
    <div className="flex items-center gap-3 w-full sm:w-auto">
  <div className="relative w-full sm:w-auto">
    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
    <input
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      className="w-full sm:w-auto pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      placeholder="Search amenities..."
    />
  </div>
</div>
  );
}