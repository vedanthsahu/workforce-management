"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-[120px] w-full rounded-2xl" />
      <Skeleton className="h-[82px] w-full rounded-2xl" />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Skeleton className="h-[100px] w-full rounded-2xl" />
        <Skeleton className="h-[100px] w-full rounded-2xl" />
        <Skeleton className="h-[100px] w-full rounded-2xl col-span-2 sm:col-span-1" />
      </div>
      <Skeleton className="h-[110px] w-full rounded-2xl" />
      <Skeleton className="h-[110px] w-full rounded-2xl" />
    </div>
  );
}
