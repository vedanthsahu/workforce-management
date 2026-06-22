"use client";

import { CalendarDays, Pencil, X } from "lucide-react";
import { useModifyVisitForm } from "../hooks/Usemodifyvisitform";
import type { GuestType, PurposeOfVisit, Visitor } from "../types/security.types";

interface Props {
  visitor: Visitor | null;
  onClose: () => void;
  onSuccess: () => void;
  onPatchVisitor: (id: string, patch: Partial<Visitor>) => void;
}

const GUEST_TYPE_OPTIONS: { value: GuestType; label: string }[] = [
  { value: "INTERVIEW_CANDIDATE", label: "Interview Candidate" },
  { value: "CLIENT", label: "Client" },
  { value: "VENDOR", label: "Vendor" },
  { value: "CONTRACTOR", label: "Contractor" },
  { value: "OTHER", label: "Other" },
];

const PURPOSE_OPTIONS: { value: PurposeOfVisit; label: string }[] = [
  { value: "INTERVIEW", label: "Interview" },
  { value: "MEETING", label: "Meeting" },
  { value: "VENDOR_VISIT", label: "Vendor Visit" },
  { value: "CLIENT_VISIT", label: "Client Visit" },
  { value: "OTHER", label: "Other" },
];

const fieldClass =
  "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition bg-white";
const labelClass = "text-xs font-semibold text-gray-600 block mb-1";

// 🚧 DUMMY — see hooks/useModifyVisitForm.ts. Edits aren't sent to the
// backend yet; it's a local-only optimistic update so the UI stays usable
// while PATCH /guest-visits/{id} isn't wired up.
export function ModifyBookingModal({ visitor, onClose, onSuccess, onPatchVisitor }: Props) {
  const form = useModifyVisitForm({
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
              <Pencil className="w-3.5 h-3.5 text-indigo-600" />
            </div>
            <h2 className="text-base font-semibold text-gray-900">Edit Visit</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition text-gray-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="px-5 py-5 space-y-4 overflow-y-auto">

          {/* <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-lg px-3 py-2 text-[11px] font-medium">
            Demo mode — this won&apos;t be saved to the backend yet.
          </div> */}

          {/* Guest summary chip */}
          <div className="bg-indigo-50 rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700 shrink-0">
              {visitor.guestInitials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">{visitor.guestName}</p>
              <p className="text-xs text-gray-500 truncate">
                {visitor.siteName} · {visitor.location}
              </p>
            </div>
          </div>

          {/* ── Visit Date ── */}
          <div>
            <label className={labelClass}>
              <span className="flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5" />
                Visit Date <span className="text-red-500">*</span>
              </span>
            </label>
            <input
              type="date"
              value={form.visitDate}
              min={new Date().toISOString().split("T")[0]}
              onChange={(e) => { form.setVisitDate(e.target.value); form.setError(null); }}
              className={fieldClass}
            />
          </div>

          {/* ── Time ── */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Start Time <span className="text-red-500">*</span></label>
              <input
                type="time"
                value={form.startTime}
                onChange={(e) => { form.setStartTime(e.target.value); form.setError(null); }}
                className={fieldClass}
              />
            </div>
            <div>
              <label className={labelClass}>End Time <span className="text-red-500">*</span></label>
              <input
                type="time"
                value={form.endTime}
                onChange={(e) => { form.setEndTime(e.target.value); form.setError(null); }}
                className={fieldClass}
              />
            </div>
          </div>

          {/* ── Guest Type ── */}
          <div>
            <label className={labelClass}>Guest Type</label>
            <select
              value={form.guestType}
              onChange={(e) => form.setGuestType(e.target.value as GuestType | "")}
              className={fieldClass}
            >
              <option value="">— Keep current —</option>
              {GUEST_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* ── Purpose of Visit ── */}
          <div>
            <label className={labelClass}>Purpose of Visit</label>
            <select
              value={form.purposeOfVisit}
              onChange={(e) => form.setPurposeOfVisit(e.target.value as PurposeOfVisit | "")}
              className={fieldClass}
            >
              <option value="">— Keep current —</option>
              {PURPOSE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* ── Notes ── */}
          <div>
            <label className={labelClass}>Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => form.setNotes(e.target.value)}
              placeholder="Any additional notes for this visit…"
              rows={2}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent resize-none transition"
            />
          </div>

          {/* ── Location (optional) ── */}
          <div className="border border-dashed border-gray-200 rounded-xl p-4 space-y-3">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
              Change Location (optional)
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelClass}>Site ID</label>
                <input
                  type="number"
                  value={form.siteId}
                  onChange={(e) => form.setSiteId(e.target.value)}
                  placeholder={visitor.siteId}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className={labelClass}>Building ID</label>
                <input
                  type="number"
                  value={form.buildingId}
                  onChange={(e) => form.setBuildingId(e.target.value)}
                  placeholder={visitor.buildingId ?? "—"}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className={labelClass}>Floor ID</label>
                <input
                  type="number"
                  value={form.floorId}
                  onChange={(e) => form.setFloorId(e.target.value)}
                  placeholder={visitor.floorId ?? "—"}
                  className={fieldClass}
                />
              </div>
            </div>
            <p className="text-[11px] text-gray-400">
              Leave empty to keep the current location.
            </p>
          </div>

          {form.error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-xs">
              {form.error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t bg-gray-50 flex gap-2.5 shrink-0">
          <button
            onClick={onClose}
            disabled={form.loading}
            className="flex-1 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-100 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={form.handleSubmit}
            disabled={form.loading}
            className="flex-1 py-2 rounded-lg bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-700 transition disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {form.loading ? (
              <>
                <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                Saving…
              </>
            ) : (
              "Save Changes"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}