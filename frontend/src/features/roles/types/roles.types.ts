// ─── Raw API response types (mirrors future backend schema) ─────────────────
// NOTE: backend is not ready yet — roles.service.ts currently returns
// hardcoded data shaped exactly like this. Swap the function bodies only
// when the real endpoints exist; nothing below this file should need to change.

export type RoleKey =
  | "EMPLOYEE"
  | "TALENT"
  | "TALENT_GUEST_COORDINATOR"
  | "SECURITY"
  | "TENANT_ADMIN";

export interface ApiPermission {
  permission_key: string;
  permission_label: string;
}

export interface ApiRoleUser {
  user_id: string;
  full_name: string;
  email: string;
}

export interface ApiRole {
  role_key: RoleKey;
  role_name: string;
  description: string;
  user_count: number;
  permission_count: number;
  permissions: ApiPermission[];
  users: ApiRoleUser[];
}

export interface ApiRolesResponse {
  items: ApiRole[];
  total: number;
}

// ─── Frontend display types ───────────────────────────────────────────────────

export interface RoleUser {
  id: string;
  fullName: string;
  email: string;
}

export interface Role {
  key: RoleKey;
  name: string;
  description: string;
  userCount: number;
  permissionCount: number;
  permissions: string[];
  users: RoleUser[];
}

// ─── Payloads ─────────────────────────────────────────────────────────────

export interface CreateRolePayload {
  role_name: string;
  description: string;
  permission_keys: string[];
}