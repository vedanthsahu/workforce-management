"use client";

import { cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { VisitorSearchBar } from "./VisitorSearchBar";
import VisitorPagination from "./VisitorPagination";
import { CheckInButton } from "./CheckInButton";
import { useCheckIn } from "../hooks/useCheckIn";
import { getStatusBadgeClass, getStatusLabel } from "../utils/security.utils";
import type { Visitor } from "../types/security.types";

const TABLE_HEADERS = [
  "Guest Name",
  "Host",
  "Visit Time",
  "Location",
  "Seat Booked",
  "Status",
  "Actions",
];

type Props = {
  title: string;
  count: number;
  visitors: Visitor[];
  loading: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  onRefresh?: () => void;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageStart: number;
  pageEnd: number;
  total: number;
};

export function VisitorTable({
  title,
  count,
  visitors,
  loading,
  search,
  onSearchChange,
  onRefresh,
  page,
  totalPages,
  onPageChange,
  pageStart,
  pageEnd,
  total,
}: Props) {
  const { checkingInId, handleCheckIn, handleCheckOut } = useCheckIn(onRefresh);

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          {title}
          <span className="text-[11px] font-medium text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
            {count}
          </span>
        </CardTitle>

        <div className="w-full sm:max-w-xs">
          <VisitorSearchBar search={search} onSearchChange={onSearchChange} />
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* ── Desktop / tablet table ────────────────────────────── */}
        <div className="hidden md:block overflow-x-auto overflow-y-auto max-h-[480px]">
          <table className="w-full text-left">
            <thead className="sticky top-0 z-10">
              <tr className="border-b bg-gray-50">
                {TABLE_HEADERS.map((h) => (
                  <th
                    key={h}
                    className={cn(
                      "py-2.5 px-4 text-[11px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap bg-gray-50",
                      h === "Actions" && "w-[140px] text-center"
                    )}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={TABLE_HEADERS.length} className="py-8 text-center text-sm text-gray-400">
                    Loading visitors…
                  </td>
                </tr>
              )}

              {!loading && visitors.length === 0 && (
                <tr>
                  <td colSpan={TABLE_HEADERS.length} className="py-8 text-center text-sm text-gray-400">
                    No visitors found.
                  </td>
                </tr>
              )}

              {!loading &&
                visitors.map((v) => (
                  <tr key={v.id} className="border-b last:border-0 hover:bg-gray-50/60 transition-colors">
                    {/* Guest Name */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-semibold text-indigo-700 shrink-0">
                          {v.guestInitials}
                        </div>
                        <span className="text-sm font-medium text-gray-800 truncate">{v.guestName}</span>
                      </div>
                    </td>

                    {/* Host — name, email, phone stacked */}
                    <td className="py-3 px-4">
                      <p className="text-sm text-gray-700">{v.hostName}</p>
                      <p className="text-[11px] text-gray-400 truncate">{v.hostEmail}</p>
                      <p className="text-[11px] text-gray-400">{v.hostPhone || "-"}</p>
                    </td>

                    {/* Visit Time */}
                    <td className="py-3 px-4 text-sm text-gray-600 whitespace-nowrap">{v.visitTimeLabel}</td>

                    {/* Location */}
                    <td className="py-3 px-4 text-sm text-gray-600">{v.location}</td>

                    {/* Seat Booked */}
                    <td className="py-3 px-4">
                      {v.seatBooked ? (
                        <span className="text-sm font-medium text-emerald-600">
                          Yes {v.seatCode ? `(${v.seatCode})` : ""}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">No (Visitor Only)</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      <span
                        className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ring-1",
                          getStatusBadgeClass(v.status)
                        )}
                      >
                        {getStatusLabel(v.status)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 w-[140px] text-center">
                      <div className="flex items-center justify-center">
                        <CheckInButton
                          visitor={v}
                          isLoading={checkingInId === v.id}
                          onCheckIn={handleCheckIn}
                          onCheckOut={handleCheckOut}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* ── Mobile cards ──────────────────────────────────────── */}
        <div className="md:hidden p-3 space-y-3 overflow-y-auto max-h-[480px]">
          {loading && (
            <p className="py-8 text-center text-sm text-gray-400">Loading visitors…</p>
          )}

          {!loading && visitors.length === 0 && (
            <p className="py-8 text-center text-sm text-gray-400">No visitors found.</p>
          )}

          {!loading &&
            visitors.map((v) => (
              <div key={v.id} className="border rounded-lg p-3.5 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-[11px] font-semibold text-indigo-700 shrink-0">
                      {v.guestInitials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{v.guestName}</p>
                      <p className="text-[11px] text-gray-400 truncate">{v.purpose}</p>
                    </div>
                  </div>

                  <span
                    className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ring-1 shrink-0",
                      getStatusBadgeClass(v.status)
                    )}
                  >
                    {getStatusLabel(v.status)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-gray-400">Host</p>
                    <p className="text-gray-700 font-medium truncate">{v.hostName}</p>
                    <p className="text-gray-400 truncate">{v.hostEmail}</p>
                    <p className="text-gray-400">{v.hostPhone || "-"}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Visit Time</p>
                    <p className="text-gray-700 font-medium">{v.visitTimeLabel}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Location</p>
                    <p className="text-gray-700 font-medium truncate">{v.location}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Seat Booked</p>
                    {v.seatBooked ? (
                      <p className="text-emerald-600 font-medium">
                        Yes {v.seatCode ? `(${v.seatCode})` : ""}
                      </p>
                    ) : (
                      <p className="text-gray-400 font-medium">No</p>
                    )}
                  </div>
                </div>

                <div className="pt-1 border-t">
                  <CheckInButton
                    visitor={v}
                    isLoading={checkingInId === v.id}
                    onCheckIn={handleCheckIn}
                    onCheckOut={handleCheckOut}
                  />
                </div>
              </div>
            ))}
        </div>

        {/* ── Footer ───────────────────────────────────────────── */}
        {!loading && total > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 border-t">
            <p className="text-xs text-gray-500">
              Showing {pageStart}–{pageEnd} of {total}
            </p>
            <VisitorPagination currentPage={page} totalPages={totalPages} onPageChange={onPageChange} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}