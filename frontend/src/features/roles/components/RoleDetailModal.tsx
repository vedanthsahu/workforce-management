"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { X, CheckCircle2 } from "lucide-react";
import { getRoleBadgeClass } from "../utils/roles.utils";
import type { Role } from "../types/roles.types";
import { useUsersFilterStore } from "@/store/useUsersFilterStore";

type Props = {
  role: Role | null;
  onClose: () => void;
};

const USERS_PREVIEW_COUNT = 2;

export default function RoleDetailModal({ role, onClose }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Lock body scroll while open
  useEffect(() => {
    if (!role) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [role]);

  if (!role) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  const handleViewUsers = () => {
    useUsersFilterStore.getState().reset();
    router.push(`/admin/users?role=${encodeURIComponent(role.key)}`);
    onClose();
  };

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
    >
      <style>{`
        .role-modal-scroll::-webkit-scrollbar { width: 8px; }
        .role-modal-scroll::-webkit-scrollbar-thumb { background-color: #e2e8f0; border-radius: 9999px; }
        .role-modal-scroll::-webkit-scrollbar-track { background: transparent; }
      `}</style>

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[85vh] flex flex-col overflow-hidden">
        {/* HEADER — stays fixed */}
        <div className="flex items-start justify-between gap-2 px-5 pt-5 pb-4 shrink-0">
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

        {/* BODY — only this scrolls, once permissions/description overflow */}
        <div
          className="role-modal-scroll flex-1 min-h-0 overflow-y-auto px-5 space-y-4"
          style={{ scrollbarWidth: "thin", scrollbarColor: "#e2e8f0 transparent" }}
        >
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
                <li key={perm.id} className="flex items-start gap-2 text-sm text-gray-700">
                  <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                  <span className="flex-1">{perm.description}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* FOOTER — stays fixed */}
        <div className="pt-2 pb-5 px-5 border-t shrink-0">
          <ul className="space-y-2">
            {role.users.slice(0, USERS_PREVIEW_COUNT).map((u) => (
              <li
                key={u.id}
                className="text-sm cursor-pointer hover:bg-gray-50 rounded-md -mx-2 px-2 py-1 transition-colors"
                onClick={handleViewUsers}
              >
                <p className="font-medium text-gray-800">{u.fullName}</p>
                <p className="text-xs text-gray-400">{u.email}</p>
              </li>
            ))}
          </ul>

          {role.userCount > 0 && (
            <button
              type="button"
              onClick={handleViewUsers}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-800 mt-2"
            >
              View all {role.userCount} users
            </button>
          )}
        </div>
      </div>
    </div>
  );
}