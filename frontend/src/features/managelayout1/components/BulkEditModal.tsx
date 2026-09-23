"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { BulkUpdatePayload, Seat, SeatStatus } from "../types/seat.types";
import { Preference } from "../types/layout.types";
import {
  SPACE_TYPE_LABELS, amenityAppliesToSeatType,
  SpaceCategory, CATEGORY_TO_APPLICABLE_SEAT_TYPE, categoryOf,
} from "../utils/spaceCategory";
import { SEAT_STATUSES } from "../utils/seatOptions.utils";
import AmenityChecklist from "./AmenityChecklist";

interface Props {
  open: boolean;
  onClose: () => void;
  selectedIds: string[];
  seats: Seat[];
  layoutId: string;
  category: SpaceCategory;
  preferences: Preference[];
  onSave: (payloads: BulkUpdatePayload[]) => Promise<void>;
}

type GroupKey = "SEATS" | "CABINS" | "CONFERENCE_ROOMS";
const GROUP_KEYS: GroupKey[] = ["SEATS", "CABINS", "CONFERENCE_ROOMS"];
const GROUP_LABELS: Record<GroupKey, string> = {
  SEATS: "Seats",
  CABINS: "Cabins",
  CONFERENCE_ROOMS: "Conference Rooms",
};

interface TabFields {
  bookable: string;
  status: string;
  amenityIds: string[];
  capacity: string;
}
const emptyFields = (): TabFields => ({ bookable: "", status: "", amenityIds: [], capacity: "" });
const emptyFieldsByGroup = (): Record<GroupKey, TabFields> => ({
  SEATS: emptyFields(), CABINS: emptyFields(), CONFERENCE_ROOMS: emptyFields(),
});

