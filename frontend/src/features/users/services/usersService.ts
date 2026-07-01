

import { axiosInstance } from "@/lib/http/axios";
import type {
  ApiUser,
  ApiUsersResponse,
  GetUsersParams,
  UpdateUserAccessPayload,
  UserAccessResult,
} from "../types/users.types";

// export const usersService = {
//   // GET /admin/users?role=&roles=&status=&page=&limit=
//   async getUsers(params?: GetUsersParams): Promise<ApiUsersResponse> {
//     const { data } = await axiosInstance.get("/admin/users", {
//       params,
//       // FastAPI expects repeated keys for list query params: roles=A&roles=B
//       paramsSerializer: (p: Record<string, unknown>) => {
//         const usp = new URLSearchParams();
//         Object.entries(p).forEach(([key, value]) => {
//           if (value === undefined || value === null) return;
//           if (Array.isArray(value)) {
//             value.forEach((v) => usp.append(key, String(v)));
//           } else {
//             usp.append(key, String(value));
//           }
//         });
//         return usp.toString();
//       },
//     });
//     return data;
//   },

//   // PATCH /admin/users/{user_id}/access — updates role + status together
//   async updateUserAccess(userId: string, payload: UpdateUserAccessPayload): Promise<UserAccessResult> {
//     const { data } = await axiosInstance.patch(`/admin/users/${userId}/access`, payload);
//     return data;
//   },

//   // TODO: no single-user GET endpoint yet — the change-role page needs this
//   // to load full profile details. Wire this up once that endpoint exists.
//   async getUserById(userId: string): Promise<ApiUser | null> {
//     const { items } = await this.getUsers({ limit: 100 });
//     return items.find((u) => u.id === userId) ?? null;
//   },

//   // TODO: no create-user endpoint yet — still stubbed client-side.
//   async createUser(): Promise<never> {
//     throw new Error("Create user endpoint not available yet.");
//   },
// };

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

  async createUser(): Promise<never> {
    throw new Error("Create user endpoint not available yet.");
  },
};