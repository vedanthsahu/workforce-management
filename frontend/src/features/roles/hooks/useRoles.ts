import { useCallback, useEffect, useState } from "react";
import { rolesService } from "../services/roles.service";
import { mapApiRoleToRole } from "../utils/roles.utils";
import type { Role } from "../types/roles.types";
import { searchMatchRank } from "@/lib/searchRank";

export const useRoles = () => {
  const [roles, setRoles] = useState<Role[]>([]);

  // Start true so the table shows skeleton rows (not "No roles found.")
  // before the first fetch kicks off.
  const [loading, setLoading] = useState(true);

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

  // Word-prefix, search-as-you-go -- matches the same rule used across the
  // admin list pages (Offices/Buildings/Floors/Amenities): "admin" and
  // "manager" both match "Team Manager", but "anager" (mid-word) does not.
  const filteredRoles = roles
    .map((r) => ({ role: r, rank: searchMatchRank(r.name, search) }))
    .filter((x): x is { role: Role; rank: number } => x.rank !== null)
    .sort((a, b) => a.rank - b.rank)
    .map((x) => x.role);

  return {
    roles: filteredRoles,
    totalRoles: roles.length,
    loading,

    search,
    setSearch,

    fetchRoles,
  };
};