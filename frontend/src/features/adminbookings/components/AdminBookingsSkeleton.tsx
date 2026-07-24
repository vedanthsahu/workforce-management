"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function AdminBookingsSkeleton() {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto overflow-x-clip p-4 sm:p-6 space-y-4 sm:space-y-6 bg-[#f8fafc]">
      {/* HEADER */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-52" />
          <Skeleton className="h-3.5 w-80" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-40 rounded-xl" />
          <Skeleton className="h-9 w-28 rounded-xl" />
          <Skeleton className="h-9 w-9 rounded-xl" />
        </div>
      </div>

      {/* FILTERS CARD */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 sm:p-5 space-y-4">
        {/* Row 1 */}
        <div className="flex items-end gap-3 flex-wrap">
          <Skeleton className="h-10 w-[230px] rounded-lg" />
          <Skeleton className="h-10 w-[180px] rounded-lg" />
          <Skeleton className="h-10 w-[180px] rounded-lg" />
          <Skeleton className="h-10 w-[180px] rounded-lg" />
          <Skeleton className="h-10 w-[170px] rounded-lg" />
        </div>
        {/* Row 2 */}
        <div className="flex items-end gap-2 flex-wrap">
          <Skeleton className="h-10 w-[170px] rounded-lg" />
          <Skeleton className="h-10 w-60 rounded-lg" />
          <Skeleton className="h-10 w-40 rounded-lg" />
          <div className="flex-1" />
          <Skeleton className="h-10 w-24 rounded-lg" />
          <Skeleton className="h-10 w-28 rounded-lg" />
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-3 p-3 sm:p-5 bg-white border rounded-2xl shadow-sm">
            <Skeleton className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl shrink-0" />
            <div className="min-w-0 space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-5 w-10" />
            </div>
          </div>
        ))}
      </div>

      {/* TABLE */}
      <div className="w-full bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col">
        {/* TABLE HEADER */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b shrink-0">
          <Skeleton className="h-4 w-32" />
        </div>

        {/* Column labels */}
        <div className="hidden sm:flex items-center gap-6 px-6 py-3 bg-blue-50/60 border-b">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-16" />
        </div>

        {/* Rows */}
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="flex items-center gap-6 px-4 sm:px-6 py-3.5 border-b border-gray-50 last:border-0"
          >
            <div className="flex items-center gap-2.5 min-w-[160px]">
              <Skeleton className="w-8 h-8 rounded-full shrink-0" />
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-2.5 w-16" />
              </div>
            </div>
            <Skeleton className="h-3.5 w-16" />
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-3.5 w-12" />
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-3.5 w-16" />
            <Skeleton className="h-7 w-7 rounded-lg ml-auto" />
          </div>
        ))}

        {/* FOOTER */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 sm:px-6 py-4 border-t shrink-0">
          <Skeleton className="h-3.5 w-40" />
          <Skeleton className="h-7 w-32 rounded-md" />
        </div>
      </div>
    </div>
  );
}
