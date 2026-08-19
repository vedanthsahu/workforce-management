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

// Actions are free-form dotted strings written by each call site (see
// safe_write_audit_log usages across the backend) -- there's no backend
// enum/endpoint to list them from yet, so this is a curated set of the
// actions currently in use. Falls back gracefully: the table/filter still
// work fine for any action not listed here, this list just seeds the
// dropdown.
export const AUDIT_ACTION_OPTIONS: { value: string; label: string }[] = [
  { value: "All", label: "All Actions" },
  { value: "booking.created", label: "booking.created" },
  { value: "booking.cancel", label: "booking.cancel" },
  { value: "user.login", label: "user.login" },
  { value: "user.logout", label: "user.logout" },
  { value: "user.access_updated", label: "user.access_updated" },
  { value: "site.created", label: "site.created" },
  { value: "site.updated", label: "site.updated" },
  { value: "building.created", label: "building.created" },
];

export const AUDIT_MODULE_OPTIONS: { value: string; label: string }[] = [
  { value: "All", label: "All Modules" },
  ...Object.keys(AUDIT_MODULE_STYLES).map((module) => ({
    value: module,
    label: module,
  })),
];

// Curated from the entity_type values the backend's audit call sites
// currently pass as resource_type -- same "seeds the dropdown, doesn't
// constrain the filter" caveat as AUDIT_ACTION_OPTIONS above.
export const AUDIT_ENTITY_OPTIONS: { value: string; label: string }[] = [
  { value: "All", label: "All Entities" },
  { value: "booking", label: "booking" },
  { value: "session", label: "session" },
  { value: "user", label: "user" },
  { value: "site", label: "site" },
  { value: "building", label: "building" },
  { value: "floor", label: "floor" },
  { value: "seat", label: "seat" },
  { value: "amenity", label: "amenity" },
  { value: "guest", label: "guest" },
  { value: "guest_visit", label: "guest_visit" },
];

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
