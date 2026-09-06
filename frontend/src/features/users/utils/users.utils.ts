

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
    // Only GET /users/{id} returns this -- GET /admin/users doesn't.
    officeLocation: item.officeLocation ?? null,
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
    officeLocation: null,
  };
}

export function toApiStatus(status: import("../types/users.types").UserStatus): "ACTIVE" | "INACTIVE" {
  return status === "active" ? "ACTIVE" : "INACTIVE";
}

export function formatDate(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function normalizeRoleKey(value: string | null | undefined): string {
  if (!value) return "";
  return value.trim().toUpperCase().replace(/[\s_-]+/g, "_");
}