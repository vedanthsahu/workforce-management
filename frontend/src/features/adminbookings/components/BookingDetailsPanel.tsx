"use client";

import { X, Armchair, MapPin, Building2, Layers, CalendarDays, CalendarPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { AdminBooking } from "../types/adminBooking.types";
import { BOOKING_STATUS_STYLES } from "../utils/constants";

type Props = {
  booking: AdminBooking;
  onClose: () => void;
};

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
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

// Modify/Cancel actions moved into the row "…" menu. The details panel
// no longer renders Modify/Cancel buttons — they're handled from the
// row menu for consistent UX.

export default function BookingDetailsPanel({
  booking,
  onClose,
}: Props) {
  const isGuest = booking.person_type === "Guest";

  // The parenthetical now shows who the seat was booked for ("Self" or the
  // actual booker's name) instead of the seat type, per the standalone
  // "Booked By" row being removed.
  const seatValue = booking.seat_code ? `${booking.seat_code} ( by - ${booking.booked_by} )` : "Visit only";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b bg-gradient-to-r from-indigo-50 to-white shrink-0">
          <h2 className="text-base font-semibold text-gray-900">Booking Details</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition text-gray-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-5 space-y-5">
          {/* Person */}
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
                isGuest ? "bg-violet-100 text-violet-700" : "bg-indigo-100 text-indigo-700"
              )}
            >
              {isGuest ? "GV" : initialsOf(booking.person_name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900 truncate">{booking.person_name}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-[11px] text-gray-400">{booking.person_type}</span>
                <span
                  className={cn(
                    "inline-flex px-2 py-0.5 text-[10px] rounded-full font-semibold",
                    BOOKING_STATUS_STYLES[booking.status]
                  )}
                >
                  {booking.status}
                </span>
              </div>
            </div>
          </div>

          {/* Booking info */}
          <Section title="Booking Info">
            <div className="space-y-3">
              <InfoRow icon={Armchair} label="Seat" value={seatValue} />
              <InfoRow icon={CalendarPlus} label="Booked On" value={booking.booked_on} />
            </div>
          </Section>

          {/* Location */}
          <Section title="Location">
            <div className="grid grid-cols-2 gap-3">
              <InfoRow icon={MapPin} label="Site" value={booking.site_name} />
              <InfoRow icon={Building2} label="Building" value={booking.building_name} />
              <InfoRow icon={Layers} label="Floor" value={booking.floor_name || "--"} />
              <InfoRow
                icon={CalendarDays}
                label="Date"
                value={booking.date_label ? `${booking.date_label} (${booking.date_relative})` : "--"}
              />
            </div>
          </Section>
        </div>

        {/* Footer actions removed — modify/cancel are available from the
           row "…" menu. */}
      </div>
    </div>
  );
}
