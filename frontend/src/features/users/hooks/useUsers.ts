import { useCallback, useEffect, useRef, useState } from "react";
import { usersService } from "../services/usersService";
import { mapApiUserToUser, mapSearchResultToUser, SEARCH_DEBOUNCE_MS } from "../utils/users.utils";
import type { User, UsersSummary } from "../types/users.types";
import { useUsersFilterStore } from "@/store/useUsersFilterStore";

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

  // GET /users?q= now matches name AND email (word-prefix on both, see
  // search_users in user_repository.py), so one call covers both -- no more
  // fetching every user in the tenant just to filter by email client-side.
  //
  // The endpoint defaults to active-only (include_inactive=false) -- without
  // passing this, search silently dropped every inactive user regardless of
  // the Status filter dropdown. There's no "inactive only" mode on the
  // backend, just include/exclude, so an INACTIVE-only filter still has to
  // fetch both and narrow client-side.
  const fetchSearch = useCallback(async (q: string) => {
    try {
      setLoading(true);
      const includeInactive = statusFilter !== "ACTIVE";
      const results = await usersService.searchUsers(q, 50, includeInactive);
      const scoped = statusFilter === "INACTIVE"
        ? results.filter((r) => r.status === "INACTIVE")
        : results;
      setUsers(scoped.map(mapSearchResultToUser));
      setSummary(null);
    } catch (error) {
      console.error("Error searching users", error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

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
