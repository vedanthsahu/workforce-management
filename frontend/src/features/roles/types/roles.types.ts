export type RoleKey =
  | "EMPLOYEE"
  | "TALENT"
  | "TALENT_GUEST_COORDINATOR"
  | "SECURITY"
  | "TENANT_ADMIN"
  | "MANAGER"
  | string;

// ─── API response types matching backend payload ──────────────────────────────

export interface ApiPermission {
  id: number;
  permissionKey: string;
  description: string;
  moduleName: string;
}

export interface ApiRole {
  roleId: number;
  roleName: string;
  roleDescription: string;
  userCount: number;
  permissionCount: number;
  permissions: ApiPermission[];
}

export interface ApiRolesSummary {
  totalUsers: number;
  filteredUsers: number;
  activeUsers: number;
  inactiveUsers: number;
}

export interface ApiRolesPagination {
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface ApiAdminUserItem {
  id: string;
  employeeId?: string | null;
  fullName?: string | null;
  roleName: string;
  department?: string | null;
  jobTitle?: string | null;
  mobilePhone?: string | null;
  status: string;
  email?: string | null;
}

export interface ApiRolesResponse {
  summary: ApiRolesSummary;
  roles: ApiRole[];
  pagination: ApiRolesPagination;
  items: ApiAdminUserItem[];
}

// Legacy shape kept for ApiRolesResponse used in service return
export interface ApiRolesResponseLegacy {
  items: ApiRole[];
  total: number;
}

// ─── Frontend display types ───────────────────────────────────────────────────

export interface RolePermission {
  id: number;
  permissionKey: string;
  description: string;
  moduleName: string;
}

export interface RoleUser {
  id: string;
  fullName: string;
  email: string;
}

export interface Role {
  roleId: number;
  key: string;
  name: string;
  description: string;
  userCount: number;
  permissionCount: number;
  permissions: RolePermission[];
  users: RoleUser[];
}

// ─── Payloads ─────────────────────────────────────────────────────────────────

export interface CreateRolePayload {
  role_name: string;
  description: string;
  permission_keys: string[];
}
