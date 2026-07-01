import type { RoleKey } from "@/features/roles/types/roles.types";

export type { RoleKey };

export type ApiUserStatus = "active" | "inactive";

export interface ApiPermission {
  permission_key: string;
  permission_label: string;
}

// ─── Backend AdminUserDirectoryItem (camelCase from CamelModel) ──────────────
export interface ApiUser {
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

export interface AdminUserDirectorySummary {
  totalUsers: number;
  filteredUsers: number;
  activeUsers: number;
  inactiveUsers: number;
}

export interface AdminUsersPagination {
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface ApiUsersResponse {
  summary: AdminUserDirectorySummary;
  roles: import("@/features/roles/types/roles.types").ApiRole[];
  pagination?: AdminUsersPagination;
  items: ApiUser[];
}

// ─── Frontend display type ────────────────────────────────────────────────────
export interface User {
  id: string;
  fullName: string;
  email: string;
  department: string;
  employeeId: string;
  status: ApiUserStatus;
  joinedOn: string;
  currentRole: string;
  roleAssignedOn: string;
  permissions: string[];
  jobTitle?: string;
  mobilePhone?: string;
}

// ─── Payloads ─────────────────────────────────────────────────────────────────
export interface UpdateUserRolePayload {
  role: RoleKey;
}

export interface RoleChangeResult {
  user_id: string;
  previous_role: string;
  new_role: string;
  updated_permissions: ApiPermission[];
  sessions_invalidated: boolean;
  changed_at: string;
}

export interface UserFormData {
  full_name: string;
  email: string;
  department: string;
  employee_id: string;
  role: RoleKey | "";
}

export interface CreateUserPayload {
  full_name: string;
  email: string;
  department: string;
  employee_id: string;
  role: RoleKey;
}
