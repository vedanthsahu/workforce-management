"use client";

import { useState } from "react";
import { CalendarDays, Pencil, X } from "lucide-react";
import { securityService } from "../services/security.service";
import type { ModifyBookingPayload, Visitor } from "../types/security.types";

interface Props {
  visitor: Visitor | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function ModifyBookingModal({ visitor, onClose, onSuccess }: Props) {
  const [bookingDate, setBookingDate] = useState(visitor?.bookingDate ?? "");
  const [siteId, setSiteId] = useState("");
  const [buildingId, setBuildingId] = useState("");
  const [floorId, setFloorId] = useState("");
  const [seatId, setSeatId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!visitor) return null;

  const handleSubmit = async () => {
    if (!bookingDate) {
      setError("Booking date is required.");
      return;
    }

    const payload: ModifyBookingPayload = {
      booking_date: bookingDate,
    };

    if (siteId) payload.site_id = Number(siteId);
    if (buildingId) payload.building_id = Number(buildingId);
    if (floorId) payload.floor_id = Number(floorId);
    if (seatId) payload.seat_id = Number(seatId);

    try {
      setLoading(true);
      setError(null);
if (!visitor.bookingId) {
  setError("No booking ID found for this visit.");
  return;
}
await securityService.modifyBooking(visitor.bookingId, payload);
      onSuccess();
      onClose();
    } catch {
      setError("Failed to modify booking. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fieldClass =
    "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition";

  const labelClass = "text-xs font-semibold text-gray-600 block mb-1";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
              <Pencil className="w-3.5 h-3.5 text-indigo-600" />
            </div>
            <h2 className="text-base font-semibold text-gray-900">Modify Booking</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition text-gray-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-4">
          {/* Guest summary chip */}
          <div className="bg-indigo-50 rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700 shrink-0">
              {visitor.guestInitials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">{visitor.guestName}</p>
              <p className="text-xs text-gray-500 truncate">
                Current: {visitor.siteName} · {visitor.location}
              </p>
            </div>
          </div>

          {/* Booking Date */}
          <div>
            <label className={labelClass}>
              <span className="flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5" />
                Booking Date <span className="text-red-500">*</span>
              </span>
            </label>
            <input
              type="date"
              value={bookingDate}
              min={new Date().toISOString().split("T")[0]}
              onChange={(e) => {
                setBookingDate(e.target.value);
                setError(null);
              }}
              className={fieldClass}
            />
          </div>

          {/* Seat fields — optional */}
          <div className="border border-dashed border-gray-200 rounded-xl p-4 space-y-3">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
              Change Seat (optional)
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Site ID</label>
                <input
                  type="number"
                  value={siteId}
                  onChange={(e) => setSiteId(e.target.value)}
                  placeholder={visitor.siteId}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className={labelClass}>Building ID</label>
                <input
                  type="number"
                  value={buildingId}
                  onChange={(e) => setBuildingId(e.target.value)}
                  placeholder="—"
                  className={fieldClass}
                />
              </div>
              <div>
                <label className={labelClass}>Floor ID</label>
                <input
                  type="number"
                  value={floorId}
                  onChange={(e) => setFloorId(e.target.value)}
                  placeholder="—"
                  className={fieldClass}
                />
              </div>
              <div>
                <label className={labelClass}>Seat ID</label>
                <input
                  type="number"
                  value={seatId}
                  onChange={(e) => setSeatId(e.target.value)}
                  placeholder={visitor.seatCode ?? "—"}
                  className={fieldClass}
                />
              </div>
            </div>

            <p className="text-[11px] text-gray-400">
              Leave seat fields empty to keep the current seat assignment.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-xs">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t bg-gray-50 flex gap-2.5">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-100 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 py-2 rounded-lg bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-700 transition disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                Saving…
              </>
            ) : (
              "Save Changes"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}