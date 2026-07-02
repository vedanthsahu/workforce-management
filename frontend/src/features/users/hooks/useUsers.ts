

// // // // import { useCallback, useEffect, useState } from "react";
// // // // import { usersService } from "../services/usersService";
// // // // import { mapApiUserToUser } from "../utils/users.utils";
// // // // import type { ApiUserStatus, RoleKey, User, UsersSummary } from "../types/users.types";

// // // // const LIMIT = 10;

// // // // export const useUsers = () => {
// // // //   const [users, setUsers] = useState<User[]>([]);
// // // //   const [summary, setSummary] = useState<UsersSummary | null>(null);
// // // //   const [loading, setLoading] = useState(false);

// // // //   const [search, setSearch] = useState("");
// // // //   const [selectedRoles, setSelectedRoles] = useState<RoleKey[]>([]);
// // // //   const [statusFilter, setStatusFilter] = useState<ApiUserStatus | "ALL">("ALL");
// // // //   const [page, setPage] = useState(1);

// // // //   const fetchUsers = useCallback(async () => {
// // // //     try {
// // // //       setLoading(true);
// // // //       const response = await usersService.getUsers({
// // // //         roles: selectedRoles.length ? selectedRoles : undefined,
// // // //         status: statusFilter === "ALL" ? undefined : statusFilter,
// // // //         page,
// // // //         limit: LIMIT,
// // // //       });
// // // //       setUsers(response.items.map(mapApiUserToUser));
// // // //       setSummary(response.summary);
// // // //     } catch (error) {
// // // //       console.error("Error fetching users", error);
// // // //     } finally {
// // // //       setLoading(false);
// // // //     }
// // // //   }, [selectedRoles, statusFilter, page]);

// // // //   useEffect(() => { fetchUsers(); }, [fetchUsers]);

// // // //   // Reset to page 1 whenever a filter changes
// // // //   useEffect(() => { setPage(1); }, [selectedRoles, statusFilter]);

// // // //   // NOTE: /admin/users has no search param yet, so this only filters the
// // // //   // current page (10 rows), not the full result set. Ask backend for a
// // // //   // `search`/`q` param to make this filter server-side.
// // // //   const filteredUsers = users.filter((u) => {
// // // //     if (!search.trim()) return true;
// // // //     const q = search.toLowerCase();
// // // //     return u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
// // // //   });

// // // //   const totalPages = summary ? Math.max(1, Math.ceil(summary.filteredUsers / LIMIT)) : 1;

// // // //   return {
// // // //     users: filteredUsers,
// // // //     summary,
// // // //     loading,
// // // //     search, setSearch,
// // // //     selectedRoles, setSelectedRoles,
// // // //     statusFilter, setStatusFilter,
// // // //     page, setPage,
// // // //     totalPages,
// // // //     fetchUsers,
// // // //   };
// // // // };


// // // import { useCallback, useEffect, useRef, useState } from "react";
// // // import { usersService } from "../services/usersService";
// // // import { mapApiUserToUser, mapSearchResultToUser } from "../utils/users.utils";
// // // import type { ApiUserStatus, RoleKey, User, UsersSummary } from "../types/users.types";

// // // const LIMIT = 25;
// // // const SEARCH_DEBOUNCE_MS = 350;

// // // export const useUsers = () => {
// // //   const [users, setUsers] = useState<User[]>([]);
// // //   const [summary, setSummary] = useState<UsersSummary | null>(null);
// // //   const [loading, setLoading] = useState(false);
// // //   const [isSearchMode, setIsSearchMode] = useState(false);

// // //   const [search, setSearch] = useState("");
// // //   const [selectedRoles, setSelectedRoles] = useState<RoleKey[]>([]);
// // //   const [statusFilter, setStatusFilter] = useState<ApiUserStatus | "ALL">("ALL");
// // //   const [page, setPage] = useState(1);

// // //   const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

// // //   // ── Paginated directory fetch (no search query) ───────────────────────────
// // //   const fetchUsers = useCallback(async () => {
// // //     try {
// // //       setLoading(true);
// // //       const response = await usersService.getUsers({
// // //         roles: selectedRoles.length ? selectedRoles : undefined,
// // //         status: statusFilter === "ALL" ? undefined : statusFilter,
// // //         page,
// // //         limit: LIMIT,
// // //       });
// // //       setUsers(response.items.map(mapApiUserToUser));
// // //       setSummary(response.summary);
// // //     } catch (error) {
// // //       console.error("Error fetching users", error);
// // //     } finally {
// // //       setLoading(false);
// // //     }
// // //   }, [selectedRoles, statusFilter, page]);

