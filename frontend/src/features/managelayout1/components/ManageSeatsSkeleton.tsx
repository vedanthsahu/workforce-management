"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function ManageSeatsSkeleton() {
  return (
    <div className="flex h-screen w-full">
      <div className="flex flex-col flex-1 min-w-0">
        <main className="flex-1 bg-gray-50 p-6 space-y-5 overflow-y-auto">

          {/* Header */}
          <div className="flex justify-between items-center">
            <div className="space-y-1.5">
              <Skeleton className="h-7 w-44" />
              <Skeleton className="h-3.5 w-72" />
            </div>
            <div className="flex gap-3">
              <Skeleton className="h-10 w-36 rounded-md" />
              <Skeleton className="h-10 w-36 rounded-md" />
            </div>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="w-9 h-9 rounded-lg" />
                </div>
                <Skeleton className="h-7 w-12" />
                <Skeleton className="h-2.5 w-24" />
              </div>
            ))}
          </div>

          {/* Filters bar */}
          <div className="flex items-end justify-between gap-3">
            <div className="flex gap-3 flex-1">
              <Skeleton className="h-9 w-40 rounded-md" />
              <Skeleton className="h-9 w-40 rounded-md" />
              <Skeleton className="h-9 w-28 rounded-md" />
            </div>
            <Skeleton className="h-9 w-24 rounded-md" />
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Table header */}
            <div className="px-4 py-3 border-b border-gray-100 flex gap-6">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-3.5 w-16" />
            </div>
            {/* Rows */}
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="px-4 py-3.5 border-b border-gray-50 flex items-center gap-6">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-7 w-7 rounded" />
              </div>
            ))}
          </div>

        </main>
      </div>
    </div>
  );
}