export default function BulkEditModal({
  open, onClose, selectedIds, seats, layoutId, category, preferences, onSave,
}: Props) {
  // Single-type panel state -- used whenever `category` isn't "ALL", since
  // every selected row there already shares the tab's type (see isFixedType
  // below).
  const [bookable, setBookable] = useState("");
  const [status, setStatus] = useState("");
  const [amenityIds, setAmenityIds] = useState<string[]>([]);
  const [capacity, setCapacity] = useState("");

  // "All Spaces" tabbed state -- one independent field set per real type, so
  // configuring Cabins doesn't require touching Seats or Conference Rooms,
  // and each tab's changes only ever apply to that tab's own rows.
  const [fieldsByGroup, setFieldsByGroup] = useState<Record<GroupKey, TabFields>>(emptyFieldsByGroup());
  const [activeGroup, setActiveGroup] = useState<GroupKey>("SEATS");

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  // Opened from a specific tab (Seats/Cabins/Conference Rooms), every
  // selected row already shares that type -- Space Type is fixed and shown
  // read-only rather than offered as a dropdown/tab set. Only "All Spaces"
  // can mix types, so only there do the per-type tabs make sense.
  const isFixedType = category !== "ALL";
  const fixedSeatType = isFixedType ? CATEGORY_TO_APPLICABLE_SEAT_TYPE[category] : null;
  const isConferenceRoom = fixedSeatType === "CONFERENCE_ROOM";

  const visiblePreferences = isFixedType
    ? preferences.filter((p) => amenityAppliesToSeatType(p.applicable_seat_types, fixedSeatType))
    : preferences;

  // Group the current selection by each row's own already-configured type --
  // never inferred (categoryOf), so a mixed "All Spaces" selection splits
  // cleanly into up to 3 buckets, one per real space type.
  const groups = useMemo(() => {
    const byGroup: Record<GroupKey, Seat[]> = { SEATS: [], CABINS: [], CONFERENCE_ROOMS: [] };
    if (isFixedType) return byGroup;
    const selectedSet = new Set(selectedIds);
    for (const s of seats) {
      if (selectedSet.has(s.seat_svg_id)) byGroup[categoryOf(s.seat_type)].push(s);
    }
    return byGroup;
  }, [seats, selectedIds, isFixedType]);

  // Land on the first non-empty tab when the dialog opens -- a selection
  // that's all Cabins shouldn't default to an empty, disabled Seats tab.
  useEffect(() => {
    if (!open || isFixedType) return;
    const firstNonEmpty = GROUP_KEYS.find((g) => groups[g].length > 0);
    setActiveGroup(firstNonEmpty ?? "SEATS");
    // Only re-run when the dialog opens -- `groups` recomputing while the
    // admin is mid-edit on a tab shouldn't yank them back to a different one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const updateGroupField = <K extends keyof TabFields>(group: GroupKey, key: K, value: TabFields[K]) => {
    setFieldsByGroup((prev) => ({ ...prev, [group]: { ...prev[group], [key]: value } }));
  };

  const toggleGroupAmenity = (group: GroupKey, id: string) => {
    setFieldsByGroup((prev) => {
      const current = prev[group].amenityIds;
      const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
      return { ...prev, [group]: { ...prev[group], amenityIds: next } };
    });
  };

  const reset = () => {
    setBookable(""); setStatus(""); setAmenityIds([]); setCapacity("");
    setFieldsByGroup(emptyFieldsByGroup());
    setActiveGroup("SEATS");
    setSaveError(false);
  };

  const handleClose = () => { reset(); onClose(); };

  const fieldsFilled = (f: TabFields, group: GroupKey) =>
    !!f.bookable || !!f.status || f.amenityIds.length > 0 || (group === "CONFERENCE_ROOMS" && !!f.capacity);

  const buildGroupPayload = (group: GroupKey): BulkUpdatePayload | null => {
    const rows = groups[group];
    const f = fieldsByGroup[group];
    if (rows.length === 0 || !fieldsFilled(f, group)) return null;

    const payload: BulkUpdatePayload = {
      seat_svg_ids: rows.map((s) => s.seat_svg_id),
      layout_id: layoutId,
    };
    if (f.bookable) payload.is_bookable = f.bookable === "Yes";
    if (f.status) payload.status = f.status as SeatStatus;
    if (f.amenityIds.length) payload.amenity_ids = f.amenityIds;
    if (group === "CONFERENCE_ROOMS" && f.capacity) payload.capacity = Number(f.capacity);
    return payload;
  };

  const isFixedTypeFilled = !!bookable || !!status || amenityIds.length > 0 || (isConferenceRoom && !!capacity);
  const anyGroupFilled = GROUP_KEYS.some((g) => fieldsFilled(fieldsByGroup[g], g) && groups[g].length > 0);
  const nothingToApply = isFixedType ? !isFixedTypeFilled : !anyGroupFilled;

  const handleSave = async () => {
    setSaving(true); setSaveError(false);
    try {
      let payloads: BulkUpdatePayload[];

      if (isFixedType) {
        const payload: BulkUpdatePayload = { seat_svg_ids: selectedIds, layout_id: layoutId };
        if (bookable) payload.is_bookable = bookable === "Yes";
        if (status) payload.status = status as SeatStatus;
        if (amenityIds.length) payload.amenity_ids = amenityIds;
        if (isConferenceRoom && capacity) payload.capacity = Number(capacity);
        payloads = [payload];
      } else {
        payloads = GROUP_KEYS
          .map(buildGroupPayload)
          .filter((p): p is BulkUpdatePayload => p !== null);
      }

      if (!payloads.length) return;

      await onSave(payloads);
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

  const selectClass = "w-full h-9 px-3 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors appearance-none";

  const renderFieldSet = (
    fields: { bookable: string; status: string; amenityIds: string[]; capacity: string },
    prefs: Preference[],
    showCapacity: boolean,
    onBookableChange: (v: string) => void,
    onStatusChange: (v: string) => void,
    onCapacityChange: (v: string) => void,
    onAmenityToggle: (id: string) => void,
  ) => (
    <>
      {showCapacity && (
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5 block">Capacity</label>
          <input
            type="number"
            min={1}
            max={1000}
            value={fields.capacity}
            onChange={(e) => onCapacityChange(e.target.value)}
            placeholder="e.g. 12"
            className={selectClass}
          />
        </div>
      )}

      <div>
        <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5 block">Bookable</label>
        <select value={fields.bookable} onChange={(e) => onBookableChange(e.target.value)} className={selectClass} style={dropdownStyle}>
          <option value="Yes">Yes</option>
          <option value="No">No</option>
        </select>
      </div>

      <div>
        <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5 block">Status</label>
        <select value={fields.status} onChange={(e) => onStatusChange(e.target.value)} className={selectClass} style={dropdownStyle}>
          {SEAT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div>
        <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2 block">Amenities</label>
        <AmenityChecklist
          preferences={prefs}
          selectedIds={fields.amenityIds}
          onToggle={onAmenityToggle}
        />
      </div>
    </>
  );

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

          {isFixedType ? (
            <>
              {/* Space Type -- fixed, shown for context only */}
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5 block">Space Type</label>
                <div className="w-full h-9 px-3 flex items-center text-xs font-medium text-gray-500 bg-gray-100 border border-gray-200 rounded-lg cursor-not-allowed">
                  {SPACE_TYPE_LABELS[fixedSeatType as string]}
                </div>
              </div>

              {renderFieldSet(
                { bookable, status, amenityIds, capacity },
                visiblePreferences,
                isConferenceRoom,
                setBookable,
                setStatus,
                setCapacity,
                toggleAmenity,
              )}
            </>
          ) : (
            <>
              {/* Space Type tabs -- one per real type, each configured (or
                  left untouched) independently. Empty tabs are disabled
                  rather than hidden, so the counts stay visible. */}
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5 block">Space Type</label>
                <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
                  {GROUP_KEYS.map((g) => {
                    const count = groups[g].length;
                    const active = activeGroup === g;
                    const changed = fieldsFilled(fieldsByGroup[g], g);
                    return (
                      <button
                        key={g}
                        type="button"
                        disabled={count === 0}
                        onClick={() => setActiveGroup(g)}
                        className={`flex-1 flex items-center justify-center gap-1 h-8 px-2 rounded-md text-[11px] font-semibold transition-colors ${
                          count === 0
                            ? "text-gray-300 cursor-not-allowed"
                            : active
                              ? "bg-white text-indigo-600 shadow-sm"
                              : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        {GROUP_LABELS[g]}
                        <span className={`inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full text-[9px] ${
                          active ? "bg-indigo-100 text-indigo-600" : "bg-gray-200 text-gray-500"
                        }`}>
                          {count}
                        </span>
                        {changed && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {groups[activeGroup].length === 0 ? (
                <p className="text-xs text-gray-400 italic">
                  No {GROUP_LABELS[activeGroup].toLowerCase()} in this selection.
                </p>
              ) : (
                renderFieldSet(
                  fieldsByGroup[activeGroup],
                  preferences.filter((p) => amenityAppliesToSeatType(p.applicable_seat_types, CATEGORY_TO_APPLICABLE_SEAT_TYPE[activeGroup])),
                  activeGroup === "CONFERENCE_ROOMS",
                  (v) => updateGroupField(activeGroup, "bookable", v),
                  (v) => updateGroupField(activeGroup, "status", v),
                  (v) => updateGroupField(activeGroup, "capacity", v),
                  (id) => toggleGroupAmenity(activeGroup, id),
                )
              )}
            </>
          )}
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
              disabled={saving || nothingToApply}
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
