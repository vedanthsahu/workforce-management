import { useCallback, useEffect, useState } from "react";
import { usersService } from "../services/usersService";
import { mapApiUserToUser } from "../utils/users.utils";
import type { User } from "../types/users.types";

export const useUsers = () => {
  const [users, setUsers] = useState<User[]>([]);

  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);

      const response = await usersService.getUsers();

      setUsers(response.items.map(mapApiUserToUser));
    } catch (error) {
      console.error("Error fetching users", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = users.filter((u) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  return {
    users: filteredUsers,
    totalUsers: users.length,
    loading,

    search,
    setSearch,

    fetchUsers,
  };
};