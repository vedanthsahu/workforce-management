"use client";

import {
  Building2,
  Calendar,
  Clock,
  Mail,
  MapPin,
  Phone,
  User,
  X,
  Armchair,
  Briefcase,
  FileText,
  Hash,
  Building,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getStatusBadgeClass,
  getStatusLabel,
  getBookingStatusBadgeClass,
  getGuestTypeLabel,
} from "../utils/security.utils";
import type { Visitor } from "../types/security.types";

interface Props {
  visitor: Visitor | null;
  onClose: () => void;
}

// ── Small info row ─────────────────────────────────────────────────────────────
function InfoRow({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start gap-3", className)}>
      <div className="mt-0.5 w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
        <Icon className="w-3.5 h-3.5 text-gray-500" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">{label}</p>
        <p className="text-sm text-gray-800 font-medium mt-0.5 break-words">{value || "—"}</p>
      </div>
    </div>
  );
}

// ── Section heading ────────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest border-b pb-1.5">
        {title}
      </h3>
      {children}
    </div>
  );
}

// No fetch, no loading/error state, no hooks: GET /guest-visits already
// returns every field this modal needs, so the row's Visitor object (already
// sitting in the table's state) is all that's required here.
export function GuestBookingDetailsModal({ visitor, onClose }: Props) {
  if (!visitor) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-indigo-50 to-white shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Visit Details</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Visit #{visitor.guestVisitId}
              {visitor.bookingId ? ` · Booking #${visitor.bookingId}` : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition text-gray-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">
          {/* Guest avatar + name + status badges */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-700 shrink-0">
              {visitor.guestInitials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-lg font-semibold text-gray-900 truncate">{visitor.guestName}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span
                  className={cn(
                    "inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ring-1",
                    getStatusBadgeClass(visitor.status)
                  )}
                >
                  {getStatusLabel(visitor.status)}
                </span>
                {visitor.bookingStatus && (
                  <span
                    className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ring-1",
                      getBookingStatusBadgeClass(visitor.bookingStatus)
                    )}
                  >
                    {visitor.bookingStatus}
                  </span>
                )}
                {/* guestType removed from view per request */}
              </div>
            </div>
          </div>

          {/* Guest info */}
          <Section title="Guest Information">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InfoRow icon={Mail} label="Email" value={visitor.guestEmail} />
              {/* Purpose removed from view per request */}
            </div>
          </Section>

          {/* Host info */}
          <Section title="Host Information">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InfoRow icon={User} label="Host Name" value={visitor.hostName} />
              <InfoRow icon={Mail} label="Host Email" value={visitor.hostEmail} />
              <InfoRow icon={Building} label="Department" value={visitor.hostDepartment} />
            </div>
          </Section>

          {/* Visit schedule */}
          <Section title="Visit Schedule">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InfoRow icon={Calendar} label="Visit Date" value={visitor.visitDate} />
              <InfoRow icon={Clock} label="Time" value={visitor.visitTimeLabel} />
              {visitor.checkedInAt && (
                <InfoRow
                  icon={Clock}
                  label="Checked In At"
                  value={new Date(visitor.checkedInAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                />
              )}
              {visitor.checkedOutAt && (
                <InfoRow
                  icon={Clock}
                  label="Checked Out At"
                  value={new Date(visitor.checkedOutAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                />
              )}
            </div>
          </Section>

          {/* Location */}
          <Section title="Location">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InfoRow icon={MapPin} label="Site" value={visitor.siteName} />
              <InfoRow icon={Building2} label="Building" value={visitor.buildingName} />
              <InfoRow icon={Hash} label="Floor" value={visitor.floorName} />
              <InfoRow
                icon={Armchair}
                label="Seat"
                value={
                  visitor.seatBooked
                    ? visitor.seatCode
                      ? `Seat ${visitor.seatCode}`
                      : "Booked"
                    : "Not required"
                }
              />
            </div>
          </Section>

          {/* Notes */}
          {visitor.notes && (
            <Section title="Notes">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                  <FileText className="w-3.5 h-3.5 text-gray-500" />
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{visitor.notes}</p>
              </div>
            </Section>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-4 border-t bg-gray-50 shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-100 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}