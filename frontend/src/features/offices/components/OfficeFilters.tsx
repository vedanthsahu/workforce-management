"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface OfficeFiltersProps {
  search: string;
  setSearch: (value: string) => void;
}

export default function OfficeFilters({ search, setSearch }: OfficeFiltersProps) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="pl-9"
        placeholder="Search offices..."
      />
    </div>
  );
}
