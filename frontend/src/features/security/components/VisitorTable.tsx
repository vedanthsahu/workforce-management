"use client";

import { useState } from "react";
import { Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { VisitorSearchBar } from "./VisitorSearchBar";
import VisitorPagination from "./VisitorPagination";
import { CheckInButton } from "./CheckInButton";
import { GuestBookingDetailsModal } from "@/features/security/components/Guestbookingdetailsmodal";
import { useCheckIn } from "../hooks/useCheckIn";
import { getStatusBadgeClass, getStatusLabel } from "../utils/security.utils";
import { VISITOR_TABLE_HEADERS, VISITOR_TABLE_MIN_HEIGHT } from "../utils/constants";
import type { Visitor } from "../types/security.types";

type ModalType = "details" | null;

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

// ── Main table ────────────────────────────────────────────────────────────────
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

  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [selectedVisitor, setSelectedVisitor] = useState<Visitor | null>(null);

  const openModal = (type: ModalType, visitor: Visitor) => {
    setSelectedVisitor(visitor);
    setActiveModal(type);
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedVisitor(null);
  };

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-6 py-4 border-b">
          <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2 whitespace-nowrap">
            {title}
            <span className="text-[11px] font-medium text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
              {count}
            </span>
          </h2>
          <div className="w-full flex justify-end">
            <VisitorSearchBar
              search={search}
              onSearchChange={onSearchChange}
              placeholder="Search by guest name…"
            />
          </div>
        </div>

        <div>
          {/* ── Desktop table ──────────────────────────────────────── */}
          <div className={cn("hidden md:block overflow-x-auto overflow-y-auto max-h-[480px]", VISITOR_TABLE_MIN_HEIGHT)}>
            <table className="w-full text-left text-xs">
              <thead className="text-xs text-blue-600 bg-blue-100 border-b sticky top-0 z-10">
                <tr>
                  {VISITOR_TABLE_HEADERS.map((h) => (
                    <th
                      key={h}
                      className={cn(
                        "px-4 py-3 font-bold whitespace-nowrap",
                        ["Guest Name", "Host", "Visit Time", "Location", "Seat Booked", "Status", "Actions"].includes(h)
                          ? "text-center"
                          : "text-left"
                      )}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading && (
                  <tr>
                    <td colSpan={VISITOR_TABLE_HEADERS.length} className="py-8 text-center text-sm text-gray-400">
                      Loading visitors…
                    </td>
                  </tr>
                )}

                {!loading && visitors.length === 0 && (
                  <tr>
                    <td colSpan={VISITOR_TABLE_HEADERS.length} className="py-8 text-center text-sm text-gray-400">
                      No visitors found.
                    </td>
                  </tr>
                )}

                {!loading && visitors.map((v, index) => (
                  <tr
                    key={v.id ?? `row-${index}`}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    {/* Guest Name */}
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-semibold text-indigo-700 shrink-0">
                          {v.guestInitials}
                        </div>
                        <span className="text-sm font-medium text-black truncate">
                          {v.guestName}
                        </span>
                      </div>
                    </td>

                    {/* Host */}
                    <td className="py-3 px-4 text-center">
                      <p className="text-sm text-black">{v.hostName}</p>
                      {v.hostEmail && (
                        <p className="text-xs text-black truncate">{v.hostEmail}</p>
                      )}
                    </td>

                    {/* Visit Time */}
                    <td className="py-3 px-4 text-sm text-black whitespace-nowrap text-center">
                      {v.visitTimeLabel}
                    </td>

                    {/* Location */}
                    <td className="py-3 px-4 text-sm text-black text-center">{v.location}</td>

                    {/* Seat Booked */}
                    <td className="py-3 px-4 text-center">
                      {v.seatBooked ? (
                        <span className="text-sm font-medium text-emerald-600">
                          Yes {v.seatCode ? `(${v.seatCode})` : ""}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">No (Visitor Only)</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 text-center">
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
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <CheckInButton
                          visitor={v}
                          isLoading={checkingInId === v.id}
                          onCheckIn={handleCheckIn}
                          onCheckOut={handleCheckOut}
                        />
                        <button
                          type="button"
                          onClick={() => openModal("details", v)}
                          className="w-7 h-7 rounded-md border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition"
                          aria-label="View details"
                        >
                          <Eye className="w-3.5 h-3.5 text-indigo-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Mobile cards ───────────────────────────────────────── */}
          <div className={cn("md:hidden p-3 space-y-3 overflow-y-auto max-h-[480px]", "min-h-[280px]")}>
            {loading && (
              <p className="py-8 text-center text-sm text-gray-400">Loading visitors…</p>
            )}

            {!loading && visitors.length === 0 && (
              <p className="py-8 text-center text-sm text-gray-400">No visitors found.</p>
            )}

            {!loading && visitors.map((v, index) => (
              <div key={v.id ?? `card-${index}`} className="border rounded-xl p-3.5 space-y-2.5">
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
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ring-1",
                        getStatusBadgeClass(v.status)
                      )}
                    >
                      {getStatusLabel(v.status)}
                    </span>
                    <button
                      type="button"
                      onClick={() => openModal("details", v)}
                      className="w-7 h-7 rounded-md border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition"
                      aria-label="View details"
                    >
                      <Eye className="w-3.5 h-3.5 text-indigo-600" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-gray-400">Host</p>
                    <p className="text-gray-700 font-medium truncate">{v.hostName}</p>
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

          {/* ── Footer ─────────────────────────────────────────────── */}
          {!loading && total > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-6 py-4 border-t text-sm text-gray-500">
              <span>
                Showing {pageStart}–{pageEnd} of {total}
              </span>
              <VisitorPagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={onPageChange}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Modal ──────────────────────────────────────────────────── */}
      {/* Details reads straight off the already-fetched table data —
         no extra API call, just the row's Visitor object. */}
      <GuestBookingDetailsModal
        visitor={activeModal === "details" ? selectedVisitor : null}
        onClose={closeModal}
      />
    </>
  );
}