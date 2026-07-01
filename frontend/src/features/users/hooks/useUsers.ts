// import { useCallback, useEffect, useState } from "react";
// import { usersService } from "../services/usersService";
// import { mapApiUserToUser } from "../utils/users.utils";
// import type { User } from "../types/users.types";

// export const useUsers = () => {
//   const [users, setUsers] = useState<User[]>([]);

//   const [loading, setLoading] = useState(false);

//   const [search, setSearch] = useState("");

//   const fetchUsers = useCallback(async () => {
//     try {
//       setLoading(true);

//       const response = await usersService.getUsers();

//       setUsers(response.items.map(mapApiUserToUser));
//     } catch (error) {
//       console.error("Error fetching users", error);
//     } finally {
//       setLoading(false);
//     }
//   }, []);

//   useEffect(() => {
//     fetchUsers();
//   }, [fetchUsers]);

//   const filteredUsers = users.filter((u) => {
//     if (!search.trim()) return true;
//     const q = search.toLowerCase();
//     return u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
//   });

//   return {
//     users: filteredUsers,
//     totalUsers: users.length,
//     loading,

//     search,
//     setSearch,

//     fetchUsers,
//   };
// };



import { useCallback, useEffect, useState } from "react";
import { usersService } from "../services/usersService";
import { mapApiUserToUser } from "../utils/users.utils";
import type { ApiUserStatus, RoleKey, User, UsersSummary } from "../types/users.types";

const LIMIT = 10;

export const useUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [summary, setSummary] = useState<UsersSummary | null>(null);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<RoleKey[]>([]);
  const [statusFilter, setStatusFilter] = useState<ApiUserStatus | "ALL">("ALL");
  const [page, setPage] = useState(1);

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

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // Reset to page 1 whenever a filter changes
  useEffect(() => { setPage(1); }, [selectedRoles, statusFilter]);

  // NOTE: /admin/users has no search param yet, so this only filters the
  // current page (10 rows), not the full result set. Ask backend for a
  // `search`/`q` param to make this filter server-side.
  const filteredUsers = users.filter((u) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  const totalPages = summary ? Math.max(1, Math.ceil(summary.filteredUsers / LIMIT)) : 1;

  return {
    users: filteredUsers,
    summary,
    loading,
    search, setSearch,
    selectedRoles, setSelectedRoles,
    statusFilter, setStatusFilter,
    page, setPage,
    totalPages,
    fetchUsers,
  };
};