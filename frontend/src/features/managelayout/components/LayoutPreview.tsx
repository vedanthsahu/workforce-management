"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Maximize2, ZoomIn, ZoomOut, Layers } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Layout } from "../types/layout.types";
import {
  Preference, Seat, SeatStatus, SeatType, SeatUpdatePayload,
  ALL_SPACE_TYPES, SPACE_TYPE_LABELS, categoryOf, suggestSeatType,
} from "@/features/managelayout1";
import { getAmenityColor } from "@/features/amenities/utils/amenityColors";
import { extractSeatIds } from "@/lib/svg/extractSeatIds";
import {
  SVG_W,
  SVG_H,
  ROOM_SVG_ID_PATTERN,
  SEAT_STATUSES,
  LEGEND_ITEMS,
} from "../utils/layoutPreview.utils";

interface LayoutPreviewProps {
  layout: Layout | null;
  fillHeight?: boolean;
  canvasHeight?: number;
  seats?: Seat[];
  preferences?: Preference[];
  onSeatSave?: (payload: SeatUpdatePayload) => Promise<unknown>;
  filteredSeats?: Seat[];
  // Explicit "a filter is actually applied" signal from the caller — must be
  // derived from the filter inputs, not inferred here by comparing
  // filteredSeats.length to seats.length. That comparison can land on equal
  // counts even when a real filter is active, which used to make the map
  // silently skip the yellow highlight for genuine matches.
  isFilterActive?: boolean;
}

// ─── SVG Helpers ──────────────────────────────────────────────────────────────

function resolveUrl(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (typeof window !== "undefined") return `${window.location.origin}${url}`;
  return url;
}

