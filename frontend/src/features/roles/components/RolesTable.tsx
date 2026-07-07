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
  if (roles.length === 0) {
    return <p className="px-6 py-12 text-center text-gray-400 text-sm">No roles found.</p>;
  }

  return (
    <>
      <style>{`
        .roles-tbody-scroll::-webkit-scrollbar { width: 8px; }
        .roles-tbody-scroll::-webkit-scrollbar-thumb { background-color: #e2e8f0; border-radius: 9999px; }
        .roles-tbody-scroll::-webkit-scrollbar-track { background: transparent; }
      `}</style>

      <div className="w-full h-full overflow-x-auto flex flex-col">
        <table className="w-full flex-1 min-h-0 flex flex-col text-left border-collapse" style={{ tableLayout: "fixed" }}>
          <thead className="block w-full shrink-0 pr-2 text-xs text-blue-600 bg-blue-100 border-b">
            <tr className="table w-full" style={{ tableLayout: "fixed" }}>
              <th className="pl-8 py-2.5 px-4 font-bold whitespace-nowrap text-left w-[24%]">Role Name</th>
              <th className="pl-10 py-2.5 px-4 font-bold whitespace-nowrap text-left w-[38%]">Description</th>
              <th className="py-2.5 px-6 font-bold whitespace-nowrap text-left w-[10%]">Users</th>
              <th className="py-2.5 pl-8 pr-4 font-bold whitespace-nowrap text-left w-[20%]">Permissions</th>
              <th className="py-2.5 px-4 font-bold whitespace-nowrap text-left w-[10%]">Action</th>
            </tr>
          </thead>
          <tbody
            className="roles-tbody-scroll block w-full flex-1 min-h-0 divide-y divide-gray-100 overflow-y-auto"
            style={{ scrollbarWidth: "thin", scrollbarColor: "#e2e8f0 transparent" }}
          >
            {roles.map((role) => (
              <tr
                key={role.roleId}
                className={`table w-full transition-colors ${
                  activeRoleKey === role.key ? "bg-indigo-50/40" : "hover:bg-gray-50/60"
                }`}
                style={{ tableLayout: "fixed" }}
              >
                <td className="py-3 px-4 w-[24%]">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ring-1 ${getRoleBadgeClass(
                      role.key
                    )}`}
                  >
                    {role.name}
                  </span>
                </td>
                <td className="py-3 px-4 text-xs text-gray-600 w-[38%] truncate">
                  {role.description}
                </td>
                <td className="py-3 px-1 text-xs text-gray-700 w-[10%]">{role.userCount}</td>
                <td className="py-3 pl-8 pr-4 text-xs text-gray-700 w-[16%]">{role.permissionCount}</td>
                <td className="py-3 px-4 w-[10%]">
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
    </>
  );
}
