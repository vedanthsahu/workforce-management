import { usersService } from "@/features/users/services/usersService";
import { axiosInstance } from "@/lib/http/axios";
import type { ApiRole, ApiRolesResponseLegacy, CreateRolePayload } from "../types/roles.types";

export const rolesService = {
  async getRoles(): Promise<ApiRolesResponseLegacy> {
    const data = await usersService.getUsers();
    const roles: ApiRole[] = data.roles ?? [];
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
