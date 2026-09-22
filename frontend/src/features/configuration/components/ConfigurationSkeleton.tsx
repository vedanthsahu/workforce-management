"use client";

import { Skeleton } from "@/components/ui/skeleton";

function SettingRowSkeleton() {
  return (
    <div className="flex items-center justify-between gap-6 py-4">
      <div className="min-w-0 space-y-1.5">
        <Skeleton className="h-3.5 w-40" />
        <Skeleton className="h-3 w-56" />
      </div>
      <div className="flex items-center gap-2.5 shrink-0">
        <Skeleton className="w-20 h-10 rounded-lg" />
        <Skeleton className="h-3 w-14" />
      </div>
    </div>
  );
}

function SectionSkeleton({ rows }: { rows: number }) {
  return (
    <div className="px-5 sm:px-6 py-5">
      <div className="flex items-start gap-3 mb-1">
        <div className="w-1 self-stretch rounded-full bg-gray-100 mt-0.5" />
        <Skeleton className="h-5 w-44" />
      </div>
      <div className="pl-4 divide-y divide-gray-100">
        {Array.from({ length: rows }).map((_, i) => (
          <SettingRowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export function ConfigurationSkeleton() {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto overflow-x-clip bg-[#f8fafc]">
      <div className="p-5 sm:p-8 space-y-6 pb-28">
        {/* HEADER */}
        <div className="space-y-2">
          <Skeleton className="h-6 sm:h-7 w-44" />
          <Skeleton className="h-3.5 w-64" />
        </div>

        {/* SETTINGS PANEL */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm divide-y divide-gray-100">
          <SectionSkeleton rows={1} />
          <SectionSkeleton rows={1} />
          <SectionSkeleton rows={2} />
          <SectionSkeleton rows={1} />
          <SectionSkeleton rows={3} />
        </div>

        {/* NOTE */}
        <div className="flex items-start gap-4 bg-gray-50 border border-gray-100 rounded-xl px-5 py-4">
          <Skeleton className="w-7 h-7 rounded-full shrink-0" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-3.5 w-16" />
            <Skeleton className="h-3 w-full max-w-md" />
          </div>
        </div>

        {/* UPDATE DETAILS */}
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-3 w-72 ml-[21px]" />
        </div>
      </div>

      {/* STICKY SAVE BAR */}
      <div className="sticky bottom-0 left-0 right-0 flex items-center justify-between gap-4 px-5 sm:px-8 py-4 bg-white/95 backdrop-blur border-t border-gray-200">
        <Skeleton className="h-3.5 w-32" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-24 rounded-xl" />
          <Skeleton className="h-9 w-32 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
