// import { axiosInstance } from "@/lib/http/axios";
// import type {
//   ApiUser,
//   ApiUsersResponse,
//   RoleChangeResult,
//   RoleKey,
//   UpdateUserRolePayload,
// } from "../types/users.types";

// // ────────────────────────────────────────────────────────────────────────────
// // ⚠️ DUMMY DATA MODE
// // Backend isn't ready yet. Every method below returns hardcoded data shaped
// // exactly like the real API response (see users.types.ts).
// // When the backend is ready, replace ONLY the body of each function with the
// // commented-out axiosInstance call below it — nothing else in the app needs
// // to change since hooks/components consume these methods, not raw data.
// // ────────────────────────────────────────────────────────────────────────────

// // Permission sets per role — kept in sync with roles.service.ts DUMMY_ROLES
// // so a user's permissions always match what Role Management shows for that role.
// const ROLE_PERMISSIONS: Record<RoleKey, ApiUser["permissions"]> = {
//   EMPLOYEE: [
//     { permission_key: "seat:book_self", permission_label: "Book seat for self" },
//     { permission_key: "booking:view_own", permission_label: "View own bookings" },
//     { permission_key: "booking:cancel_own", permission_label: "Cancel own bookings" },
//   ],
//   TALENT: [
//     { permission_key: "seat:book_self", permission_label: "Book seat for self" },
//     { permission_key: "seat:book_guest", permission_label: "Book seat for guests" },
//     { permission_key: "guest:invite", permission_label: "Invite guests without seat booking" },
//   ],
//   TALENT_GUEST_COORDINATOR: [
//     { permission_key: "seat:book_guest", permission_label: "Book seat for guests" },
//     { permission_key: "guest:invite", permission_label: "Invite guests" },
//   ],
//   SECURITY: [
//     { permission_key: "guest:view_visits", permission_label: "View visits" },
//     { permission_key: "guest:search", permission_label: "Search guests" },
//     { permission_key: "guest:check_in", permission_label: "Check-in guests" },
//     { permission_key: "guest:check_out", permission_label: "Check-out guests" },
//   ],
//   TENANT_ADMIN: [
//     { permission_key: "user:manage", permission_label: "Manage users" },
//     { permission_key: "role:assign", permission_label: "Assign roles" },
//     { permission_key: "permission:manage", permission_label: "Manage permissions" },
//     { permission_key: "audit:view", permission_label: "View audit logs" },
//     { permission_key: "settings:manage", permission_label: "Manage settings" },
//   ],
// };

// const NAMES = [
//   "Ravi Kumar", "Sneha R", "John D", "Prakash S", "Kavya M",
//   "Anita Desai", "Vikram Rao", "Meera Iyer", "Arjun Nair", "Divya Shah",
//   "Karthik P", "Pooja Verma", "Suresh Babu", "Lakshmi N", "Rahul Mehta",
// ];
// const DEPARTMENTS = ["HR", "Engineering", "Operations", "Facilities", "Security", "Sales"];
// const ROLE_CYCLE: RoleKey[] = ["EMPLOYEE", "TALENT", "SECURITY", "TALENT_GUEST_COORDINATOR", "TENANT_ADMIN"];

// function buildDummyUser(i: number): ApiUser {
//   const name = NAMES[i % NAMES.length];
//   const suffix = i >= NAMES.length ? String(Math.floor(i / NAMES.length) + 1) : "";
//   const role = ROLE_CYCLE[i % ROLE_CYCLE.length];

//   return {
//     user_id: `usr_${String(i + 1).padStart(4, "0")}`,
//     full_name: suffix ? `${name} ${suffix}` : name,
//     email: `${name.toLowerCase().replace(/\s+/g, ".")}${suffix}@company.com`,
//     department: DEPARTMENTS[i % DEPARTMENTS.length],
//     employee_id: `E${10234 + i}`,
//     status: i % 11 === 0 ? "inactive" : "active",
//     joined_on: "2023-03-15",
//     current_role: role,
//     role_assigned_on: "2023-03-15",
//     permissions: ROLE_PERMISSIONS[role],
//   };
// }

