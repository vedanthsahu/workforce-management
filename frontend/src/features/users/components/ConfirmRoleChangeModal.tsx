"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle, Check, X } from "lucide-react";
import { getRoleBadgeClass } from "../utils/users.utils";
import type { User } from "../types/users.types";

type Props = {
  open: boolean;
  user: User;
  newRole: string | null;
  submitting: boolean;
  errorMessage: string | null;
  onCancel: () => void;
  onConfirm: () => void;
};

const ROLE_CHANGE_CONSEQUENCES = [
  "Update user permissions",
  "Invalidate existing sessions",
  "Force the user to login again",
];

export default function ConfirmRoleChangeModal({ open, user, newRole, submitting, errorMessage, onCancel, onConfirm }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onCancel]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open || !newRole) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onCancel();
  };

  return (
    <div ref={overlayRef} onClick={handleOverlayClick} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 space-y-4 max-h-[85vh] overflow-y-auto">
        <div className="flex items-start justify-between">
          <div className="w-full flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center">
              <AlertTriangle size={22} className="text-amber-500" />
            </div>
          </div>
          <button type="button" onClick={onCancel} className="absolute right-5 top-5 p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <X size={16} />
          </button>
        </div>

        <h3 className="text-center text-base font-semibold text-gray-900">Confirm Role Change</h3>

        <p className="text-sm text-gray-600 text-center">
          You are changing <span className="font-semibold text-gray-900">{user.fullName}</span>&apos;s role:
        </p>

        <div className="flex items-center gap-3 rounded-lg bg-gray-50 px-4 py-3 border">
          <div className="flex-1">
            <p className="text-xs text-gray-400">From:</p>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ring-1 mt-1 ${getRoleBadgeClass(user.currentRole)}`}>
              {user.currentRole}
            </span>
          </div>
          <span className="text-gray-300">→</span>
          <div className="flex-1">
            <p className="text-xs text-gray-400">To:</p>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ring-1 mt-1 ${getRoleBadgeClass(newRole)}`}>
              {newRole}
            </span>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">This will:</p>
          <ul className="space-y-1.5">
            {ROLE_CHANGE_CONSEQUENCES.map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm text-gray-600">
                <Check size={14} className="text-emerald-500 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {errorMessage && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</div>
        )}

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onCancel} disabled={submitting} className="flex-1 h-9 rounded-md border text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            Cancel
          </button>
          <button type="button" onClick={onConfirm} disabled={submitting} className="flex-1 h-9 rounded-md bg-red-600 hover:bg-red-700 text-sm font-medium text-white disabled:opacity-50">
            {submitting ? "Saving…" : "Confirm Change"}
          </button>
        </div>
      </div>
    </div>
  );
}