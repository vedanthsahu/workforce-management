"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronDown, RotateCcw, Search } from "lucide-react";
import {
  AdminBooking,
  AdminBookingFilters,
  AdminBookingSiteOption,
  AdminBookingBuildingOption,
  AdminBookingFloorOption,
} from "../types/adminBooking.types";

type Props = {
  filters: AdminBookingFilters;
  onUpdate: <K extends keyof AdminBookingFilters>(key: K, value: AdminBookingFilters[K]) => void;
  onClear: () => void;
  onSearch: () => void;
  sites: AdminBookingSiteOption[];
  buildings: AdminBookingBuildingOption[];
  floors: AdminBookingFloorOption[];
  /** Called with "All" or a real site_id. */
  onSiteChange: (siteId: string) => void;
  /** Called with "All" or a real building_id. */
  onBuildingChange: (buildingId: string) => void;
  /** All loaded bookings, used to compute the live Employee/Guest & Seat suggestion dropdowns. */
  bookings: AdminBooking[];
};

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function DateRangeField({
  dateFrom,
  dateTo,
  onChange,
}: {
  dateFrom: string;
  dateTo: string;
  onChange: (from: string, to: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState(dateFrom);
  const [draftTo, setDraftTo] = useState(dateTo);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDraftFrom(dateFrom);
    setDraftTo(dateTo);
  }, [dateFrom, dateTo]);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const label = dateFrom && dateTo ? `${formatDate(dateFrom)} – ${formatDate(dateTo)}` : "All Dates";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="h-10 px-3 flex items-center gap-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors min-w-[200px]"
      >
        <CalendarDays size={14} className="text-gray-400 shrink-0" />
        <span className="flex-1 text-left truncate">{label}</span>
        <ChevronDown size={14} className="text-gray-400 shrink-0" />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-20 p-3 flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">From</label>
            <input
              type="date"
              value={draftFrom}
              max={draftTo || undefined}
              onChange={(e) => setDraftFrom(e.target.value)}
              className="h-9 px-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">To</label>
            <input
              type="date"
              value={draftTo}
              min={draftFrom || undefined}
              onChange={(e) => setDraftTo(e.target.value)}
              className="h-9 px-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
            />
          </div>
          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setDraftFrom("");
                setDraftTo("");
                onChange("", "");
                setOpen(false);
              }}
              className="h-8 px-3 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => {
                onChange(draftFrom, draftTo);
                setOpen(false);
              }}
              className="h-8 px-3 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  children,
  minWidth = "150px",
  width,
}: {
  label: string;
  children: React.ReactNode;
  minWidth?: string;
  /** Fixed width, overriding content-based sizing so sibling fields line up evenly. */
  width?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5 shrink-0" style={{ minWidth, width }}>
      <label className="text-xs font-medium text-gray-600">{label}</label>
      {children}
    </div>
  );
}

const selectClass =
  "h-10 px-3 pr-8 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-colors cursor-pointer w-full";

const selectArrowStyle: React.CSSProperties = {
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\")",
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 10px center",
};