// // 265 to match the reference screen's "Showing 1 to 5 of 265 users".
// const DUMMY_USERS: ApiUser[] = Array.from({ length: 265 }, (_, i) => buildDummyUser(i));

// function delay<T>(value: T, ms = 300): Promise<T> {
//   return new Promise((resolve) => setTimeout(() => resolve(value), ms));
// }

// export const usersService = {
//   // GET ALL USERS
//   async getUsers(): Promise<ApiUsersResponse> {
//     return delay({ items: DUMMY_USERS, total: DUMMY_USERS.length });
//     // const { data } = await axiosInstance.get("/admin/users");
//     // return data;
//   },

//   // GET SINGLE USER (used by the change-role modal)
//   async getUserById(userId: string): Promise<ApiUser | null> {
//     const user = DUMMY_USERS.find((u) => u.user_id === userId) ?? null;
//     return delay(user);
//     // const { data } = await axiosInstance.get(`/admin/users/${userId}`);
//     // return data;
//   },

//   // UPDATE USER ROLE
//   async updateUserRole(userId: string, payload: UpdateUserRolePayload): Promise<RoleChangeResult> {
//     const user = DUMMY_USERS.find((u) => u.user_id === userId);
//     if (!user) throw new Error("User not found");

//     const previousRole = user.current_role;
//     const newPermissions = ROLE_PERMISSIONS[payload.role];

//     // Mutate in-memory dummy store so the list reflects the change
//     // immediately, mimicking a real DB update.
//     user.current_role = payload.role;
//     user.permissions = newPermissions;
//     user.role_assigned_on = new Date().toISOString().slice(0, 10);

//     const result: RoleChangeResult = {
//       user_id: userId,
//       previous_role: previousRole,
//       new_role: payload.role,
//       updated_permissions: newPermissions,
//       sessions_invalidated: true,
//       changed_at: new Date().toISOString(),
//     };
//     return delay(result, 500);
//     // const { data } = await axiosInstance.patch(`/admin/users/${userId}/role`, payload);
//     // return data;
//   },
// };

import { axiosInstance } from "@/lib/http/axios";
import type {
  ApiUser,
  ApiUsersResponse,
  CreateUserPayload,
  RoleChangeResult,
  RoleKey,
  UpdateUserRolePayload,
} from "../types/users.types";

const ROLE_PERMISSIONS: Record<RoleKey, ApiUser["permissions"]> = {
  EMPLOYEE: [
    { permission_key: "seat:book_self", permission_label: "Book seat for self" },
    { permission_key: "booking:view_own", permission_label: "View own bookings" },
    { permission_key: "booking:cancel_own", permission_label: "Cancel own bookings" },
  ],
  TALENT: [
    { permission_key: "seat:book_self", permission_label: "Book seat for self" },
    { permission_key: "seat:book_guest", permission_label: "Book seat for guests" },
    { permission_key: "guest:invite", permission_label: "Invite guests without seat booking" },
  ],
  TALENT_GUEST_COORDINATOR: [
    { permission_key: "seat:book_guest", permission_label: "Book seat for guests" },
    { permission_key: "guest:invite", permission_label: "Invite guests" },
  ],
  SECURITY: [
    { permission_key: "guest:view_visits", permission_label: "View visits" },
    { permission_key: "guest:search", permission_label: "Search guests" },
    { permission_key: "guest:check_in", permission_label: "Check-in guests" },
    { permission_key: "guest:check_out", permission_label: "Check-out guests" },
  ],
  TENANT_ADMIN: [
    { permission_key: "user:manage", permission_label: "Manage users" },
    { permission_key: "role:assign", permission_label: "Assign roles" },
    { permission_key: "permission:manage", permission_label: "Manage permissions" },
    { permission_key: "audit:view", permission_label: "View audit logs" },
    { permission_key: "settings:manage", permission_label: "Manage settings" },
  ],
};

