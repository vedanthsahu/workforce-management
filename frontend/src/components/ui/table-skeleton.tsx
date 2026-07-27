"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function StatCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-12" />
          <Skeleton className="h-2.5 w-16" />
        </div>
      ))}
    </div>
  );
}

function TableRowSkeleton({ columns }: { columns: number }) {
  return (
    <tr className="border-b border-gray-50">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 sm:px-6 py-3.5">
          <Skeleton className={`h-4 ${i === 0 ? "w-32" : i === columns - 1 ? "w-16" : "w-24"}`} />
        </td>
      ))}
    </tr>
  );
}

export function TableBodySkeleton({ columns = 5, rows = 5 }: { columns?: number; rows?: number }) {
  return (
    <div>
      {/* Column headers */}
      <div className="px-4 sm:px-6 py-3 border-b border-gray-100 flex gap-6">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-20" />
        ))}
      </div>

      {/* Rows */}
      <table className="w-full">
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <TableRowSkeleton key={i} columns={columns} />
          ))}
        </tbody>
      </table>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-t">
        <Skeleton className="h-3.5 w-40" />
        <div className="flex gap-1">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      </div>
    </div>
  );
}

export function TableSkeleton({ columns = 5, rows = 5, statCards = 4 }: { columns?: number; rows?: number; statCards?: number }) {
  return (
    <div className="space-y-4 sm:space-y-6">
      <StatCardsSkeleton count={statCards} />

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-9 w-50 rounded-lg" />
        </div>

        <TableBodySkeleton columns={columns} rows={rows} />
      </div>
    </div>
  );
}