// // //   // ── Server-side search (GET /users?q=) ───────────────────────────────────
// // //   const fetchSearch = useCallback(async (q: string) => {
// // //     try {
// // //       setLoading(true);
// // //       const results = await usersService.searchUsers(q, 50);
// // //       setUsers(results.map(mapSearchResultToUser));
// // //       setSummary(null);
// // //     } catch (error) {
// // //       console.error("Error searching users", error);
// // //     } finally {
// // //       setLoading(false);
// // //     }
// // //   }, []);

// // //   // ── Switch between search mode and paginated mode ─────────────────────────
// // //   useEffect(() => {
// // //     if (debounceRef.current) clearTimeout(debounceRef.current);
// // //     const q = search.trim();
// // //     if (!q) {
// // //       setIsSearchMode(false);
// // //       return;
// // //     }
// // //     setIsSearchMode(true);
// // //     debounceRef.current = setTimeout(() => fetchSearch(q), SEARCH_DEBOUNCE_MS);
// // //     return () => {
// // //       if (debounceRef.current) clearTimeout(debounceRef.current);
// // //     };
// // //   }, [search, fetchSearch]);

// // //   useEffect(() => {
// // //     if (!isSearchMode) fetchUsers();
// // //   }, [isSearchMode, fetchUsers]);

// // //   useEffect(() => { setPage(1); }, [selectedRoles, statusFilter]);

// // //   useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

// // //   const totalPages = summary ? Math.max(1, Math.ceil(summary.filteredUsers / LIMIT)) : 1;

// // //   return {
// // //     users,
// // //     summary,
// // //     loading,
// // //     isSearchMode,
// // //     search, setSearch,
// // //     selectedRoles, setSelectedRoles,
// // //     statusFilter, setStatusFilter,
// // //     page, setPage,
// // //     totalPages,
// // //     limit: LIMIT,
// // //     fetchUsers,
// // //   };
// // // };

// // import { useCallback, useEffect, useRef, useState } from "react";
// // import { usersService } from "../services/usersService";
// // import { mapApiUserToUser, mapSearchResultToUser } from "../utils/users.utils";
// // import type { ApiUserStatus, RoleKey, User, UsersSummary } from "../types/users.types";

// // const LIMIT = 25;
// // const SEARCH_DEBOUNCE_MS = 350;

// // export const useUsers = () => {
// //   const [users, setUsers] = useState<User[]>([]);
// //   const [summary, setSummary] = useState<UsersSummary | null>(null);
// //   const [loading, setLoading] = useState(false);
// //   const [isSearchMode, setIsSearchMode] = useState(false);

// //   const [search, setSearch] = useState("");
// //   const [selectedRoles, setSelectedRoles] = useState<RoleKey[]>([]);
// //   const [statusFilter, setStatusFilter] = useState<ApiUserStatus | "ALL">("ALL");
// //   const [page, setPage] = useState(1);

// //   const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

// //   const fetchUsers = useCallback(async () => {
// //     try {
// //       setLoading(true);
// //       const response = await usersService.getUsers({
// //         roles: selectedRoles.length ? selectedRoles : undefined,
// //         status: statusFilter === "ALL" ? undefined : statusFilter,
// //         page,
// //         limit: LIMIT,
// //       });

// //       setUsers(response.items.map(mapApiUserToUser));

// //       // The API returns roles as a separate top-level array (roleName + userCount),
// //       // not nested inside summary — build the RoleCount[] the dropdown expects here.
// //       setSummary({
// //         ...response.summary,
// //         roles: (response.roles ?? []).map((r) => ({
// //           roleName: r.roleName,
// //           count: r.userCount,
// //         })),
// //       });
// //     } catch (error) {
// //       console.error("Error fetching users", error);
// //     } finally {
// //       setLoading(false);
// //     }
// //   }, [selectedRoles, statusFilter, page]);

// //   const fetchSearch = useCallback(async (q: string) => {
// //     try {
// //       setLoading(true);
// //       const results = await usersService.searchUsers(q, 50);
// //       setUsers(results.map(mapSearchResultToUser));
// //       setSummary(null);
// //     } catch (error) {
// //       console.error("Error searching users", error);
// //     } finally {
// //       setLoading(false);
// //     }
// //   }, []);

// //   useEffect(() => {
// //     if (debounceRef.current) clearTimeout(debounceRef.current);
// //     const q = search.trim();
// //     if (!q) {
// //       setIsSearchMode(false);
// //       return;
// //     }
// //     setIsSearchMode(true);
// //     debounceRef.current = setTimeout(() => fetchSearch(q), SEARCH_DEBOUNCE_MS);
// //     return () => {
// //       if (debounceRef.current) clearTimeout(debounceRef.current);
// //     };
// //   }, [search, fetchSearch]);

// //   useEffect(() => {
// //     if (!isSearchMode) fetchUsers();
// //   }, [isSearchMode, fetchUsers]);

// //   useEffect(() => { setPage(1); }, [selectedRoles, statusFilter]);

// //   useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

