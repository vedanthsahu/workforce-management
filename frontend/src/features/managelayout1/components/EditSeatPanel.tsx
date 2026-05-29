"use client";

import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Seat, SeatStatus, SeatType, SeatUpdatePayload } from "../types/seat.types";
import { Preference } from "../types/layout.types";

interface Props {
  seat: Seat | null;
  preferences: Preference[];
  onSave: (payload: SeatUpdatePayload) => Promise<unknown>;
  onClose: () => void;
}

// const SEAT_TYPES: SeatType[] = ["Workstation", "Meeting Room", "Cabin", "Phone Booth"];
// const SEAT_STATUSES: SeatStatus[] = ["ACTIVE", "INACTIVE"];
const SEAT_TYPES: SeatType[] = ["STANDARD" , "WINDOW" , "CABIN" ,"ACCESSIBLE", "HOT_DESK"];
const SEAT_STATUSES: SeatStatus[] = ["ACTIVE", "INACTIVE"];

export default function EditSeatPanel({ seat, preferences, onSave, onClose }: Props) {
  const [seatType,    setSeatType]    = useState<SeatType>("STANDARD");
  const [bookable,    setBookable]    = useState<boolean>(true);
  const [status,      setStatus]      = useState<SeatStatus>("ACTIVE");
  const [amenityIds,  setAmenityIds]  = useState<string[]>([]);
  const [notes,       setNotes]       = useState<string>("");
  const [saving,      setSaving]      = useState(false);
  const [saveError,   setSaveError]   = useState(false);
  const [saved,       setSaved]       = useState(false);

  useEffect(() => {
    if (!seat) return;
    setSeatType(seat.seat_type as SeatType);
    setBookable(seat.is_bookable);
    setStatus(seat.status);
    setAmenityIds([...seat.amenity_ids]);
    setNotes(seat.notes ?? "");
    setSaved(false);
    setSaveError(false);
  }, [seat]);

  const toggleAmenity = (id: string) => {
    setSaved(false);
    setAmenityIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    if (!seat) return;
    setSaving(true); setSaveError(false);
    try {
      await onSave({
        seat_svg_id: seat.seat_svg_id,
        layout_id: seat.layout_id,
        seat_type: seatType,
        is_bookable: bookable,
        status,
        amenity_ids: amenityIds,
        notes: notes || undefined,
      });
      setSaved(true);
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  };

  if (!seat) return null;

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200 w-[320px] flex-shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Edit Seat</p>
          <h3 className="text-base font-bold text-indigo-600">{seat.seat_code}</h3>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
        >
          <X size={15} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">

        {/* 1. Basic Information */}
        <section>
          <p className="text-xs font-semibold text-gray-700 mb-3">1. Basic Information</p>

          <div className="space-y-3">
            {/* Seat Type */}
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1 block">
                Seat Type <span className="text-red-500">*</span>
              </label>
              <select
                value={seatType}
                onChange={(e) => { setSeatType(e.target.value as SeatType); setSaved(false); }}
                className="w-full h-9 px-3 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-colors"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 10px center",
                }}
              >
                {SEAT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* Bookable */}
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1 block">
                Bookable <span className="text-red-500">*</span>
              </label>
              <select
                value={bookable ? "Yes" : "No"}
                onChange={(e) => { setBookable(e.target.value === "Yes"); setSaved(false); }}
                className="w-full h-9 px-3 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-colors"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 10px center",
                }}
              >
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1 block">
                Status <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={status}
                  onChange={(e) => { setStatus(e.target.value as SeatStatus); setSaved(false); }}
                  className="w-full h-9 pl-7 pr-3 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-colors"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 10px center",
                  }}
                >
                  {SEAT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <span className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full pointer-events-none ${
                  status === "ACTIVE" ? "bg-emerald-500" : "bg-gray-400"
                }`} />
              </div>
            </div>
          </div>
        </section>

        {/* 2. Amenities */}
        <section>
          <p className="text-xs font-semibold text-gray-700 mb-1">2. Amenities</p>
          <p className="text-[10px] text-gray-400 mb-3">Select amenities for this seat</p>
          {preferences.length === 0 ? (
            <p className="text-xs text-gray-400 italic">No amenities available.</p>
          ) : (
            <div className="space-y-1.5">
              {preferences.map((p) => {
                const on = amenityIds.includes(p.preference_id);
                return (
                  <label
                    key={p.preference_id}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                      on ? "bg-indigo-50 border-indigo-200" : "bg-white border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                      on ? "bg-indigo-600 border-indigo-600" : "border-gray-300"
                    }`}>
                      {on && (
                        <svg viewBox="0 0 8 7" className="w-2.5 h-2.5">
                          <path d="M1 3.5l2 2L7 1" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={on}
                      onChange={() => toggleAmenity(p.preference_id)}
                    />
                    <span className={`text-xs font-medium flex-1 ${on ? "text-indigo-700" : "text-gray-700"}`}>
                      {p.preference_name}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </section>

        {/* 3. Notes */}
        <section>
          <p className="text-xs font-semibold text-gray-700 mb-1">
            3. Notes <span className="text-gray-400 font-normal">(Optional)</span>
          </p>
          <textarea
            value={notes}
            onChange={(e) => { setNotes(e.target.value); setSaved(false); }}
            placeholder="Add any notes about this seat…"
            maxLength={200}
            rows={3}
            className="w-full px-3 py-2.5 text-xs text-gray-700 bg-white border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-colors placeholder:text-gray-400"
          />
          <p className="text-right text-[10px] text-gray-400 mt-0.5">{notes.length} / 200</p>
        </section>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-gray-100 bg-white flex items-center justify-between gap-3">
        <div className="text-xs">
          {saveError && <span className="text-red-500">Save failed. Try again.</span>}
          {saved && !saveError && <span className="text-emerald-600">Saved successfully.</span>}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium border border-gray-200 bg-white text-gray-600 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}