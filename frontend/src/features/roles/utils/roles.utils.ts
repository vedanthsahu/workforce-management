import type { ApiRole, Role } from "../types/roles.types";

export function mapApiRoleToRole(item: ApiRole): Role {
  return {
    roleId: item.roleId,
    key: item.roleName,
    name: item.roleName,
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

export const ROLE_BADGE_STYLES: Record<string, string> = {
  EMPLOYEE: "bg-blue-50 text-blue-600 ring-blue-200",
  FACILITATOR: "bg-purple-50 text-purple-600 ring-purple-200",
  FACILITATOR_GUEST_COORDINATOR: "bg-cyan-50 text-cyan-600 ring-cyan-200",
  SECURITY: "bg-amber-50 text-amber-600 ring-amber-200",
  TENANT_ADMIN: "bg-emerald-50 text-emerald-600 ring-emerald-200",
  MANAGER: "bg-violet-50 text-violet-600 ring-violet-200",
};

export function getRoleBadgeClass(key: string): string {
  return ROLE_BADGE_STYLES[key] ?? "bg-gray-50 text-gray-500 ring-gray-200";
}
