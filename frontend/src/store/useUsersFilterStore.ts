// features/users/stores/useUsersFilterStore.ts
import { ApiUserStatus, RoleKey } from "@/features/users/types/users.types";
import { create } from "zustand";


type UsersFilterState = {
    search: string;
    selectedRoles: RoleKey[];
    statusFilter: ApiUserStatus | "ALL";
    page: number;
    limit: number;

    setSearch: (search: string) => void;
    setSelectedRoles: (roles: RoleKey[]) => void;
    setStatusFilter: (status: ApiUserStatus | "ALL") => void;
    setPage: (page: number) => void;
    setLimit: (limit: number) => void;
    reset: () => void;
};

const initialState = {
    search: "",
    selectedRoles: [] as RoleKey[],
    statusFilter: "ALL" as const,
    page: 1,
    limit: 25,
};

export const useUsersFilterStore = create<UsersFilterState>((set) => ({
    ...initialState,

    setSearch: (search) => set({ search, page: 1 }),
    setSelectedRoles: (selectedRoles) => set({ selectedRoles, page: 1 }),
    setStatusFilter: (statusFilter) => set({ statusFilter, page: 1 }),
    setPage: (page) => set({ page }),
    setLimit: (limit) => set({ limit, page: 1 }),
    reset: () => set(initialState),
}));