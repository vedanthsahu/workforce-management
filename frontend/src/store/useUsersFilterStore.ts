// Zustand store for the User Management page's filters.
//
// WHY A STORE INSTEAD OF useState IN THE HOOK:
// Navigating to /admin/users/[id]/change-role and back unmounts the page,
// which would reset local useState. Keeping search/role/status/page here
// lets that state survive the round trip.

import { create } from "zustand";
import type { ApiUserStatus, RoleKey } from "@/features/users/types/users.types";

interface UsersFilterState {
  search: string;
  selectedRoles: RoleKey[];
  statusFilter: ApiUserStatus | "ALL";
  page: number;
  setSearch: (search: string) => void;
  setSelectedRoles: (roles: RoleKey[]) => void;
  setStatusFilter: (status: ApiUserStatus | "ALL") => void;
  setPage: (page: number) => void;
}

export const useUsersFilterStore = create<UsersFilterState>((set) => ({
  search: "",
  selectedRoles: [],
  statusFilter: "ALL",
  page: 1,
  setSearch: (search) => set({ search }),
  setSelectedRoles: (selectedRoles) => set({ selectedRoles }),
  setStatusFilter: (statusFilter) => set({ statusFilter }),
  setPage: (page) => set({ page }),
}));
