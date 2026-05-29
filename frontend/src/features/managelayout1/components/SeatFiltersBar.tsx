"use client";
// SeatFiltersBar.tsx  – unchanged UI, exports defaultFilters helper

import React from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { SeatFilters } from "../types/seat.types";
import { Preference } from "../types/layout.types";

/** Call this to get a fresh "no filters applied" object */
export function defaultFilters(): SeatFilters {
  return {
    search:    "",
    seat_type: "All",
    status:    "All",
    bookable:  "All",
    amenity:   "All",
  };
}

interface Props {
  filters: SeatFilters;
  seatTypes: string[];
  preferences: Preference[];
  onUpdate: <K extends keyof SeatFilters>(key: K, value: SeatFilters[K]) => void;
  onReset: () => void;
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1 min-w-[130px]">
      <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 px-3 pr-8 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-colors cursor-pointer"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 10px center",
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function SeatFiltersBar({
  filters,
  seatTypes,
  preferences,
  onUpdate,
  onReset,
}: Props) {
  const activeCount = [
    filters.search.trim() !== "",
    filters.seat_type !== "All",
    filters.status !== "All",
    filters.bookable !== "All",
    filters.amenity !== "All",
  ].filter(Boolean).length;

  const amenityOptions = [
    { value: "All", label: "All Amenities" },
    ...preferences.map((p) => ({
      value: p.preference_id,
      label: p.preference_name,
    })),
  ];

  return (
    <div className="flex items-end gap-3 flex-wrap">
      {/* Search */}
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
          Search
        </label>
        <div className="relative">
          <Search
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search by seat code…"
            value={filters.search}
            onChange={(e) => onUpdate("search", e.target.value)}
            className="h-9 pl-8 pr-3 w-52 text-xs text-gray-700 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-colors placeholder:text-gray-400"
          />
        </div>
      </div>

      <FilterSelect
        label="Seat Type"
        value={filters.seat_type}
        options={seatTypes.map((t) => ({ value: t, label: t }))}
        onChange={(v) => onUpdate("seat_type", v)}
      />

      <FilterSelect
        label="Status"
        value={filters.status}
        options={[
          { value: "All", label: "All Status" },
          { value: "Active", label: "Active" },
          { value: "Inactive", label: "Inactive" },
          { value: "Maintenance", label: "Maintenance" },
        ]}
        onChange={(v) => onUpdate("status", v)}
      />

      <FilterSelect
        label="Bookable"
        value={filters.bookable}
        options={[
          { value: "All", label: "All" },
          { value: "Yes", label: "Yes" },
          { value: "No", label: "No" },
        ]}
        onChange={(v) => onUpdate("bookable", v)}
      />

      <FilterSelect
        label="Amenities"
        value={filters.amenity}
        options={amenityOptions}
        onChange={(v) => onUpdate("amenity", v)}
      />

      {/* Reset */}
      {activeCount > 0 && (
        <button
          onClick={onReset}
          className="h-9 mt-auto flex items-center gap-1.5 px-3 text-xs font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
        >
          <X size={12} />
          Clear filters
          <span className="w-4 h-4 flex items-center justify-center bg-indigo-500 text-white rounded-full text-[9px] font-bold">
            {activeCount}
          </span>
        </button>
      )}

      {activeCount === 0 && (
        <div className="h-9 mt-auto w-9 flex items-center justify-center border border-gray-200 rounded-lg bg-white text-gray-400">
          <SlidersHorizontal size={14} />
        </div>
      )}
    </div>
  );
}