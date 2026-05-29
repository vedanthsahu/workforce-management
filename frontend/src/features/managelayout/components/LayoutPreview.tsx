"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Maximize2, ZoomIn, ZoomOut, Layers } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Layout } from "../types/layout.types";
import { Preference, Seat, SeatStatus, SeatType, SeatUpdatePayload } from "@/features/managelayout1";



interface LayoutPreviewProps {
  layout: Layout | null;
  fillHeight?: boolean;
  canvasHeight?: number;
  seats?: Seat[];
  preferences?: Preference[];
  onSeatSave?: (payload: SeatUpdatePayload) => Promise<unknown>;
  filteredSeats?: Seat[];
}

// ─── SVG Helpers ──────────────────────────────────────────────────────────────

function resolveUrl(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (typeof window !== "undefined") return `${window.location.origin}${url}`;
  return url;
}

function extractSeatIds(svgText: string): string[] {
  const ids: string[] = [];
  const regex = /<g\s+id="([^"]+)"/g;
  let match;
  while ((match = regex.exec(svgText)) !== null) ids.push(match[1]);
  return ids;
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

// function colorSeats(svgText: string, seats: Seat[]): string {
//   let result = svgText;
//   seats.forEach((seat) => {
//     const id = seat.seat_svg_id;
//     let fill: string;
//     if (!seat.is_configured) {
//       fill = "#D1D5DB";
//     } else if (!seat.is_bookable) {
//       fill = "#EF4444";
//     } else {
//       fill = "#22C55E";
//     }

