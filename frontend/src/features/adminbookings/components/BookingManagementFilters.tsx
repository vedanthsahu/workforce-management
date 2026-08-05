"use client";

import { useEffect, useRef, useState } from "react";
import { adminBookingsService } from "../services/adminBookings.service";
import { mapAdminBookingRawToUiBooking } from "../utils/mapAdminBooking";
import { Building2, CalendarDays, ChevronDown, Layers, RotateCcw, Search, ShieldCheck, User, Users, X } from "lucide-react";
import {
  AdminBooking,
  AdminBookingFilters,
  AdminBookingSiteOption,
  AdminBookingBuildingOption,
  AdminBookingFloorOption,
} from "../types/adminBooking.types";
import { BOOKING_STATUS_OPTIONS } from "../utils/constants";

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
              onKeyDown={(e) => {
                if (!["Tab", "Escape", "Shift"].includes(e.key)) e.preventDefault();
              }}
              onPaste={(e) => e.preventDefault()}
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
              onKeyDown={(e) => {
                if (!["Tab", "Escape", "Shift"].includes(e.key)) e.preventDefault();
              }}
              onPaste={(e) => e.preventDefault()}
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
      style={{ minWidth, maxWidth: "100%", flex: width ? `1 1 ${width}` : "0 1 auto" }}
    >
      {label && <label className="text-xs font-medium text-gray-600">{label}</label>}
      {children}
    </div>
  );
}

