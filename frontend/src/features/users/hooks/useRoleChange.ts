import { useCallback, useEffect, useState } from "react";
import { usersService } from "../services/usersService";
import { mapApiUserToUser } from "../utils/users.utils";
import type { RoleKey, User } from "../types/users.types";

const ALL_ROLES: RoleKey[] = [
  "EMPLOYEE",
  "TALENT",
  "TALENT_GUEST_COORDINATOR",
  "SECURITY",
  "TENANT_ADMIN",
];

export const useRoleChange = (userId: string) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const [selectedRole, setSelectedRole] = useState<string | null>(null);
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
        const apiUser = await usersService.getUserById(userId);
        if (!active) return;
        if (apiUser) {
          const mapped = mapApiUserToUser(apiUser);
          setUser(mapped);
          setSelectedRole(mapped.currentRole);
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
    return () => {
      active = false;
    };
  }, [userId]);

  const hasChanged = !!user && !!selectedRole && selectedRole !== user.currentRole;

  // "Save Role" -> opens the confirm popup
  const openConfirm = useCallback(() => {
    if (!hasChanged) return;
    setErrorMessage(null);
    setConfirmOpen(true);
  }, [hasChanged]);

  const closeConfirm = useCallback(() => {
    setConfirmOpen(false);
  }, []);

  // "Confirm Change" in the popup
  const confirmRoleChange = useCallback(async (): Promise<boolean> => {
    if (!user || !selectedRole) return false;
    try {
      setSubmitting(true);
      setErrorMessage(null);
      await usersService.updateUserRole(user.id, { role: selectedRole as import("../types/users.types").RoleKey });
      setConfirmOpen(false);
      return true;
    } catch (error) {
      console.error("Error updating role", error);
      setErrorMessage("Could not update the role. Please try again.");
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [user, selectedRole]);

  return {
    user,
    loading,
    notFound,

    roles: ALL_ROLES,
    selectedRole,
    setSelectedRole,
    hasChanged,

    confirmOpen,
    openConfirm,
    closeConfirm,

    submitting,
    errorMessage,
    confirmRoleChange,
  };
};