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
    <div className="bg-white border border-[#EBEBF5] rounded-2xl overflow-hidden hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#EBEBF5]">
        <p className="text-[13px] font-bold text-[#0f172a]">Upcoming Bookings</p>
        {totalCount > 2 && (
          <Link
            href="/mybookings"
            className="text-[11.5px] text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-0.5 transition-colors"
          >
            View all ({totalCount})
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>
      <div className="p-3.5 space-y-3">
        {bookings.length === 0 ? (
          <div className="px-1 py-8 flex flex-col items-center gap-2.5">
            <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center">
              <CalendarDays className="w-6 h-6 text-gray-300" />
            </div>
            <p className="text-[12px] text-gray-400 text-center">
              No upcoming bookings.
              {canBookSelf && <><br /><span className="text-blue-500 font-medium">Book a seat</span> to get started.</>}
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
