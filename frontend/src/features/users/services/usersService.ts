import { axiosInstance } from "@/lib/http/axios";
import type {
  ApiUser,
  ApiUsersResponse,
  CreateUserPayload,
  RoleChangeResult,
  UpdateUserRolePayload,
} from "../types/users.types";

export interface GetUsersParams {
  page?: number;
  limit?: number;
  role?: string;
  status?: string;
}

export const usersService = {
  async getUsers(params?: GetUsersParams): Promise<ApiUsersResponse> {
    const { data } = await axiosInstance.get<ApiUsersResponse>("/admin/users", { params });
    return data;
  },

  async getUserById(userId: string): Promise<ApiUser | null> {
    try {
      const { data } = await axiosInstance.get<ApiUser>(`/admin/users/${userId}`);
      return data;
    } catch {
      return null;
    }
  },

  async updateUserAccess(
    userId: string,
    payload: { role_name?: string; status?: string },
  ): Promise<void> {
    await axiosInstance.patch(`/admin/users/${userId}/access`, payload);
  },

  async updateUserRole(userId: string, payload: UpdateUserRolePayload): Promise<RoleChangeResult> {
    const { data } = await axiosInstance.patch<RoleChangeResult>(
      `/admin/users/${userId}/access`,
      { role_name: payload.role },
    );
    return data;
  },

  async createUser(payload: CreateUserPayload): Promise<ApiUser> {
    const { data } = await axiosInstance.post<ApiUser>("/admin/users", payload);
    return data;
  },
};
