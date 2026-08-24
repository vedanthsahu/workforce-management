import { AuditEventStatus, AuditRequestMethod } from "../types/audit.types";

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

// Preset "Last N minutes" quick-time-filter options -- value is seconds,
// sent to the backend as lastSeconds (see backend/api/routes/admin_audit.py).
// The backend itself accepts any positive integer of seconds, not just these
// presets; this is just what the UI currently exposes.
export const AUDIT_RELATIVE_TIME_OPTIONS: { value: number; label: string }[] = [
  { value: 5 * 60, label: "Last 5 min" },
  { value: 10 * 60, label: "Last 10 min" },
  { value: 20 * 60, label: "Last 20 min" },
  { value: 30 * 60, label: "Last 30 min" },
  { value: 45 * 60, label: "Last 45 min" },
  { value: 60 * 60, label: "Last 60 min" },
  { value: 120 * 60, label: "Last 120 min" },
];

export function moduleBadgeStyle(module: string): string {
  return AUDIT_MODULE_STYLES[module] ?? AUDIT_MODULE_FALLBACK_STYLE;
}

export function methodBadgeStyle(method: AuditRequestMethod): string {
  return AUDIT_METHOD_STYLES[method] ?? AUDIT_METHOD_FALLBACK_STYLE;
}
