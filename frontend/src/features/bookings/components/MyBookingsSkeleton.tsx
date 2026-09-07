"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function MyBookingsStatsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="bg-white border border-[#EBEBF5] rounded-xl px-4 py-4 flex flex-col gap-2.5 min-w-[160px] border-l-[3px] border-l-gray-200"
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="w-11 h-11 rounded-xl" />
          </div>
          <div>
            <Skeleton className="h-7 w-12" />
            <Skeleton className="h-3 w-24 mt-2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function BookingCardSkeleton() {
  return (
    <div className="bg-white border border-[#EBEBF5] rounded-2xl overflow-hidden">
      <div className="grid items-center gap-4 sm:gap-6 p-4 sm:px-5 sm:py-[18px] grid-cols-[52px_1fr] sm:grid-cols-[52px_1.7fr_auto]">
        {/* Icon */}
        <Skeleton className="w-[52px] h-[52px] rounded-[13px] shrink-0" />

        {/* Main info */}
        <div className="min-w-0 space-y-2">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-3 w-56" />
          <div className="flex gap-2 pt-0.5">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        </div>

        {/* Meta + actions — right column */}
        <div className="hidden sm:flex flex-col items-end gap-2">
          <div className="flex items-center gap-1.5">
            <Skeleton className="h-3 w-3 rounded" />
            <Skeleton className="h-3 w-24" />
          </div>
          <div className="flex items-center gap-1.5">
            <Skeleton className="h-3 w-3 rounded" />
            <Skeleton className="h-3 w-28" />
          </div>
          <div className="flex gap-2 mt-1">
            <Skeleton className="h-7 w-16 rounded-md" />
            <Skeleton className="h-7 w-16 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function MyBookingsSkeleton() {
  return (
    <div className="flex flex-col gap-3.5">
      <BookingCardSkeleton />
      <BookingCardSkeleton />
      <BookingCardSkeleton />
      <BookingCardSkeleton />
    </div>
  );
}
