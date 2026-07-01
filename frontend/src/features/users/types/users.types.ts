
// // ─── Raw API response types (mirrors future backend schema) ─────────────────
// import type { RoleKey } from "@/features/roles/types/roles.types";

// export type { RoleKey };

// export type ApiUserStatus = "active" | "inactive";

// export interface ApiPermission {
//   permission_key: string;
//   permission_label: string;
// }

// export interface ApiUser {
//   user_id: string;
//   full_name: string;
//   email: string;
//   department: string;
//   employee_id: string;
//   status: ApiUserStatus;
//   joined_on: string;
//   current_role: RoleKey;
//   role_assigned_on: string;
//   permissions: ApiPermission[];
// }

// export interface ApiUsersResponse {
//   items: ApiUser[];
//   total: number;
// }

// // ─── Frontend display types ──────────────────────────────────────────────
// export interface User {
//   id: string;
//   fullName: string;
//   email: string;
//   department: string;
//   employeeId: string;
//   status: ApiUserStatus;
//   joinedOn: string;
//   currentRole: RoleKey;
//   roleAssignedOn: string;
//   permissions: string[];
// }

// // ─── Payloads ─────────────────────────────────────────────────────────────
// export interface UpdateUserRolePayload {
//   role: RoleKey;
// }

// export interface RoleChangeResult {
//   user_id: string;
//   previous_role: RoleKey;
//   new_role: RoleKey;
//   updated_permissions: ApiPermission[];
//   sessions_invalidated: boolean;
//   changed_at: string;
// }

// // "+ Add User" form
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



import type { RoleKey } from "@/features/roles/types/roles.types";

export type { RoleKey };

// ─── Raw API types (mirrors backend schema) ─────────────────────────────
export type ApiUserStatus = "ACTIVE" | "INACTIVE";
export type UserStatus = "active" | "inactive";

export interface RoleCount {
  roleName: RoleKey;
  count: number;
}

export interface UsersSummary {
  totalUsers: number;
  filteredUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  roles: RoleCount[];
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

export interface ApiUsersResponse {
  summary: UsersSummary;
  items: ApiUser[];
}

// ─── Frontend display types ──────────────────────────────────────────────
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

// ─── Query params for GET /admin/users ───────────────────────────────────
export interface GetUsersParams {
  role?: RoleKey;
  roles?: RoleKey[];
  status?: ApiUserStatus;
  page?: number;
  limit?: number;
}

// ─── PATCH /admin/users/{user_id}/access ─────────────────────────────────
export interface UpdateUserAccessPayload {
  role_name: RoleKey;
  status: ApiUserStatus;
}

export interface UserAccessResult {
  id: string;
  roleName: RoleKey;
  status: ApiUserStatus;
}

// "+ Add User" form (no backend endpoint yet — still stubbed)
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