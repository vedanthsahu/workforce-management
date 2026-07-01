// import type { ApiUser, User } from "../types/users.types";

// // Re-exported here so users components can `import { getRoleBadgeClass } from
// // "../utils/users.utils"` without needing to know it actually lives in the
// // roles feature — keeps role colors identical to Role Management everywhere.
// export { getRoleBadgeClass } from "@/features/roles/utils/roles.utils";

// export function mapApiUserToUser(item: ApiUser): User {
//   return {
//     id: item.user_id,
//     fullName: item.full_name,
//     email: item.email,
//     department: item.department,
//     employeeId: item.employee_id,
//     status: item.status,
//     joinedOn: item.joined_on,
//     currentRole: item.current_role,
//     roleAssignedOn: item.role_assigned_on,
//     permissions: item.permissions.map((p) => p.permission_label),
//   };
// }

// export function formatDate(iso: string): string {
//   return new Date(iso).toLocaleDateString("en-IN", {
//     day: "2-digit",
//     month: "short",
//     year: "numeric",
//   });
// }


import type { ApiUser, User } from "../types/users.types";

export { getRoleBadgeClass } from "@/features/roles/utils/roles.utils";

export function mapApiUserToUser(item: ApiUser): User {
  return {
    id: item.id,
    fullName: item.fullName,
    email: item.email,
    department: item.department,
    employeeId: item.employeeId,
    jobTitle: item.jobTitle,
    mobilePhone: item.mobilePhone,
    status: item.status === "ACTIVE" ? "active" : "inactive",
    currentRole: item.roleName,
  };
}

export function toApiStatus(status: import("../types/users.types").UserStatus): "ACTIVE" | "INACTIVE" {
  return status === "active" ? "ACTIVE" : "INACTIVE";
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}