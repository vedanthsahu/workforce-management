"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronDown, Search } from "lucide-react";
import { AdminBookingFilters } from "../types/adminBooking.types";

type Props = {
  filters: AdminBookingFilters;
  onUpdate: <K extends keyof AdminBookingFilters>(key: K, value: AdminBookingFilters[K]) => void;
  onClear: () => void;
  onSearch: () => void;
};

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
}: {
  label: string;
  children: React.ReactNode;
  minWidth?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5 shrink-0" style={{ minWidth }}>
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
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={selectClass}
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

export default function BookingManagementFilters({ filters, onUpdate, onClear, onSearch }: Props) {
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

        <Field label="Office">
          <NativeSelect
            value={filters.site}
            onChange={(v) => onUpdate("site", v)}
            options={[
              { value: "All", label: "All Offices" },
              { value: "Hyderabad", label: "Hyderabad" },
              { value: "Bangalore", label: "Bangalore" },
              { value: "Pune", label: "Pune" },
            ]}
          />
        </Field>

        <Field label="Building">
          <NativeSelect
            value={filters.building}
            onChange={(v) => onUpdate("building", v)}
            options={[
              { value: "All", label: "All Buildings" },
              { value: "Roxana", label: "Roxana" },
              { value: "Solitaire", label: "Solitaire" },
            ]}
          />
        </Field>

        <Field label="Floor">
          <NativeSelect
            value={filters.floor}
            onChange={(v) => onUpdate("floor", v)}
            options={[
              { value: "All", label: "All Floors" },
              { value: "5th", label: "5th Floor" },
              { value: "6th", label: "6th Floor" },
            ]}
          />
        </Field>

        <div className="flex items-end gap-3 shrink-0">
          <Field label="Booking Type" minWidth="140px">
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

          <Field label="Status" minWidth="140px">
            <NativeSelect
              value={filters.status}
              onChange={(v) => onUpdate("status", v)}
              options={[
                { value: "All", label: "All" },
                { value: "Confirmed", label: "Confirmed" },
                { value: "Checked In", label: "Checked In" },
                { value: "Cancelled", label: "Cancelled" },
                { value: "Completed", label: "Completed" },
              ]}
            />
          </Field>
        </div>
      </div>

      {/* Row 2 */}
      <div className="flex items-end gap-3 flex-wrap">
        <Field label="Employee / Guest">
          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or email"
              value={filters.search}
              onChange={(e) => onUpdate("search", e.target.value)}
              className="h-10 pl-9 pr-3 w-full text-sm text-gray-700 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-colors placeholder:text-gray-400"
            />
          </div>
        </Field>

        <Field label="Seat Number">
          <div className="relative w-full sm:w-56">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search seat number"
              value={filters.seatNumber}
              onChange={(e) => onUpdate("seatNumber", e.target.value)}
              className="h-10 pl-9 pr-3 w-full text-sm text-gray-700 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-colors placeholder:text-gray-400"
            />
          </div>
        </Field>

        <Field label="Booked By">
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

        <div className="flex items-center gap-2 ml-auto">
          <button
            type="button"
            onClick={onClear}
            className="h-10 px-4 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={onSearch}
            className="h-10 px-5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm"
          >
            Search
          </button>
        </div>
      </div>
    </div>
  );
}
