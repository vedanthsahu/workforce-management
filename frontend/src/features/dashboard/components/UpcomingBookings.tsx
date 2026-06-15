"use client";

import Link from "next/link";
import { CalendarDays, ChevronRight } from "lucide-react";
import { BookingCard } from "./BookingCard";
import type { Booking } from "../types/dashboard.types";

type UpcomingBookingsProps = {
  bookings: Booking[];
  onCancel: (booking: Booking) => void;
  onModify: (booking: Booking) => void;
  totalCount: number;
  canCancelOwn: boolean;
  canBookSelf: boolean;
};

export function UpcomingBookings({
  bookings,
  onCancel,
  onModify,
  totalCount,
  canCancelOwn,
  canBookSelf,
}: UpcomingBookingsProps) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <p className="text-[12.5px] font-semibold text-gray-900">Upcoming bookings</p>
        {totalCount > 2 && (
          <Link
            href="/mybookings"
            className="text-[11px] text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-0.5 transition-colors"
          >
            View all ({totalCount})
            <ChevronRight className="w-3 h-3" />
          </Link>
        )}
      </div>
      <div className="p-3 space-y-2.5">
        {bookings.length === 0 ? (
          <div className="px-1 py-6 flex flex-col items-center gap-2">
            <CalendarDays className="w-8 h-8 text-gray-200" />
            <p className="text-[11px] text-gray-400 text-center">
              No upcoming bookings.
              {canBookSelf && <><br />Book a seat to get started.</>}
            </p>
          </div>
        ) : (
          bookings.map((b) => (
            <BookingCard
              key={b.id}
              booking={b}
              onCancel={onCancel}
              onModify={onModify}
              canCancelOwn={canCancelOwn}
              canBookSelf={canBookSelf}
            />
          ))
        )}
      </div>
    </div>
  );
}