// //   const totalPages = summary ? Math.max(1, Math.ceil(summary.filteredUsers / LIMIT)) : 1;

// //   return {
// //     users,
// //     summary,
// //     loading,
// //     isSearchMode,
// //     search, setSearch,
// //     selectedRoles, setSelectedRoles,
// //     statusFilter, setStatusFilter,
// //     page, setPage,
// //     totalPages,
// //     limit: LIMIT,
// //     fetchUsers,
// //   };
// // };


// // features/users/hooks/useUsers.ts
// import { useCallback, useEffect, useRef } from "react";
// import { usersService } from "../services/usersService";
// import { mapApiUserToUser, mapSearchResultToUser } from "../utils/users.utils";

// import { useState } from "react";
// import type { User, UsersSummary } from "../types/users.types";
// import { useUsersFilterStore } from "@/store/useUsersFilterStore";

// const LIMIT = 25;
// const SEARCH_DEBOUNCE_MS = 350;

// export const useUsers = () => {
//   const [users, setUsers] = useState<User[]>([]);
//   const [summary, setSummary] = useState<UsersSummary | null>(null);
//   const [loading, setLoading] = useState(false);
//   const [isSearchMode, setIsSearchMode] = useState(false);

//   const search = useUsersFilterStore((s) => s.search);
//   const selectedRoles = useUsersFilterStore((s) => s.selectedRoles);
//   const statusFilter = useUsersFilterStore((s) => s.statusFilter);
//   const page = useUsersFilterStore((s) => s.page);
//   const setSearch = useUsersFilterStore((s) => s.setSearch);
//   const setSelectedRoles = useUsersFilterStore((s) => s.setSelectedRoles);
//   const setStatusFilter = useUsersFilterStore((s) => s.setStatusFilter);
//   const setPage = useUsersFilterStore((s) => s.setPage);

//   const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
//       setSummary({
//         ...response.summary,
//         roles: (response.roles ?? []).map((r) => ({
//           roleName: r.roleName,
//           count: r.userCount,
//         })),
//       });
//     } catch (error) {
//       console.error("Error fetching users", error);
//     } finally {
//       setLoading(false);
//     }
//   }, [selectedRoles, statusFilter, page]);

//   const fetchSearch = useCallback(async (q: string) => {
//     try {
//       setLoading(true);
//       const results = await usersService.searchUsers(q, 50);
//       setUsers(results.map(mapSearchResultToUser));
//       setSummary(null);
//     } catch (error) {
//       console.error("Error searching users", error);
//     } finally {
//       setLoading(false);
//     }
//   }, []);

//   useEffect(() => {
//     if (debounceRef.current) clearTimeout(debounceRef.current);
//     const q = search.trim();
//     if (!q) {
//       setIsSearchMode(false);
//       return;
//     }
//     setIsSearchMode(true);
//     debounceRef.current = setTimeout(() => fetchSearch(q), SEARCH_DEBOUNCE_MS);
//     return () => {
//       if (debounceRef.current) clearTimeout(debounceRef.current);
//     };
//   }, [search, fetchSearch]);

//   useEffect(() => {
//     if (!isSearchMode) fetchUsers();
//   }, [isSearchMode, fetchUsers]);

//   useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

//   const totalPages = summary ? Math.max(1, Math.ceil(summary.filteredUsers / LIMIT)) : 1;

//   return {
//     users, summary, loading, isSearchMode,
//     search, setSearch,
//     selectedRoles, setSelectedRoles,
//     statusFilter, setStatusFilter,
//     page, setPage,
//     totalPages, limit: LIMIT,
//     fetchUsers,
//   };
// };


import { useCallback, useEffect, useRef, useState } from "react";
import { usersService } from "../services/usersService";
import { mapApiUserToUser, mapSearchResultToUser } from "../utils/users.utils";
import type { User, UsersSummary } from "../types/users.types";
import { useUsersFilterStore } from "@/store/useUsersFilterStore";

const LIMIT = 25;
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
  const setSearch = useUsersFilterStore((s) => s.setSearch);
  const setSelectedRoles = useUsersFilterStore((s) => s.setSelectedRoles);
  const setStatusFilter = useUsersFilterStore((s) => s.setStatusFilter);
  const setPage = useUsersFilterStore((s) => s.setPage);

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
        limit: LIMIT,
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
  }, [selectedRoles, statusFilter, page]);

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
  }, [selectedRoles, statusFilter]);

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  const totalPages = summary ? Math.max(1, Math.ceil(summary.filteredUsers / LIMIT)) : 1;

  return {
    users, summary, roles: summary?.roles ?? [], loading, isSearchMode,
    search, setSearch,
    selectedRoles, setSelectedRoles,
    statusFilter, setStatusFilter,
    page, setPage,
    totalPages, limit: LIMIT,
    fetchUsers,
  };
};