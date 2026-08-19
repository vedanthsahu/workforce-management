// The real values safe_write_audit_log writes across the backend -- NOT
// "FAILED" (see backend/schemas/audit.py's AuditEventStatus).
export type AuditEventStatus = "SUCCESS" | "FAILURE" | "DENIED";

/** Not an enum on the backend (module is derived from the action's prefix and
 * falls back to the uppercased prefix for anything unmapped) -- these are
 * just the values backend/repositories/audit_repository.py's
 * _ACTION_PREFIX_TO_MODULE currently produces. */
export type AuditModule = "AUTH" | "BOOKING" | "GUEST" | "LOCATION" | "AMENITY" | (string & {});

export type AuditRequestMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE" | (string & {});

export type AuditSourceChannel = "WEB" | "MOBILE" | "API" | (string & {});

export type AuditSortBy = "occurred_at" | "action" | "module" | "status" | "actor";
export type AuditSortDir = "asc" | "desc";

/** GET /admin/audit item shape -- deliberately lightweight (see
 * backend/schemas/audit.py AuditLogListItemResponse); the heavier columns
 * (old/new values, user agent, ...) only come back from the detail call. */
export interface AuditLogListItemRaw {
  id: string;
  actor_user_id: string | null;
  actor_name: string | null;
  actor_email: string | null;
  actor_role: string | null;
  action: string;
  module: AuditModule;
  entity_type: string | null;
  entity_id: string | null;
  event_status: AuditEventStatus;
  request_method: AuditRequestMethod | null;
  source_channel: AuditSourceChannel | null;
  occurred_at: string;
}

/** GET /admin/audit/{id} response shape -- full audit_logs row (see
 * backend/schemas/audit.py AuditLogDetailResponse). */
export interface AuditLogDetailRaw extends AuditLogListItemRaw {
  request_path: string | null;
  request_id: string | null;
  correlation_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  changed_fields: string[] | null;
  metadata: Record<string, unknown> | null;
  failure_code: string | null;
  failure_reason: string | null;
  created_at: string;
}

/** UI-shaped row used by the table. */
export interface AuditLogListItem {
  id: string;
  actorUserId: string;
  actorName: string;
  actorEmail: string;
  actorRole: string;
  action: string;
  actionLabel: string;
  module: AuditModule;
  entityType: string;
  entityId: string;
  status: AuditEventStatus;
  requestMethod: AuditRequestMethod;
  sourceChannel: AuditSourceChannel;
  occurredAt: string;
}

/** UI-shaped full record used by the detail sheet. */
export interface AuditLog extends AuditLogListItem {
  requestPath: string;
  requestId: string;
  correlationId: string;
  ipAddress: string;
  userAgent: string;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  changedFields: string[] | null;
  failureCode: string | null;
  failureReason: string | null;
  createdAt: string;
}

/** Which time-window control is active in the filter bar -- the two are
 * mutually exclusive (a toggle, not two independent filters): "date" sends
 * dateFrom/dateTo, "relative" sends lastSeconds. See useAuditLogs.ts. */
export type AuditTimeMode = "date" | "relative";

export interface AuditLogFilters {
  search: string;
  action: string;
  module: string;
  entity: string;
  status: string;
  timeMode: AuditTimeMode;
  dateFrom: string;
  dateTo: string;
  /** Selected "Last N seconds" preset value, or null when none is picked. */
  lastSeconds: number | null;
}

export function defaultAuditLogFilters(): AuditLogFilters {
  // Date Range defaults to today so the page loads showing today's audit
  // events without the admin needing to pick a date first.
  const todayIso = new Date().toISOString().slice(0, 10);
  return {
    search: "",
    action: "All",
    module: "All",
    entity: "All",
    status: "All",
    timeMode: "date",
    dateFrom: todayIso,
    dateTo: todayIso,
    lastSeconds: null,
  };
}

export interface AuditLogSummary {
  total_events: number;
  successful_events: number;
  failed_events: number;
  unique_users: number;
}

export interface AuditLogPagination {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface AuditLogListResponse {
  items: AuditLogListItemRaw[];
  summary: AuditLogSummary;
  pagination: AuditLogPagination;
}
