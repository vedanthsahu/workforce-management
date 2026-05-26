"use client";

import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

type Props = {
  search: string;
  setSearch: (value: string) => void;
};

export default function OfficeFilters({ search, setSearch }: Props) {
  return (
    <div className="flex justify-between items-center p-4 border-b">
      
      <h2 className="font-bold text-gray-900">
        Offices List
      </h2>

      <div className="relative w-64">
        <Input
          placeholder="Search offices..."
          value={search} // 🔥 controlled input
          onChange={(e) => setSearch(e.target.value)} // 🔥 triggers hook
          className="pl-9 rounded-lg"
        />
        <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
      </div>

    </div>
  );
}