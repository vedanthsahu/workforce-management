"use client";

import { X, CheckCircle2 } from "lucide-react";
import { getRoleBadgeClass } from "../utils/roles.utils";
import type { Role } from "../types/roles.types";

type Props = {
  role: Role | null;
  onClose: () => void;
};

const USERS_PREVIEW_COUNT = 3;

export default function RoleDetailPanel({ role, onClose }: Props) {
  if (!role) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 space-y-4 lg:sticky lg:top-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-gray-400 mb-1">Role</p>
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-md text-sm font-semibold ring-1 ${getRoleBadgeClass(
              role.key
            )}`}
          >
            {role.name}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      <div>
        <p className="text-xs font-medium text-gray-500 mb-1">Description</p>
        <p className="text-sm text-gray-700">{role.description}</p>
      </div>

      <div>
        <p className="text-xs font-medium text-gray-500 mb-2">
          Permissions ({role.permissionCount})
        </p>
        <ul className="space-y-1.5">
          {role.permissions.map((perm) => (
            <li key={perm.id ?? perm.key} className="flex items-start gap-2 text-sm text-gray-700">
              <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 shrink-0" />
              <span>{perm.description}</span>
              <span className="ml-auto text-[10px] text-gray-400 font-mono">{perm.key}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="pt-2 border-t">
        <p className="text-xs font-medium text-gray-500 mb-2">
          Users with this role ({role.userCount})
        </p>
        <ul className="space-y-2">
          {role.users.slice(0, USERS_PREVIEW_COUNT).map((u) => (
            <li key={u.id} className="text-sm">
              <p className="font-medium text-gray-800">{u.fullName}</p>
              <p className="text-xs text-gray-400">{u.email}</p>
            </li>
          ))}
        </ul>

        {role.userCount > USERS_PREVIEW_COUNT && (
          <button
            type="button"
            className="text-xs font-medium text-indigo-600 hover:text-indigo-800 mt-2"
          >
            View all {role.userCount} users
          </button>
        )}
      </div>
    </div>
  );
}