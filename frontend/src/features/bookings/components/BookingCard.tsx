"use client";

import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TAG_STYLES } from "../utils/constants";
import { formatDate } from "../utils/bookingHelpers";
import type { Booking } from "../types/bookings.types";

type BookingTagChipProps = {
  label: string;
  variant: string;
};

function BookingTagChip({ label, variant }: BookingTagChipProps) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium whitespace-nowrap",
      TAG_STYLES[variant] ?? TAG_STYLES.zone,
    )}>
      {label}
    </span>
  );
}

type BookingCardProps = {
  booking: Booking;
  onCancelClick: (booking: Booking) => void;
  onModifyClick: (booking: Booking) => void;
  showActions?: boolean;
};

export function BookingCard({ booking, onCancelClick, onModifyClick, showActions = true }: BookingCardProps) {
  const isCancelled = booking.status === "cancelled";

  return (
    <div className="bg-white border border-[#EBEBF5] rounded-xl overflow-hidden flex flex-col hover:shadow-sm transition-shadow duration-200">
      <div className="flex items-stretch">
        {/* Left accent bar */}
        <div className={cn(
          "w-[3px] shrink-0",
          isCancelled
            ? "bg-gray-200"
            : booking.status === "pending"
              ? "bg-amber-400"
              : "bg-indigo-500",
        )} />

        <div className="flex-1 min-w-0 px-4 sm:px-5 py-4">
          {/* Row 1: title + booked-on — stacks on mobile */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 sm:gap-4">
            <div className="min-w-0">
              <p className="text-[13.5px] font-semibold text-[#1A1A2E] truncate">
                {booking.location} · {booking.floor} · Seat {booking.seat}
              </p>
              <p className="text-[12px] text-gray-500 mt-0.5">
                {formatDate(booking.date)}
                {" · "}
                {booking.isFullDay
                  ? "Full day"
                  : `${booking.startTime} – ${booking.endTime}`}
                {booking.isFullDay && (
                  <span className="ml-2 text-[11px] bg-gray-100 text-gray-500 rounded px-1.5 py-0.5">
                    Full day
                  </span>
                )}
              </p>
            </div>
            <span className="text-[11px] text-gray-400 whitespace-nowrap sm:mt-0.5">
              Booked {booking.bookedOn}
            </span>
          </div>

          {/* Row 2: tags */}
          {!isCancelled && (
            <div className="flex gap-1.5 flex-wrap mt-2.5">
              {booking.tags.map((tag, i) => (
                <BookingTagChip key={i} label={tag.label} variant={tag.variant} />
              ))}
              {booking.isRecurring && booking.recurringPattern && (
                <BookingTagChip label={booking.recurringPattern} variant="recurring" />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Cancelled badge */}
      {isCancelled && (
        <div className="flex justify-end px-4 sm:px-5 py-2.5 border-t border-gray-100 bg-[#F7F8FC]">
          <Badge
            variant="outline"
            className="gap-1.5 px-2.5 py-1 text-[11.5px] font-semibold bg-red-50 text-red-500 border-red-200 rounded-md"
          >
            <XCircle className="size-3" />
            Cancelled
          </Badge>
        </div>
      )}

      {/* Action footer */}
      {showActions && !isCancelled && (
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-2 px-4 sm:px-5 py-2.5 border-t border-gray-100 bg-[#F7F8FC]">
          <Button
            variant="outline"
            size="sm"
            className="h-8 sm:h-7 w-full sm:w-auto px-4 text-[12.5px] text-gray-600"
            onClick={() => onModifyClick(booking)}
          >
            Modify
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 sm:h-7 w-full sm:w-auto px-4 text-[12.5px] border-red-200 bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 hover:border-red-300"
            onClick={() => onCancelClick(booking)}
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
