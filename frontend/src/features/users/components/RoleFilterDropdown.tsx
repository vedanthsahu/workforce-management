"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { getRoleBadgeClass, normalizeRoleKey } from "../utils/users.utils";
import type { RoleCount, RoleKey } from "../types/users.types";

type Props = {
  roleCounts: RoleCount[];
  selectedRoles: RoleKey[];
  onChange: (roles: RoleKey[]) => void;
};

export default function RoleFilterDropdown({ roleCounts, selectedRoles, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleRole = (role: RoleKey) => {
    if (selectedRoles.includes(role)) {
      onChange(selectedRoles.filter((r) => r !== role));
    } else {
      onChange([...selectedRoles, role]);
    }
  };

  const label = selectedRoles.length === 0
    ? "All roles"
    : selectedRoles.length === 1
      ? selectedRoles[0]
      : `${selectedRoles.length} roles`;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-between gap-2 h-10 w-44 px-4 border border-gray-200 rounded-lg text-sm bg-white hover:bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <span className="truncate">{label}</span>
        <ChevronDown size={14} className="text-gray-400 shrink-0" />
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-1 w-60 rounded-lg border border-gray-200 bg-white py-1.5 shadow-lg max-h-72 overflow-y-auto overflow-x-hidden">
          <button
            type="button"
            onClick={() => onChange([])}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50"
          >
            <input type="checkbox" readOnly checked={selectedRoles.length === 0} className="accent-blue-600 shrink-0" />
            All Roles
          </button>
          <div className="my-1 border-t" />
          {roleCounts.map(({ roleName, count }) => (
            <label
              key={roleName}
              className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm hover:bg-gray-50 cursor-pointer"
            >
              <span className="flex items-center gap-2 min-w-0">
                <input
                  type="checkbox"
                  // checked={selectedRoles.includes(roleName)}
                  checked={selectedRoles.some((r) => normalizeRoleKey(r) === normalizeRoleKey(roleName))}
                  onChange={() => toggleRole(roleName)}
                  className="accent-blue-600 shrink-0"
                />
                <span className={`inline-flex items-center whitespace-nowrap px-1.5 py-0.5 rounded text-[11px] font-semibold ring-1 ${getRoleBadgeClass(roleName)}`}>
                  {roleName}
                </span>
              </span>
              <span className="text-xs text-gray-400 shrink-0">{count}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}