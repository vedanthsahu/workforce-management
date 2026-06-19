// // ─── Raw API response types (mirrors future backend schema) ─────────────────
// // NOTE: backend is not ready yet — users.service.ts currently returns
// // hardcoded data shaped exactly like this. Swap the function bodies only
// // when the real endpoints exist; nothing below this file should need to change.

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
//   joined_on: string; // ISO date
//   current_role: RoleKey;
//   role_assigned_on: string; // ISO date
//   permissions: ApiPermission[];
// }

// export interface ApiUsersResponse {
//   items: ApiUser[];
//   total: number;
// }

// // ─── Frontend display types ───────────────────────────────────────────────────

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
//   changed_at: string; // ISO datetime
// }


// ─── Raw API response types (mirrors future backend schema) ─────────────────
import type { RoleKey } from "@/features/roles/types/roles.types";

export type { RoleKey };

export type ApiUserStatus = "active" | "inactive";

export interface ApiPermission {
  permission_key: string;
  permission_label: string;
}

export interface ApiUser {
  user_id: string;
  full_name: string;
  email: string;
  department: string;
  employee_id: string;
  status: ApiUserStatus;
  joined_on: string;
  current_role: RoleKey;
  role_assigned_on: string;
  permissions: ApiPermission[];
}

export interface ApiUsersResponse {
  items: ApiUser[];
  total: number;
}

// ─── Frontend display types ──────────────────────────────────────────────
export interface User {
  id: string;
  fullName: string;
  email: string;
  department: string;
  employeeId: string;
  status: ApiUserStatus;
  joinedOn: string;
  currentRole: RoleKey;
  roleAssignedOn: string;
  permissions: string[];
}

// ─── Payloads ─────────────────────────────────────────────────────────────
export interface UpdateUserRolePayload {
  role: RoleKey;
}

export interface RoleChangeResult {
  user_id: string;
  previous_role: RoleKey;
  new_role: RoleKey;
  updated_permissions: ApiPermission[];
  sessions_invalidated: boolean;
  changed_at: string;
}

// "+ Add User" form
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