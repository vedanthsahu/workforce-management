

// import { useCallback, useEffect, useState } from "react";
// import { usersService } from "../services/usersService";
// import { mapApiUserToUser } from "../utils/users.utils";
// import type { ApiUserStatus, RoleKey, User, UsersSummary } from "../types/users.types";

// const LIMIT = 10;

// export const useUsers = () => {
//   const [users, setUsers] = useState<User[]>([]);
//   const [summary, setSummary] = useState<UsersSummary | null>(null);
//   const [loading, setLoading] = useState(false);

//   const [search, setSearch] = useState("");
//   const [selectedRoles, setSelectedRoles] = useState<RoleKey[]>([]);
//   const [statusFilter, setStatusFilter] = useState<ApiUserStatus | "ALL">("ALL");
//   const [page, setPage] = useState(1);

//   const fetchUsers = useCallback(async () => {
//     try {
//       setLoading(true);
//       const response = await usersService.getUsers({
//         roles: selectedRoles.length ? selectedRoles : undefined,
//         status: statusFilter === "ALL" ? undefined : statusFilter,
//         page,
//         limit: LIMIT,
//       });
//       setUsers(response.items.map(mapApiUserToUser));
//       setSummary(response.summary);
//     } catch (error) {
//       console.error("Error fetching users", error);
//     } finally {
//       setLoading(false);
//     }
//   }, [selectedRoles, statusFilter, page]);

//   useEffect(() => { fetchUsers(); }, [fetchUsers]);

//   // Reset to page 1 whenever a filter changes
//   useEffect(() => { setPage(1); }, [selectedRoles, statusFilter]);

//   // NOTE: /admin/users has no search param yet, so this only filters the
//   // current page (10 rows), not the full result set. Ask backend for a
//   // `search`/`q` param to make this filter server-side.
//   const filteredUsers = users.filter((u) => {
//     if (!search.trim()) return true;
//     const q = search.toLowerCase();
//     return u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
//   });

//   const totalPages = summary ? Math.max(1, Math.ceil(summary.filteredUsers / LIMIT)) : 1;

//   return {
//     users: filteredUsers,
//     summary,
//     loading,
//     search, setSearch,
//     selectedRoles, setSelectedRoles,
//     statusFilter, setStatusFilter,
//     page, setPage,
//     totalPages,
//     fetchUsers,
//   };
// };


import { useCallback, useEffect, useRef, useState } from "react";
import { usersService } from "../services/usersService";
import { mapApiUserToUser, mapSearchResultToUser } from "../utils/users.utils";
import type { ApiUserStatus, RoleKey, User, UsersSummary } from "../types/users.types";

const LIMIT = 25;
const SEARCH_DEBOUNCE_MS = 350;

export const useUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [summary, setSummary] = useState<UsersSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSearchMode, setIsSearchMode] = useState(false);

  const [search, setSearch] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<RoleKey[]>([]);
  const [statusFilter, setStatusFilter] = useState<ApiUserStatus | "ALL">("ALL");
  const [page, setPage] = useState(1);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Paginated directory fetch (no search query) ───────────────────────────
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await usersService.getUsers({
        roles: selectedRoles.length ? selectedRoles : undefined,
        status: statusFilter === "ALL" ? undefined : statusFilter,
        page,
        limit: LIMIT,
      });
      setUsers(response.items.map(mapApiUserToUser));
      setSummary(response.summary);
    } catch (error) {
      console.error("Error fetching users", error);
    } finally {
      setLoading(false);
    }
  }, [selectedRoles, statusFilter, page]);

  // ── Server-side search (GET /users?q=) ───────────────────────────────────
  const fetchSearch = useCallback(async (q: string) => {
    try {
      setLoading(true);
      const results = await usersService.searchUsers(q, 50);
      setUsers(results.map(mapSearchResultToUser));
      setSummary(null);
    } catch (error) {
      console.error("Error searching users", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Switch between search mode and paginated mode ─────────────────────────
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

  useEffect(() => { setPage(1); }, [selectedRoles, statusFilter]);

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  const totalPages = summary ? Math.max(1, Math.ceil(summary.filteredUsers / LIMIT)) : 1;

  return {
    users,
    summary,
    loading,
    isSearchMode,
    search, setSearch,
    selectedRoles, setSelectedRoles,
    statusFilter, setStatusFilter,
    page, setPage,
    totalPages,
    limit: LIMIT,
    fetchUsers,
  };
};