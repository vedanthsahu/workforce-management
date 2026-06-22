

"use client";

import { AlertTriangle, X } from "lucide-react";
import { useCancelVisit } from "../hooks/Usecancelvisit";
import type { Visitor } from "../types/security.types";

interface Props {
  visitor: Visitor | null;
  onClose: () => void;
  onSuccess: () => void;
  onPatchVisitor: (id: string, patch: Partial<Visitor>) => void;
}

// 🚧 DUMMY — see hooks/useCancelVisit.ts. The cancellation isn't sent to the
// backend yet; it's a local-only optimistic update so the UI stays usable
// while POST /guest-visits/{id}/cancel isn't wired up.
export function CancelBookingModal({ visitor, onClose, onSuccess, onPatchVisitor }: Props) {
  const form = useCancelVisit({
    visitor,
    onPatch: onPatchVisitor,
    onSuccess: () => {
      onSuccess();
      onClose();
    },
  });

  if (!visitor) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-red-500" />
            </div>
            <h2 className="text-base font-semibold text-gray-900">Cancel Visit</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition text-gray-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-4">
          {/* <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-lg px-3 py-2 text-[11px] font-medium">
            Demo mode — this won&apos;t be saved to the backend yet.
          </div> */}

          {/* Who is being cancelled */}
          <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700 shrink-0">
              {visitor.guestInitials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">{visitor.guestName}</p>
              <p className="text-xs text-gray-400 truncate">
                {visitor.visitDate} · {visitor.visitTimeLabel}
              </p>
            </div>
          </div>

          {/* Reason textarea */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-600">
              Cancellation Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              value={form.reason}
              onChange={(e) => {
                form.setReason(e.target.value);
                form.setError(null);
              }}
              placeholder="Briefly describe why this visit is being cancelled…"
              rows={3}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent resize-none transition"
            />
            {form.error && <p className="text-xs text-red-600">{form.error}</p>}
          </div>

          <p className="text-xs text-gray-400">
            This action cannot be undone. The host will be notified of the cancellation.
          </p>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t bg-gray-50 flex gap-2.5">
          <button
            onClick={onClose}
            disabled={form.loading}
            className="flex-1 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-100 transition disabled:opacity-50"
          >
            Keep Visit
          </button>
          <button
            onClick={form.handleSubmit}
            disabled={form.loading}
            className="flex-1 py-2 rounded-lg bg-red-500 text-sm font-semibold text-white hover:bg-red-600 transition disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {form.loading ? (
              <>
                <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                Cancelling…
              </>
            ) : (
              "Cancel Visit"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}