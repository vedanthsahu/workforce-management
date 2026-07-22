"use client";

import { useEffect, useRef, useState } from "react";
import {
  X,
  Armchair,
  MapPin,
  Building2,
  Layers,
  CalendarDays,
  CalendarPlus,
  ChevronDown,
  Pencil,
  FileEdit,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AdminBooking } from "../types/adminBooking.types";
import { BOOKING_STATUS_STYLES } from "../utils/constants";

type Props = {
  booking: AdminBooking;
  onClose: () => void;
  onModifySeat: (booking: AdminBooking) => void;
  onModifyVisit: (booking: AdminBooking) => void;
  onCancelSeat: (booking: AdminBooking) => void;
  onCancelVisit: (booking: AdminBooking) => void;
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

// A single Modify/Cancel action button that expands into "…Visit" / "…Seat"
// choices — used only for a guest booking linked to a guest-visit invite,
// where the visit and the seat can be modified/cancelled independently.
function ActionMenuButton({
  label,
  icon: TriggerIcon,
  variant,
  options,
}: {
  label: string;
  icon: React.ElementType;
  variant: "indigo" | "red";
  options: { label: string; icon: React.ElementType; onClick: () => void }[];
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const colorClass =
    variant === "indigo"
      ? "text-indigo-600 border-indigo-200 hover:bg-indigo-50"
      : "text-red-600 border-red-200 hover:bg-red-50";
  const itemColorClass = variant === "indigo" ? "text-gray-700" : "text-red-600";

  return (
    <div ref={rootRef} className="relative flex-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-full h-9 flex items-center justify-center gap-1.5 text-xs font-semibold bg-white border rounded-lg transition-colors",
          colorClass
        )}
      >
        <TriggerIcon size={13} />
        {label}
        <ChevronDown size={13} className={cn("transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-1.5 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-10">
          {options.map((o) => (
            <button
              key={o.label}
              type="button"
              onClick={() => {
                setOpen(false);
                o.onClick();
              }}
              className={cn(
                "flex items-center justify-center gap-2 w-full px-3 py-2 text-center text-xs font-medium hover:bg-gray-50 transition-colors",
                itemColorClass
              )}
            >
              <o.icon size={14} />
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function BookingDetailsPanel({
  booking,
  onClose,
  onModifySeat,
  onModifyVisit,
  onCancelSeat,
  onCancelVisit,
}: Props) {
  const isGuest = booking.person_type === "Guest";
  // A guest booking linked to a guest-visit invite has both a "visit" and a
  // "seat" side that can be modified/cancelled independently; a plain seat
  // booking (employee, or a guest with no linked visit) only has the seat.
  const hasVisit = isGuest && !!booking.guest_visit_id;
  // GET /admin/bookings also unions in visit-only guest rows — a guest
  // visit with no linked seat booking at all (booking_id/seat_id both null)
  // — which have nothing to "modify/cancel seat" on.
  const hasBooking = !!booking.booking_id;
  // Only future, still-active bookings can be modified/cancelled — the
  // backend rejects today/past dates for both /modify and /cancel, and a
  // booking that's already Cancelled has nothing left to modify or cancel.
  const canMutate =
    booking.status !== "Cancelled" &&
    booking.activity_date > new Date().toISOString().slice(0, 10);

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

        {/* Footer actions — hidden for today/past bookings, which can no
           longer be modified or cancelled. */}
        {canMutate && (
          <div className="flex items-center gap-2.5 px-5 py-4 border-t bg-gray-50 shrink-0">
            {hasVisit && hasBooking ? (
              <>
                <ActionMenuButton
                  label="Modify"
                  icon={Pencil}
                  variant="indigo"
                  options={[
                    { label: "Edit Visit", icon: FileEdit, onClick: () => onModifyVisit(booking) },
                    { label: "Edit Seat", icon: Pencil, onClick: () => onModifySeat(booking) },
                  ]}
                />
                <ActionMenuButton
                  label="Cancel"
                  icon={X}
                  variant="red"
                  options={[
                    { label: "Cancel Visit", icon: X, onClick: () => onCancelVisit(booking) },
                    { label: "Cancel Seat", icon: X, onClick: () => onCancelSeat(booking) },
                  ]}
                />
              </>
            ) : hasVisit ? (
              <>
                <button
                  onClick={() => onModifyVisit(booking)}
                  className="flex-1 h-9 text-xs font-semibold text-indigo-600 bg-white border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors"
                >
                  Edit Visit
                </button>
                <button
                  onClick={() => onCancelVisit(booking)}
                  className="flex-1 h-9 text-xs font-semibold text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                >
                  Cancel Visit
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => onModifySeat(booking)}
                  className="flex-1 h-9 text-xs font-semibold text-indigo-600 bg-white border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors"
                >
                  Modify Booking
                </button>
                <button
                  onClick={() => onCancelSeat(booking)}
                  className="flex-1 h-9 text-xs font-semibold text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                >
                  Cancel Booking
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