//     const groupRegex = new RegExp(`(<g[^>]*id="${id}"[^>]*>)([\\s\\S]*?)(<\/g>)`, "m");
//     result = result.replace(groupRegex, (match, open, inner, close) => {
//       const colored = inner
//         .replace(/fill="[^"]*"/g, `fill="${fill}"`)
//         .replace(/fill:[^;"}]*/g, `fill:${fill}`);
//       return `${open}${colored}${close}`;
//     });
//   });
//   return result;
// }
function colorSeats(svgText: string, seats: Seat[], filteredIds?: Set<string>): string {
  let result = svgText;
  const hasFilter = filteredIds !== undefined && filteredIds.size !== seats.length;

  seats.forEach((seat) => {
    const id = seat.seat_svg_id;
    let fill: string;

    // If filters active and this seat isn't in filtered set → dim it
    if (hasFilter && filteredIds!.has(id)) {
      fill = "#FFDF00"; // dimmed gray
    } else if (!seat.is_configured) {
      fill = "#D1D5DB";
    } else if (!seat.is_bookable) {
      fill = "#EF4444";
    } else {
      fill = "#22C55E";
    }

    const groupRegex = new RegExp(`(<g[^>]*id="${id}"[^>]*>)([\\s\\S]*?)(<\\/g>)`, "m");
    result = result.replace(groupRegex, (match, open, inner, close) => {
      const colored = inner
        .replace(/fill="[^"]*"/g, `fill="${fill}"`)
        .replace(/fill:[^;"}]*/g, `fill:${fill}`);
      return `${open}${colored}${close}`;
    });
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

const SEAT_TYPES: SeatType[] = ["STANDARD", "WINDOW", "CABIN", "ACCESSIBLE", "HOT_DESK"];
const SEAT_TYPE_LABELS: Record<string, string> = {
  STANDARD: "STANDARD",
  WINDOW: "WINDOW",
  CABIN: "CABIN",
  ACCESSIBLE: "ACCESSIBLE",
  HOT_DESK: "HOT_DESK",
};
const SEAT_STATUSES: SeatStatus[] = ["ACTIVE", "INACTIVE"];

const SeatConfigDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  seat: Seat | null;
  preferences: Preference[];
  onSave: (payload: SeatUpdatePayload) => Promise<unknown>;
}> = ({ open, onClose, seat, preferences, onSave }) => {
  const [seatType,   setSeatType]   = useState<SeatType>("STANDARD");
  const [bookable,   setBookable]   = useState(true);
  const [status,     setStatus]     = useState<SeatStatus>("ACTIVE");
  const [amenityIds, setAmenityIds] = useState<string[]>([]);
  const [notes,      setNotes]      = useState("");
  const [saving,     setSaving]     = useState(false);
  const [saveError,  setSaveError]  = useState(false);
  const [saved,      setSaved]      = useState(false);

  useEffect(() => {
    if (!seat || !open) return;
    setSeatType(seat.seat_type as SeatType);
    setBookable(seat.is_bookable);
    setStatus(seat.status as SeatStatus);
    setAmenityIds([...seat.amenity_ids]);
    setNotes(seat.notes ?? "");
    setSaved(false);
    setSaveError(false);
  }, [seat, open]);

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
        layout_id:   seat.layout_id,
        seat_type:   seatType,
        is_bookable: bookable,
        status,
        amenity_ids: amenityIds,
        notes:       notes || undefined,
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
    rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/30 
    focus:border-indigo-400 transition-colors`;
  const chevron = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' 
    viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpolyline 
    points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md rounded-xl p-0 overflow-hidden gap-0 [&>button:last-child]:hidden">
        <DialogHeader className="px-5 pt-5 pb-4 border-b">
          <p className="text-xs text-gray-400 mb-0.5 font-medium">Configure Seat</p>
          <DialogTitle className="text-base font-bold text-indigo-600">
            {seat.seat_code}
          </DialogTitle>
        </DialogHeader>

        <div className="px-5 py-5 space-y-4 overflow-y-auto max-h-[60vh]">

          {/* Seat Type */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5 block">
              Seat Type <span className="text-red-500">*</span>
            </label>
            <select
              value={seatType}
              onChange={(e) => { setSeatType(e.target.value as SeatType); setSaved(false); }}
              className={selectCls}
              style={{ backgroundImage: chevron, backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center" }}
            >
              {SEAT_TYPES.map((t) => (
                <option key={t} value={t}>{SEAT_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>

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
              <span className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full pointer-events-none ${
                status === "ACTIVE" ? "bg-emerald-500" : "bg-gray-400"
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
                  return (
                    <button
                      key={p.preference_id}
                      onClick={() => toggleAmenity(p.preference_id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-left text-xs font-medium transition-colors ${
                        on ? "bg-indigo-50 border-indigo-300 text-indigo-700" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      <div className={`w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center ${
                        on ? "bg-indigo-600 border-indigo-600" : "border-gray-300"
                      }`}>
                        {on && (
                          <svg viewBox="0 0 8 7" className="w-2.5 h-2.5">
                            <path d="M1 3.5l2 2L7 1" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
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
              className="w-full px-3 py-2.5 text-xs text-gray-700 bg-white border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-colors placeholder:text-gray-400"
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
              disabled={saving}
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

const LEGEND_ITEMS = [
  { label: "Configured & Bookable", color: "#22C55E" },
  { label: "Non-bookable",          color: "#EF4444" },
  { label: "Unconfigured",          color: "#D1D5DB" },
] as const;

function PreviewLegend() {
  return (
    <div className="flex items-center gap-4">
      {LEGEND_ITEMS.map(({ label, color }) => (
        <span key={label} className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
          {label}
        </span>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const SVG_W = 2466;
const SVG_H = 2039;
const DEFAULT_CANVAS_HEIGHT = 460;

export default function LayoutPreview({
  layout,
  fillHeight = false,
  canvasHeight,
  seats = [],
  preferences = [],
  onSeatSave,
  filteredSeats,
}: LayoutPreviewProps) {
  const wrapperRef   = useRef<HTMLDivElement>(null);
  const transformRef = useRef<HTMLDivElement>(null);

  const scaleRef     = useRef(1);
  const translateRef = useRef({ x: 0, y: 0 });
  const isPanning    = useRef(false);
  const panStart     = useRef({ x: 0, y: 0 });
  const mouseDownPos = useRef({ x: 0, y: 0 });
  const didDrag      = useRef(false);

  const [rawSvg,      setRawSvg]      = useState<string | null>(null);
  const [svgError,    setSvgError]    = useState(false);
  const [zoomDisplay, setZoomDisplay] = useState(100);
  const [mapReady,    setMapReady]    = useState(false);
  const [loading,     setLoading]     = useState(false);

  const seatIdsRef = useRef<Set<string>>(new Set());

  const [dialogOpen,  setDialogOpen]  = useState(false);
  const [clickedSeat, setClickedSeat] = useState<Seat | null>(null);

  const resolvedHeight = canvasHeight ?? DEFAULT_CANVAS_HEIGHT;

  // Load SVG
  useEffect(() => {
    const rawUrl = layout?.layout_file_url;
    if (!rawUrl) { setRawSvg(null); setSvgError(false); setMapReady(false); return; }
    const url = resolveUrl(rawUrl);
    setLoading(true); setRawSvg(null); setSvgError(false); setMapReady(false);
    fetch(url)
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.text(); })
      .then((text) => {
        const fluid = text
          .replace(/\bwidth="[^"]*"/, 'width="100%"')
          .replace(/\bheight="[^"]*"/, 'height="100%"');
        const ids = extractSeatIds(fluid);
        seatIdsRef.current = new Set(ids);
        // setRawSvg(addPointerCursors(fluid, ids));
        setRawSvg(onSeatSave ? addPointerCursors(fluid, ids) : fluid);
      })
      .catch(() => setSvgError(true))
      .finally(() => setLoading(false));
  }, [layout?.layout_file_url]);

  // const coloredSvg = rawSvg && seats.length > 0
  //   ? colorSeats(rawSvg, seats)
  //   : rawSvg;
  const filteredIds = filteredSeats
  ? new Set(filteredSeats.map((s) => s.seat_svg_id))
  : undefined;

const coloredSvg = rawSvg && seats.length > 0
  ? colorSeats(rawSvg, seats, filteredIds)
  : rawSvg;

  const displaySvg = coloredSvg && clickedSeat && dialogOpen
    ? highlightSeat(coloredSvg, clickedSeat.seat_svg_id)
    : coloredSvg;

  const applyTransform = useCallback(() => {
    const el = transformRef.current;
    if (!el) return;
    el.style.transform = `translate(${translateRef.current.x}px,${translateRef.current.y}px) scale(${scaleRef.current})`;
  }, []);

  const fitView = useCallback(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const { width: wW, height: wH } = wrapper.getBoundingClientRect();
    if (wW === 0 || wH === 0) return;
    const scale = Math.min(wW / SVG_W, wH / SVG_H);
    scaleRef.current = scale;
    translateRef.current = { x: (wW - SVG_W * scale) / 2, y: (wH - SVG_H * scale) / 2 };
    applyTransform();
    setZoomDisplay(Math.round(scale * 100));
  }, [applyTransform]);

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

  const zoomStep = useCallback((factor: number) => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const { width: wW, height: wH } = wrapper.getBoundingClientRect();
    const oldScale = scaleRef.current;
    const newScale = Math.min(Math.max(oldScale * factor, 0.05), 4);
    const cx = wW / 2, cy = wH / 2;
    translateRef.current = {
      x: cx - (cx - translateRef.current.x) * (newScale / oldScale),
      y: cy - (cy - translateRef.current.y) * (newScale / oldScale),
    };
    scaleRef.current = newScale;
    applyTransform();
    setZoomDisplay(Math.round(newScale * 100));
  }, [applyTransform]);

  const zoomIn  = useCallback(() => zoomStep(1.25),     [zoomStep]);
  const zoomOut = useCallback(() => zoomStep(1 / 1.25), [zoomStep]);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      const oldScale = scaleRef.current;
      const newScale = Math.min(Math.max(oldScale * factor, 0.05), 4);
      const rect = el.getBoundingClientRect();
      translateRef.current = {
        x: e.clientX - rect.left - (e.clientX - rect.left - translateRef.current.x) * (newScale / oldScale),
        y: e.clientY - rect.top  - (e.clientY - rect.top  - translateRef.current.y) * (newScale / oldScale),
      };
      scaleRef.current = newScale;
      applyTransform();
      setZoomDisplay(Math.round(newScale * 100));
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, [applyTransform]);

  const onMouseDown = (e: React.MouseEvent) => {
    isPanning.current = true; didDrag.current = false;
    mouseDownPos.current = { x: e.clientX, y: e.clientY };
    panStart.current = { ...translateRef.current };
    (e.currentTarget as HTMLElement).style.cursor = "grabbing";
  };

  const onMouseMove = (e: React.MouseEvent) => {
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
  };

  const onMouseLeave = () => {
    isPanning.current = false;
    if (wrapperRef.current) wrapperRef.current.style.cursor = "grab";
  };

  // const onMapClick = (e: React.MouseEvent) => {
  //   if (didDrag.current) { didDrag.current = false; return; }
  //   const svgId = getSeatIdFromClick(e.target, seatIdsRef.current);
  //   if (!svgId) return;
  //   const seat = seats.find((s) => s.seat_svg_id === svgId) ?? null;
  //   if (!seat) return;
  //   setClickedSeat(seat);
  //   setDialogOpen(true);
  // };

  const onMapClick = (e: React.MouseEvent) => {
  if (didDrag.current) { didDrag.current = false; return; }
  if (!onSeatSave) return;                    // ← add this line
  const svgId = getSeatIdFromClick(e.target, seatIdsRef.current);
  if (!svgId) return;
  const seat = seats.find((s) => s.seat_svg_id === svgId) ?? null;
  if (!seat) return;
  setClickedSeat(seat);
  setDialogOpen(true);
};

  const showSpinner = loading || (!rawSvg && !svgError && !!layout?.layout_file_url);

  if (!layout) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between px-1">
          <p className="text-sm font-medium text-gray-700">Layout Preview</p>
        </div>
        <div className="flex items-center justify-center h-[460px] bg-gray-50 rounded-xl border border-dashed border-gray-200">
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

        <div className="flex items-center gap-4 flex-wrap flex-shrink-0">
          <p className="text-sm font-semibold text-gray-700 mr-auto">Layout Preview</p>
          <PreviewLegend />
          {mapReady && (
            <div className="flex items-center gap-1.5">
              <button onClick={(e) => { e.stopPropagation(); zoomOut(); }}
                className="w-7 h-7 rounded-md border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50 text-gray-600 transition-colors">
                <ZoomOut size={13} />
              </button>
              <span className="text-xs font-semibold text-gray-500 tabular-nums w-10 text-center select-none">
                {zoomDisplay}%
              </span>
              <button onClick={(e) => { e.stopPropagation(); zoomIn(); }}
                className="w-7 h-7 rounded-md border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50 text-gray-600 transition-colors">
                <ZoomIn size={13} />
              </button>
            </div>
          )}
        </div>

        <div
          className={`relative bg-[#F7F8FC] border border-[#EBEBF5] rounded-xl overflow-hidden ${fillHeight ? "flex-1 min-h-0" : ""}`}
          style={fillHeight ? { width: "100%" } : { width: "100%", height: resolvedHeight }}
        >
          {mapReady && (
            <div className="absolute top-3 right-3 z-20 flex flex-col gap-1.5">
              <button onClick={(e) => { e.stopPropagation(); fitView(); }} title="Fit to view"
                className="w-8 h-8 rounded-lg bg-white border border-[#EBEBF5] shadow-sm flex items-center justify-center hover:bg-gray-50 text-gray-600 transition-colors">
                <Maximize2 size={14} />
              </button>
            </div>
          )}

          <div ref={wrapperRef} className="w-full h-full overflow-hidden select-none"
            style={{ cursor: "grab" }}
            onMouseDown={onMouseDown} onMouseMove={onMouseMove}
            onMouseUp={onMouseUp} onMouseLeave={onMouseLeave} onClick={onMapClick}
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
              <div ref={transformRef}
                style={{ transformOrigin: "top left", width: `${SVG_W}px`, height: `${SVG_H}px`, willChange: "transform", visibility: mapReady ? "visible" : "hidden" }}
                dangerouslySetInnerHTML={{ __html: displaySvg }}
              />
            )}
          </div>
        </div>

        {mapReady && (
          <div className="flex items-center justify-between px-0.5 flex-shrink-0">
            <button onClick={fitView}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors border border-gray-200 bg-white px-3 py-1.5 rounded-lg hover:bg-gray-50">
              <Maximize2 size={12} />
              Fit to Screen
            </button>
            <p className="text-[10px] text-gray-400 select-none">
              Scroll to zoom · Drag to pan · Click a seat to configure
            </p>
          </div>
        )}

        {layout && !layout.is_published && layout.status !== "ARCHIVED" && (
          <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 flex-shrink-0">
            <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            This is a draft layout. Publish to make it available for employee bookings.
          </div>
        )}
      </div>

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
              seat_name:   prev.seat_code,   // ← seat_name always mirrors seat_code
              seat_type:   payload.seat_type,
              is_bookable: payload.is_bookable,
              status:      payload.status,
              amenity_ids: payload.amenity_ids,
              notes:       payload.notes ?? prev.notes,
            };
          });
        }}
      />
    </>
  );
}