const NAMES = [
  "Ravi Kumar", "Sneha R", "John D", "Prakash S", "Kavya M",
  "Anita Desai", "Vikram Rao", "Meera Iyer", "Arjun Nair", "Divya Shah",
  "Karthik P", "Pooja Verma", "Suresh Babu", "Lakshmi N", "Rahul Mehta",
];
const DEPARTMENTS = ["HR", "Engineering", "Operations", "Facilities", "Security", "Sales"];
const ROLE_CYCLE: RoleKey[] = ["EMPLOYEE", "TALENT", "SECURITY", "TALENT_GUEST_COORDINATOR", "TENANT_ADMIN"];

function buildDummyUser(i: number): ApiUser {
  const name = NAMES[i % NAMES.length];
  const suffix = i >= NAMES.length ? String(Math.floor(i / NAMES.length) + 1) : "";
  const role = ROLE_CYCLE[i % ROLE_CYCLE.length];

  return {
    user_id: `usr_${String(i + 1).padStart(4, "0")}`,
    full_name: suffix ? `${name} ${suffix}` : name,
    email: `${name.toLowerCase().replace(/\s+/g, ".")}${suffix}@company.com`,
    department: DEPARTMENTS[i % DEPARTMENTS.length],
    employee_id: `E${10234 + i}`,
    status: i % 11 === 0 ? "inactive" : "active",
    joined_on: "2023-03-15",
    current_role: role,
    role_assigned_on: "2023-03-15",
    permissions: ROLE_PERMISSIONS[role],
  };
}

// 265 to match "Showing 1 to 5 of 265 users" — now paginated 10/page.
const DUMMY_USERS: ApiUser[] = Array.from({ length: 265 }, (_, i) => buildDummyUser(i));

function delay<T>(value: T, ms = 300): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export const usersService = {
  async getUsers(): Promise<ApiUsersResponse> {
    return delay({ items: DUMMY_USERS, total: DUMMY_USERS.length });
    // const { data } = await axiosInstance.get("/admin/users");
    // return data;
  },

  async getUserById(userId: string): Promise<ApiUser | null> {
    const user = DUMMY_USERS.find((u) => u.user_id === userId) ?? null;
    return delay(user);
    // const { data } = await axiosInstance.get(`/admin/users/${userId}`);
    // return data;
  },

  async updateUserRole(userId: string, payload: UpdateUserRolePayload): Promise<RoleChangeResult> {
    const user = DUMMY_USERS.find((u) => u.user_id === userId);
    if (!user) throw new Error("User not found");

    const previousRole = user.current_role;
    const newPermissions = ROLE_PERMISSIONS[payload.role];

    user.current_role = payload.role;
    user.permissions = newPermissions;
    user.role_assigned_on = new Date().toISOString().slice(0, 10);

    const result: RoleChangeResult = {
      user_id: userId,
      previous_role: previousRole,
      new_role: payload.role,
      updated_permissions: newPermissions,
      sessions_invalidated: true,
      changed_at: new Date().toISOString(),
    };
    return delay(result, 500);
    // const { data } = await axiosInstance.patch(`/admin/users/${userId}/role`, payload);
    // return data;
  },

  // CREATE USER ("+ Add User")
  async createUser(payload: CreateUserPayload): Promise<ApiUser> {
    const newUser: ApiUser = {
      user_id: `usr_${String(DUMMY_USERS.length + 1).padStart(4, "0")}`,
      full_name: payload.full_name,
      email: payload.email,
      department: payload.department,
      employee_id: payload.employee_id,
      status: "active",
      joined_on: new Date().toISOString().slice(0, 10),
      current_role: payload.role,
      role_assigned_on: new Date().toISOString().slice(0, 10),
      permissions: ROLE_PERMISSIONS[payload.role],
    };
    DUMMY_USERS.unshift(newUser);
    return delay(newUser);
    // const { data } = await axiosInstance.post("/admin/users", payload);
    // return data;
  },
};