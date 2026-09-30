import type { ApiRole, Role } from "../types/roles.types";

// DB role keys are SCREAMING_SNAKE_CASE (e.g. "TENANT_ADMIN") -- display as
// "TENANT ADMIN" wherever a role name is shown to a user.
export function formatRoleLabel(role: string): string {
  return role.replace(/_/g, " ");
}

export function mapApiRoleToRole(item: ApiRole): Role {
  return {
    roleId: item.roleId,
    key: item.roleName,
    name: formatRoleLabel(item.roleName),
    description: item.roleDescription,
    userCount: item.userCount,
    permissionCount: item.permissionCount,
    permissions: (item.permissions ?? []).map((p) => ({
      id: p.id,
      permissionKey: p.permissionKey,
      description: p.description,
      moduleName: p.moduleName,
    })),
    users: [],
  };
}

// Single source of truth for role -> badge color across the app (sidebar,
// role management, users, audit, profile). Keep every surface pointed at
// this map instead of hand-rolling a local copy, so the colors never drift.
export const ROLE_BADGE_STYLES: Record<string, string> = {
  EMPLOYEE: "bg-blue-50 text-blue-600 ring-blue-200",
  FACILITATOR: "bg-purple-50 text-purple-600 ring-purple-200",
  FACILITATOR_GUEST_COORDINATOR: "bg-cyan-50 text-cyan-600 ring-cyan-200",
  FRONT_OFFICE: "bg-amber-50 text-amber-600 ring-amber-200",
  TENANT_ADMIN: "bg-emerald-50 text-emerald-600 ring-emerald-200",
  MANAGER: "bg-violet-50 text-violet-600 ring-violet-200",
  FACILITIES: "bg-orange-50 text-orange-600 ring-orange-200",
};

export function getRoleBadgeClass(key: string): string {
  return ROLE_BADGE_STYLES[key] ?? "bg-gray-50 text-gray-500 ring-gray-200";
}

// ─── User-list preview counts ───────────────────────────────────────────────
// NOTE: these were already different values (2 vs 3) in the two components
// before this move -- preserved as-is here, not reconciled, since that's a
// behavior decision and not part of a pure constant relocation.
export const ROLE_DETAIL_MODAL_USERS_PREVIEW_COUNT = 2;
export const ROLE_DETAIL_PANEL_USERS_PREVIEW_COUNT = 3;
