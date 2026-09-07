import { useCallback, useEffect, useRef, useState } from "react";
import { usersService } from "../services/usersService";
import { mapApiUserToUser, mapSearchResultToUser } from "../utils/users.utils";
import type { User, UsersSummary } from "../types/users.types";
import { useUsersFilterStore } from "@/store/useUsersFilterStore";

const SEARCH_DEBOUNCE_MS = 350;

export const useUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [summary, setSummary] = useState<UsersSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSearchMode, setIsSearchMode] = useState(false);

  const search = useUsersFilterStore((s) => s.search);
  const selectedRoles = useUsersFilterStore((s) => s.selectedRoles);
  const statusFilter = useUsersFilterStore((s) => s.statusFilter);
  const page = useUsersFilterStore((s) => s.page);
  const limit = useUsersFilterStore((s) => s.limit);
  const setSearch = useUsersFilterStore((s) => s.setSearch);
  const setSelectedRoles = useUsersFilterStore((s) => s.setSelectedRoles);
  const setStatusFilter = useUsersFilterStore((s) => s.setStatusFilter);
  const setPage = useUsersFilterStore((s) => s.setPage);
  const setLimit = useUsersFilterStore((s) => s.setLimit);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await usersService.getUsers({
        // Send the ORIGINAL (non-normalized) role values to the backend —
        // normalization is a frontend-only comparison concern, the API
        // still expects its own roleName format.
        roles: selectedRoles.length ? selectedRoles : undefined,
        status: statusFilter === "ALL" ? undefined : statusFilter,
        page,
        limit,
      });

      setUsers(response.items.map(mapApiUserToUser));
      setSummary({
        ...response.summary,
        roles: (response.roles ?? []).map((r) => ({
          roleName: r.roleName,
          count: r.userCount,
        })),
      });
    } catch (error) {
      console.error("Error fetching users", error);
    } finally {
      setLoading(false);
    }
  }, [selectedRoles, statusFilter, page, limit]);

  const fetchSearch = useCallback(async (q: string) => {
    try {
      setLoading(true);
      const lower = q.toLowerCase();

      // Name search via the existing API endpoint
      const nameSearchPromise = usersService.searchUsers(q, 50);

      // Email search: fetch all users (no pagination) and filter by email client-side.
      // The /users?q= endpoint doesn't match email, so we do it here separately.
      const emailSearchPromise = usersService.getUsers({
        roles: selectedRoles.length ? selectedRoles : undefined,
        status: statusFilter === "ALL" ? undefined : statusFilter,
      });

      const [nameResults, allUsersResponse] = await Promise.all([
        nameSearchPromise,
        emailSearchPromise,
      ]);

      const nameUsers = nameResults.map(mapSearchResultToUser);
      const emailUsers = allUsersResponse.items
        .map(mapApiUserToUser)
        .filter((u) => u.email.toLowerCase().includes(lower));

      // Merge: name results first, then any email-only matches not already included
      const seen = new Set(nameUsers.map((u) => u.id));
      const merged = [
        ...nameUsers,
        ...emailUsers.filter((u) => !seen.has(u.id)),
      ];

      setUsers(merged);
      setSummary(null);
    } catch (error) {
      console.error("Error searching users", error);
    } finally {
      setLoading(false);
    }
  }, [selectedRoles, statusFilter]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = search.trim();
    if (!q) {
      setIsSearchMode(false);
      return;
    }
    setIsSearchMode(true);
    debounceRef.current = setTimeout(() => fetchSearch(q), SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, fetchSearch]);

  useEffect(() => {
    if (!isSearchMode) fetchUsers();
  }, [isSearchMode, fetchUsers]);

  // Reset to page 1 when a filter changes — but not on the initial mount,
  // otherwise returning from change-role would wipe the restored page.
  const didMountRef = useRef(false);
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    setPage(1);
  }, [selectedRoles, statusFilter, setPage]);

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  const totalPages = summary ? Math.max(1, Math.ceil(summary.filteredUsers / limit)) : 1;

  return {
    users, summary, roles: summary?.roles ?? [], loading, isSearchMode,
    search, setSearch,
    selectedRoles, setSelectedRoles,
    statusFilter, setStatusFilter,
    page, setPage,
    totalPages, limit, setLimit,
    fetchUsers,
  };
};
