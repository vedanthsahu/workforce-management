"use client";

import { Eye } from "lucide-react";
import { getRoleBadgeClass } from "../utils/users.utils";
import UserRowMenu from "./UserRowMenu";
import type { User } from "../types/users.types";

type Props = {
  users: User[];
  highlightedUserId?: string | null;
  onChangeRole: (user: User) => void;
};

export default function UsersTable({ users, highlightedUserId, onChangeRole }: Props) {
  if (users.length === 0) {
    return <p className="px-6 py-12 text-center text-gray-400 text-sm">No users found.</p>;
  }

  return (
    <>
      <style>{`
        @keyframes highlight-fade {
          0%   { background-color: #eff6ff; }
          60%  { background-color: #eff6ff; }
          100% { background-color: transparent; }
        }
        .row-highlight { animation: highlight-fade 3s ease forwards; }
        .users-tbody-scroll::-webkit-scrollbar { width: 8px; }
        .users-tbody-scroll::-webkit-scrollbar-thumb { background-color: #e2e8f0; border-radius: 9999px; }
        .users-tbody-scroll::-webkit-scrollbar-track { background: transparent; }
      `}</style>

      {/* ── Mobile card list ──────────────────────────────── */}
      <div className="md:hidden h-full overflow-y-auto divide-y divide-gray-100">
        {users.map((user, index) => {
          const isHighlighted = user.id === highlightedUserId;
          return (
            <div
              key={user.id}
              className={`px-4 py-3 flex items-center justify-between gap-3 ${isHighlighted ? "row-highlight" : ""}`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 shrink-0 rounded-full bg-indigo-100 flex items-center justify-center text-[11px] font-semibold text-indigo-700">
                  {initialsFor(user.fullName)}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm text-gray-900 line-clamp-2">{user.fullName}</p>
                  <p className="text-xs text-gray-400 line-clamp-2">{user.email}</p>
                  {user.officeLocation && (
                    <p className="text-xs text-gray-400 line-clamp-2">{user.officeLocation}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span
                      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold ring-1 ${getRoleBadgeClass(
                        user.currentRole
                      )}`}
                    >
                      {user.currentRole}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-medium ${user.status === "active" ? "text-emerald-600" : "text-gray-400"
                        }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      {user.status === "active" ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
              </div>
              <UserRowMenu
                onChangeRole={() => onChangeRole(user)}
                openUpward={index === users.length - 1}
              />
            </div>
          );
        })}
      </div>

      {/* ── Desktop table ─────────────────────────────────── */}
      <div className="hidden md:flex md:flex-col w-full h-full overflow-x-auto">
        <table className="w-full min-w-220 flex-1 min-h-0 flex flex-col text-left border-collapse" style={{ tableLayout: "fixed" }}>
          {/* pr-2 reserves the same 8px the tbody's scrollbar takes, so header and body columns line up */}
          <thead className="block w-full shrink-0 pr-2 text-xs text-blue-600 bg-blue-100 border-b">
            <tr className="table w-full" style={{ tableLayout: "fixed" }}>
              <th className="pl-15 py-2.5 px-4 font-bold whitespace-nowrap text-left w-[18%]">Name</th>
              <th className="pl-15 py-2.5 px-4 font-bold whitespace-nowrap text-left w-[24%]">Email</th>
              <th className="pl-6 py-2.5 px-4 font-bold whitespace-nowrap text-left w-[16%]">Work Location</th>
              <th className="pl-10 py-2.5 px-4 font-bold whitespace-nowrap text-left w-[16%]">Current Role</th>
              <th className="py-2.5 pl-10 pr-4 font-bold whitespace-nowrap text-left w-[14%]">Status</th>
              <th className="pl-8 py-2.5 px-4 font-bold whitespace-nowrap text-left w-[12%]">Action</th>
            </tr>
          </thead>
          <tbody
            className="users-tbody-scroll block w-full flex-1 min-h-0 divide-y divide-gray-100 overflow-y-auto"
            style={{ scrollbarWidth: "thin", scrollbarColor: "#e2e8f0 transparent" }}
          >
            {users.map((user, index) => {
              const isHighlighted = user.id === highlightedUserId;
              const isLastRow = index === users.length - 1;
              return (
                <tr
                  key={user.id}
                  className={`table w-full ${isHighlighted ? "row-highlight" : "hover:bg-gray-50/60 transition-colors"}`}
                  style={{ tableLayout: "fixed" }}
                >
                  <td className="py-3 px-4 w-[18%] max-w-0">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-[11px] font-semibold text-indigo-700 shrink-0">
                        {initialsFor(user.fullName)}
                      </div>
                      <span title={user.fullName} className="text-sm font-medium text-gray-900 line-clamp-2 min-w-0">
                        {user.fullName}
                      </span>
                    </div>
                  </td>
                  <td className="py-2 px-1 text-sm text-black w-[24%] max-w-0">
                    <span title={user.email} className="block line-clamp-2">
                      {user.email}
                    </span>
                  </td>
                  <td className="pl-5 py-3 px-4 text-sm text-black w-[16%] max-w-0">
                    <span title={user.officeLocation ?? undefined} className="block line-clamp-2">
                      {user.officeLocation ?? "—"}
                    </span>
                  </td>
                  <td className="pl-8 py-2 px-4 w-[16%]">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ring-1 ${getRoleBadgeClass(
                        user.currentRole
                      )}`}
                    >
                      {user.currentRole}
                    </span>
                  </td>
                  <td className="py-3 pl-8 pr-4 w-[14%]">
                    <span
                      className={`inline-flex items-center gap-1.5 text-sm font-medium ${user.status === "active" ? "text-emerald-600" : "text-gray-400"
                        }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      {user.status === "active" ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="py-3 px-4 w-[12%]">
                    <div className="flex items-center gap-3">
                      {/* placeholder for now — not clickable */}
                      <span
                        className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-gray-400 text-gray-300 cursor-not-allowed select-none opacity-50"
                        title="View (coming soon)"
                      >
                        <Eye size={14} />
                      </span>
                      <UserRowMenu
                        onChangeRole={() => onChangeRole(user)}
                        openUpward={isLastRow}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}