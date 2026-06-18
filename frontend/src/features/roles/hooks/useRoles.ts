import { useCallback, useEffect, useState } from "react";
import { rolesService } from "../services/roles.service";
import { mapApiRoleToRole } from "../utils/roles.utils";
import type { Role } from "../types/roles.types";

export const useRoles = () => {
  const [roles, setRoles] = useState<Role[]>([]);

  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");

  const fetchRoles = useCallback(async () => {
    try {
      setLoading(true);

      const response = await rolesService.getRoles();

      setRoles(response.items.map(mapApiRoleToRole));
    } catch (error) {
      console.error("Error fetching roles", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const filteredRoles = roles.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return r.name.toLowerCase().includes(q) || r.description.toLowerCase().includes(q);
  });

  return {
    roles: filteredRoles,
    totalRoles: roles.length,
    loading,

    search,
    setSearch,

    fetchRoles,
  };
};