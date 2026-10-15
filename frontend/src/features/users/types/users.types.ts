
import type { RoleKey, ApiPermission } from "@/features/roles/types/roles.types";

export type { RoleKey };

export type ApiUserStatus = "ACTIVE" | "INACTIVE";
export type UserStatus = "active" | "inactive";

export interface RoleCount {
  roleName: string;
  count: number;
}

// Matches the real top-level `roles` array in the API payload
export interface ApiRoleSummaryItem {
  roleId: number;
  roleName: RoleKey;
  roleDescription: string;
  userCount: number;
  permissionCount: number;
  permissions: ApiPermission[];
}

export interface UsersSummary {
  totalUsers: number;
  filteredUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  roles: RoleCount[]; // derived on the frontend, not sent as-is by the API
}

export interface ApiUser {
  id: string;
  employeeId: string | null;
  fullName: string;
  roleName: RoleKey;
  department: string;
  jobTitle: string;
  mobilePhone: string;
  status: ApiUserStatus;
  email: string;
  /** Only present on the GET /users/{id} response, not GET /admin/users. */
  officeLocation?: string | null;
}

export interface ApiUsersPagination {
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

// Matches the actual raw API shape
export interface ApiUsersResponse {
  summary: {
    totalUsers: number;
    filteredUsers: number;
    activeUsers: number;
    inactiveUsers: number;
  };
  roles: ApiRoleSummaryItem[];
  pagination: unknown | null;
  items: ApiUser[];
}

export interface User {
  id: string;
  fullName: string;
  email: string;
  department: string;
  employeeId: string | null;
  jobTitle: string;
  mobilePhone: string;
  status: UserStatus;
  currentRole: RoleKey;
  officeLocation: string | null;
}

export interface GetUsersParams {
  role?: RoleKey;
  roles?: RoleKey[];
  status?: ApiUserStatus;
  page?: number;
  limit?: number;
}

export interface UpdateUserAccessPayload {
  role_name: RoleKey;
  status: ApiUserStatus;
}

export interface UserAccessResult {
  id: string;
  roleName: RoleKey;
  status: ApiUserStatus;
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

export interface ApiUserSearchResult {
  user_id: string;
  tenant_id: string;
  full_name: string;
  email: string;
  role_name: RoleKey;
  status: ApiUserStatus;
  employee_id: string | null;
  department: string | null;
}