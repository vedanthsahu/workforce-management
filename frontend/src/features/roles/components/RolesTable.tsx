"use client";

import { Eye } from "lucide-react";
import { getRoleBadgeClass } from "../utils/roles.utils";
import type { Role } from "../types/roles.types";

type Props = {
  roles: Role[];
  onViewRole: (role: Role) => void;
  activeRoleKey?: string | null;
};

export default function RolesTable({ roles, onViewRole, activeRoleKey }: Props) {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b bg-gray-50/60">
            <th className="py-2.5 px-4 text-xs font-semibold text-gray-500 whitespace-nowrap">Role Name</th>
            <th className="py-2.5 px-4 text-xs font-semibold text-gray-500 whitespace-nowrap">Description</th>
            <th className="py-2.5 px-4 text-xs font-semibold text-gray-500 whitespace-nowrap">Users</th>
            <th className="py-2.5 px-4 text-xs font-semibold text-gray-500 whitespace-nowrap">Permissions</th>
            <th className="py-2.5 px-4 text-xs font-semibold text-gray-500 whitespace-nowrap">Action</th>
          </tr>
        </thead>
        <tbody>
          {roles.length === 0 && (
            <tr>
              <td colSpan={5} className="py-8 text-center text-sm text-gray-400">
                No roles found.
              </td>
            </tr>
          )}

          {roles.map((role) => (
            <tr
              key={role.key}
              className={`border-b last:border-0 hover:bg-gray-50/60 transition-colors ${
                activeRoleKey === role.key ? "bg-indigo-50/40" : ""
              }`}
            >
              <td className="py-3 px-4">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ring-1 ${getRoleBadgeClass(
                    role.key
                  )}`}
                >
                  {role.name}
                </span>
              </td>
              <td className="py-3 px-4 text-sm text-gray-600 max-w-[280px] truncate">
                {role.description}
              </td>
              <td className="py-3 px-4 text-sm text-gray-700">{role.userCount}</td>
              <td className="py-3 px-4 text-sm text-gray-700">{role.permissionCount}</td>
              <td className="py-3 px-4">
                <button
                  type="button"
                  onClick={() => onViewRole(role)}
                  className="inline-flex items-center justify-center w-8 h-8 rounded-md border hover:bg-gray-50 text-gray-500 transition-colors"
                  title="View role"
                >
                  <Eye size={14} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}