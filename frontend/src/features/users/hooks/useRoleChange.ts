// import { useCallback, useEffect, useState } from "react";
// import { usersService } from "../services/usersService";
// import { mapApiUserToUser } from "../utils/users.utils";
// import type { RoleKey, User } from "../types/users.types";

// const ALL_ROLES: RoleKey[] = [
//   "EMPLOYEE",
//   "TALENT",
//   "TALENT_GUEST_COORDINATOR",
//   "SECURITY",
//   "TENANT_ADMIN",
// ];

// export const useRoleChange = (userId: string) => {
//   const [user, setUser] = useState<User | null>(null);
//   const [loading, setLoading] = useState(false);
//   const [notFound, setNotFound] = useState(false);

//   const [selectedRole, setSelectedRole] = useState<RoleKey | null>(null);
//   const [confirmOpen, setConfirmOpen] = useState(false);
//   const [submitting, setSubmitting] = useState(false);
//   const [errorMessage, setErrorMessage] = useState<string | null>(null);

//   useEffect(() => {
//     if (!userId) return;
//     let active = true;
//     (async () => {
//       try {
//         setLoading(true);
//         setNotFound(false);
//         setErrorMessage(null);
//         const apiUser = await usersService.getUserById(userId);
//         if (!active) return;
//         if (apiUser) {
//           const mapped = mapApiUserToUser(apiUser);
//           setUser(mapped);
//           setSelectedRole(mapped.currentRole);
//         } else {
//           setNotFound(true);
//         }
//       } catch (error) {
//         console.error("Error fetching user", error);
//         if (active) setErrorMessage("Could not load this user. Please try again.");
//       } finally {
//         if (active) setLoading(false);
//       }
//     })();
//     return () => {
//       active = false;
//     };
//   }, [userId]);

//   const hasChanged = !!user && !!selectedRole && selectedRole !== user.currentRole;

//   // "Save Role" -> opens the confirm popup
//   const openConfirm = useCallback(() => {
//     if (!hasChanged) return;
//     setErrorMessage(null);
//     setConfirmOpen(true);
//   }, [hasChanged]);

//   const closeConfirm = useCallback(() => {
//     setConfirmOpen(false);
//   }, []);

//   // "Confirm Change" in the popup
//   const confirmRoleChange = useCallback(async (): Promise<boolean> => {
//     if (!user || !selectedRole) return false;
//     try {
//       setSubmitting(true);
//       setErrorMessage(null);
//       await usersService.updateUserRole(user.id, { role: selectedRole });
//       setConfirmOpen(false);
//       return true;
//     } catch (error) {
//       console.error("Error updating role", error);
//       setErrorMessage("Could not update the role. Please try again.");
//       return false;
//     } finally {
//       setSubmitting(false);
//     }
//   }, [user, selectedRole]);

//   return {
//     user,
//     loading,
//     notFound,

//     roles: ALL_ROLES,
//     selectedRole,
//     setSelectedRole,
//     hasChanged,

//     confirmOpen,
//     openConfirm,
//     closeConfirm,

//     submitting,
//     errorMessage,
//     confirmRoleChange,
//   };
// };



import { useCallback, useEffect, useState } from "react";
import { usersService } from "../services/usersService";
import { mapApiUserToUser, toApiStatus } from "../utils/users.utils";
import type { RoleKey, User, UserStatus } from "../types/users.types";

// Admin-only roles the PATCH /admin/users/{id}/access endpoint will not accept.
const NON_ASSIGNABLE_ROLES = new Set(["TENANT_ADMIN", "PRODUCT_ADMIN"]);

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

        // One request gets all users + summary.roles — no second round-trip needed.
        const { items, summary } = await usersService.getUsers({ limit: 100 });
        if (!active) return;

        // Populate assignable roles from the API — excludes admin-only roles.
        const assignable = summary.roles
          .filter(({ roleName }) => !NON_ASSIGNABLE_ROLES.has(roleName))
          .map(({ roleName }) => roleName as RoleKey);
        setRoles(assignable);

        // Find the target user in the returned items.
        const apiUser = items.find((u) => u.id === userId) ?? null;
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
      setErrorMessage("Could not update role/status. Please try again.");
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