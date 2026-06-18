"use client";

import { useEffect, useRef } from "react";
import { X, CheckCircle2 } from "lucide-react";
import { getRoleBadgeClass } from "../utils/roles.utils";
import type { Role } from "../types/roles.types";

type Props = {
  role: Role | null;
  onClose: () => void;
};

const USERS_PREVIEW_COUNT = 2;

export default function RoleDetailModal({ role, onClose }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);

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

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
    >
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 space-y-4 max-h-[85vh] overflow-y-auto">
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
            {role.permissions.map((perm, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                {perm}
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
    </div>
  );
}