"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function ChangeRoleSkeleton() {
  return (
    <div className="space-y-5">
      {/* Back link */}
      <Skeleton className="h-4 w-40" />

      {/* Title */}
      <div className="space-y-1">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-3.5 w-80" />
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 max-w-4xl">
        {/* User profile card */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="w-14 h-14 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-3 w-44" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          </div>
          <div className="space-y-3 pt-2">
            <div className="flex justify-between">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-32" />
            </div>
            <div className="flex justify-between">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-28" />
            </div>
            <div className="flex justify-between">
              <Skeleton className="h-3 w-14" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </div>

        {/* Role panel */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <Skeleton className="h-5 w-32" />
          <div className="space-y-2">
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
          <Skeleton className="h-10 w-full rounded-lg mt-2" />
        </div>
      </div>
    </div>
  );
}
