"use client";

import React, { useState, useMemo } from "react";
import { Pencil, ChevronLeft, ChevronRight, ArrowUp, ArrowDown } from "lucide-react";
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

type SortKey = "seat_code" | "is_configured";
type SortOrder = "asc" | "desc";

function Dash() {
  return <span className="text-gray-400 text-xs">—</span>;
}

function BookablePill({ bookable }: { bookable: boolean | null }) {
  if (bookable === null) return <Dash />;
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

function StatusPill({ status }: { status: string | null }) {
  if (!status) return <Dash />;
  const styles: Record<string, string> = {
    ACTIVE:      "bg-emerald-50 text-emerald-700 border-emerald-200",
    INACTIVE:    "bg-gray-100 text-gray-500 border-gray-200",
    MAINTENANCE: "bg-amber-50 text-amber-700 border-amber-200",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${styles[status] ?? "bg-gray-100 text-gray-500 border-gray-200"}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${
        status === "ACTIVE"      ? "bg-emerald-500" :
        status === "MAINTENANCE" ? "bg-amber-500"   :
        "bg-gray-400"
      }`} />
      {status}
    </span>
  );
}

function ConfiguredPill({ configured }: { configured: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
        configured
          ? "bg-indigo-50 text-indigo-700 border-indigo-200"
          : "bg-amber-50 text-amber-700 border-amber-200"
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${configured ? "bg-indigo-500" : "bg-amber-400"}`} />
      {configured ? "Configured" : "Not Configured"}
    </span>
  );
}

function SortIcon({ active, order }: { active: boolean; order: SortOrder }) {
  if (!active) return <ArrowUp size={11} className="opacity-25" />;
  return order === "asc"
    ? <ArrowUp size={11} className="text-indigo-500" />
    : <ArrowDown size={11} className="text-indigo-500" />;
}

export default function SeatTable({
  seats, preferences, selected, isAllSelected, isIndeterminate,
  onToggleSelect, onSelectAll, onClearSelection, onEditSeat, onBulkEdit,
}: Props) {
  const [page, setPage]           = useState(1);
  const [pageSize, setPageSize]   = useState(10);
  const [sortKey, setSortKey]     = useState<SortKey>("seat_code");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  const prefMap = Object.fromEntries(preferences.map((p) => [p.preference_id, p.preference_name]));

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  };

  const sortedSeats = useMemo(() => {
    return [...seats].sort((a, b) => {
      if (sortKey === "seat_code") {
        const aNum = parseInt(a.seat_code, 10);
        const bNum = parseInt(b.seat_code, 10);
        const aVal = isNaN(aNum) ? a.seat_code : aNum;
        const bVal = isNaN(bNum) ? b.seat_code : bNum;
        if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
        if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
        return 0;
      }
      if (sortKey === "is_configured") {
        const aVal = a.is_configured ? 1 : 0;
        const bVal = b.is_configured ? 1 : 0;
        return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });
  }, [seats, sortKey, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(sortedSeats.length / pageSize));
  const start      = (page - 1) * pageSize;
  const pageSeats  = sortedSeats.slice(start, start + pageSize);

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
            <span className="text-xs bg-indigo-50 border border-indigo-200 text-indigo-600 px-2 py-0.5 rounded-full font-medium">
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
      <div className="rounded-xl border border-gray-200 overflow-hidden overflow-x-auto">
        <table className="min-w-[700px] w-full text-sm border-collapse">
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
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                <button
                  onClick={() => handleSort("seat_code")}
                  className="flex items-center gap-1 hover:text-gray-800 transition-colors"
                >
                  Seat Code
                  <SortIcon active={sortKey === "seat_code"} order={sortOrder} />
                </button>
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                Seat Type
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                Amenities
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                Bookable
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                Status
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                <button
                  onClick={() => handleSort("is_configured")}
                  className="flex items-center gap-1 hover:text-gray-800 transition-colors"
                >
                  Configuration
                  <SortIcon active={sortKey === "is_configured"} order={sortOrder} />
                </button>
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {pageSeats.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-16 text-center text-sm text-gray-400">
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

                    {/* Seat Type — null shows dash */}
                    <td className="px-4 py-3 text-gray-700 text-xs font-medium">
                      {seat.seat_type ?? <Dash />}
                    </td>

                    {/* Amenities */}
                    <td className="px-4 py-3">
                      {seat.amenity_ids.length === 0 ? (
                        <Dash />
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

                    {/* Bookable — null shows dash */}
                    <td className="px-4 py-3">
                      <BookablePill bookable={seat.is_bookable} />
                    </td>

                    {/* Status — null shows dash */}
                    <td className="px-4 py-3">
                      <StatusPill status={seat.status} />
                    </td>

                    <td className="px-4 py-3">
                      <ConfiguredPill configured={seat.is_configured} />
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
          {seats.length > 0 &&
            `Showing ${Math.min(start + 1, seats.length)}–${Math.min(start + pageSize, seats.length)} of ${seats.length} seats`}
        </p>

        {seats.length > 0 && (
          <div className="flex items-center gap-3">
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

            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-7 h-7 flex items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={13} />
              </button>

              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
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
        )}
      </div>
    </div>
  );
}
