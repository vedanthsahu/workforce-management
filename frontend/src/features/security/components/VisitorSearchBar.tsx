"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

type Props = {
  search: string;
  onSearchChange: (value: string) => void;
  placeholder?: string;
};

export function VisitorSearchBar({
  search,
  onSearchChange,
  placeholder = "Search by guest name...",
}: Props) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      <Input
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={placeholder}
        className="pl-9 h-9 text-sm w-60"
      />
    </div>
  );
}