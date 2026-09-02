import type { CSSProperties } from "react";
import { AuditEventStatus, AuditRequestMethod } from "../types/audit.types";

// Shared styling for the plain <select>-based filter fields (Module, Status)
// in AuditLogFilters' NativeSelect -- a hand-drawn chevron replaces the
// browser-native one so it matches the custom dropdowns (Entity/Action)
// sitting next to it in the same filter row.
export const AUDIT_SELECT_BASE_CLASS =
  "h-10 pl-3 pr-8 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-colors cursor-pointer w-full";

export const AUDIT_SELECT_ARROW_STYLE: CSSProperties = {
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\")",
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 10px center",
};

export const AUDIT_STATUS_STYLES: Record<AuditEventStatus, string> = {
  SUCCESS: "bg-emerald-100 text-emerald-700",
  FAILURE: "bg-red-100 text-red-700",
  DENIED: "bg-amber-100 text-amber-700",
};

// Module isn't a strict backend enum (it's derived from the action's prefix,
// falling back to the uppercased prefix for anything unmapped -- see
// _ACTION_PREFIX_TO_MODULE in backend/repositories/audit_repository.py), so
// this covers only the values it currently produces. Anything else falls
// back to AUDIT_MODULE_FALLBACK_STYLE.
export const AUDIT_MODULE_STYLES: Record<string, string> = {
  AUTH: "bg-blue-100 text-blue-700",
  BOOKING: "bg-indigo-100 text-indigo-700",
  GUEST: "bg-violet-100 text-violet-700",
  LOCATION: "bg-sky-100 text-sky-700",
  AMENITY: "bg-teal-100 text-teal-700",
};
export const AUDIT_MODULE_FALLBACK_STYLE = "bg-gray-100 text-gray-600";

export const AUDIT_METHOD_STYLES: Record<string, string> = {
  GET: "bg-slate-100 text-slate-700",
  POST: "bg-purple-100 text-purple-700",
  PATCH: "bg-orange-100 text-orange-700",
  PUT: "bg-teal-100 text-teal-700",
  DELETE: "bg-red-100 text-red-700",
};
export const AUDIT_METHOD_FALLBACK_STYLE = "bg-gray-100 text-gray-600";

// Action/Module/Entity dropdown OPTIONS are no longer hardcoded here -- the
// filter bar derives them from GET /admin/audit's `filter_options` (every
// real (module, entity_type, action) combination for the tenant) via
// deriveAuditFilterOptions in utils/mapAuditLog.ts, so they can't drift out
// of sync with what's actually in the data. AUDIT_MODULE_STYLES above stays
// (it's just badge coloring, independent of the options list).

export const AUDIT_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "All", label: "All Status" },
  { value: "SUCCESS", label: "Success" },
  { value: "FAILURE", label: "Failure" },
  { value: "DENIED", label: "Denied" },
];

export const AUDIT_PAGE_SIZES = [10, 25, 50, 75, 100];

// Preset quick-time-filter options -- value is seconds, sent to the backend
// as lastSeconds (see backend/api/routes/admin_audit.py). The backend itself
// accepts any positive integer of seconds, not just these presets; this is
// just what the UI currently exposes, grouped the way CloudWatch's time
// picker groups its quick ranges (Minutes / Hours / Days). `shortLabel` is
// the bare number shown on the chip itself (unit is implied by the group
// header); `label` is the full "N min/hr/day" text used for the trigger
// button and any other place the value needs to stand alone.
type AuditRelativeTimeOption = { value: number; label: string; shortLabel: string };

function minuteOption(minutes: number): AuditRelativeTimeOption {
  return { value: minutes * 60, label: `${minutes} min`, shortLabel: `${minutes}` };
}
function hourOption(hours: number): AuditRelativeTimeOption {
  return { value: hours * 60 * 60, label: hours === 1 ? "1 hr" : `${hours} hrs`, shortLabel: `${hours}` };
}
function dayOption(days: number): AuditRelativeTimeOption {
  return { value: days * 24 * 60 * 60, label: days === 1 ? "1 day" : `${days} days`, shortLabel: `${days}` };
}

export const AUDIT_RELATIVE_TIME_GROUPS: { label: string; options: AuditRelativeTimeOption[] }[] = [
  { label: "Minutes", options: [5, 10, 15, 30, 45].map(minuteOption) },
  { label: "Hours", options: [1, 2, 3, 6, 8, 12].map(hourOption) },
  { label: "Days", options: [1, 2, 3, 4, 5, 6].map(dayOption) },
];

export const AUDIT_RELATIVE_TIME_OPTIONS: AuditRelativeTimeOption[] = AUDIT_RELATIVE_TIME_GROUPS.flatMap(
  (group) => group.options
);

export function moduleBadgeStyle(module: string): string {
  return AUDIT_MODULE_STYLES[module] ?? AUDIT_MODULE_FALLBACK_STYLE;
}

export function methodBadgeStyle(method: AuditRequestMethod): string {
  return AUDIT_METHOD_STYLES[method] ?? AUDIT_METHOD_FALLBACK_STYLE;
}
