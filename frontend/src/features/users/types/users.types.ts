

// import type { RoleKey } from "@/features/roles/types/roles.types";

// export type { RoleKey };

// // ─── Raw API types (mirrors backend schema) ─────────────────────────────
// export type ApiUserStatus = "ACTIVE" | "INACTIVE";
// export type UserStatus = "active" | "inactive";

// export interface RoleCount {
//   roleName: RoleKey;
//   count: number;
// }

// export interface UsersSummary {
//   totalUsers: number;
//   filteredUsers: number;
//   activeUsers: number;
//   inactiveUsers: number;
//   roles: RoleCount[];
// }

// // ─── Backend AdminUserDirectoryItem (camelCase from CamelModel) ──────────────
// export interface ApiUser {
//   id: string;
//   employeeId: string | null;
//   fullName: string;
//   roleName: RoleKey;
//   department: string;
//   jobTitle: string;
//   mobilePhone: string;
//   status: ApiUserStatus;
//   email: string;
// }

// export interface ApiUsersResponse {
//   summary: UsersSummary;
//   items: ApiUser[];
// }

// // ─── Frontend display type ────────────────────────────────────────────────────
// export interface User {
//   id: string;
//   fullName: string;
//   email: string;
//   department: string;
//   employeeId: string | null;
//   jobTitle: string;
//   mobilePhone: string;
//   status: UserStatus;
//   currentRole: RoleKey;
// }

// // ─── Query params for GET /admin/users ───────────────────────────────────
// export interface GetUsersParams {
//   role?: RoleKey;
//   roles?: RoleKey[];
//   status?: ApiUserStatus;
//   page?: number;
//   limit?: number;
// }

// // ─── PATCH /admin/users/{user_id}/access ─────────────────────────────────
// export interface UpdateUserAccessPayload {
//   role_name: RoleKey;
//   status: ApiUserStatus;
// }

// export interface UserAccessResult {
//   id: string;
//   roleName: RoleKey;
//   status: ApiUserStatus;
// }

// // "+ Add User" form (no backend endpoint yet — still stubbed)
// export interface UserFormData {
//   full_name: string;
//   email: string;
//   department: string;
//   employee_id: string;
//   role: RoleKey | "";
// }

// export interface CreateUserPayload {
//   full_name: string;
//   email: string;
//   department: string;
//   employee_id: string;
//   role: RoleKey;
// }

// // ─── GET /users?q= search response (snake_case, no summary/pagination) ──────
// export interface ApiUserSearchResult {
//   user_id: string;
//   tenant_id: string;
//   full_name: string;
//   email: string;
//   role_name: RoleKey;
//   status: ApiUserStatus;
//   employee_id: string | null;
//   department: string | null;
// }

import type { RoleKey, ApiPermission } from "@/features/roles/types/roles.types";

export type { RoleKey };

export type ApiUserStatus = "ACTIVE" | "INACTIVE";
export type UserStatus = "active" | "inactive";

export interface RoleCount {
  roleName: RoleKey;
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