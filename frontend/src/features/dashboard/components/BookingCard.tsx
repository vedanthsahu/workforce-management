"use client";

import { Calendar, Hash, Clock, Pencil, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Booking } from "../types/dashboard.types";

function getInitials(name: string): string {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

type BookingCardProps = {
  booking: Booking;
  onCancel: (booking: Booking) => void;
  onModify: (booking: Booking) => void;
  canCancelOwn: boolean;
  canBookSelf: boolean;
};

export function BookingCard({ booking, onCancel, onModify, canCancelOwn, canBookSelf }: BookingCardProps) {
  const isConfirmed = booking.status === "Confirmed";

  return (
    <div className={cn(
      "bg-white border border-[#EBEBF5] rounded-2xl transition-all duration-200 overflow-hidden",
      "hover:shadow-md hover:border-gray-200 animate-fade-in-up",
    )}>
      <div className="grid grid-cols-[44px_1fr_auto] items-center gap-3.5 p-3.5 sm:px-4 sm:py-[14px]">

        {/* Icon */}
        <div className="w-[44px] h-[44px] rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
          <span className="text-xl leading-none" role="img" aria-label="Office building">🏢</span>
        </div>

        {/* Main info */}
        <div className="min-w-0">
          <p className="text-[13px] font-bold text-[#0f172a] truncate">{booking.location}</p>
          <p className="text-[11.5px] text-gray-600 mt-0.5">{booking.floor} · Seat {booking.seatId}</p>
          <div className="flex items-center gap-1.5 mt-1.5 text-[11.5px] text-gray-600">
            <Calendar className="size-3 text-blue-500 shrink-0" />
            <span>{booking.date} · {booking.startTime} – {booking.endTime}</span>
          </div>
          <div className="flex gap-1.5 flex-wrap mt-2">
            <span className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold",
              isConfirmed
                ? "bg-[#E8F5E9] text-[#2E7D32] border border-[#A5D6A7]"
                : "bg-[#FFF8E1] text-[#F57F17] border border-[#FFE082]",
            )}>
              <span className={cn("w-1.5 h-1.5 rounded-full", isConfirmed ? "bg-green-500" : "bg-amber-500")} />
              {booking.status}
            </span>
            {booking.isRecurring && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold bg-[#E8EAF6] text-[#283593] border border-[#9FA8DA]">
                Recurring
              </span>
            )}
            {booking.bookingType === "on_behalf" && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                On Behalf
              </span>
            )}
          </div>
        </div>

        {/* Right column: Booking ID + Booked on */}
        <div className="hidden sm:flex flex-col items-end text-right">
          <div className="flex items-center gap-1 mb-0.5">
            <Hash className="size-2.5 text-blue-500" />
            <p className="text-[9px] font-semibold tracking-wider uppercase text-gray-500">Booking ID</p>
          </div>
          <p className="text-[10.5px] text-gray-700 font-mono mb-2">{booking.id}</p>
          {booking.bookedOn && (
            <>
              <div className="flex items-center gap-1 mb-0.5">
                <Clock className="size-2.5 text-blue-500" />
                <p className="text-[9px] font-semibold tracking-wider uppercase text-gray-500">Booked on</p>
              </div>
              <p className="text-[10.5px] text-gray-700">{booking.bookedOn}</p>
            </>
          )}
        </div>
      </div>

      {/* Footer row: booked-by + actions aligned with grid columns */}
      {(booking.bookingType === "on_behalf" || canCancelOwn || canBookSelf) && (
        <div className="hidden sm:grid grid-cols-[44px_1fr_auto] gap-3.5 px-4 pb-3.5 -mt-1 items-center">
          <div />
          {booking.bookingType === "on_behalf" && booking.bookedByName ? (
            <div className="flex items-center gap-2 min-w-0 pt-2 border-t border-gray-100">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0 bg-gradient-to-br from-emerald-500 to-teal-600">
                {getInitials(booking.bookedByName)}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-gray-400">Booked by</p>
                <p className="text-[11.5px] font-semibold text-[#0f172a] truncate">{booking.bookedByName}</p>
              </div>
            </div>
          ) : <div />}
          {(canCancelOwn || canBookSelf) ? (
            <div className="flex gap-1.5 shrink-0 justify-end">
              {canBookSelf && (
                <button onClick={() => onModify(booking)} className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-gray-600 bg-white hover:bg-gray-50 border border-gray-200 hover:border-blue-300 hover:text-blue-600 rounded-lg px-2.5 py-1 transition-all">
                  <Pencil className="size-2.5" /> Modify
                </button>
              )}
              {canCancelOwn && (
                <button onClick={() => onCancel(booking)} className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-red-500 bg-white hover:bg-red-50 border border-red-200 hover:border-red-300 rounded-lg px-2.5 py-1 transition-all">
                  <X className="size-2.5" /> Cancel
                </button>
              )}
            </div>
          ) : <div />}
        </div>
      )}

      {/* Mobile actions */}
      {(canCancelOwn || canBookSelf) && (
        <div className="sm:hidden flex gap-2 px-3.5 pb-3">
          {canBookSelf && (
            <button
              onClick={() => onModify(booking)}
              className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-gray-600 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1"
            >
              <Pencil className="size-2.5" />
              Modify
            </button>
          )}
          {canCancelOwn && (
            <button
              onClick={() => onCancel(booking)}
              className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-red-500 bg-white hover:bg-red-50 border border-red-200 rounded-lg px-2.5 py-1"
            >
              <X className="size-2.5" />
              Cancel
            </button>
          )}
        </div>
      )}

      {booking.managerNote && (
        <div className="px-3.5 pb-3 sm:px-4">
          <p className="text-[10px] text-gray-400 italic">{booking.managerNote}</p>
        </div>
      )}
    </div>
  );
}
