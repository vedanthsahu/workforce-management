"use client";

import { Calendar, Pencil, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { TAG_STYLES, BOOKING_TYPE_STYLES } from "../utils/constants";
import { formatDate } from "../utils/bookingHelpers";
import type { Booking } from "../types/bookings.types";

function BookingTagChip({ label, variant }: { label: string; variant: string }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap",
      TAG_STYLES[variant] ?? TAG_STYLES.zone,
    )}>
      <span className={cn(
        "w-1.5 h-1.5 rounded-full",
        variant === "confirmed" ? "bg-green-500" : variant === "sprint" ? "bg-amber-500" : "bg-current",
      )} />
      {label}
    </span>
  );
}

function BookingTypeBadge({ type }: { type: string }) {
  const style = BOOKING_TYPE_STYLES[type] ?? BOOKING_TYPE_STYLES.self;
  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold", style.bg, style.text)}>
      {style.label}
    </span>
  );
}

function getInitials(name: string): string {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

type BookingCardProps = {
  booking: Booking;
  onCancelClick: (booking: Booking) => void;
  onModifyClick: (booking: Booking) => void;
  showActions?: boolean;
};

export function BookingCard({ booking, onCancelClick, onModifyClick, showActions = true }: BookingCardProps) {
  const isCancelled = booking.status === "cancelled";
  const bType = booking.bookingType ?? "self";
  const isSelf = bType === "self";
  const hasBookedBy = !isSelf && !!booking.bookedByName;

  return (
    <div className={cn(
      "bg-white border border-[#EBEBF5] rounded-2xl transition-all duration-200 overflow-hidden",
      "hover:shadow-md hover:border-gray-200",
    )}>
      <div className={cn(
        "grid items-center gap-4 sm:gap-6 p-4 sm:px-5 sm:py-[18px]",
        hasBookedBy
          ? "grid-cols-[52px_1fr] sm:grid-cols-[52px_1.7fr_1.1fr_auto]"
          : "grid-cols-[52px_1fr] sm:grid-cols-[52px_1.7fr_auto]",
      )}>

        {/* Icon — same as booked-for-someone */}
        <div className="w-[52px] h-[52px] rounded-[13px] bg-orange-100 flex items-center justify-center shrink-0">
          <span className="text-2xl leading-none" role="img" aria-label="Office building">🏢</span>
        </div>

        {/* Main info */}
        <div className="min-w-0">
          <p className="text-[14px] font-bold text-[#0f172a] truncate">{booking.location}</p>
          <p className="text-[12px] text-gray-500 mt-0.5">{booking.floor} · Seat {booking.seat}</p>
          <div className="flex items-center gap-1.5 mt-1.5 text-[12px] text-gray-500">
            <Calendar className="size-3 text-gray-400 shrink-0" />
            <span>
              {formatDate(booking.date)}
              {" · "}
              {booking.isFullDay ? "Full day" : `${booking.startTime} – ${booking.endTime}`}
            </span>
          </div>
          <div className="flex gap-1.5 flex-wrap mt-2.5">
            {!isCancelled && booking.tags.map((tag, i) => (
              <BookingTagChip key={i} label={tag.label} variant={tag.variant} />
            ))}
            {isCancelled && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-600">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                Cancelled
              </span>
            )}
            <BookingTypeBadge type={bType} />
          </div>
        </div>

        {/* Booked by — only when someone else booked for you */}
        {hasBookedBy && (
          <div className="hidden sm:block min-w-0">
            <p className="text-[10px] font-semibold tracking-wider uppercase text-gray-400 mb-2">Booked by</p>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 bg-gradient-to-br from-emerald-500 to-teal-600">
                {getInitials(booking.bookedByName!)}
              </div>
              <div className="min-w-0">
                <p className="text-[12.5px] font-semibold text-[#1A1A2E] truncate">{booking.bookedByName}</p>
                <p className="text-[11px] text-gray-400 truncate">{booking.bookedByRole ?? "—"}</p>
              </div>
            </div>
          </div>
        )}

        {/* Meta + Actions — right aligned */}
        <div className="hidden sm:flex flex-col items-end text-right">
          <p className="text-[10px] font-semibold tracking-wider uppercase text-gray-400 mb-1">Booking ID</p>
          <p className="text-[11px] text-gray-500 font-mono mb-2.5">{booking.id}</p>
          <p className="text-[10px] font-semibold tracking-wider uppercase text-gray-400 mb-1">Booked on</p>
          <p className="text-[12px] text-gray-500">{booking.bookedOn}</p>
          {showActions && !isCancelled && (
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => onModifyClick(booking)}
                className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-gray-600 bg-white hover:bg-gray-50 border border-gray-200 hover:border-blue-300 hover:text-blue-600 rounded-lg px-3 py-1.5 transition-all"
              >
                <Pencil className="size-3" />
                Modify
              </button>
              <button
                onClick={() => onCancelClick(booking)}
                className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-red-500 bg-white hover:bg-red-50 border border-red-200 hover:border-red-300 rounded-lg px-3 py-1.5 transition-all"
              >
                <X className="size-3" />
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile meta + actions */}
      <div className="sm:hidden px-4 pb-4">
        <div className="flex items-center gap-4 text-[11px] text-gray-400">
          <span className="font-mono">{booking.id}</span>
          <span>·</span>
          <span>{booking.bookedOn}</span>
        </div>
        {showActions && !isCancelled && (
          <div className="flex gap-2 mt-2.5">
            <button
              onClick={() => onModifyClick(booking)}
              className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-gray-600 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5"
            >
              <Pencil className="size-3" />
              Modify
            </button>
            <button
              onClick={() => onCancelClick(booking)}
              className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-red-500 bg-white hover:bg-red-50 border border-red-200 rounded-lg px-3 py-1.5"
            >
              <X className="size-3" />
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
