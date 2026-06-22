import type { ApiRole, Role } from "../types/roles.types";

export function mapApiRoleToRole(item: ApiRole): Role {
  return {
    key: item.role_key,
    name: item.role_name,
    description: item.description,
    userCount: item.user_count,
    permissionCount: item.permission_count,
    permissions: item.permissions.map((p) => p.permission_label),
    users: item.users.map((u) => ({
      id: u.user_id,
      fullName: u.full_name,
      email: u.email,
    })),
  };
}

export const ROLE_BADGE_STYLES: Record<string, string> = {
  EMPLOYEE: "bg-blue-50 text-blue-600 ring-blue-200",
  TALENT: "bg-purple-50 text-purple-600 ring-purple-200",
  TALENT_GUEST_COORDINATOR: "bg-cyan-50 text-cyan-600 ring-cyan-200",
  SECURITY: "bg-amber-50 text-amber-600 ring-amber-200",
  TENANT_ADMIN: "bg-emerald-50 text-emerald-600 ring-emerald-200",
};

export function getRoleBadgeClass(key: string): string {
  return ROLE_BADGE_STYLES[key] ?? "bg-gray-50 text-gray-500 ring-gray-200";
}