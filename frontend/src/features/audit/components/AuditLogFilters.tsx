"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays, Clock, ChevronDown, Search, X } from "lucide-react";
import { auditService } from "../services/audit.service";
import { AuditLogFilters as AuditLogFiltersType, AuditLogListItem, AuditTimeMode } from "../types/audit.types";
import { initialsOf, mapAuditLogListItemToUi } from "../utils/mapAuditLog";
import {
  AUDIT_ACTION_OPTIONS,
  AUDIT_ENTITY_OPTIONS,
  AUDIT_MODULE_OPTIONS,
  AUDIT_RELATIVE_TIME_OPTIONS,
  AUDIT_STATUS_OPTIONS,
} from "../utils/constants";

type Props = {
  filters: AuditLogFiltersType;
  onUpdate: <K extends keyof AuditLogFiltersType>(key: K, value: AuditLogFiltersType[K]) => void;
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
              onChange={(e) => {
                // Picking a new From date resets To to match it -- keeps the
                // range valid without the user having to also touch To, but
                // they can still pick a different To afterward (min below
                // just stops them picking one earlier than From).
                const next = e.target.value;
                setDraftFrom(next);
                setDraftTo(next);
              }}
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

function TimeModeToggle({ mode, onChange }: { mode: AuditTimeMode; onChange: (mode: AuditTimeMode) => void }) {
  return (
    <div className="h-10 inline-flex items-center bg-gray-200 border border-gray-200 p-1 rounded-lg gap-1 shrink-0">
      {(
        [
          { key: "date", label: "Date" },
          { key: "relative", label: "Time" },
        ] as const
      ).map(({ key, label }) => {
        const active = mode === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={`inline-flex items-center justify-center h-full px-3 text-[12px] font-medium rounded-md transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/50 ${
              active ? "bg-indigo-700 text-white shadow-sm" : "bg-white text-gray-700 shadow-sm hover:bg-gray-50"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

const selectBaseClass =
  "h-10 pl-3 pr-8 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-colors cursor-pointer w-full";

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
    <select value={value} onChange={(e) => onChange(e.target.value)} className={selectBaseClass} style={selectArrowStyle}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function RelativeTimeField({ value, onChange }: { value: number | null; onChange: (seconds: number | null) => void }) {
  const showClear = value !== null;
  return (
    <div className="relative">
      <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
        className="h-10 pl-9 pr-8 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-colors cursor-pointer w-full"
        style={showClear ? { backgroundImage: "none" } : selectArrowStyle}
      >
        <option value="" disabled hidden>
          Select time range
        </option>
        {AUDIT_RELATIVE_TIME_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {showClear && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

/** Type-ahead "search as you go" user name search -- same debounced
 * fetch-suggestions-from-the-backend pattern as the employee search on
 * Bookings > Book for Someone (BookingManagementFilters.tsx), just backed by
 * GET /admin/audit's name-only `search` instead of admin bookings. */
function UserSearchField({ value, onChange }: { value: string; onChange: (name: string) => void }) {
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<AuditLogListItem[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  useEffect(() => {
    const q = value.trim();
    if (!q) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      auditService
        .list({ search: q, page: 1, limit: 8 })
        .then((res) => {
          if (cancelled) return;
          const seen = new Set<string>();
          const matches: AuditLogListItem[] = [];
          for (const raw of res.items) {
            const log = mapAuditLogListItemToUi(raw);
            const key = log.actorUserId || log.actorName;
            if (seen.has(key)) continue;
            seen.add(key);
            matches.push(log);
          }
          setSuggestions(matches);
        })
        .catch(() => {
          if (!cancelled) setSuggestions([]);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [value]);

  return (
    <div ref={rootRef} className="relative w-60">
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
      <input
        type="text"
        placeholder="Search by user name"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          if (value.trim()) setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
        className="h-10 pl-9 pr-8 w-full text-sm text-gray-700 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-colors placeholder:text-gray-400"
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            onChange("");
            setOpen(false);
          }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={14} />
        </button>
      )}

      {open && value.trim() && (
        <div className="absolute top-[calc(100%+6px)] left-0 right-0 z-30 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          {suggestions.length === 0 ? (
            <p className="px-4 py-3 text-xs text-gray-400 text-center">No matches for &quot;{value}&quot;</p>
          ) : (
            <ul role="listbox" className="py-1 max-h-60 overflow-y-auto divide-y divide-gray-100">
              {suggestions.map((log) => (
                <li key={log.actorUserId || log.actorName} role="option" aria-selected={false}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      onChange(log.actorName);
                      setOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-indigo-50 transition-colors text-left"
                  >
                    <span className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0 bg-indigo-100 text-indigo-700">
                      {initialsOf(log.actorName)}
                    </span>
                    <span className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-gray-800 truncate">{log.actorName}</p>
                      <p className="text-[11px] text-gray-400 truncate">{log.actorEmail}</p>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default function AuditLogFilters({ filters, onUpdate }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-60">
          <TimeModeToggle mode={filters.timeMode} onChange={(mode) => onUpdate("timeMode", mode)} />
          <div className="flex-1 min-w-0">
            {filters.timeMode === "date" ? (
              <DateRangeField
                dateFrom={filters.dateFrom}
                dateTo={filters.dateTo}
                onChange={(from, to) => {
                  onUpdate("dateFrom", from);
                  onUpdate("dateTo", to);
                }}
              />
            ) : (
              <RelativeTimeField value={filters.lastSeconds} onChange={(seconds) => onUpdate("lastSeconds", seconds)} />
            )}
          </div>
        </div>

        <div className="w-[150px]">
          <NativeSelect value={filters.action} onChange={(v) => onUpdate("action", v)} options={AUDIT_ACTION_OPTIONS} />
        </div>
        <div className="w-[150px]">
          <NativeSelect value={filters.module} onChange={(v) => onUpdate("module", v)} options={AUDIT_MODULE_OPTIONS} />
        </div>
        <div className="w-[150px]">
          <NativeSelect value={filters.entity} onChange={(v) => onUpdate("entity", v)} options={AUDIT_ENTITY_OPTIONS} />
        </div>
        <div className="w-[150px]">
          <NativeSelect value={filters.status} onChange={(v) => onUpdate("status", v)} options={AUDIT_STATUS_OPTIONS} />
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <UserSearchField value={filters.search} onChange={(name) => onUpdate("search", name)} />
      </div>
    </div>
  );
}