const selectBaseClass =
  "h-10 pr-8 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-colors cursor-pointer w-full";

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
  icon,
  clearable,
  defaultValue = "All",
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
  /** Shown as an unselectable placeholder when value is "" — not a real option, just a prompt. */
  placeholder?: string;
  /** Optional leading icon rendered inside the field, left of the text. */
  icon?: React.ReactNode;
  /** Shows an inline "X" once value differs from `defaultValue`; clicking it resets back to `defaultValue`. */
  clearable?: boolean;
  defaultValue?: string;
}) {
  const showClear = !!clearable && !!value && value !== defaultValue;

  return (
    <div className="relative">
      {icon && (
        <span
          className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${disabled ? "text-gray-300" : "text-gray-400"}`}
        >
          {icon}
        </span>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`${selectBaseClass} ${icon ? "pl-8" : "pl-3"} disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400`}
        style={showClear ? { backgroundImage: "none" } : selectArrowStyle}
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
      {showClear && (
        <button
          type="button"
          onClick={() => onChange(defaultValue)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={14} />
        </button>
      )}
    </div>
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

  // Employee/Guest & Seat suggestion dropdowns hit the backend's own
  // search/seatCode filters directly (debounced) instead of pre-loading
  // everything and matching client-side.
  const [employeeSuggestions, setEmployeeSuggestions] = useState<AdminBooking[]>([]);
  useEffect(() => {
    const q = filters.search.trim();
    if (!q) {
      setEmployeeSuggestions([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      adminBookingsService
        .list({
          search: q,
          bookingType: filters.bookingType === "Employee" ? "EMPLOYEE" : filters.bookingType === "Guest" ? "GUEST" : undefined,
          page: 1,
          limit: 8,
        })
        .then((res) => {
          if (cancelled) return;
          const seen = new Set<string>();
          const matches: AdminBooking[] = [];
          for (const raw of res.items) {
            const b = mapAdminBookingRawToUiBooking(raw);
            const key = `${b.person_name}|${b.person_email}`;
            if (seen.has(key)) continue;
            seen.add(key);
            matches.push(b);
          }
          setEmployeeSuggestions(matches);
        })
        .catch(() => {
          if (!cancelled) setEmployeeSuggestions([]);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [filters.search, filters.bookingType]);

  const searchPlaceholder = filters.bookingType
    ? "Search by name or email"
    : "Select Employee or Guest first";

  const [seatSuggestions, setSeatSuggestions] = useState<AdminBooking[]>([]);
  useEffect(() => {
    const q = filters.seatNumber.trim();
    if (!q) {
      setSeatSuggestions([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      adminBookingsService
        .list({ seatCode: q, page: 1, limit: 8 })
        .then((res) => {
          if (cancelled) return;
          const seen = new Set<string>();
          const matches: AdminBooking[] = [];
          for (const raw of res.items) {
            const b = mapAdminBookingRawToUiBooking(raw);
            if (!b.seat_code || seen.has(b.seat_code)) continue;
            seen.add(b.seat_code);
            matches.push(b);
          }
          setSeatSuggestions(matches);
        })
        .catch(() => {
          if (!cancelled) setSeatSuggestions([]);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [filters.seatNumber]);

  // Keep the status selection valid when bookingType changes. If the
  // currently selected status is not present in the new options, reset
  // it back to "All" so the UI and backend filters stay consistent.
  useEffect(() => {
    const employeeStatusValues = ["All", "Confirmed", "Cancelled", "Modified"];
    const allStatusValues = BOOKING_STATUS_OPTIONS.map((o) => o.value);
    const guestStatusValues = allStatusValues.filter((v) => v !== "No Show");

    const allowed =
      filters.bookingType === "Employee"
        ? employeeStatusValues
        : filters.bookingType === "Guest"
        ? guestStatusValues
        : allStatusValues;

    if (!allowed.includes(filters.status)) onUpdate("status", "All");
  }, [filters.bookingType, filters.status, onUpdate]);

  return (
    <div className="flex flex-col gap-4">
      {/* Row 1 */}
      <div className="flex items-end gap-3 flex-wrap">
        <Field label="Date Range" width="240px">
          <DateRangeField
            dateFrom={filters.dateFrom}
            dateTo={filters.dateTo}
            onChange={(from, to) => {
              onUpdate("dateFrom", from);
              onUpdate("dateTo", to);
            }}
          />
        </Field>

        <Field label="Office" width="175px">
          <NativeSelect
            value={filters.site}
            onChange={onSiteChange}
            placeholder="Select Office"
            icon={<Building2 size={14} />}
            options={[
              { value: "All", label: "All Office" },
              ...sites.map((s) => ({ value: s.site_id, label: s.site_name })),
            ]}
          />
        </Field>

        <Field label="Building" width="175px">
          <NativeSelect
            value={filters.building}
            onChange={onBuildingChange}
            disabled={!filters.site || filters.site === "All"}
            placeholder="Select Building"
            icon={<Building2 size={14} />}
            options={[
              { value: "All", label: "All Building" },
              ...buildings.map((b) => ({ value: b.building_id, label: b.building_name })),
            ]}
          />
        </Field>

        <Field label="Floor" width="175px">
          <NativeSelect
            value={filters.floor}
            onChange={(v) => onUpdate("floor", v)}
            disabled={!filters.building || filters.building === "All"}
            placeholder="Select Floor"
            icon={<Layers size={14} />}
            options={[
              { value: "All", label: "All Floor" },
              ...floors.map((f) => ({ value: f.floor_id, label: f.floor_name })),
            ]}
          />
        </Field>

        <Field label="Status" width="170px">
          {(() => {
            let statusOptions: { value: string; label: string }[];
            if (filters.bookingType === "Employee") {
              statusOptions = [
                { value: "All", label: "All Status" },
                { value: "Confirmed", label: "Confirmed" },
                { value: "Cancelled", label: "Cancelled" },
                { value: "Modified", label: "Modified" },
              ];
            } else if (filters.bookingType === "Guest") {
              statusOptions = BOOKING_STATUS_OPTIONS.filter((o) => o.value !== "No Show");
            } else {
              statusOptions = BOOKING_STATUS_OPTIONS;
            }

            return (
              <NativeSelect
                value={filters.status}
                onChange={(v) => onUpdate("status", v)}
                icon={<ShieldCheck size={14} />}
                options={statusOptions}
                clearable
              />
            );
          })()}
        </Field>
      </div>

      {/* Row 2 */}
      <div className="flex items-end gap-2 flex-wrap" >
        <Field label="Search By" minWidth="100px">
          <div className="h-10 inline-flex items-center bg-gray-200 border border-gray-200 p-1 rounded-lg gap-1">
            {(["Employee", "Guest"] as const).map((opt) => {
              const active = filters.bookingType === opt;
              const Icon = opt === "Employee" ? User : Users;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => onUpdate("bookingType", opt)}
                  className={`inline-flex items-center justify-center gap-1 w-21 h-full px-2 text-[12px] font-medium rounded-md transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/50 ${active ? "bg-indigo-700 text-white shadow-sm" : "bg-white text-gray-700 shadow-sm hover:bg-gray-50"}`}
                >
                  <Icon size={13} />
                  {opt}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label={filters.bookingType === "Guest" ? "Search Guest" : "Search Employee"}>
          <div ref={searchRef} className="relative w-full sm:w-60">
              {/* input wrapper is positioned relative so icon centers within input only */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={filters.search}
                  disabled={!filters.bookingType}
                  title={!filters.bookingType ? "Select Employee or Guest before Search" : undefined}
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
                            {initialsOf(b.person_name)}
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
          <div ref={seatRef} className="relative w-full sm:w-60">
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
            className="h-10 px-5 flex items-center gap-1.5 text-sm font-medium text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg transition-colors shadow-sm"
          >
            <Search size={14} />
            Search
          </button>
        </div>
      </div>
    </div>
  );
}
