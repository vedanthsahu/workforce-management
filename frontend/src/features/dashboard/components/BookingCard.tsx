"use client";

import { Repeat2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Booking } from "../types/dashboard.types";

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
    <div className="group bg-white border border-gray-100 rounded-xl overflow-hidden flex hover:border-gray-200 hover:shadow-sm transition-all duration-200 animate-fade-in-up">
      <div className={cn(
        "w-[3px] shrink-0 self-stretch rounded-l-xl transition-all duration-300",
        isConfirmed ? "bg-emerald-400 group-hover:bg-emerald-500" : "bg-yellow-400 group-hover:bg-yellow-500"
      )} />
      <div className="flex-1 px-4 py-3.5 min-w-0">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <p className="text-[12.5px] font-semibold text-gray-900 leading-snug">
            {booking.location} · {booking.floor}
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <Badge
              variant={isConfirmed ? "secondary" : "outline"}
              className={cn(
                "text-[10px] font-semibold px-2 py-[3px] rounded-md",
                isConfirmed ? "bg-emerald-50 text-emerald-700" : "bg-yellow-50 text-yellow-700"
              )}
            >
              {booking.status}
            </Badge>
            {booking.isRecurring && (
              <span className="inline-flex items-center gap-1 text-[10px] text-gray-400 font-medium">
                <Repeat2 className="w-3 h-3" />
                Recurring
              </span>
            )}
          </div>
        </div>
        <p className="text-[11px] text-gray-400 mt-1 leading-snug">
          Seat {booking.seatId} · {booking.date} · {booking.startTime} – {booking.endTime}
        </p>
        {(canCancelOwn || canBookSelf) && (
          <div className="flex items-center mt-3 pt-2.5 border-t border-gray-50 gap-2">
            {canBookSelf && (
              <Button
                variant="outline" size="sm"
                className="h-[22px] text-[11px] px-2.5 rounded-md border-gray-200 text-gray-600 shadow-none font-normal hover:bg-gray-50 hover:border-gray-300 active:scale-95 transition-all duration-150"
                onClick={() => onModify(booking)}
              >
                Modify
              </Button>
            )}
            {canCancelOwn && (
              <Button
                variant="ghost" size="sm"
                className="h-[22px] text-[11px] px-2.5 rounded-md text-red-500 hover:text-red-600 hover:bg-red-50 shadow-none font-normal active:scale-95 transition-all duration-150"
                onClick={() => onCancel(booking)}
              >
                Cancel
              </Button>
            )}
          </div>
        )}
        {booking.managerNote && (
          <p className="text-[10px] text-gray-400 mt-1.5 italic">{booking.managerNote}</p>
        )}
      </div>
    </div>
  );
}
