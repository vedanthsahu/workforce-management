import { AuditLog, AuditLogDetailRaw, AuditLogFilterOptionRaw, AuditLogListItem, AuditLogListItemRaw } from "../types/audit.types";

export function formatAuditDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

/** "building.created" -> "Building Created" */
export function formatActionTitle(action: string): string {
  return action
    .split(".")
    .join(" ")
    .split(/[\s_]+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

function mapListItemFields(raw: AuditLogListItemRaw) {
  return {
    id: raw.id,
    actorUserId: raw.actor_user_id ?? "",
    actorName: raw.actor_name || raw.actor_email || "Unknown",
    actorEmail: raw.actor_email ?? "",
    actorRole: raw.actor_role ?? "",
    action: raw.action,
    actionLabel: formatActionTitle(raw.action),
    module: raw.module,
    entityType: raw.entity_type ?? "",
    entityId: raw.entity_id ?? "",
    status: raw.event_status,
    requestMethod: raw.request_method ?? "GET",
    sourceChannel: raw.source_channel ?? "WEB",
    occurredAt: raw.occurred_at,
  };
}

export function mapAuditLogListItemToUi(raw: AuditLogListItemRaw): AuditLogListItem {
  return mapListItemFields(raw);
}

export function mapAuditLogDetailToUi(raw: AuditLogDetailRaw): AuditLog {
  return {
    ...mapListItemFields(raw),
    requestPath: raw.request_path ?? "",
    requestId: raw.request_id ?? "",
    correlationId: raw.correlation_id ?? "",
    ipAddress: raw.ip_address ?? "",
    userAgent: raw.user_agent ?? "",
    oldValues: raw.old_values,
    newValues: raw.new_values,
    changedFields: raw.changed_fields,
    failureCode: raw.failure_code,
    failureReason: raw.failure_reason,
    createdAt: raw.created_at,
  };
}

/** Which "Changes" UI block AuditChangesSection should render -- driven by
 * event status and the shape of the old/new-values payload, never by
 * diffing field values ourselves (the backend already tells us what
 * changed via changed_fields). */
export type AuditEventCategory = "CREATE" | "UPDATE" | "DELETE" | "AUTH" | "FAILED" | "NONE";

function hasFields(value: Record<string, unknown> | null): value is Record<string, unknown> {
  return !!value && Object.keys(value).length > 0;
}

/**
 * Classifies which "Changes" block to render.
 *
 * `action`/old-new-values shape decide it first (the most concrete signal),
 * `request_method` only steps in as a fallback when a *successful* event
 * captured no old/new payload at all and the action name itself doesn't say
 * ".created"/".updated"/etc -- GET never mutates data, so a payload-less GET
 * always means "nothing changed" regardless of module/entity; POST/PATCH/
 * PUT/DELETE hint at the closest category for whatever module/entity this
 * event belongs to.
 */
export function getAuditEventCategory(
  log: Pick<AuditLog, "status" | "action" | "oldValues" | "newValues" | "requestMethod">
): AuditEventCategory {
  if (log.status !== "SUCCESS") return "FAILED";

  const action = log.action.toLowerCase();
  if (action === "user.login" || action === "user.logout" || action.endsWith(".login") || action.endsWith(".logout")) {
    return "AUTH";
  }

  const hasOld = hasFields(log.oldValues);
  const hasNew = hasFields(log.newValues);

  if (hasNew && !hasOld) return "CREATE";
  if (hasOld && !hasNew) return "DELETE";
  if (hasOld && hasNew) return "UPDATE";

  // No payload captured either way -- fall back to the action name so a
  // create/update/delete action still gets a sensible (empty-state) block
  // instead of silently landing in "NONE".
  if (action.endsWith(".created")) return "CREATE";
  if (action.endsWith(".deleted") || action.endsWith(".delete")) return "DELETE";
  if (action.endsWith(".updated") || action.endsWith("_updated") || action.endsWith(".cancel")) return "UPDATE";

  // Still nothing to go on -- the HTTP method is the last reliable signal.
  switch (log.requestMethod?.toUpperCase()) {
    case "GET":
      return "AUTH"; // read-only call, nothing to have changed
    case "DELETE":
      return "DELETE";
    case "PATCH":
    case "PUT":
      return "UPDATE";
    case "POST":
      return "CREATE";
    default:
      return "NONE";
  }
}

/** Field keys to render for an UPDATE -- changed_fields when the backend
 * provided it, otherwise every key present across old/new (still backend
 * data, not a frontend value comparison). */
export function updateFieldKeys(log: Pick<AuditLog, "changedFields" | "oldValues" | "newValues">): string[] {
  if (log.changedFields && log.changedFields.length > 0) return log.changedFields;
  const keys = new Set<string>([...Object.keys(log.oldValues ?? {}), ...Object.keys(log.newValues ?? {})]);
  return [...keys];
}

/** "booking" -> "Booking", "guest_visit" -> "Guest Visit"; falls back to the
 * module (e.g. "LOCATION" -> "Location") when entity_type wasn't captured,
 * so CREATE/DELETE banners can name what actually changed instead of a
 * generic "record". */
export function formatEntityLabel(entityType: string, module: string): string {
  const source = entityType || module.toLowerCase() || "record";
  return source
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/** "building_code" -> "Building Code", "site_id" -> "Site ID" */
export function formatFieldLabel(key: string): string {
  return key
    .split("_")
    .filter(Boolean)
    .map((word) => (word.toLowerCase() === "id" ? "ID" : word[0].toUpperCase() + word.slice(1)))
    .join(" ");
}

/** Renders one field's value for the Changes section -- primitives as-is,
 * objects/arrays compactly, null/undefined/empty-string as an explicit
 * "Not set" so it reads as data, not a rendering bug. */
export function formatFieldValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "Not set";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string" || typeof value === "number") return String(value);
  return JSON.stringify(value);
}

/** Short human-readable summary shown under the event title in the detail sheet, e.g. "New building has been created". */
export function describeAuditAction(log: Pick<AuditLogListItem, "action" | "entityType" | "actionLabel">): string {
  const entity = log.entityType || "record";
  if (log.action.endsWith(".created")) return `New ${entity} has been created`;
  if (log.action.endsWith(".deleted")) return `A ${entity} has been deleted`;
  if (log.action.endsWith(".updated") || log.action.endsWith("_updated")) return `The ${entity} has been updated`;
  if (log.action.endsWith(".cancel")) return `The ${entity} has been cancelled`;
  if (log.action === "user.login") return "User successfully logged in";
  if (log.action === "user.logout") return "User logged out";
  return `${log.actionLabel} event recorded`;
}

export interface AuditCascadingFilterOptions {
  moduleOptions: { value: string; label: string }[];
  entityOptions: { value: string; label: string }[];
  actionOptions: { value: string; label: string }[];
}

/**
 * Derives the Module -> Entity -> Action dropdown option lists for the
 * filter bar from the flat `filter_options` array the list endpoint
 * returns, narrowed by whatever's currently selected upstream: Entity
 * options are scoped to the selected Module, Action options are scoped to
 * the selected Module *and* Entity. Pass "All" for a level that hasn't been
 * narrowed yet.
 */
export function deriveAuditFilterOptions(
  facets: AuditLogFilterOptionRaw[],
  selectedModule: string,
  selectedEntity: string
): AuditCascadingFilterOptions {
  const modules = [...new Set(facets.map((f) => f.module))].sort();

  const entityFacets = selectedModule === "All" ? facets : facets.filter((f) => f.module === selectedModule);
  const entities = [...new Set(entityFacets.map((f) => f.entity_type).filter((e): e is string => !!e))].sort();

  const actionFacets = selectedEntity === "All" ? entityFacets : entityFacets.filter((f) => f.entity_type === selectedEntity);
  const actions = [...new Set(actionFacets.map((f) => f.action))].sort();

  const toOptions = (values: string[], allLabel: string) => [
    { value: "All", label: allLabel },
    ...values.map((v) => ({ value: v, label: v })),
  ];

  return {
    moduleOptions: toOptions(modules, "All Modules"),
    entityOptions: toOptions(entities, "All Entities"),
    actionOptions: toOptions(actions, "All Actions"),
  };
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}
