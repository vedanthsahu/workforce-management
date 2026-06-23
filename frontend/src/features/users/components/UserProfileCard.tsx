import { Check } from "lucide-react";
import { getRoleBadgeClass, formatDate } from "../utils/users.utils";
import type { User } from "../types/users.types";

export default function UserProfileCard({ user }: { user: User }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 space-y-4">
      <div>
        <p className="text-xs text-gray-400 mb-2">User Profile</p>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-semibold text-indigo-700 shrink-0">
            {initialsFor(user.fullName)}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{user.fullName}</p>
            <p className="text-xs text-gray-400">{user.email}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-y-3 text-sm border-t pt-4">
        <div>
          <p className="text-xs text-gray-400">Department</p>
          <p className="font-medium text-gray-800">{user.department}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Employee ID</p>
          <p className="font-medium text-gray-800">{user.employeeId}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Status</p>
          <span
            className={`inline-flex items-center gap-1.5 font-medium ${
              user.status === "active" ? "text-emerald-600" : "text-gray-400"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            {user.status === "active" ? "Active" : "Inactive"}
          </span>
        </div>
        <div>
          <p className="text-xs text-gray-400">Joined On</p>
          <p className="font-medium text-gray-800">{formatDate(user.joinedOn)}</p>
        </div>
      </div>

      <div className="rounded-lg bg-gray-50 p-3 border">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Current Role</span>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ring-1 ${getRoleBadgeClass(
              user.currentRole
            )}`}
          >
            {user.currentRole}
          </span>
        </div>
        <p className="text-[11px] text-gray-400 mt-1">Assigned on: {formatDate(user.roleAssignedOn)}</p>
      </div>

      <div>
        <p className="text-xs font-medium text-gray-500 mb-2">
          Assigned Permissions ({user.permissions.length})
        </p>
        <ul className="space-y-1.5">
          {user.permissions.map((perm, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
              <Check size={14} className="text-emerald-500 mt-0.5 shrink-0" />
              {perm}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}