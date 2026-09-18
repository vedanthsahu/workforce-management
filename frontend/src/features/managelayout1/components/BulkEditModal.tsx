"use client";

import React, { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { BulkUpdatePayload, SeatStatus, SeatType } from "../types/seat.types";
import { Preference } from "../types/layout.types";
import { SPACE_TYPES, SPACE_TYPE_LABELS, amenityAppliesToSeatType } from "../utils/spaceCategory";
import AmenityChecklist from "./AmenityChecklist";

interface Props {
  open: boolean;
  onClose: () => void;
  selectedIds: string[];
  layoutId: string;
  preferences: Preference[];
  onSave: (payload: BulkUpdatePayload) => Promise<void>;
}

const SEAT_STATUSES: SeatStatus[] = ["ACTIVE", "INACTIVE"];

export default function BulkEditModal({
  open, onClose, selectedIds, layoutId, preferences, onSave,
}: Props) {
  const [seatType, setSeatType] = useState<string>("");
  const [bookable, setBookable] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [amenityIds, setAmenityIds] = useState<string[]>([]);
  const [capacity, setCapacity] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const isConferenceRoom = seatType === "CONFERENCE_ROOM";
  // Only filter once the admin picks a space type to bulk-set -- left blank,
  // the selected seats may be a mix of types, so no single type's amenity
  // list would be meaningful.
  const visiblePreferences = seatType
    ? preferences.filter((p) => amenityAppliesToSeatType(p.applicable_seat_types, seatType))
    : preferences;

  const reset = () => {
    setSeatType(""); setBookable(""); setStatus("");
    setAmenityIds([]); setCapacity("");
    setSaveError(false);
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSave = async () => {
    setSaving(true); setSaveError(false);
    try {
      const payload: BulkUpdatePayload = {
        seat_svg_ids: selectedIds,
        layout_id: layoutId,
      };
      if (seatType) payload.seat_type = seatType as SeatType;
      if (bookable) payload.is_bookable = bookable === "Yes";
      if (status) payload.status = status as SeatStatus;
      if (amenityIds.length) payload.amenity_ids = amenityIds;
      if (isConferenceRoom && capacity) payload.capacity = Number(capacity);
      await onSave(payload);
      handleClose();
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  };

  const toggleAmenity = (id: string) =>
    setAmenityIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const dropdownStyle = {
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat" as const,
    backgroundPosition: "right 10px center",
  };

  const selectClass = "w-full h-9 px-3 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-colors appearance-none";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-md rounded-xl p-0 overflow-hidden gap-0 [&>button:last-child]:hidden">
        <DialogHeader className="px-5 pt-5 pb-4 border-b">
          <p className="text-xs text-gray-400 mb-0.5 font-medium">Bulk Edit</p>
          <DialogTitle className="text-base font-bold text-gray-900">
            Edit {selectedIds.length} Space{selectedIds.length !== 1 ? "s" : ""}
          </DialogTitle>
        </DialogHeader>

        <div className="px-5 py-5 space-y-4 overflow-y-auto scrollbar-thin max-h-[60vh]">
          <p className="text-xs text-gray-500">
            Only filled fields will be applied. Leave blank to keep existing values.
          </p>

          {/* Space Type */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5 block">Space Type</label>
            <select
              value={seatType}
              onChange={(e) => {
                const next = e.target.value;
                setSeatType(next);
                setAmenityIds((prev) =>
                  prev.filter((id) => {
                    const pref = preferences.find((p) => p.preference_id === id);
                    return amenityAppliesToSeatType(pref?.applicable_seat_types, next);
                  })
                );
              }}
              className={selectClass}
              style={dropdownStyle}
            >
              <option value="" disabled hidden>Select space type</option>
              {SPACE_TYPES.map((t) => <option key={t} value={t}>{SPACE_TYPE_LABELS[t]}</option>)}
            </select>
          </div>

          {/* Capacity — only relevant when bulk-setting Space Type to Conference Room */}
          {isConferenceRoom && (
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5 block">Capacity</label>
              <input
                type="number"
                min={1}
                max={1000}
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                placeholder="e.g. 12"
                className={selectClass}
              />
            </div>
          )}

          {/* Bookable */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5 block">Bookable</label>
            <select value={bookable} onChange={(e) => setBookable(e.target.value)} className={selectClass} style={dropdownStyle}>

              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5 block">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectClass} style={dropdownStyle}>
              {SEAT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Amenities */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2 block">Amenities</label>
            <AmenityChecklist
              preferences={visiblePreferences}
              selectedIds={amenityIds}
              onToggle={toggleAmenity}
            />
          </div>
        </div>

        <div className="px-5 py-3 border-t flex items-center justify-between gap-3 bg-white">
          <div className="text-xs">
            {saveError && <span className="text-red-500">Save failed. Try again.</span>}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleClose} className="px-4 py-1.5 text-xs font-medium border border-gray-200 bg-white text-gray-600 rounded-md hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || (!seatType && !bookable && !status && !amenityIds.length)}
              className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving…" : "Apply Changes"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
