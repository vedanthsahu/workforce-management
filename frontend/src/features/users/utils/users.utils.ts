import type { ApiUser, User } from "../types/users.types";

export { getRoleBadgeClass } from "@/features/roles/utils/roles.utils";

export function mapApiUserToUser(item: ApiUser): User {
  return {
    id: item.id,
    fullName: item.fullName ?? "—",
    email: item.email ?? "—",
    department: item.department ?? "—",
    employeeId: item.employeeId ?? "—",
    status: (item.status?.toLowerCase() === "active" ? "active" : "inactive"),
    joinedOn: "",
    currentRole: item.roleName ?? "—",
    roleAssignedOn: "",
    permissions: [],
    jobTitle: item.jobTitle ?? undefined,
    mobilePhone: item.mobilePhone ?? undefined,
  };
}

export function formatDate(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
