"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { adminActivitiesService } from "../services/adminActivities.service";
import { CalendarDays, ChevronDown, RotateCcw, Search, X } from "lucide-react";
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

  const label = dateFrom && dateTo ? `${formatDate(dateFrom)} – ${formatDate(dateTo)}` : "Select date range";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="h-10 px-3 flex items-center gap-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors w-full"
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
  label?: string;
  children: React.ReactNode;
  minWidth?: string;
  /** Preferred width on wide screens; the field still grows to fill its own line when wrapped on tablet/mobile. */
  width?: string;
}) {
  return (
    <div
      className="flex flex-col gap-1.5"
      style={{ minWidth, maxWidth: "100%", flex: width ? `1 1 ${width}` : "1 1 auto" }}
    >
      {label && <label className="text-xs font-medium text-gray-600">{label}</label>}
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
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
  /** Shown as an unselectable placeholder when value is "" — not a real option, just a prompt. */
  placeholder?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={`${selectClass} disabled:opacity-50 disabled:cursor-not-allowed`}
      style={selectArrowStyle}
    >
      {placeholder && (
        <option value="" disabled hidden>
          {placeholder}
        </option>
      )}
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

  // Load a full activities snapshot to drive suggestions so suggestions
  // remain independent of the other active filters applied to the table.
  const [allActivities, setAllActivities] = useState<AdminBooking[] | null>(null);
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const resp = await adminActivitiesService.list({});
        if (!mounted) return;
        const mapped: AdminBooking[] = (resp.items ?? []).map((it) => ({
          booking_id: it.bookingId ?? it.guestVisitId ?? "",
          person_name: it.bookedFor?.name ?? it.bookedBy?.name ?? "",
          person_type: (it.bookedFor?.entityType === "GUEST" || it.bookedBy?.entityType === "GUEST") ? "Guest" : "Employee",
          person_email: it.bookedFor?.email ?? it.bookedBy?.email ?? "",
          avatar_url: undefined,
          seat_code: it.seat?.seatCode ?? "",
          seat_type: it.seat?.seatType ?? "",
          site_name: it.site?.siteName ?? "",
          building_name: it.building?.buildingName ?? "",
          floor_name: it.floor?.floorName ?? "",
          activity_date: it.activityDate ?? "",
          date_label: it.activityDate ?? "",
          date_relative: "",
          time_range: "",
          status: (it.activityStatus as any) ?? "Scheduled",
          booked_by: "Self",
          booked_on: it.createdAt ?? "",
          check_in_time: it.checkInAt,
          amenities: [],
        }));
        setAllActivities(mapped);
      } catch {
        setAllActivities([]);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const activitySource = allActivities ?? bookings;

  const employeeSuggestions = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    if (!q) return [];
    const seen = new Set<string>();
    const matches: AdminBooking[] = [];
    for (const b of activitySource) {
      // Only respect bookingType toggle; ignore other filters (site/building/floor/date/status)
      if (filters.bookingType === "Employee" && b.person_type !== "Employee") continue;
      if (filters.bookingType === "Guest" && b.person_type !== "Guest") continue;
      if (!b.person_name.toLowerCase().includes(q) && !b.person_email.toLowerCase().includes(q)) continue;
      const key = `${b.person_name}|${b.person_email}`;
      if (seen.has(key)) continue;
      seen.add(key);
      matches.push(b);
      if (matches.length >= 8) break;
    }
    return matches;
  }, [activitySource, filters.search, filters.bookingType]);

  const searchPlaceholder = filters.bookingType === "Employee"
    ? "Search by name or email"
    : filters.bookingType === "Guest"
      ? "Search by name or email"
      : "Select Employee or Guest first";

  const seatSuggestions = useMemo(() => {
    const q = filters.seatNumber.trim().toLowerCase();
    if (!q) return [];
    const seen = new Set<string>();
    const matches: AdminBooking[] = [];
    for (const b of activitySource) {
      if (!b.seat_code || !b.seat_code.toLowerCase().includes(q)) continue;
      if (seen.has(b.seat_code)) continue;
      seen.add(b.seat_code);
      matches.push(b);
      if (matches.length >= 8) break;
    }
    return matches;
  }, [activitySource, filters.seatNumber]);

  return (
    <div className="flex flex-col gap-4">
      {/* Row 1 */}
      <div className="flex items-end gap-3 flex-wrap">
        <Field label="Date Range" width="235px">
          <DateRangeField
            dateFrom={filters.dateFrom}
            dateTo={filters.dateTo}
            onChange={(from, to) => {
              onUpdate("dateFrom", from);
              onUpdate("dateTo", to);
            }}
          />
        </Field>

        <Field label="Office" width="185px">
          <NativeSelect
            value={filters.site}
            onChange={onSiteChange}
            placeholder="Select Office"
            options={[
              { value: "All", label: "All Office" },
              ...sites.map((s) => ({ value: s.site_id, label: s.site_name })),
            ]}
          />
        </Field>

        <Field label="Building" width="185px">
          <NativeSelect
            value={filters.building}
            onChange={onBuildingChange}
            disabled={!filters.site || filters.site === "All"}
            placeholder="Select Building"
            options={[
              { value: "All", label: "All Building" },
              ...buildings.map((b) => ({ value: b.building_id, label: b.building_name })),
            ]}
          />
        </Field>

        <Field label="Floor" width="185px">
          <NativeSelect
            value={filters.floor}
            onChange={(v) => onUpdate("floor", v)}
            disabled={!filters.building || filters.building === "All"}
            placeholder="Select Floor"
            options={[
              { value: "All", label: "All Floor" },
              ...floors.map((f) => ({ value: f.floor_id, label: f.floor_name })),
            ]}
          />
        </Field>

        <Field label="Status" width="170px">
          <NativeSelect
            value={filters.status}
            onChange={(v) => onUpdate("status", v)}
            options={[
              { value: "All", label: "All Status" },
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
      </div>

      {/* Row 2 */}
      <div className="flex items-end gap-3 flex-wrap" >
        <Field>
          <div ref={searchRef} className="relative w-full sm:w-64">
              <div className="mb-2">
                <div className="inline-flex items-center bg-gray-100 p-1 rounded-full space-x-1">
                  {(["Employee", "|", "Guest"] as const).map((opt) => {
                    if (opt === "|") {
                      return (
                        <span key={opt} className="px-0.5 text-[12px] text-gray-900 select-none">
                          |
                        </span>
                      );
                    }
                    const active = filters.bookingType === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => onUpdate("bookingType", opt)}
                        className={`px-3 py-1 text-[12px] leading-none rounded-full transition-colors duration-150 focus:outline-none ${active ? "bg-indigo-600 text-white shadow-sm" : "text-gray-600 hover:bg-white/60"}`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* input wrapper is positioned relative so icon centers within input only */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={filters.search}
                  disabled={!filters.bookingType}
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
                  className="h-10 pl-9 pr-8 w-full text-sm text-gray-700 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-colors placeholder:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50"
                />
                {filters.search && (
                  <button
                    type="button"
                    onClick={() => {
                      onUpdate("search", "");
                      setSearchOpen(false);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

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
              className="h-10 pl-9 pr-8 w-full text-sm text-gray-700 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-colors placeholder:text-gray-400"
            />
            {filters.seatNumber && (
              <button
                type="button"
                onClick={() => {
                  onUpdate("seatNumber", "");
                  setSeatOpen(false);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={14} />
              </button>
            )}

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
              { value: "All", label: "All Booked By" },
              { value: "Self", label: "Self" },
              { value: "Admin", label: "Admin" },
            ]}
          />
        </Field>

        <div className="flex items-center gap-2 w-full sm:w-auto sm:ml-auto justify-end">
          <button
            type="button"
            onClick={onClear}
            className="h-10 px-4 flex items-center gap-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RotateCcw size={14} />
            Clear
          </button>
          <button
            type="button"
            onClick={onSearch}
            className="h-10 px-5 flex items-center gap-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm"
          >
            <Search size={14} />
            Search
          </button>
        </div>
      </div>
    </div>
  );
}
