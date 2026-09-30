"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { BookingSidebarSkeleton } from "./BookingSidebar";

export function BookaSeatSkeleton() {
  return (
    <>
      {/* Header — matches the sticky header */}
      <div className="flex justify-between items-start sm:items-center gap-3 mb-4">
        <div className="space-y-1.5">
          <Skeleton className="h-5 sm:h-6 w-36 sm:w-44" />
          <Skeleton className="h-3 w-56" />
        </div>
        <Skeleton className="h-8 w-24 rounded-md" />
      </div>

      {/* Step indicator bar */}
      <div className="bg-white border border-[#EBEBF5] rounded-xl px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between sm:justify-start sm:gap-3 mb-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-2 sm:gap-3">
            <Skeleton className="w-7 h-7 sm:w-8 sm:h-8 rounded-full shrink-0" />
            <div className="space-y-1 hidden sm:block">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-2.5 w-44" />
            </div>
            {i < 3 && <Skeleton className="h-3 w-3 rounded-full mx-1 sm:mx-2 shrink-0" />}
          </div>
        ))}
      </div>

      {/* Two-card form + sidebar — matches the real step 1 layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_336px] lg:items-start gap-3 sm:gap-4">
        <div className="flex flex-col gap-3 sm:gap-4 min-w-0">

          {/* Card: Where & when */}
          <div className="bg-white border border-[#EBEBF5] rounded-xl p-4 sm:p-6 flex flex-col gap-5 sm:gap-6">
            <div className="flex items-center gap-3">
              <Skeleton className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-56" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {["Site (Office Location)", "Building", "Floor"].map((label) => (
                <div key={label} className="space-y-1.5">
                  <Skeleton className="h-2.5 w-28" />
                  <Skeleton className="h-9 sm:h-10 w-full rounded-md" />
                </div>
              ))}
            </div>

            <div className="space-y-1.5">
              <Skeleton className="h-3.5 w-16" />
              <div className="flex gap-2 sm:gap-3 items-center">
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-2.5 w-10" />
                  <Skeleton className="h-9 sm:h-10 w-full rounded-md" />
                </div>
                <Skeleton className="h-3 w-3 rounded-full mt-5 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-2.5 w-8" />
                  <Skeleton className="h-9 sm:h-10 w-full rounded-md" />
                </div>
              </div>
            </div>
          </div>

          {/* Card: Your space, your preferences */}
          <div className="bg-white border border-[#EBEBF5] rounded-xl p-4 sm:p-6 flex flex-col gap-5 sm:gap-6">
            <div className="flex items-center gap-3">
              <Skeleton className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-52" />
                <Skeleton className="h-3 w-64" />
              </div>
            </div>

            <div className="flex gap-2 sm:gap-3 flex-wrap">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="flex-1 min-w-[130px] h-20 sm:h-24 rounded-xl" />
              ))}
            </div>
          </div>

          {/* Action row */}
          <div className="flex justify-end items-center">
            <Skeleton className="h-9 w-44 rounded-md" />
          </div>
        </div>

        {/* Sidebar */}
        <BookingSidebarSkeleton />
      </div>
    </>
  );
}
