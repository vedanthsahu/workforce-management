import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { usersService } from "../services/usersService";
import { mapApiUserToUser, toApiStatus } from "../utils/users.utils";
import type { RoleKey, User, UserStatus } from "../types/users.types";

// Kept out of the assignable-role dropdown list entirely -- PRODUCT_ADMIN
// can never be assigned via this endpoint, and has no in-app management
// flow at all. TENANT_ADMIN is deliberately NOT in this set: a Tenant Admin
// can promote any user straight to TENANT_ADMIN, manage an existing admin's
// access, or their own -- see admin_update_user_access_service.
const NON_ASSIGNABLE_ROLES = new Set(["PRODUCT_ADMIN"]);

export const useRoleChange = (userId: string) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [roles, setRoles] = useState<RoleKey[]>([]);

  const [selectedRole, setSelectedRole] = useState<RoleKey | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<UserStatus>("active");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    (async () => {
      try {
        setLoading(true);
        setNotFound(false);
        setErrorMessage(null);

        // The target user comes from the dedicated single-user endpoint
        // (GET /users/{id}) instead of paging through the whole directory
        // to find it. The assignable-roles list still has no endpoint of
        // its own — it only exists as a side-channel of GET /admin/users
        // (see rolesService.getRoles) — so that call stays, but at the
        // smallest possible page size: its `roles` field is a tenant-wide
        // summary, not scoped to the page, so `limit: 1` is enough.
        const [apiUser, { roles: apiRoles }] = await Promise.all([
          usersService.getUserById(userId),
          usersService.getUsers({ limit: 1 }),
        ]);
        if (!active) return;

        // Populate assignable roles from the API — excludes PRODUCT_ADMIN only.
        const assignable = apiRoles
          .filter(({ roleName }) => !NON_ASSIGNABLE_ROLES.has(roleName))
          .map(({ roleName }) => roleName as RoleKey);
        setRoles(assignable);

        if (apiUser) {
          const mapped = mapApiUserToUser(apiUser);
          setUser(mapped);
          setSelectedRole(mapped.currentRole);
          setSelectedStatus(mapped.status);
        } else {
          setNotFound(true);
        }
      } catch (error) {
        console.error("Error fetching user", error);
        if (active) setErrorMessage("Could not load this user. Please try again.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [userId]);

  const hasChanged =
    !!user &&
    ((!!selectedRole && selectedRole !== user.currentRole) ||
      selectedStatus !== user.status);

  const openConfirm = useCallback(() => {
    if (!hasChanged) return;
    setErrorMessage(null);
    setConfirmOpen(true);
  }, [hasChanged]);

  const closeConfirm = useCallback(() => setConfirmOpen(false), []);

  const confirmRoleChange = useCallback(async (): Promise<boolean> => {
    if (!user || !selectedRole) return false;
    try {
      setSubmitting(true);
      setErrorMessage(null);
      await usersService.updateUserAccess(user.id, {
        role_name: selectedRole,
        status: toApiStatus(selectedStatus),
      });
      setConfirmOpen(false);
      return true;
    } catch (error) {
      console.error("Error updating access", error);
      // Surface the backend's actual reason when there is one (e.g. the
      // last-admin guard, or a protected-role rejection) instead of a
      // generic message that reads like a transient failure.
      const serverMessage = axios.isAxiosError(error)
        ? error.response?.data?.error?.message
        : undefined;
      setErrorMessage(serverMessage ?? "Could not update role/status. Please try again.");
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [user, selectedRole, selectedStatus]);

  return {
    user, loading, notFound,
    roles,
    selectedRole, setSelectedRole,
    selectedStatus, setSelectedStatus,
    hasChanged,
    confirmOpen, openConfirm, closeConfirm,
    submitting, errorMessage, confirmRoleChange,
  };
};