function NativeSelect({
  value,
  onChange,
  options,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={`${selectClass} disabled:opacity-50 disabled:cursor-not-allowed`}
      style={selectArrowStyle}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export default function BookingManagementFilters({
  filters,
  onUpdate,
  onClear,
  onSearch,
  sites,
  buildings,
  floors,
  onSiteChange,
  onBuildingChange,
  bookings,
}: Props) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [seatOpen, setSeatOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const seatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
      if (seatRef.current && !seatRef.current.contains(e.target as Node)) setSeatOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const employeeSuggestions = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    if (!q) return [];
    const seen = new Set<string>();
    const matches: AdminBooking[] = [];
    for (const b of bookings) {
      if (!b.person_name.toLowerCase().includes(q) && !b.person_email.toLowerCase().includes(q)) continue;
      const key = `${b.person_name}|${b.person_email}`;
      if (seen.has(key)) continue;
      seen.add(key);
      matches.push(b);
      if (matches.length >= 8) break;
    }
    return matches;
  }, [bookings, filters.search]);

  const seatSuggestions = useMemo(() => {
    const q = filters.seatNumber.trim().toLowerCase();
    if (!q) return [];
    const seen = new Set<string>();
    const matches: AdminBooking[] = [];
    for (const b of bookings) {
      if (!b.seat_code || !b.seat_code.toLowerCase().includes(q)) continue;
      if (seen.has(b.seat_code)) continue;
      seen.add(b.seat_code);
      matches.push(b);
      if (matches.length >= 8) break;
    }
    return matches;
  }, [bookings, filters.seatNumber]);

  return (
    <div className="flex flex-col gap-4">
      {/* Row 1 */}
      <div className="flex items-end gap-3 flex-nowrap">
        <Field label="Date Range">
          <DateRangeField
            dateFrom={filters.dateFrom}
            dateTo={filters.dateTo}
            onChange={(from, to) => {
              onUpdate("dateFrom", from);
              onUpdate("dateTo", to);
            }}
          />
        </Field>

        <Field label="Office" width="187px">
          <NativeSelect
            value={filters.site}
            onChange={onSiteChange}
            options={[
              { value: "All", label: "All Offices" },
              ...sites.map((s) => ({ value: s.site_id, label: s.site_name })),
            ]}
          />
        </Field>

        <Field label="Building" width="187px">
          <NativeSelect
            value={filters.building}
            onChange={onBuildingChange}
            disabled={filters.site === "All"}
            options={[
              { value: "All", label: "All Buildings" },
              ...buildings.map((b) => ({ value: b.building_id, label: b.building_name })),
            ]}
          />
        </Field>

        <Field label="Floor" width="187px">
          <NativeSelect
            value={filters.floor}
            onChange={(v) => onUpdate("floor", v)}
            disabled={filters.building === "All"}
            options={[
              { value: "All", label: "All Floors" },
              ...floors.map((f) => ({ value: f.floor_id, label: f.floor_name })),
            ]}
          />
        </Field>

        <Field label="Booking Type" width="187px">
          <NativeSelect
            value={filters.bookingType}
            onChange={(v) => onUpdate("bookingType", v)}
            options={[
              { value: "All", label: "All" },
              { value: "Employee", label: "Employee" },
              { value: "Guest", label: "Guest" },
            ]}
          />
        </Field>
      </div>

      {/* Row 2 */}
      <div className="flex items-end gap-3 flex-wrap">
        <Field label="Employee / Guest">
          <div ref={searchRef} className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or email"
              value={filters.search}
              onChange={(e) => {
                onUpdate("search", e.target.value);
                setSearchOpen(true);
              }}
              onFocus={() => {
                if (filters.search.trim()) setSearchOpen(true);
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") setSearchOpen(false);
              }}
              className="h-10 pl-9 pr-3 w-full text-sm text-gray-700 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-colors placeholder:text-gray-400"
            />

            {searchOpen && filters.search.trim() && (
              <div className="absolute top-[calc(100%+6px)] left-0 right-0 z-30 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                {employeeSuggestions.length === 0 ? (
                  <p className="px-4 py-3 text-xs text-gray-400 text-center">No matches for &quot;{filters.search}&quot;</p>
                ) : (
                  <ul role="listbox" className="py-1 max-h-60 overflow-y-auto divide-y divide-gray-100">
                    {employeeSuggestions.map((b) => (
                      <li key={`${b.person_name}-${b.person_email}`} role="option">
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            onUpdate("search", b.person_name);
                            setSearchOpen(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-indigo-50 transition-colors text-left"
                        >
                          <span
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0 ${
                              b.person_type === "Guest" ? "bg-violet-100 text-violet-700" : "bg-indigo-100 text-indigo-700"
                            }`}
                          >
                            {b.person_type === "Guest" ? "GV" : initialsOf(b.person_name)}
                          </span>
                          <span className="flex-1 min-w-0">
                            <p className="text-[13px] font-medium text-gray-800 truncate">{b.person_name}</p>
                            <p className="text-[11px] text-gray-400 truncate">{b.person_email}</p>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </Field>

        <Field label="Seat Number">
          <div ref={seatRef} className="relative w-full sm:w-56">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search seat number"
              value={filters.seatNumber}
              onChange={(e) => {
                onUpdate("seatNumber", e.target.value);
                setSeatOpen(true);
              }}
              onFocus={() => {
                if (filters.seatNumber.trim()) setSeatOpen(true);
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") setSeatOpen(false);
              }}
              className="h-10 pl-9 pr-3 w-full text-sm text-gray-700 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-colors placeholder:text-gray-400"
            />

            {seatOpen && filters.seatNumber.trim() && (
              <div className="absolute top-[calc(100%+6px)] left-0 right-0 z-30 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                {seatSuggestions.length === 0 ? (
                  <p className="px-4 py-3 text-xs text-gray-400 text-center">No matches for &quot;{filters.seatNumber}&quot;</p>
                ) : (
                  <ul role="listbox" className="py-1 max-h-60 overflow-y-auto divide-y divide-gray-100">
                    {seatSuggestions.map((b) => (
                      <li key={b.seat_code} role="option">
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            onUpdate("seatNumber", b.seat_code);
                            setSeatOpen(false);
                          }}
                          className="w-full flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-indigo-50 transition-colors text-left"
                        >
                          <span className="text-[13px] font-medium text-gray-800">{b.seat_code}</span>
                          <span className="text-[11px] text-gray-400">{b.seat_type}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </Field>

        <Field label="Booked By"  width="187px">
          <NativeSelect
            value={filters.bookedBy}
            onChange={(v) => onUpdate("bookedBy", v)}
            options={[
              { value: "All", label: "All" },
              { value: "Self", label: "Self" },
              { value: "Admin", label: "Admin" },
            ]}
          />
        </Field>

        <Field label="Status"  width="187px">
          <NativeSelect
            value={filters.status}
            onChange={(v) => onUpdate("status", v)}
            options={[
              { value: "All", label: "All" },
              { value: "Scheduled", label: "Scheduled" },
              { value: "Confirmed", label: "Confirmed" },
              { value: "Checked In", label: "Checked In" },
              { value: "Checked Out", label: "Checked Out" },
              { value: "Completed", label: "Completed" },
              { value: "Cancelled", label: "Cancelled" },
              { value: "Modified", label: "Modified" },
              { value: "No Show", label: "No Show" },
            ]}
          />
        </Field>

        <div className="flex items-center gap-2 ml-auto">
          <button
            type="button"
            onClick={onClear}
            className="h-10 px-4 flex items-center gap-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RotateCcw size={14} />
            Clear
          </button>
          {/* <button
            type="button"
            onClick={onSearch}
            className="h-10 px-5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm"
          >
            Search
          </button> */}
        </div>
      </div>
    </div>
  );
}
