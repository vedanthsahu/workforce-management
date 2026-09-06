import axios from "axios";
import { axiosInstance } from "@/lib/http/axios";
import type {
  ApiUser,
  ApiUsersResponse,
  ApiUserSearchResult,
  GetUsersParams,
  UpdateUserAccessPayload,
  UserAccessResult,
} from "../types/users.types";

// services/usersService.ts
export const usersService = {
  async getUsers(params?: GetUsersParams): Promise<ApiUsersResponse> {
    const { data } = await axiosInstance.get("/admin/users", {
      params,
      paramsSerializer: (p: Record<string, unknown>) => {
        const usp = new URLSearchParams();
        Object.entries(p).forEach(([key, value]) => {
          if (value === undefined || value === null) return;
          if (Array.isArray(value)) {
            value.forEach((v) => usp.append(key, String(v)));
          } else {
            usp.append(key, String(value));
          }
        });
        return usp.toString();
      },
    });
    return data;
  },
//role change 
  async updateUserAccess(userId: string, payload: UpdateUserAccessPayload): Promise<UserAccessResult> {
    const { data } = await axiosInstance.patch(`/admin/users/${userId}/access`, payload);
    return data;
  },

  async getUserById(userId: string): Promise<ApiUser | null> {
    try {
      const { data } = await axiosInstance.get<ApiUser>(`/users/${userId}`);
      return data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) return null;
      throw error;
    }
  },

  async searchUsers(q: string, limit = 20): Promise<ApiUserSearchResult[]> {
    const { data } = await axiosInstance.get("/users", { params: { q, limit } });
    return data;
  },

  async createUser(): Promise<never> {
    throw new Error("Create user endpoint not available yet.");
  },
};
