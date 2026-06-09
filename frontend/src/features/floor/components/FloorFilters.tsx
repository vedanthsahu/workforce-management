"use client";

import { Search } from "lucide-react";

type Props = {
  search: string;
  setSearch: (
    value: string
  ) => void;
};

export default function FloorFilters({
  search,
  setSearch,
}: Props) {
  return (
    <div className="relative w-full sm:w-80">
      <Search
        size={16}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
      />

      <input
        value={search}
        onChange={(e) =>
          setSearch(e.target.value)
        }
        placeholder="Search floors by floor code or floor name"
        className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}