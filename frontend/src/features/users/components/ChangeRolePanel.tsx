"use client";

import { ChevronDown, ShieldCheck, ToggleRight } from "lucide-react";
import type { RoleKey, UserStatus } from "../types/users.types";

type Props = {
  roles: RoleKey[];
  currentRole: RoleKey;
  selectedRole: RoleKey | null;
  setSelectedRole: (role: RoleKey) => void;
  currentStatus: UserStatus;
  selectedStatus: UserStatus;
  setSelectedStatus: (status: UserStatus) => void;
  hasChanged: boolean;
  onSave: () => void;
  onCancel: () => void;
};

export default function ChangeRolePanel({
  roles, currentRole, selectedRole, setSelectedRole,
  currentStatus, selectedStatus, setSelectedStatus,
  hasChanged, onSave, onCancel,
}: Props) {
  const handleRoleChange = (value: string) => {
    if (value === "__NO_CHANGE__") {
      setSelectedRole(currentRole);
    } else {
      setSelectedRole(value as RoleKey);
    }
  };

  const handleStatusChange = (value: string) => {
    if (value === "__NO_CHANGE__") {
      setSelectedStatus(currentStatus);
    } else {
      setSelectedStatus(value as UserStatus);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 sm:p-6 flex flex-col gap-5 h-full">

      {/* Header — icon chip pairs with the profile card's avatar for symmetry */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-linear-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-sm">
          <ShieldCheck className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Assignment</p>
          <h3 className="text-sm font-semibold text-gray-900">Change Role & Status</h3>
        </div>
      </div>

      {/* Fields */}
      <div className="flex flex-col gap-4">
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1.5">
            <ShieldCheck size={12} className="text-indigo-400" />
            Select Role
          </label>
          <div className="relative">
            <select
              value={selectedRole === currentRole ? "" : selectedRole ?? ""}
              onChange={(e) => handleRoleChange(e.target.value)}
              className="w-full appearance-none h-10 px-3 pr-8 text-sm border border-gray-200 rounded-xl bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30 focus-visible:border-indigo-400 transition-colors"
            >
              <option value="__NO_CHANGE__">{currentRole}</option>
              <option value="" disabled hidden>{currentRole}</option>

              {roles
                .filter((r) => r !== currentRole)
                .map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}


            </select>
            <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
        </div>

        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1.5">
            <ToggleRight size={12} className="text-indigo-400" />
            Account Status
          </label>
          <div className="relative">
            <select
              value={selectedStatus}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="w-full appearance-none h-10 px-3 pr-8 text-sm border border-gray-200 rounded-xl bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30 focus-visible:border-indigo-400 transition-colors"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Spacer pushes notice + buttons to bottom */}
      <div className="flex-1" />

      {/* Notice */}
      <p className="text-xs text-gray-400 text-center">
        Changes take effect immediately and will invalidate the user&apos;s current session.
      </p>

      {/* Actions */}
      <div className="flex flex-col-reverse sm:flex-row gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 h-10 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={!hasChanged}
          onClick={onSave}
          className="flex-1 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-sm font-medium text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}