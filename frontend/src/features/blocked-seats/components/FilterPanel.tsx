import { CalendarDays, Search } from "lucide-react";
import type { BlockedSeatFilters, LocationOption } from "../types/blockedSeats.types";
import { BLOCK_TYPE_OPTIONS } from "../utils/constants";

interface Props {
  filters: BlockedSeatFilters; sites: LocationOption[]; buildings: LocationOption[]; floors: LocationOption[];
  onChange: (key: keyof BlockedSeatFilters, value: string) => void; onSearch: () => void; enabled: boolean;
}
export default function FilterPanel({ filters, sites, buildings, floors, onChange, onSearch, enabled }: Props) {
  const selectClass = "h-9 w-full rounded-md border border-input bg-background px-3 text-xs text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:bg-muted disabled:text-muted-foreground";
  const fields: Array<[keyof BlockedSeatFilters, string, LocationOption[]]> = [["siteId", "Site", sites], ["buildingId", "Building", buildings], ["floorId", "Floor", floors]];
  return <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16}/><input value={filters.search} onChange={(e) => onChange("search", e.target.value)} placeholder="Search by seat ID or reason" className="h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/10"/></div><div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
    {fields.map(([key, label, options]) => <label key={key} className="space-y-1.5 text-xs font-semibold text-foreground">{label}<select value={filters[key]} disabled={(key === "buildingId" && !filters.siteId) || (key === "floorId" && !filters.buildingId)} onChange={(e) => onChange(key, e.target.value)} className={selectClass}><option value="">All {label.toLowerCase()}s</option>{options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></label>)}
    <label className="space-y-1.5 text-xs font-semibold text-foreground">Block type<select value={filters.blockType} onChange={(e) => onChange("blockType", e.target.value)} className={selectClass}><option value="">All types</option>{BLOCK_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
    <label className="space-y-1.5 text-xs font-semibold text-foreground">Date<div className="relative"><CalendarDays className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={15}/><input type="date" value={filters.date} onChange={(e) => onChange("date", e.target.value)} className={`${selectClass} pl-9`}/></div></label>
    <button type="button" disabled={!enabled} onClick={onSearch} className="mt-[22px] inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"><Search size={16}/>Search</button>
  </div></section>;
}
