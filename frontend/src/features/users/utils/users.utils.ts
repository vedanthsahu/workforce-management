

import type { ApiUser, ApiUserSearchResult, User } from "../types/users.types";

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

export function mapSearchResultToUser(item: ApiUserSearchResult): User {
  return {
    id: item.user_id,
    fullName: item.full_name,
    email: item.email,
    department: item.department ?? "",
    employeeId: item.employee_id,
    jobTitle: "",
    mobilePhone: "",
    status: item.status === "ACTIVE" ? "active" : "inactive",
    currentRole: item.role_name,
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