// Reads the uploaded layout's actual canvas size from its own <svg viewBox>
// (falling back to width/height attributes, then to the SVG_W/SVG_H default)
// instead of assuming every floor plan was authored at exactly 2466x2039 —
// a layout drawn at a different size would otherwise fit-to-view incorrectly
// (undersized scale, content bleeding past the right/bottom edge).
function parseSvgDimensions(svgText: string): { w: number; h: number } {
  const svgTag = svgText.match(/<svg\b[^>]*>/)?.[0] ?? "";

  const viewBox = svgTag.match(
    /viewBox=["']\s*[\d.+-]+\s+[\d.+-]+\s+([\d.]+)\s+([\d.]+)\s*["']/
  );
  if (viewBox) {
    const w = parseFloat(viewBox[1]);
    const h = parseFloat(viewBox[2]);
    if (w > 0 && h > 0) return { w, h };
  }

  const width = svgTag.match(/\swidth=["']([\d.]+)(?:px)?["']/);
  const height = svgTag.match(/\sheight=["']([\d.]+)(?:px)?["']/);
  if (width && height) {
    const w = parseFloat(width[1]);
    const h = parseFloat(height[1]);
    if (w > 0 && h > 0) return { w, h };
  }

  return { w: SVG_W, h: SVG_H };
}

function getSeatIdFromClick(target: EventTarget | null, knownIds: Set<string>): string | null {
  let el = target as Element | null;
  while (el) {
    if (el.tagName?.toLowerCase() === "svg") return null;
    const id = el.getAttribute?.("id");
    if (id && knownIds.has(id)) return id;
    el = el.parentElement;
  }
  return null;
}

// ─── Seat color resolution ────────────────────────────────────────────────────
//
// Unconfigured seats (desk or room) keep the floor plan's original artwork
// colors — they only start recoloring once an admin has actually configured
// them. For a configured desk:
//   INACTIVE (regardless of bookable) → Red   (#EF4444)
//   ACTIVE + is_bookable = false      → Amber (#F59E0B)
//   ACTIVE + is_bookable = true       → Green (#22C55E)

function resolveSeatFill(seat: Seat): string {
  if (seat.status === "INACTIVE") return "#EF4444"; // Inactive     — red
  if (!seat.is_bookable) return "#F59E0B"; // Non-bookable — amber
  return "#22C55E";                                 // Bookable     — green
}

function isRoomSvgId(svgId: string): boolean {
  return ROOM_SVG_ID_PATTERN.test(svgId);
}

// Escapes regex metacharacters so seat ids containing them (e.g. "F9.1",
// "Group (2)") can be safely interpolated into a RegExp instead of being
// misinterpreted as pattern syntax.
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function recolorGroup(svgText: string, id: string, fill: string): string {
  // "g" flag: some exported floor plans reuse the same <g id="..."> more than
  // once (e.g. a duplicated furniture block that wasn't re-keyed). Without
  // it, String.replace only recolors the first occurrence, leaving whichever
  // copy actually renders on screen untouched.
  const groupRegex = new RegExp(`(<g[^>]*id="${escapeRegExp(id)}"[^>]*>)([\\s\\S]*?)(<\\/g>)`, "gm");
  return svgText.replace(groupRegex, (_match, open, inner, close) => {
    // fill="none" (and fill:none) are deliberately transparent — outlines,
    // cutouts, gaps between an icon's parts. Overwriting those too flattens
    // the whole group into one solid-color block, erasing the icon's shape
    // instead of just recoloring its visible parts.
    const colored = inner
      .replace(/fill="(?!none")[^"]*"/g, `fill="${fill}"`)
      .replace(/fill:(?!none)[^;"}\s]*/g, `fill:${fill}`);
    return `${open}${colored}${close}`;
  });
}

// Paints a solid black stroke directly on every shape inside a seat's <g>,
// mirroring the booking-side floor map's seat border (see recolorSeat's
// fallback branch in features/book/components/SvgFloorMapPage.tsx). Seats sit
// flush against their neighbors with zero gap, so an outer glow (CSS
// filter/drop-shadow) gets painted over on the touching side by whichever
// neighbor is drawn later in the SVG's document order — it only ever shows on
// edges facing open space. A `stroke` painted directly on each shape is part
// of the same paint step as its fill, so it can't be erased by a later
// sibling, giving a complete border on every side including shared edges.
function addFlatBorder(svgText: string, id: string, color = "#000000", width = "32"): string {
  const groupRegex = new RegExp(`(<g[^>]*id="${escapeRegExp(id)}"[^>]*>)([\\s\\S]*?)(<\\/g>)`, "gm");
  return svgText.replace(groupRegex, (_match, open, inner, close) => {
    // `stroke` and `stroke-width` are added independently: many real exports
    // set stroke="none" with no stroke-width at all, so "already has a
    // stroke attribute" isn't a reliable signal that a usable width exists
    // too — checking each attribute separately guarantees every shape ends
    // up with both, instead of some shapes getting recolored to black but
    // keeping the default 1-unit width (invisible against a canvas tens of
    // thousands of units wide).
    const bordered = inner
      .replace(/<(path|rect|polygon|circle|ellipse)\b(?![^>]*\sstroke=)/g, `<$1 stroke="${color}"`)
      .replace(/<(path|rect|polygon|circle|ellipse)\b(?![^>]*\sstroke-width=)/g, `<$1 stroke-width="${width}"`)
      .replace(/stroke="[^"]*"/g, `stroke="${color}"`)
      .replace(/stroke-width="[^"]*"/g, `stroke-width="${width}"`);
    return `${open}${bordered}${close}`;
  });
}

// Outlines a search/filter-matched seat by painting a solid stroke directly
// on every shape inside its <g> — the same per-shape technique addFlatBorder
// uses for the base status border, not a CSS `filter: drop-shadow`. A
// drop-shadow's offset is resolved in this SVG's own coordinate units, and a
// fixed "1px" offset is a rounding error against a canvas this size (see
// addFlatBorder's comment on the same issue) — it never actually rendered
// visibly. A `stroke` avoids that scaling problem entirely, and being wider
// than addFlatBorder's own 32-unit base border (which every configured seat
// already has, in black) makes this highlight visibly override it instead
// of being swallowed underneath.
function addSeatBorder(svgText: string, id: string, color = "#FACC15", width = "60"): string {
  const groupRegex = new RegExp(`(<g[^>]*id="${escapeRegExp(id)}"[^>]*>)([\\s\\S]*?)(<\\/g>)`, "gm");
  return svgText.replace(groupRegex, (_match, open, inner, close) => {
    const bordered = inner
      .replace(/<(path|rect|polygon|circle|ellipse)\b(?![^>]*\sstroke=)/g, `<$1 stroke="${color}"`)
      .replace(/<(path|rect|polygon|circle|ellipse)\b(?![^>]*\sstroke-width=)/g, `<$1 stroke-width="${width}"`)
      .replace(/stroke="[^"]*"/g, `stroke="${color}"`)
      .replace(/stroke-width="[^"]*"/g, `stroke-width="${width}"`);
    return `${open}${bordered}${close}`;
  });
}

// Dims and desaturates a room's <g> (cabin/conference/meeting/training) in
// place, without touching its inner artwork — the CSS filter/opacity on the
// outer group cascades to every nested shape regardless of how deeply the
// room's furniture/table icons are grouped, so this only needs to add a
// style attribute to the opening tag, unlike recolorGroup's per-shape fill
// rewrite. Matches the grey/desaturated treatment already used for
// booked/unavailable rooms on the booking-side floor map.
function greyOutRoom(svgText: string, id: string): string {
  const openTagRegex = new RegExp(`<g\\b[^>]*\\sid="${escapeRegExp(id)}"[^>]*>`);
  const match = svgText.match(openTagRegex);
  if (!match || match.index === undefined) return svgText;
  const openTag = match[0];
  const overlay = "opacity:0.45;filter:grayscale(1) saturate(0.5);";
  const newTag = /\sstyle="/.test(openTag)
    ? openTag.replace(/\sstyle="([^"]*)"/, (_m, existing) =>
        ` style="${existing}${existing && !existing.trim().endsWith(";") ? ";" : ""}${overlay}"`
      )
    : openTag.replace(/>$/, ` style="${overlay}">`);
  return svgText.slice(0, match.index) + newTag + svgText.slice(match.index + openTag.length);
}

function colorSeats(svgText: string, seats: Seat[], filteredIds: Set<string> | undefined, isFilterActive: boolean): string {
  let result = svgText;
  const hasFilter = isFilterActive && filteredIds !== undefined;
  const highlightedIds: string[] = [];

  seats.forEach((seat) => {
    const id = seat.seat_svg_id;

    // Cabins/conference/meeting/training rooms keep the floor plan's
    // original artwork colors — no status/bookable flood-fill, no filter
    // highlight — with one exception: an INACTIVE room gets a grey,
    // desaturated overlay so it still reads as unavailable, same as any
    // other seat's INACTIVE state does.
    if (isRoomSvgId(id)) {
      if (seat.is_configured && seat.status === "INACTIVE") {
        result = greyOutRoom(result, id);
      }
      return;
    }

    if (hasFilter && filteredIds!.has(id)) highlightedIds.push(id);

    // Edited locally on an already-published layout but not yet published —
    // flag it distinctly so the admin can see at a glance what will change.
    if (seat.has_unpublished_changes) {
      result = recolorGroup(result, id, "#FB923C"); // Pending — orange
      result = addFlatBorder(result, id);
      return;
    }

    // Unconfigured — leave the floor plan's original artwork colors until an
    // admin actually configures it.
    if (!seat.is_configured) return;

    result = recolorGroup(result, id, resolveSeatFill(seat));
    result = addFlatBorder(result, id);
  });

  // Applied last, after every fill/border above, so a search/filter match
  // overrides whatever status color and (black) border the seat already
  // got — a solid yellow fill plus a matching border reads as "this seat,
  // completely," not just a thin outline traced on top of its old color.
  highlightedIds.forEach((id) => {
    result = recolorGroup(result, id, "#FACC15");
    result = addSeatBorder(result, id, "#EAB308");
  });

  return result;
}

function addPointerCursors(svgText: string, ids: string[]): string {
  let result = svgText;
  ids.forEach((id) => {
    result = result.replace(`<g id="${id}">`, `<g id="${id}" style="cursor:pointer">`);
  });
  return result;
}

function highlightSeat(svgText: string, svgId: string): string {
  const openTag = `<g id="${svgId}">`;
  const start = svgText.indexOf(openTag);
  if (start === -1) return svgText;
  return (
    svgText.slice(0, start) +
    `<g id="${svgId}" style="cursor:pointer;filter:drop-shadow(0 0 6px rgba(99,102,241,0.8))">` +
    svgText.slice(start + openTag.length)
  );
}

// ─── Seat Config Dialog ───────────────────────────────────────────────────────

interface SeatConfigDialogProps {
  open: boolean;
  onClose: () => void;
  seat: Seat | null;
  preferences: Preference[];
  onSave: (payload: SeatUpdatePayload) => Promise<unknown>;
}

const SeatConfigDialog: React.FC<SeatConfigDialogProps> = ({ open, onClose, seat, preferences, onSave }) => {
  const [seatType, setSeatType] = useState<SeatType>("STANDARD");
  const [bookable, setBookable] = useState(true);
  const [status, setStatus] = useState<SeatStatus>("ACTIVE");
  const [amenityIds, setAmenityIds] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [capacity, setCapacity] = useState<number | null>(null);
  const [wasSuggested, setWasSuggested] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [saved, setSaved] = useState(false);

  const isConferenceRoom = seatType === "CONFERENCE_ROOM";
  const capacityInvalid = isConferenceRoom && (capacity == null || capacity < 1);

  useEffect(() => {
    if (!seat) return;
    const suggested = !seat.seat_type;
    setSeatType((seat.seat_type as SeatType) ?? (suggestSeatType(seat.seat_svg_id) as SeatType));
    setWasSuggested(suggested);
    setBookable(seat.is_bookable ?? true);
    setStatus((seat.status as SeatStatus) ?? "ACTIVE");
    setAmenityIds([...seat.amenity_ids]);
    setNotes(seat.notes ?? "");
    setCapacity(seat.capacity ?? null);
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
    if (capacityInvalid) { setSaved(false); return; }
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
        capacity: isConferenceRoom ? capacity : null,
      });
      setSaved(true);
      setTimeout(() => onClose(), 800);
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  };

  if (!seat) return null;

  const selectCls = `w-full h-9 px-3 text-xs font-medium text-gray-700 bg-white border border-gray-200
    rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500
    transition-colors`;
  const chevron = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12'
    viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpolyline
    points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md rounded-xl p-0 overflow-hidden gap-0 [&>button:last-child]:hidden">
        <DialogHeader className="px-5 pt-5 pb-4 border-b">
          <p className="text-xs text-gray-400 mb-0.5 font-medium">
            Configure {categoryOf(seat.seat_type) === "SEATS" ? "Seat" : categoryOf(seat.seat_type) === "CABINS" ? "Cabin" : "Conference Room"}
          </p>
          <DialogTitle className="text-base font-bold text-indigo-600">
            {seat.seat_code}
          </DialogTitle>
        </DialogHeader>

        <div className="px-5 py-5 space-y-4 overflow-y-auto max-h-[60vh]">
          {/* Space Type */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5 block">
              Space Type <span className="text-red-500">*</span>
            </label>
            <select
              value={seatType}
              onChange={(e) => { setSeatType(e.target.value as SeatType); setWasSuggested(false); setSaved(false); }}
              className={selectCls}
              style={{ backgroundImage: chevron, backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center" }}
            >
              {ALL_SPACE_TYPES.map((t) => (
                <option key={t} value={t}>{SPACE_TYPE_LABELS[t]}</option>
              ))}
            </select>
            {wasSuggested && (
              <p className="text-[10.5px] text-indigo-500 mt-1">
                Suggested from the floor-plan ID ({seat.seat_svg_id}) — confirm or change it.
              </p>
            )}
          </div>

          {/* Capacity — Conference Rooms only */}
          {isConferenceRoom && (
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5 block">
                Capacity <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min={1}
                max={1000}
                value={capacity ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setCapacity(v === "" ? null : Number(v));
                  setSaved(false);
                }}
                placeholder="e.g. 12"
                className={`${selectCls} ${capacityInvalid ? "border-red-300 focus:border-red-400" : ""}`}
              />
              <p className="text-[10.5px] text-gray-400 mt-1">Number of people this room seats.</p>
              {capacityInvalid && (
                <p className="text-[10.5px] text-red-500 mt-1">Capacity is required for a conference room.</p>
              )}
            </div>
          )}

          {/* Bookable */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5 block">
              Bookable <span className="text-red-500">*</span>
            </label>
            <select
              value={bookable ? "Yes" : "No"}
              onChange={(e) => { setBookable(e.target.value === "Yes"); setSaved(false); }}
              className={selectCls}
              style={{ backgroundImage: chevron, backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center" }}
            >
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5 block">
              Status <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={status}
                onChange={(e) => { setStatus(e.target.value as SeatStatus); setSaved(false); }}
                className={`${selectCls} pl-7`}
                style={{ backgroundImage: chevron, backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center" }}
              >
                {SEAT_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <span className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full pointer-events-none ${status === "ACTIVE" ? "bg-emerald-500" : "bg-gray-400"
                }`} />
            </div>
          </div>

          {/* Amenities */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2 block">
              Amenities
            </label>
            {preferences.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No amenities available.</p>
            ) : (
              <div className="grid grid-cols-2 gap-1.5">
                {preferences.map((p) => {
                  const on = amenityIds.includes(p.preference_id);
                  const color = getAmenityColor(p.preference_name, p.preference_type);
                  return (
                    <button
                      key={p.preference_id}
                      onClick={() => toggleAmenity(p.preference_id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-left text-xs font-medium transition-colors ${on ? "bg-indigo-50 border-indigo-300 text-indigo-700" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                        }`}
                    >
                      <div className={`w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center ${on ? "bg-indigo-600 border-indigo-600" : "border-gray-300"
                        }`}>
                        {on && (
                          <svg viewBox="0 0 8 7" className="w-2.5 h-2.5">
                            <path d="M1 3.5l2 2L7 1" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${color.dot}`} />
                      {p.preference_name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5 block">
              Notes <span className="text-gray-400 font-normal">(Optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => { setNotes(e.target.value); setSaved(false); }}
              placeholder="Add any notes about this seat…"
              maxLength={200}
              rows={3}
              className="w-full px-3 py-2.5 text-xs text-gray-700 bg-white border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors placeholder:text-gray-400"
            />
            <p className="text-right text-[10px] text-gray-400 mt-0.5">{notes.length} / 200</p>
          </div>
        </div>

        <div className="px-5 py-3 border-t flex items-center justify-between gap-3 bg-white">
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
              disabled={saving || capacityInvalid}
              className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ─── Legend ───────────────────────────────────────────────────────────────────

// FIX: flex-wrap + gap-y so items wrap on narrow screens instead of overflowing
function PreviewLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {LEGEND_ITEMS.map(({ label, color }) => (
        <span key={label} className="flex items-center gap-1.5 text-xs text-gray-500 whitespace-nowrap">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
          {label}
        </span>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function LayoutPreview({
  layout,
  fillHeight = false,
  canvasHeight,
  seats = [],
  preferences = [],
  onSeatSave,
  filteredSeats,
  isFilterActive = false,
}: LayoutPreviewProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const transformRef = useRef<HTMLDivElement>(null);

  // ── pan / zoom state (all refs to avoid re-renders) ────────────────────
  const scaleRef = useRef(1);
  const translateRef = useRef({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const mouseDownPos = useRef({ x: 0, y: 0 });
  const didDrag = useRef(false);

  // FIX: touch support refs
  const pinchStartRef = useRef<number | null>(null);

  const [rawSvg, setRawSvg] = useState<string | null>(null);
  const [svgError, setSvgError] = useState(false);
  const [zoomDisplay, setZoomDisplay] = useState(100);
  const [mapReady, setMapReady] = useState(false);
  const [loading, setLoading] = useState(false);

  // Actual canvas size of the loaded SVG — read from its own markup, not
  // assumed to always match the SVG_W/SVG_H default.
  const [svgDims, setSvgDims] = useState<{ w: number; h: number }>({ w: SVG_W, h: SVG_H });

  const seatIdsRef = useRef<Set<string>>(new Set());

  const [dialogOpen, setDialogOpen] = useState(false);
  const [clickedSeat, setClickedSeat] = useState<Seat | null>(null);

  // ── Hover tooltip (only in configure mode) ────────────────────────────
  const [tooltip, setTooltip] = useState<{ seat: Seat; x: number; y: number } | null>(null);
  const lastHoveredIdRef = useRef<string | null>(null);

  // ── Load SVG ───────────────────────────────────────────────────────────
  useEffect(() => {
    const rawUrl = layout?.layout_file_url;
    if (!rawUrl) { setRawSvg(null); setSvgError(false); setMapReady(false); return; }
    const url = resolveUrl(rawUrl);
    setLoading(true); setRawSvg(null); setSvgError(false); setMapReady(false);
    setSvgDims({ w: SVG_W, h: SVG_H });
    fetch(url)
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.text(); })
      .then((text) => {
        setSvgDims(parseSvgDimensions(text));
        const fluid = text
          .replace(/\bwidth="[^"]*"/, 'width="100%"')
          .replace(/\bheight="[^"]*"/, 'height="100%"');
        const ids = extractSeatIds(fluid, "LayoutPreview");
        seatIdsRef.current = new Set(ids);
        setRawSvg(onSeatSave ? addPointerCursors(fluid, ids) : fluid);
      })
      .catch(() => setSvgError(true))
      .finally(() => setLoading(false));
    // onSeatSave is intentionally excluded: it's the `saveSeat` callback from
    // useManageSeats, whose identity changes whenever the seats array
    // updates (e.g. right after a successful save). Adding it here would
    // re-fetch the SVG from the network and reset the map state every time
    // a seat is saved. This effect should only reload when the SVG's own
    // URL changes; onSeatSave is only used below to pick between two
    // transforms of the already-fetched text, not to decide whether to fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout?.layout_file_url]);

  // ── Compute colored SVG ────────────────────────────────────────────────
  const filteredIds = useMemo(
    () => filteredSeats ? new Set(filteredSeats.map((s) => s.seat_svg_id)) : undefined,
    [filteredSeats]
  );

  const coloredSvg = useMemo(() => {
    if (!rawSvg || seats.length === 0) return rawSvg;
    return colorSeats(rawSvg, seats, filteredIds, isFilterActive);
  }, [rawSvg, seats, filteredIds, isFilterActive]);

  const displaySvg = useMemo(() => {
    if (!coloredSvg || !clickedSeat || !dialogOpen) return coloredSvg;
    return highlightSeat(coloredSvg, clickedSeat.seat_svg_id);
  }, [coloredSvg, clickedSeat, dialogOpen]);

  // ── Transform helpers ──────────────────────────────────────────────────
  // `animate` adds a short CSS transition for discrete, user-initiated steps
  // (zoom buttons) so they ease instead of jump-cutting. Continuous
  // interactions (wheel zoom, drag-pan) stay untransitioned — animating
  // those would make them lag behind the cursor. Both zoom directions use
  // the same short transition (120ms) rather than one direction being
  // instant — an asymmetric instant/eased split reads as a glitchy jump,
  // and 120ms keeps the number of repainted frames low on this floor plan's
  // oversized canvas without the visual inconsistency.
  const applyTransform = useCallback((animate = false) => {
    const el = transformRef.current;
    if (!el) return;
    el.style.transition = animate ? "transform 120ms ease-out" : "none";
    el.style.transform = `translate(${translateRef.current.x}px,${translateRef.current.y}px) scale(${scaleRef.current})`;
  }, []);

  const fitView = useCallback(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const { width: wW, height: wH } = wrapper.getBoundingClientRect();
    if (wW === 0 || wH === 0) return;
    const scale = Math.min(wW / svgDims.w, wH / svgDims.h);
    scaleRef.current = scale;
    translateRef.current = { x: (wW - svgDims.w * scale) / 2, y: (wH - svgDims.h * scale) / 2 };
    applyTransform();
    setZoomDisplay(Math.round(scale * 100));
  }, [applyTransform, svgDims]);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper || !rawSvg) return;
    const observer = new ResizeObserver(() => fitView());
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, [rawSvg, fitView]);

  useEffect(() => {
    if (!rawSvg || loading) { setMapReady(false); return; }
    const id = requestAnimationFrame(() => { fitView(); setMapReady(true); });
    return () => cancelAnimationFrame(id);
  }, [rawSvg, loading, fitView]);

  // ── Zoom ───────────────────────────────────────────────────────────────
  // The zoom-out floor is the "fit to view" scale for whatever SVG is
  // currently loaded, not a fixed constant — a fixed floor either blocks
  // reaching fit-to-view on an oversized canvas (too high) or, on a normal-
  // sized floor plan, lets you zoom out past fit-to-view into a tiny shape
  // surrounded by empty gray space (too low). Clamping to the fit scale
  // means "fully zoomed out" always means the original fitted framing.
  const zoomStep = useCallback((factor: number) => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const { width: wW, height: wH } = wrapper.getBoundingClientRect();
    const zoomFloor = Math.min(wW / svgDims.w, wH / svgDims.h);
    const oldScale = scaleRef.current;
    const newScale = Math.min(Math.max(oldScale * factor, zoomFloor), 4);
    const cx = wW / 2, cy = wH / 2;
    translateRef.current = {
      x: cx - (cx - translateRef.current.x) * (newScale / oldScale),
      y: cy - (cy - translateRef.current.y) * (newScale / oldScale),
    };
    scaleRef.current = newScale;
    applyTransform(true);
    setZoomDisplay(Math.round(newScale * 100));
  }, [applyTransform, svgDims]);

  const zoomIn = useCallback(() => zoomStep(1.25), [zoomStep]);
  const zoomOut = useCallback(() => zoomStep(1 / 1.25), [zoomStep]);

  // ── Wheel zoom ─────────────────────────────────────────────────────────
  // A trackpad or a fast mouse wheel can fire many "wheel" events within a
  // single animation frame. Doing a full transform + React state update per
  // event does redundant work the browser can't even paint in time, which
  // reads as stutter — especially on this floor plan's oversized SVG canvas,
  // which is already expensive to re-rasterize on any scale change. Instead,
  // accumulate the zoom factor from every event that arrives before the
  // next frame and apply it once, right before paint.
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    let rafId: number | null = null;
    let pending: { factor: number; clientX: number; clientY: number } | null = null;

    const flush = () => {
      rafId = null;
      if (!pending) return;
      const { factor, clientX, clientY } = pending;
      pending = null;
      const oldScale = scaleRef.current;
      const rect = el.getBoundingClientRect();
      // Same fit-scale floor as zoomStep — see the comment there.
      const zoomFloor = Math.min(rect.width / svgDims.w, rect.height / svgDims.h);
      const newScale = Math.min(Math.max(oldScale * factor, zoomFloor), 4);
      translateRef.current = {
        x: clientX - rect.left - (clientX - rect.left - translateRef.current.x) * (newScale / oldScale),
        y: clientY - rect.top - (clientY - rect.top - translateRef.current.y) * (newScale / oldScale),
      };
      scaleRef.current = newScale;
      applyTransform();
      setZoomDisplay(Math.round(newScale * 100));
    };

    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      pending = {
        factor: (pending?.factor ?? 1) * factor,
        clientX: e.clientX,
        clientY: e.clientY,
      };
      if (rafId === null) rafId = requestAnimationFrame(flush);
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => {
      el.removeEventListener("wheel", handler);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [applyTransform, svgDims]);

  // ── Mouse pan handlers ─────────────────────────────────────────────────
  const onMouseDown = (e: React.MouseEvent) => {
    isPanning.current = true; didDrag.current = false;
    mouseDownPos.current = { x: e.clientX, y: e.clientY };
    panStart.current = { ...translateRef.current };
    (e.currentTarget as HTMLElement).style.cursor = "grabbing";
  };

  const onMouseMove = (e: React.MouseEvent) => {
    // Hover tooltip (only in configure mode, not while dragging)
    if (onSeatSave && !didDrag.current) {
      const svgId = getSeatIdFromClick(e.target, seatIdsRef.current);
      if (svgId !== lastHoveredIdRef.current) {
        lastHoveredIdRef.current = svgId;
        if (svgId) {
          const hovered = seats.find((s) => s.seat_svg_id === svgId) ?? null;
          if (hovered) {
            const rect = wrapperRef.current?.getBoundingClientRect();
            if (rect) {
              const relX = e.clientX - rect.left;
              const relY = e.clientY - rect.top;
              // Flip above cursor when within 170px of the bottom to avoid clipping
              const nearBottom = relY > rect.height - 170;
              const nearRight = relX > rect.width - 170;
              setTooltip({
                seat: hovered,
                x: nearRight ? relX - 160 : relX + 14,
                y: nearBottom ? relY - 155 : relY - 10,
              });
            }
          } else {
            setTooltip(null);
          }
        } else {
          setTooltip(null);
        }
      }
    }

    // Pan logic
    if (!isPanning.current) return;
    const dx = e.clientX - mouseDownPos.current.x;
    const dy = e.clientY - mouseDownPos.current.y;
    if (!didDrag.current && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) didDrag.current = true;
    if (didDrag.current) {
      translateRef.current = { x: panStart.current.x + dx, y: panStart.current.y + dy };
      applyTransform();
    }
  };

  const onMouseUp = (e: React.MouseEvent) => {
    isPanning.current = false;
    (e.currentTarget as HTMLElement).style.cursor = "grab";
    if (didDrag.current) { setTooltip(null); lastHoveredIdRef.current = null; }
  };

  const onMouseLeave = () => {
    isPanning.current = false;
    if (wrapperRef.current) wrapperRef.current.style.cursor = "grab";
    setTooltip(null);
    lastHoveredIdRef.current = null;
  };

  // ── FIX: Touch pan + pinch-to-zoom handlers ────────────────────────────
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      // Single finger → pan
      isPanning.current = true;
      didDrag.current = false;
      const t = e.touches[0];
      mouseDownPos.current = { x: t.clientX, y: t.clientY };
      panStart.current = { ...translateRef.current };
    } else if (e.touches.length === 2) {
      // Two fingers → pinch-to-zoom
      isPanning.current = false;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchStartRef.current = Math.hypot(dx, dy);
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 1 && isPanning.current) {
      const t = e.touches[0];
      const dx = t.clientX - mouseDownPos.current.x;
      const dy = t.clientY - mouseDownPos.current.y;
      if (!didDrag.current && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) didDrag.current = true;
      if (didDrag.current) {
        translateRef.current = { x: panStart.current.x + dx, y: panStart.current.y + dy };
        applyTransform();
      }
    } else if (e.touches.length === 2 && pinchStartRef.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const factor = dist / pinchStartRef.current;
      pinchStartRef.current = dist;

      const wrapper = wrapperRef.current;
      if (!wrapper) return;
      const { left, top, width, height } = wrapper.getBoundingClientRect();
      const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - left;
      const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2 - top;

      const oldScale = scaleRef.current;
      // Same fit-scale floor as zoomStep — see the comment there.
      const zoomFloor = Math.min(width / svgDims.w, height / svgDims.h);
      const newScale = Math.min(Math.max(oldScale * factor, zoomFloor), 4);
      translateRef.current = {
        x: cx - (cx - translateRef.current.x) * (newScale / oldScale),
        y: cy - (cy - translateRef.current.y) * (newScale / oldScale),
      };
      scaleRef.current = newScale;
      applyTransform();
      setZoomDisplay(Math.round(newScale * 100));
    }
  };

  const onTouchEnd = () => {
    isPanning.current = false;
    pinchStartRef.current = null;
  };

  // ── Click → seat config dialog ─────────────────────────────────────────
  const onMapClick = (e: React.MouseEvent) => {
    if (didDrag.current) { didDrag.current = false; return; }
    if (!onSeatSave) return;
    const svgId = getSeatIdFromClick(e.target, seatIdsRef.current);
    if (!svgId) return;
    const seat = seats.find((s) => s.seat_svg_id === svgId) ?? null;
    if (!seat) return;
    setClickedSeat(seat);
    setDialogOpen(true);
  };

  const showSpinner = loading || (!rawSvg && !svgError && !!layout?.layout_file_url);

  // ── Empty state ────────────────────────────────────────────────────────
  if (!layout) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between px-1">
          <p className="text-sm font-medium text-gray-700">Layout Preview</p>
        </div>
        {/* FIX: responsive height on empty state too */}
        <div className="flex items-center justify-center h-[320px] sm:h-[400px] md:h-[460px] bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <div className="text-center text-gray-400">
            <Layers className="mx-auto mb-2 opacity-30" size={32} />
            <p className="text-sm">Select a layout to preview</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`flex flex-col gap-2 ${fillHeight ? "h-full" : ""}`}>

        {/* ── Toolbar: title + legend + zoom controls ─────────────────── */}
        <div className="flex items-start gap-3 flex-wrap flex-shrink-0">
          <p className="text-sm font-semibold text-gray-700 mr-auto">Layout Preview</p>

          {/* FIX: legend now wraps via flex-wrap inside PreviewLegend */}
          <PreviewLegend />

          {mapReady && (
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={(e) => { e.stopPropagation(); zoomOut(); }}
                className="w-7 h-7 rounded-md border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50 text-gray-600 transition-colors"
              >
                <ZoomOut size={13} />
              </button>
              <span className="text-xs font-semibold text-gray-500 tabular-nums w-10 text-center select-none">
                {zoomDisplay}%
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); zoomIn(); }}
                className="w-7 h-7 rounded-md border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50 text-gray-600 transition-colors"
              >
                <ZoomIn size={13} />
              </button>
            </div>
          )}
        </div>

        {/* ── Canvas ────────────────────────────────────────────────────── */}
        {/*
          FIX: Drop the hardcoded inline height style.
          Use responsive Tailwind classes: 320px mobile → 400px sm → 460px md+.
          When fillHeight=true, the parent flex-1 takes over as before.
        */}
        <div
          className={`relative bg-[#F7F8FC] border border-[#EBEBF5] rounded-xl overflow-hidden
            ${fillHeight
              ? "flex-1 min-h-0"
              : !canvasHeight ? "h-[320px] sm:h-[400px] md:h-[460px]" : ""
            }`}
          style={{ width: "100%", ...(!fillHeight && canvasHeight ? { height: canvasHeight } : {}) }}
        >
          {/* Fit-to-view button (top-right corner) */}
          {mapReady && (
            <div className="absolute top-3 right-3 z-20 flex flex-col gap-1.5">
              <button
                onClick={(e) => { e.stopPropagation(); fitView(); }}
                title="Fit to view"
                className="w-8 h-8 rounded-lg bg-white border border-[#EBEBF5] shadow-sm flex items-center justify-center hover:bg-gray-50 text-gray-600 transition-colors"
              >
                <Maximize2 size={14} />
              </button>
            </div>
          )}

          {/*
            FIX: Add onTouchStart / onTouchMove / onTouchEnd for pan + pinch-to-zoom.
            touchAction: "none" prevents the browser intercepting touch events for scroll.
          */}
          <div
            ref={wrapperRef}
            className="w-full h-full overflow-hidden select-none"
            style={{ cursor: "grab", touchAction: "none" }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseLeave}
            onClick={onMapClick}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            {showSpinner && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#F7F8FC] z-10">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                  <p className="text-[12px] text-gray-400">Loading floor plan…</p>
                </div>
              </div>
            )}

            {svgError && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-[13px] text-gray-500 mb-1">Could not load floor plan</p>
                  <p className="text-[11px] text-gray-400 font-mono break-all px-6">{layout.layout_file_url}</p>
                </div>
              </div>
            )}

            {displaySvg && (
              <div
                ref={transformRef}
                style={{
                  transformOrigin: "top left",
                  width: `${svgDims.w}px`,
                  height: `${svgDims.h}px`,
                  willChange: "transform",
                  visibility: mapReady ? "visible" : "hidden",
                }}
                dangerouslySetInnerHTML={{ __html: displaySvg }}
              />
            )}

            {/* Seat hover tooltip */}
            {tooltip && (() => {
              const prefMap = Object.fromEntries(preferences.map((p) => [p.preference_id, p.preference_name]));
              const amenityNames = tooltip.seat.amenity_ids.map((id) => prefMap[id]).filter(Boolean);
              return (
                <div
                  className="absolute z-30 pointer-events-none bg-white border border-gray-200 rounded-lg shadow-md px-2.5 py-2 min-w-[140px] max-w-[200px]"
                  style={{ left: tooltip.x, top: tooltip.y }}
                >
                  <p className="text-[11px] font-semibold text-gray-800">{tooltip.seat.seat_code}</p>
                  {tooltip.seat.is_configured ? (
                    <div className="mt-1 space-y-0.5">
                      <p className="text-[10px] text-gray-500 flex items-center gap-1">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${tooltip.seat.status === "ACTIVE" ? "bg-emerald-500" : "bg-red-400"}`} />
                        {tooltip.seat.status ?? "ACTIVE"}
                      </p>
                      <p className="text-[10px] text-gray-500">Bookable: {tooltip.seat.is_bookable ? "Yes" : "No"}</p>
                      {tooltip.seat.seat_type && (
                        <p className="text-[10px] text-gray-400">{tooltip.seat.seat_type}</p>
                      )}
                      {amenityNames.length > 0 && (
                        <div className="mt-1 pt-1 border-t border-gray-100">
                          <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Amenities</p>
                          <div className="flex flex-wrap gap-0.5">
                            {amenityNames.map((name) => (
                              <span key={name} className="text-[9px] bg-indigo-50 text-indigo-600 border border-indigo-100 rounded px-1 py-0.5">{name}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-[10px] text-amber-600 mt-0.5">Not configured</p>
                  )}
                </div>
              );
            })()}
          </div>
        </div>

        {/* ── Bottom bar ────────────────────────────────────────────────── */}
        {mapReady && (
          <div className="flex items-center justify-between px-0.5 flex-shrink-0">
            <button
              onClick={fitView}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors border border-gray-200 bg-white px-3 py-1.5 rounded-lg hover:bg-gray-50"
            >
              <Maximize2 size={12} />
              Fit to Screen
            </button>
            {/* FIX: hide hint text on mobile — too long for narrow screens */}
            <p className="text-[10px] text-gray-400 select-none hidden sm:block">
              Scroll to zoom · Drag to pan · Click a seat to configure
            </p>
          </div>
        )}

        {/* ── Scheduled banner ─────────────────────────────────────────────
            Checked before the draft banner below -- a SCHEDULED layout
            also has is_published=false, so without this it fell into the
            "this is a draft, publish it" banner, which is both wrong (it's
            already scheduled, not sitting undecided) and actively
            misleading (there's no "Publish" action to take here; seat
            edits are already live via the reschedule/edit endpoints). */}
        {layout && layout.status === "SCHEDULED" && (
          <div className="flex items-center gap-2 px-3 py-2 bg-sky-50 border border-sky-200 rounded-lg text-xs text-sky-700 flex-shrink-0">
            <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
            {layout.effective_from
              ? `Scheduled to take over on ${new Date(layout.effective_from).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}. Seat changes made now apply immediately; changing the date is still allowed until bookings exist against it.`
              : "This layout is scheduled to take over automatically. Seat changes made now apply immediately."}
          </div>
        )}

        {/* ── Draft banner ──────────────────────────────────────────────── */}
        {layout && !layout.is_published && layout.status !== "ARCHIVED" && layout.status !== "SCHEDULED" && (
          <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 flex-shrink-0">
            <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            This is a draft layout. Publish to make it available for employee bookings.
          </div>
        )}

      </div>

      {/* ── Seat config dialog ─────────────────────────────────────────── */}
      <SeatConfigDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setClickedSeat(null); }}
        seat={clickedSeat}
        preferences={preferences}
        onSave={async (payload) => {
          if (onSeatSave) await onSeatSave(payload);
          setClickedSeat((prev): Seat | null => {
            if (!prev) return null;
            return {
              ...prev,
              seat_name: prev.seat_code,
              seat_type: payload.seat_type,
              is_bookable: payload.is_bookable,
              status: payload.status,
              amenity_ids: payload.amenity_ids,
              notes: payload.notes ?? prev.notes,
            };
          });
        }}
      />
    </>
  );
}
