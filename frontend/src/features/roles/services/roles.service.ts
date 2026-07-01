import { usersService } from "@/features/users/services/usersService";
import { axiosInstance } from "@/lib/http/axios";
import type { ApiRole, ApiRolesResponseLegacy, CreateRolePayload } from "../types/roles.types";

// Hardcoded descriptions and permissions per role
// Replace with data.roles once backend returns them
const ROLE_META: Record<string, { description: string; permissions: { id: number; key: string; description: string; module: string }[] }> = {
  EMPLOYEE: {
    description: "Regular employee user",
    permissions: [
      { id: 1, key: "dashboard:view", description: "View dashboard", module: "Dashboard" },
      { id: 2, key: "seat:book_self", description: "Book seat for self", module: "Booking" },
      { id: 7, key: "booking:view_own", description: "View own bookings", module: "Booking" },
      { id: 8, key: "booking:cancel_own", description: "Cancel own bookings", module: "Booking" },
      { id: 12, key: "teammate:view", description: "View teammate presence", module: "Team" },
    ],
  },
  TALENT: {
    description: "Can book for employees and guests, invite guests",
    permissions: [
      { id: 2, key: "seat:book_self", description: "Book seat for self", module: "Booking" },
      { id: 3, key: "seat:book_guest", description: "Book seat for guests", module: "Booking" },
      { id: 9, key: "guest:invite", description: "Invite guests without seat booking", module: "Guest" },
    ],
  },
  TALENT_GUEST_COORDINATOR: {
    description: "Can book seats for guests and invite guests",
    permissions: [
      { id: 3, key: "seat:book_guest", description: "Book seat for guests", module: "Booking" },
      { id: 9, key: "guest:invite", description: "Invite guests", module: "Guest" },
    ],
  },
  SECURITY: {
    description: "Manages guest visits, search guests, check-in and check-out",
    permissions: [
      { id: 10, key: "guest:view_visits", description: "View visits", module: "Guest" },
      { id: 11, key: "guest:search", description: "Search guests", module: "Guest" },
      { id: 13, key: "guest:check_in", description: "Check-in guests", module: "Guest" },
      { id: 14, key: "guest:check_out", description: "Check-out guests", module: "Guest" },
    ],
  },
  TENANT_ADMIN: {
    description: "System administrator",
    permissions: [
      { id: 26, key: "user:manage", description: "Manage users", module: "Admin" },
      { id: 27, key: "role:assign", description: "Assign roles", module: "Admin" },
      { id: 28, key: "permission:manage", description: "Manage permissions", module: "Admin" },
      { id: 29, key: "audit:view", description: "View audit logs", module: "Admin" },
      { id: 30, key: "settings:manage", description: "Manage settings", module: "Admin" },
    ],
  },
  MANAGER: {
    description: "Team manager with access to team bookings and reports",
    permissions: [
      { id: 2, key: "seat:book_self", description: "Book seat for self", module: "Booking" },
      { id: 15, key: "booking:view_team", description: "View team bookings", module: "Booking" },
      { id: 16, key: "report:view", description: "View reports", module: "Reports" },
    ],
  },
};

export const rolesService = {
  async getRoles(): Promise<ApiRolesResponseLegacy> {
    const data = await usersService.getUsers();

    // When backend returns roles[] directly, use it
    if (data.roles && data.roles.length > 0) {
      return { items: data.roles, total: data.roles.length };
    }

    // Derive roles by grouping items by roleName
    const roleCountMap: Record<string, number> = {};
    let roleIdCounter = 1;
    const roleIdMap: Record<string, number> = {};

    for (const user of data.items ?? []) {
      const role = user.roleName;
      if (!role) continue;
      roleCountMap[role] = (roleCountMap[role] ?? 0) + 1;
      if (!roleIdMap[role]) roleIdMap[role] = roleIdCounter++;
    }

    const roles: ApiRole[] = Object.keys(roleCountMap).map((roleName) => {
      const meta = ROLE_META[roleName] ?? {
        description: `${roleName} role`,
        permissions: [],
      };
      return {
        roleId: roleIdMap[roleName],
        roleName,
        roleDescription: meta.description,
        userCount: roleCountMap[roleName],
        permissionCount: meta.permissions.length,
        permissions: meta.permissions,
      };
    });

    return { items: roles, total: roles.length };
  },

  async getRoleByKey(roleKey: string): Promise<ApiRole | null> {
    const response = await rolesService.getRoles();
    return response.items.find((r) => r.roleName === roleKey) ?? null;
  },

  async createRole(payload: CreateRolePayload): Promise<ApiRole> {
    const { data } = await axiosInstance.post<ApiRole>("/admin/roles", payload);
    return data;
  },
};
