"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays, Clock, ChevronDown, RotateCcw, Search, X } from "lucide-react";
import { auditService } from "../services/audit.service";
import {
  AuditLogFilterOptionRaw,
  AuditLogFilters as AuditLogFiltersType,
  AuditLogListItem,
  AuditTimeMode,
  defaultAuditLogFilters,
} from "../types/audit.types";
import { deriveAuditFilterOptions, initialsOf, mapAuditLogListItemToUi } from "../utils/mapAuditLog";
import {
  AUDIT_RELATIVE_TIME_GROUPS,
  AUDIT_RELATIVE_TIME_OPTIONS,
  AUDIT_SELECT_ARROW_STYLE,
  AUDIT_SELECT_BASE_CLASS,
  AUDIT_STATUS_OPTIONS,
} from "../utils/constants";

type Props = {
  filters: AuditLogFiltersType;
  onUpdate: <K extends keyof AuditLogFiltersType>(key: K, value: AuditLogFiltersType[K]) => void;
  onSearch: () => void;
  onClear: () => void;
  /** Every real (module, entity_type, action) combination for the tenant --
   * powers the cascading Module -> Entity -> Action dropdowns below. */
  filterOptions: AuditLogFilterOptionRaw[];
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
    <div className="flex items-center gap-3">
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
            className={`text-xs font-medium pb-0.5 border-b-2 transition-colors duration-150 ${
              active ? "border-indigo-600 text-indigo-600 font-semibold" : "border-transparent text-gray-600 hover:text-gray-700"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

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
      className={AUDIT_SELECT_BASE_CLASS}
      style={AUDIT_SELECT_ARROW_STYLE}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/** Same value/onChange/options contract as NativeSelect, but a custom
 * click-to-open list instead of a browser-native <select> -- needed only
 * where the option list is long enough to scroll (Action), since a native
 * select's popup is OS/browser chrome and its scrollbar can't be restyled
 * with CSS at all. Module/Entity/Status stay on NativeSelect; their lists
 * are short enough that this doesn't come up for them. */
function CustomSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const selectedLabel = options.find((o) => o.value === value)?.label ?? value;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="h-10 pl-3 pr-8 relative flex items-center text-sm text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors w-full text-left"
      >
        <span className="flex-1 truncate">{selectedLabel}</span>
        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute top-full left-0 mt-1 w-full max-h-60 overflow-y-auto bg-white border border-gray-200 shadow-lg z-20 py-1"
          style={{ scrollbarWidth: "thin", scrollbarColor: "#d1d5db transparent" }}
        >
          {options.map((o) => {
            const active = o.value === value;
            return (
              <li key={o.value} role="option" aria-selected={active}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1 text-sm transition-colors hover:bg-[#767676] hover:text-white ${
                    active ? "text-gray-900 font-medium" : "text-gray-700"
                  }`}
                >
                  {o.label}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Relative time trigger + popover -- same trigger/popover shape as
 * DateRangeField above (untouched), but the popover body is a CloudWatch-
 * style chip grid instead of the old <select>. Picking a chip applies
 * immediately and closes the popover, since there's nothing else to
 * configure (unlike the date range's two inputs + Apply). */
function RelativeTimeField({ value, onChange }: { value: number | null; onChange: (seconds: number | null) => void }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const label = AUDIT_RELATIVE_TIME_OPTIONS.find((o) => o.value === value)?.label ?? "Select time range";
  const showClear = value !== null;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="h-10 pl-9 pr-8 flex items-center text-sm text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors w-full text-left"
      >
        <span className="flex-1 truncate">{label}</span>
      </button>
      <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      {showClear ? (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={14} />
        </button>
      ) : (
        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      )}

      {open && (
        <div className="absolute top-full left-0 mt-1 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-20 p-3 flex flex-col gap-3">
          {AUDIT_RELATIVE_TIME_GROUPS.map((group) => (
            <div key={group.label} className="flex flex-col gap-1.5">
              <p className="text-xs font-medium text-gray-500">{group.label}</p>
              <div className="flex flex-wrap gap-2">
                {group.options.map((o) => {
                  const active = value === o.value;
                  return (
                    <button
                      key={o.value}
                      type="button"
                      title={o.label}
                      onClick={() => {
                        onChange(o.value);
                        setOpen(false);
                      }}
                      className={`h-8 min-w-8 px-2.5 text-xs font-medium rounded-lg border transition-colors ${
                        active
                          ? "bg-indigo-600 border-indigo-600 text-white"
                          : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {o.shortLabel}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
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

function optionLabel(options: { value: string; label: string }[], value: string): string {
  return options.find((o) => o.value === value)?.label ?? value;
}

export default function AuditLogFilters({ filters, onUpdate, onSearch, onClear, filterOptions }: Props) {
  const { moduleOptions, entityOptions, actionOptions } = deriveAuditFilterOptions(
    filterOptions,
    filters.module,
    filters.entity
  );

  // Module -> Entity -> Action is a real hierarchy (see deriveAuditFilterOptions),
  // so narrowing an upstream level resets whatever's downstream -- otherwise
  // a stale Entity/Action selection could point at a combination that no
  // longer applies under the newly picked Module/Entity.
  const handleModuleChange = (module: string) => {
    onUpdate("module", module);
    onUpdate("entity", "All");
    onUpdate("action", "All");
  };
  const handleEntityChange = (entity: string) => {
    onUpdate("entity", entity);
    onUpdate("action", "All");
  };

  // Date <-> Time is a mode switch, not just another field -- the value from
  // whichever mode you're leaving (date range / relative preset) and every
  // other filter become stale against the newly picked mode, so reset
  // everything back to defaults. This only touches the draft `filters` state
  // (nothing is fetched until Search is clicked), so it's a silent, instant
  // reset with no loading flicker.
  const handleTimeModeChange = (mode: AuditTimeMode) => {
    const defaults = defaultAuditLogFilters();
    onUpdate("timeMode", mode);
    onUpdate("search", defaults.search);
    onUpdate("module", defaults.module);
    onUpdate("entity", defaults.entity);
    onUpdate("action", defaults.action);
    onUpdate("status", defaults.status);
    onUpdate("dateFrom", defaults.dateFrom);
    onUpdate("dateTo", defaults.dateTo);
    onUpdate("lastSeconds", defaults.lastSeconds);
  };

  // Chips summarizing whichever of Module/Entity/Action/Status aren't "All" --
  // each one's remove button reuses the same cascading reset as its select so
  // clearing Module from a chip also clears the now-stale Entity/Action picks.
  const activeFilterChips = [
    filters.module !== "All" && {
      key: "module",
      label: "Module",
      value: optionLabel(moduleOptions, filters.module),
      onRemove: () => handleModuleChange("All"),
    },
    filters.entity !== "All" && {
      key: "entity",
      label: "Entity",
      value: optionLabel(entityOptions, filters.entity),
      onRemove: () => handleEntityChange("All"),
    },
    filters.action !== "All" && {
      key: "action",
      label: "Action",
      value: optionLabel(actionOptions, filters.action),
      onRemove: () => onUpdate("action", "All"),
    },
    filters.status !== "All" && {
      key: "status",
      label: "Status",
      value: optionLabel(AUDIT_STATUS_OPTIONS, filters.status),
      onRemove: () => onUpdate("status", "All"),
    },
  ].filter((chip): chip is { key: string; label: string; value: string; onRemove: () => void } => Boolean(chip));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="w-70.5 flex flex-col gap-1">
          <TimeModeToggle mode={filters.timeMode} onChange={handleTimeModeChange} />
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

        <div className="w-41 flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Module</label>
          <NativeSelect value={filters.module} onChange={handleModuleChange} options={moduleOptions} />
        </div>
        <div className="w-41 flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Entity</label>
          <CustomSelect value={filters.entity} onChange={handleEntityChange} options={entityOptions} />
        </div>
        <div className="w-42 flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Action</label>
          <CustomSelect value={filters.action} onChange={(v) => onUpdate("action", v)} options={actionOptions} />
        </div>
        <div className="w-42 flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Status</label>
          <NativeSelect value={filters.status} onChange={(v) => onUpdate("status", v)} options={AUDIT_STATUS_OPTIONS} />
        </div>
      </div>

      {activeFilterChips.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-gray-500">
            {activeFilterChips.length} filter{activeFilterChips.length > 1 ? "s" : ""} selected:
          </span>
          {activeFilterChips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-full"
            >
              <span className="text-indigo-400 font-normal">{chip.label}:</span>
              {chip.value}
              <button
                type="button"
                onClick={chip.onRemove}
                className="p-0.5 rounded-full hover:bg-indigo-100 transition-colors"
                aria-label={`Clear ${chip.label} filter`}
              >
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Search</label>
          <UserSearchField value={filters.search} onChange={(name) => onUpdate("search", name)} />
        </div>

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
