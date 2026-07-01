

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

  // No single-user GET endpoint yet — fetches up to 100 users at a time (the
  // backend max) so all 35 current users come back in one request.
  // Swap for GET /admin/users/{id} when that endpoint exists.
  async getUserById(userId: string): Promise<ApiUser | null> {
    const limit = 100;
    let page = 1;

    while (true) {
      const { items, summary } = await this.getUsers({ page, limit });
      const found = items.find((u) => u.id === userId);
      if (found) return found;
      if (items.length === 0) return null;

      const totalPages = Math.max(1, Math.ceil(summary.totalUsers / limit));
      if (page >= totalPages) return null;
      page++;
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