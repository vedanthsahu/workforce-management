import {
  Building2,
  CalendarDays,
  Layers3,
  MapPin,
  RotateCcw,
  Search,
  ShieldCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { BlockedSeatFilters, LocationOption } from "../types/blockedSeats.types";
import { BLOCK_TYPE_OPTIONS } from "../utils/constants";

interface Props {
  filters: BlockedSeatFilters;
  sites: LocationOption[];
  buildings: LocationOption[];
  floors: LocationOption[];
  loadingSites: boolean;
  loadingBuildings: boolean;
  loadingFloors: boolean;
  onChange: (key: keyof BlockedSeatFilters, value: string) => void;
  onSearch: () => void;
  onClear: () => void;
  enabled: boolean;
}

interface SelectFieldProps {
  label: string;
  value: string;
  placeholder: string;
  icon: LucideIcon;
  options: Array<{ value: string; label: string }>;
  disabled?: boolean;
  onChange: (value: string) => void;
}

const controlClass =
  "h-10 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-3 text-[12.5px] font-normal text-gray-900 outline-none transition-colors focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400 sm:h-11 sm:text-[13px]";

function SelectField({
  label,
  value,
  placeholder,
  icon: Icon,
  options,
  disabled,
  onChange,
}: SelectFieldProps) {
  return (
    <label className="block min-w-0 text-[11px] font-medium text-gray-600 sm:text-[12px]">
      {label}
      <span className="relative mt-1.5 block">
        <Icon
          size={15}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <select
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          className={controlClass}
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </span>
    </label>
  );
}

export default function FilterPanel({
  filters,
  sites,
  buildings,
  floors,
  loadingSites,
  loadingBuildings,
  loadingFloors,
  onChange,
  onSearch,
  onClear,
  enabled,
}: Props) {
  return (
    <section className="rounded-2xl border border-[#EBEBF5] bg-white p-4 shadow-sm sm:p-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5 xl:gap-4">
        <label className="block min-w-0 text-[11px] font-medium text-gray-600 sm:text-[12px]">
          Date
          <span className="relative mt-1.5 block">
            <CalendarDays
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="date"
              value={filters.date}
              onChange={(event) => onChange("date", event.target.value)}
              className={controlClass}
            />
          </span>
        </label>
        <SelectField
          label="Office"
          value={filters.siteId}
          placeholder={loadingSites ? "Loading Offices…" : "All Offices"}
          icon={MapPin}
          options={sites.map((option) => ({
            value: option.id,
            label: option.name,
          }))}
          disabled={loadingSites}
          onChange={(value) => onChange("siteId", value)}
        />
        <SelectField
          label="Building"
          value={filters.buildingId}
          placeholder={loadingBuildings ? "Loading Buildings…" : "All Buildings"}
          icon={Building2}
          options={buildings.map((option) => ({
            value: option.id,
            label: option.name,
          }))}
          disabled={!filters.siteId || loadingBuildings}
          onChange={(value) => onChange("buildingId", value)}
        />
        <SelectField
          label="Floor"
          value={filters.floorId}
          placeholder={loadingFloors ? "Loading Floors…" : "All Floors"}
          icon={Layers3}
          options={floors.map((option) => ({
            value: option.id,
            label: option.name,
          }))}
          disabled={!filters.buildingId || loadingFloors}
          onChange={(value) => onChange("floorId", value)}
        />
        <SelectField
          label="Block Type"
          value={filters.blockType}
          placeholder="All Types"
          icon={ShieldCheck}
          options={BLOCK_TYPE_OPTIONS.map((option) => ({
            value: option.value,
            label: option.label,
          }))}
          onChange={(value) => onChange("blockType", value)}
        />
      </div>

      <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-end">
        <label className="block min-w-0 flex-1 text-[11px] font-medium text-gray-600 sm:text-[12px]">
          Search
          <span className="relative mt-1.5 block">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              value={filters.search}
              onChange={(event) => onChange("search", event.target.value)}
              placeholder="Search by seat ID or reason"
              className={controlClass}
            />
          </span>
        </label>
        <div className="flex shrink-0 justify-end gap-2">
          <button
            type="button"
            onClick={onClear}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-5 text-[12.5px] font-medium text-gray-600 transition-colors hover:bg-gray-50 sm:h-11 sm:text-[13px]"
          >
            <RotateCcw size={15} />
            Clear
          </button>
          <button
            type="button"
            disabled={!enabled}
            onClick={onSearch}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 text-[12.5px] font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40 sm:h-11 sm:text-[13px]"
          >
            <Search size={15} />
            Search
          </button>
        </div>
      </div>
    </section>
  );
}
