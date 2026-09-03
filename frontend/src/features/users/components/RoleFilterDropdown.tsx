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
  // pendingRoles is always an explicit list of checked roles while the dropdown
  // is open — never overloaded to mean "all". [] unambiguously means "nothing
  // checked yet", which is what lets us disable Apply on an empty selection.
  const [pendingRoles, setPendingRoles] = useState<RoleKey[]>(selectedRoles);
  const ref = useRef<HTMLDivElement>(null);

  const allRoleNames = roleCounts.map((r) => r.roleName);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const openDropdown = () => {
    // Default state (no filter applied yet) should open with every checkbox
    // unchecked, not pre-checked — only reflect an actual prior selection.
    setPendingRoles(selectedRoles);
    setOpen((o) => !o);
  };

  const togglePendingRole = (role: RoleKey) => {
    setPendingRoles((prev) => {
      const isChecked = prev.some((r) => normalizeRoleKey(r) === normalizeRoleKey(role));
      return isChecked
        ? prev.filter((r) => normalizeRoleKey(r) !== normalizeRoleKey(role))
        : [...prev, role];
    });
  };

  const allChecked = pendingRoles.length === allRoleNames.length;
  const noneChecked = pendingRoles.length === 0;

  // Effective selection pendingRoles would apply as (mirrors handleApply's
  // "all checked" -> [] collapsing), compared against the already-applied
  // selectedRoles to detect a no-op Apply.
  const effectivePending = allChecked ? [] : pendingRoles;
  const isUnchanged =
    effectivePending.length === selectedRoles.length &&
    effectivePending
      .map(normalizeRoleKey)
      .sort()
      .every((r, i) => r === selectedRoles.map(normalizeRoleKey).sort()[i]);

  const handleApply = () => {
    if (noneChecked) return;
    // Everything checked is equivalent to "no filter" — keep that represented
    // as [] so the rest of the app's `selectedRoles.length ? ... : undefined` holds.
    onChange(allChecked ? [] : pendingRoles);
    setOpen(false);
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
        onClick={openDropdown}
        className="flex items-center justify-between gap-2 h-10 w-full md:w-44 px-4 border border-gray-200 rounded-lg text-sm bg-white hover:bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <span className="truncate">{label}</span>
        <ChevronDown size={14} className="text-gray-400 shrink-0" />
      </button>

      {open && (
        <div className="absolute left-0 right-0 md:left-auto md:right-0 z-20 mt-1 w-auto md:w-64 rounded-lg border border-gray-200 bg-white py-1.5 shadow-lg">
          <div className="flex items-center justify-between gap-2 px-3 py-1">
            <button
              type="button"
              onClick={() => setPendingRoles(allChecked ? [] : allRoleNames)}
              className="flex items-center gap-2 text-left text-sm text-gray-700 hover:text-gray-900"
            >
              <input
                type="checkbox"
                readOnly
                checked={allChecked}
                className="accent-blue-600 shrink-0"
              />
              All Roles
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  // Clear is immediate -- unlike checking/unchecking boxes,
                  // it doesn't wait for Apply. Unticks the draft AND resets
                  // the actually-applied filter back to "All Roles" in one
                  // click, but (unlike Apply) doesn't close the dropdown --
                  // it's a reset the admin can keep picking roles after, not
                  // a confirm-and-done action.
                  setPendingRoles([]);
                  onChange([]);
                }}
                className="rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={handleApply}
                disabled={noneChecked || isUnchanged}
                title={
                  noneChecked
                    ? "Select at least one role"
                    : isUnchanged
                      ? "No changes to apply"
                      : undefined
                }
                className="rounded-md bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed disabled:hover:bg-gray-200"
              >
                Apply
              </button>
            </div>
          </div>
          <div className="my-1 border-t" />
          <div className="max-h-72 overflow-y-auto overflow-x-hidden">
            {roleCounts.map(({ roleName, count }) => (
              <label
                key={roleName}
                className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm hover:bg-gray-50 cursor-pointer"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <input
                    type="checkbox"
                    checked={pendingRoles.some((r) => normalizeRoleKey(r) === normalizeRoleKey(roleName))}
                    onChange={() => togglePendingRole(roleName)}
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
        </div>
      )}
    </div>
  );
}