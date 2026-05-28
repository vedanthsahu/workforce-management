"use client";

import React, { useState } from "react";
import { Pencil, ChevronLeft, ChevronRight } from "lucide-react";
import { Seat } from "../types/seat.types";
import { Preference } from "../types/layout.types";

interface Props {
  seats: Seat[];
  preferences: Preference[];
  selected: Set<string>;
  isAllSelected: boolean;
  isIndeterminate: boolean;
  onToggleSelect: (svgId: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onEditSeat: (seat: Seat) => void;
  onBulkEdit: () => void;
}

const PAGE_SIZES = [10, 25, 50];

function BookablePill({ bookable }: { bookable: boolean }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
        bookable
          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
          : "bg-red-50 text-red-600 border border-red-200"
      }`}
    >
      {bookable ? "Yes" : "No"}
    </span>
  );
}

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Active:      "bg-emerald-50 text-emerald-700 border-emerald-200",
    Inactive:    "bg-gray-100 text-gray-500 border-gray-200",
    Maintenance: "bg-amber-50 text-amber-700 border-amber-200",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${styles[status] ?? "bg-gray-100 text-gray-500 border-gray-200"}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${status === "Active" ? "bg-emerald-500" : status === "Maintenance" ? "bg-amber-500" : "bg-gray-400"}`} />
      {status}
    </span>
  );
}

export default function SeatTable({
  seats, preferences, selected, isAllSelected, isIndeterminate,
  onToggleSelect, onSelectAll, onClearSelection, onEditSeat, onBulkEdit,
}: Props) {
  const [page, setPage]           = useState(1);
  const [pageSize, setPageSize]   = useState(10);

  const prefMap = Object.fromEntries(preferences.map((p) => [p.preference_id, p.preference_name]));

  const totalPages = Math.max(1, Math.ceil(seats.length / pageSize));
  const start      = (page - 1) * pageSize;
  const pageSeats  = seats.slice(start, start + pageSize);

  // Reset page on seat list change
  React.useEffect(() => { setPage(1); }, [seats.length]);

  const handleSelectAll = () => {
    if (isAllSelected) onClearSelection();
    else onSelectAll();
  };

  return (
    <div className="flex flex-col">
      {/* Table header info */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-800">{seats.length} Seats</span>
          {selected.size > 0 && (
            <span className="text-xs text-gray-500 bg-indigo-50 border border-indigo-200 text-indigo-600 px-2 py-0.5 rounded-full font-medium">
              {selected.size} selected
            </span>
          )}
        </div>
        {selected.size > 0 && (
          <button
            onClick={onBulkEdit}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Pencil size={12} />
            Bulk Edit
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  ref={(el) => { if (el) el.indeterminate = isIndeterminate; }}
                  onChange={handleSelectAll}
                  className="w-4 h-4 rounded border-gray-300 accent-indigo-600 cursor-pointer"
                />
              </th>
              {["Seat Code", "Seat Type", "Amenities", "Bookable", "Status", "Actions"].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageSeats.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-16 text-center text-sm text-gray-400">
                  No seats match the current filters.
                </td>
              </tr>
            ) : (
              pageSeats.map((seat, idx) => {
                const isSelected = selected.has(seat.seat_svg_id);
                return (
                  <tr
                    key={seat.seat_id}
                    className={`border-b border-gray-100 transition-colors ${
                      isSelected ? "bg-indigo-50/60" : idx % 2 === 0 ? "bg-white" : "bg-gray-50/40"
                    } hover:bg-indigo-50/40`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelect(seat.seat_svg_id)}
                        className="w-4 h-4 rounded border-gray-300 accent-indigo-600 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => onEditSeat(seat)}
                        className="text-indigo-600 font-semibold hover:text-indigo-800 hover:underline transition-colors text-sm"
                      >
                        {seat.seat_code}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-gray-700 text-xs font-medium">{seat.seat_type}</td>
                    <td className="px-4 py-3">
                      {seat.amenity_ids.length === 0 ? (
                        <span className="text-gray-400 text-xs">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {seat.amenity_ids.slice(0, 2).map((id) => (
                            <span
                              key={id}
                              className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-[10px] font-medium border border-gray-200"
                            >
                              {prefMap[id] ?? id}
                            </span>
                          ))}
                          {seat.amenity_ids.length > 2 && (
                            <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-500 text-[10px] font-medium border border-gray-200">
                              +{seat.amenity_ids.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <BookablePill bookable={seat.is_bookable} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={seat.status} />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => onEditSeat(seat)}
                        className="w-7 h-7 flex items-center justify-center rounded-md border border-gray-200 bg-white hover:bg-indigo-50 hover:border-indigo-300 text-gray-500 hover:text-indigo-600 transition-colors"
                        title="Edit seat"
                      >
                        <Pencil size={12} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-3 px-1">
        <p className="text-xs text-gray-400">
          Showing {Math.min(start + 1, seats.length)}–{Math.min(start + pageSize, seats.length)} of {seats.length} seats
        </p>

        <div className="flex items-center gap-3">
          {/* Page size */}
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>Rows</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="h-7 px-2 text-xs border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
            >
              {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          {/* Page numbers */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="w-7 h-7 flex items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={13} />
            </button>

            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              // show pages around current
              let pg = i + 1;
              if (totalPages > 5) {
                if (page <= 3) pg = i + 1;
                else if (page >= totalPages - 2) pg = totalPages - 4 + i;
                else pg = page - 2 + i;
              }
              return (
                <button
                  key={pg}
                  onClick={() => setPage(pg)}
                  className={`w-7 h-7 flex items-center justify-center rounded-md text-xs font-medium transition-colors ${
                    page === pg
                      ? "bg-indigo-600 text-white border border-indigo-600"
                      : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {pg}
                </button>
              );
            })}

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="w-7 h-7 flex items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}