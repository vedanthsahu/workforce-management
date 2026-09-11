import { CalendarDays, Search } from "lucide-react";
import type { BlockedSeatFilters, LocationOption } from "../types/blockedSeats.types";
import { BLOCK_TYPE_OPTIONS } from "../utils/constants";

interface Props {
  filters: BlockedSeatFilters; sites: LocationOption[]; buildings: LocationOption[]; floors: LocationOption[];
  onChange: (key: keyof BlockedSeatFilters, value: string) => void; onSearch: () => void; enabled: boolean;
}
export default function FilterPanel({ filters, sites, buildings, floors, onChange, onSearch, enabled }: Props) {
  const selectClass = "h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100";
  const fields: Array<[keyof BlockedSeatFilters, string, LocationOption[]]> = [["siteId", "Site", sites], ["buildingId", "Building", buildings], ["floorId", "Floor", floors]];
  return <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/><input value={filters.search} onChange={(e) => onChange("search", e.target.value)} placeholder="Search by seat ID or reason" className="h-10 w-full rounded-md border border-slate-200 pl-10 pr-3 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"/></div><div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
    {fields.map(([key, label, options]) => <label key={key} className="space-y-1.5 text-xs font-semibold text-slate-700">{label}<select value={filters[key]} disabled={(key === "buildingId" && !filters.siteId) || (key === "floorId" && !filters.buildingId)} onChange={(e) => onChange(key, e.target.value)} className={selectClass}><option value="">All {label.toLowerCase()}s</option>{options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></label>)}
    <label className="space-y-1.5 text-xs font-semibold text-slate-700">Block type<select value={filters.blockType} onChange={(e) => onChange("blockType", e.target.value)} className={selectClass}><option value="">All types</option>{BLOCK_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
    <label className="space-y-1.5 text-xs font-semibold text-slate-700">Date<div className="relative"><CalendarDays className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={15}/><input type="date" value={filters.date} onChange={(e) => onChange("date", e.target.value)} className={`${selectClass} pl-9`}/></div></label>
    <button type="button" disabled={!enabled} onClick={onSearch} className="mt-[22px] inline-flex h-9 items-center justify-center gap-2 rounded-md bg-violet-600 text-sm font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-violet-200"><Search size={16}/>Search</button>
  </div></section>;
}
