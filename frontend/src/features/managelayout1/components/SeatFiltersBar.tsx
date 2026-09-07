"use client";
// SeatFiltersBar.tsx  – unchanged UI, exports defaultFilters helper

import React from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { SeatFilters } from "../types/seat.types";
import { Preference } from "../types/layout.types";
import { getAmenityColor } from "@/features/amenities/utils/amenityColors";

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
  options: { value: string; label: string; dotColor?: string }[];
  onChange: (v: string) => void;
}) {
  // "All"-ish is always the first option — anything else counts as active
  // and gets an inline clear (x) instead of relying on a separate,
  // page-wide "Clear filters" button.
  const isActive = value !== options[0]?.value;

  return (
    <div className="flex flex-col gap-1 min-w-[110px] flex-shrink-0">
      <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
        {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-full pl-3 pr-8 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-colors cursor-pointer"
          style={{
            // The clear (x) button takes over this exact spot when a filter
            // is active, so only one icon ever occupies the corner — showing
            // the chevron underneath it too just crowded the two together.
            backgroundImage: isActive
              ? "none"
              : `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 10px center",
          }}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value} style={o.dotColor ? { color: o.dotColor } : undefined}>
              {o.dotColor ? `● ${o.label}` : o.label}
            </option>
          ))}
        </select>
        {isActive && (
          <button
            type="button"
            onClick={() => onChange(options[0].value)}
            aria-label={`Clear ${label} filter`}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-gray-400 hover:text-gray-600"
          >
            <X size={12} />
          </button>
        )}
      </div>
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
      dotColor: getAmenityColor(p.preference_name, p.preference_type).hex,
    })),
  ];

  return (
    <div className="flex items-end gap-3 flex-wrap">
      {/* Search */}
      <div className="flex flex-col gap-1 flex-shrink-0">
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
            className={`h-9 pl-8 ${filters.search ? "pr-7" : "pr-3"} w-44 text-xs text-gray-700 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-colors placeholder:text-gray-400`}
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => onUpdate("search", "")}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={12} />
            </button>
          )}
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
          // { value: "Maintenance", label: "Maintenance" },
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

      {/* Reset all — each field clears itself inline now, this is just a
          shortcut for clearing everything at once. */}
      {activeCount > 0 ? (
        <button
          type="button"
          onClick={onReset}
          title="Clear all filters"
          className="h-9 mt-auto w-9 flex items-center justify-center border border-indigo-200 bg-indigo-50 rounded-lg text-indigo-600 hover:bg-indigo-100 transition-colors flex-shrink-0 relative"
        >
          <SlidersHorizontal size={14} />
          <span className="absolute -top-1.5 -right-1.5 w-4 h-4 flex items-center justify-center bg-indigo-500 text-white rounded-full text-[9px] font-bold">
            {activeCount}
          </span>
        </button>
      ) : (
        <div className="h-9 mt-auto w-9 flex items-center justify-center border border-gray-200 rounded-lg bg-white text-gray-400 flex-shrink-0">
          <SlidersHorizontal size={14} />
        </div>
      )}
    </div>
  );
}