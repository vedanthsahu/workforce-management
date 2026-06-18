import { axiosInstance } from "@/lib/http/axios";
import type {
  ApiRole,
  ApiRolesResponse,
  CreateRolePayload,
} from "../types/roles.types";

// ────────────────────────────────────────────────────────────────────────────
// ⚠️ DUMMY DATA MODE
// Backend isn't ready yet. Every method below returns hardcoded data shaped
// exactly like the real API response (see roles.types.ts).
// When the backend is ready, replace ONLY the body of each function with the
// commented-out axiosInstance call below it — nothing else in the app needs
// to change since hooks/components consume these methods, not raw data.
// ────────────────────────────────────────────────────────────────────────────

const DUMMY_ROLES: ApiRole[] = [
  {
    role_key: "EMPLOYEE",
    role_name: "EMPLOYEE",
    description: "Basic employee role with self service access",
    user_count: 240,
    permission_count: 3,
    permissions: [
      { permission_key: "seat:book_self", permission_label: "Book seat for self" },
      { permission_key: "booking:view_own", permission_label: "View own bookings" },
      { permission_key: "booking:cancel_own", permission_label: "Cancel own bookings" },
    ],
    users: [
      { user_id: "u1", full_name: "Ravi Kumar", email: "ravi@company.com" },
      { user_id: "u2", full_name: "Anjali Mehta", email: "anjali@company.com" },
    ],
  },
  {
    role_key: "TALENT",
    role_name: "TALENT",
    description: "Can book for employees and guests, invite guests",
    user_count: 8,
    permission_count: 3,
    permissions: [
      { permission_key: "seat:book_self", permission_label: "Book seat for self" },
      { permission_key: "seat:book_guest", permission_label: "Book seat for guests" },
      { permission_key: "guest:invite", permission_label: "Invite guests without seat booking" },
    ],
    users: [
      { user_id: "u3", full_name: "Sneha R", email: "sneha@company.com" },
    ],
  },
  {
    role_key: "TALENT_GUEST_COORDINATOR",
    role_name: "TALENT_GUEST_COORDINATOR",
    description: "Can book seats for guests and invite guests",
    user_count: 5,
    permission_count: 2,
    permissions: [
      { permission_key: "seat:book_guest", permission_label: "Book seat for guests" },
      { permission_key: "guest:invite", permission_label: "Invite guests" },
    ],
    users: [
      { user_id: "u4", full_name: "Prakash S", email: "prakash@company.com" },
    ],
  },
  {
    role_key: "SECURITY",
    role_name: "SECURITY",
    description: "Manages guest visits, search guests, check-in and check-out",
    user_count: 12,
    permission_count: 4,
    permissions: [
      { permission_key: "guest:view_visits", permission_label: "View visits" },
      { permission_key: "guest:search", permission_label: "Search guests" },
      { permission_key: "guest:check_in", permission_label: "Check-in guests" },
      { permission_key: "guest:check_out", permission_label: "Check-out guests" },
    ],
    users: [
      { user_id: "u5", full_name: "John D", email: "john@company.com" },
      { user_id: "u6", full_name: "Kavya M", email: "kavya@company.com" },
    ],
  },
  {
    role_key: "TENANT_ADMIN",
    role_name: "TENANT_ADMIN",
    description: "Full access to manage users, roles, permissions",
    user_count: 2,
    permission_count: 5,
    permissions: [
      { permission_key: "user:manage", permission_label: "Manage users" },
      { permission_key: "role:assign", permission_label: "Assign roles" },
      { permission_key: "permission:manage", permission_label: "Manage permissions" },
      { permission_key: "audit:view", permission_label: "View audit logs" },
      { permission_key: "settings:manage", permission_label: "Manage settings" },
    ],
    users: [
      { user_id: "u7", full_name: "Admin User", email: "admin@company.com" },
    ],
  },
];

function delay<T>(value: T, ms = 300): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export const rolesService = {
  // GET ALL ROLES
  async getRoles(): Promise<ApiRolesResponse> {
    return delay({ items: DUMMY_ROLES, total: DUMMY_ROLES.length });
    // const { data } = await axiosInstance.get("/admin/roles");
    // return data;
  },

  // GET SINGLE ROLE (with full permission + user list — used for the side detail panel)
  async getRoleByKey(roleKey: string): Promise<ApiRole | null> {
    const role = DUMMY_ROLES.find((r) => r.role_key === roleKey) ?? null;
    return delay(role);
    // const { data } = await axiosInstance.get(`/admin/roles/${roleKey}`);
    // return data;
  },

  // CREATE ROLE
  async createRole(payload: CreateRolePayload): Promise<ApiRole> {
    const newRole: ApiRole = {
      role_key: payload.role_name.toUpperCase().replace(/\s+/g, "_") as ApiRole["role_key"],
      role_name: payload.role_name,
      description: payload.description,
      user_count: 0,
      permission_count: payload.permission_keys.length,
      permissions: payload.permission_keys.map((key) => ({
        permission_key: key,
        permission_label: key,
      })),
      users: [],
    };
    return delay(newRole);
    // const { data } = await axiosInstance.post("/admin/roles", payload);
    // return data;
  },
};