// // import React, { useCallback, useEffect, useRef, useState } from "react";
// // import { Maximize2, ZoomIn, ZoomOut } from "lucide-react";

// // // ─── Types ────────────────────────────────────────────────────────────────────
// // export interface SeatWithSvgId {
// //   id: string;
// //   svgId: string;
// //   label: string;
// //   status: "available" | "booked" | "unavailable" | "yours";
// //   matchesPreferences: boolean;
// //   amenities: string[];
// // }

// // // ─── All seat <g> ids present in floor-IT.svg ────────────────────────────────
// // const ALL_SVG_SEAT_IDS = [
// //   "1","2","3","4","5","6","7","8","9","10",
// //   "11","12","13","14","15","16","17","18","19","20",
// //   "21","22","23","s24","25","26","27","28","29","30","31",
// // ];

// // const SVG_W = 2466;
// // const SVG_H = 2039;

// // // ─── Color palettes ───────────────────────────────────────────────────────────
// // const PALETTES: Record<string, {
// //   body: string; bodyStroke: string;
// //   armrest: string;
// //   back: string; backStroke: string;
// //   curve: string; arc: string;
// //   opacity: string;
// // }> = {
// //   available: {
// //     body: "#d1fae5", bodyStroke: "#34d399",
// //     armrest: "#a7f3d0",
// //     back: "#059669", backStroke: "#047857",
// //     curve: "#34d399", arc: "#6ee7b7",
// //     opacity: "1",
// //   },
// //   selected: {
// //     body: "#4f46e5", bodyStroke: "#3730a3",
// //     armrest: "#6366f1",
// //     back: "#c7d2fe", backStroke: "#6366f1",
// //     curve: "#6366f1", arc: "#a5b4fc",
// //     opacity: "1",
// //   },
// //   booked: {
// //     body: "#fca5a5", bodyStroke: "#ef4444",
// //     armrest: "#f87171",
// //     back: "#dc2626", backStroke: "#b91c1c",
// //     curve: "#ef4444", arc: "#fca5a5",
// //     opacity: "0.85",
// //   },
// //   unavailable: {
// //     body: "#fca5a5", bodyStroke: "#ef4444",
// //     armrest: "#f87171",
// //     back: "#dc2626", backStroke: "#b91c1c",
// //     curve: "#ef4444", arc: "#fca5a5",
// //     opacity: "0.85",
// //   },
// //   yours: {
// //     body: "#d1fae5", bodyStroke: "#10b981",
// //     armrest: "#6ee7b7",
// //     back: "#059669", backStroke: "#047857",
// //     curve: "#10b981", arc: "#6ee7b7",
// //     opacity: "1",
// //   },
// //   preference: {
// //     body: "#e0e7ff", bodyStroke: "#818cf8",
// //     armrest: "#c7d2fe",
// //     back: "#4f46e5", backStroke: "#3730a3",
// //     curve: "#818cf8", arc: "#a5b4fc",
// //     opacity: "1",
// //   },
// //   unloaded: {
// //     body: "#fca5a5", bodyStroke: "#ef4444",
// //     armrest: "#f87171",
// //     back: "#dc2626", backStroke: "#b91c1c",
// //     curve: "#ef4444", arc: "#fca5a5",
// //     opacity: "0.85",
// //   },
// // };

// // // ─── Recolor one seat block inside the raw SVG string ────────────────────────
// // function recolorSeat(svg: string, svgId: string, paletteKey: string): string {
// //   const p = PALETTES[paletteKey] ?? PALETTES.unloaded;

// //   const openTag = `<g id="${svgId}">`;
// //   const start   = svg.indexOf(openTag);
// //   if (start === -1) return svg;

// //   const end = svg.indexOf("</g>", start);
// //   if (end === -1) return svg;

// //   const before = svg.slice(0, start);
// //   let   block  = svg.slice(start, end + 4);
// //   const after  = svg.slice(end + 4);

// //   block = block.replace(
// //     /fill="#C8C8C8" stroke="#888888"/g,
// //     `fill="${p.body}" stroke="${p.bodyStroke}"`
// //   );
// //   block = block.replace(
// //     /fill="#B0B0B0" stroke="#888888"/g,
// //     `fill="${p.armrest}" stroke="${p.bodyStroke}"`
// //   );
// //   block = block.replace(
// //     /fill="#616161" stroke="#424242"/g,
// //     `fill="${p.back}" stroke="${p.backStroke}"`
// //   );
// //   block = block.replace(/stroke="#707070"/g, `stroke="${p.curve}"`);
// //   block = block.replace(/stroke="#A0A0A0"/g, `stroke="${p.arc}"`);
// //   block = block.replace(
// //     `<g id="${svgId}">`,
// //     `<g id="${svgId}" style="opacity:${p.opacity};cursor:${
// //       paletteKey === "available" || paletteKey === "yours" || paletteKey === "preference"
// //         ? "pointer"
// //         : "default"
// //     }">`
// //   );

// //   return before + block + after;
// // }

// // // ─── Build fully-colored SVG string ──────────────────────────────────────────
// // function buildColoredSvg(
// //   rawSvg: string,
// //   seats: SeatWithSvgId[],
// //   selectedSeatId: string | null
// // ): string {
// //   const seatMap = new Map<string, SeatWithSvgId>();
// //   seats.forEach((s) => seatMap.set(s.svgId, s));

// //   let svg = rawSvg;
// //   ALL_SVG_SEAT_IDS.forEach((svgId) => {
// //     const seat = seatMap.get(svgId);
// //     let key: string;
// //     if (!seat) {
// //       key = "unloaded";
// //     } else if (seat.id === selectedSeatId) {
// //       key = "selected";
// //     } else {
// //       key = seat.status;
// //     }
// //     svg = recolorSeat(svg, svgId, key);
// //   });
// //   return svg;
// // }

// // // ─── Walk up the click target to find a seat svgId ───────────────────────────
// // function getSvgIdFromClick(target: EventTarget | null): string | null {
// //   let el = target as Element | null;
// //   while (el) {
// //     if (el.tagName?.toLowerCase() === "svg") return null;
// //     const id = el.getAttribute("id");
// //     if (id && ALL_SVG_SEAT_IDS.includes(id)) return id;
// //     el = el.parentElement;
// //   }
// //   return null;
// // }

// // // ─── Props ────────────────────────────────────────────────────────────────────
// // interface SvgFloorMapPageProps {
// //   seats: SeatWithSvgId[];
// //   selectedSeatId: string | null;
// //   onSeatSelect: (seatId: string | null) => void;
// //   loading?: boolean;
// //   siteName?: string;
// //   buildingName?: string;
// //   floorName?: string;
// // }

// // // ─── Component ────────────────────────────────────────────────────────────────
// // export const SvgFloorMapPage: React.FC<SvgFloorMapPageProps> = ({
// //   seats,
// //   selectedSeatId,
// //   onSeatSelect,
// //   loading = false,
// // }) => {
// //   const wrapperRef   = useRef<HTMLDivElement>(null);
// //   const transformRef = useRef<HTMLDivElement>(null);

// //   const scaleRef     = useRef(1);
// //   const translateRef = useRef({ x: 0, y: 0 });
// //   const isPanning    = useRef(false);
// //   const panStart     = useRef({ x: 0, y: 0 });
// //   const mouseDownPos = useRef({ x: 0, y: 0 });
// //   const didDrag      = useRef(false);
// //   const fitDoneRef   = useRef(false); // track if first fit has happened

// //   const [rawSvg,      setRawSvg]      = useState<string | null>(null);
// //   const [svgError,    setSvgError]    = useState(false);
// //   const [zoomDisplay, setZoomDisplay] = useState(100);
// //   const [mapReady,    setMapReady]    = useState(false); // controls visibility

// //   // const coloredSvg = rawSvg
// //   //   ? buildColoredSvg(rawSvg, seats, selectedSeatId)
// //   //   : null;
// //   const coloredSvg = rawSvg && !loading && seats.length > 0
// //   ? buildColoredSvg(rawSvg, seats, selectedSeatId)
// //   : null;

// //   // ── Fetch raw SVG once ────────────────────────────────────────────────────
// //   useEffect(() => {
// //     fetch("/floor-IT.svg")
// //       .then((r) => {
// //         if (!r.ok) throw new Error(`HTTP ${r.status}`);
// //         return r.text();
// //       })
// //       .then(setRawSvg)
// //       .catch(() => setSvgError(true));
// //   }, []);

// //   // ── applyTransform ────────────────────────────────────────────────────────
// //   const applyTransform = useCallback(() => {
// //     const el = transformRef.current;
// //     if (!el) return;
// //     el.style.transform = `translate(${translateRef.current.x}px,${translateRef.current.y}px) scale(${scaleRef.current})`;
// //   }, []);

// //   // ── fitView ───────────────────────────────────────────────────────────────
// //   const fitView = useCallback(() => {
// //     const wrapper = wrapperRef.current;
// //     if (!wrapper) return;
// //     const { width: wW, height: wH } = wrapper.getBoundingClientRect();
// //     if (wW === 0 || wH === 0) return; // not ready yet
// //     const scale = Math.min(wW / SVG_W, wH / SVG_H);
// //     scaleRef.current     = scale;
// //     translateRef.current = {
// //       x: (wW - SVG_W * scale) / 2,
// //       y: (wH - SVG_H * scale) / 2,
// //     };
// //     applyTransform();
// //     setZoomDisplay(Math.round(scale * 100));
// //   }, [applyTransform]);

// //   // ── ResizeObserver: fitView when wrapper has real dimensions ─────────────
// //   // This is the only place fitView is called — fires when wrapper is painted
// //   // and also handles sidebar open/close resizes automatically.
// //   // useEffect(() => {
// //   //   const wrapper = wrapperRef.current;
// //   //   if (!wrapper || !rawSvg || loading) return;

// //   //   const observer = new ResizeObserver((entries) => {
// //   //     for (const entry of entries) {
// //   //       const { width, height } = entry.contentRect;
// //   //       if (width > 0 && height > 0) {
// //   //         fitView();
// //   //         // On first successful fit, show the map
// //   //         if (!fitDoneRef.current) {
// //   //           fitDoneRef.current = true;
// //   //           setMapReady(true);
// //   //         }
// //   //       }
// //   //     }
// //   //   });

// //   //   observer.observe(wrapper);
// //   //   return () => observer.disconnect();
// //   // }, [rawSvg, loading, fitView]);

// // // useEffect(() => {
// // //   const wrapper = wrapperRef.current;
// // //   if (!wrapper || !rawSvg) return;  // ← removed loading check

// // //   const observer = new ResizeObserver((entries) => {
// // //     for (const entry of entries) {
// // //       const { width, height } = entry.contentRect;
// // //       if (width > 0 && height > 0) {
// // //         fitView();
// // //         // Only reveal map when fitView is done AND seats are loaded
// // //         if (!fitDoneRef.current && !loading) {
// // //           fitDoneRef.current = true;
// // //           setMapReady(true);
// // //         }
// // //       }
// // //     }
// // //   });

// // //   observer.observe(wrapper);
// // //   return () => observer.disconnect();
// // // }, [rawSvg, loading, fitView]);

// // // ── ResizeObserver: fitView when wrapper has real dimensions ─────────────
// // useEffect(() => {
// //   const wrapper = wrapperRef.current;
// //   if (!wrapper || !rawSvg) return;

// //   const observer = new ResizeObserver((entries) => {
// //     for (const entry of entries) {
// //       const { width, height } = entry.contentRect;
// //       if (width > 0 && height > 0) {
// //         fitView();
// //       }
// //     }
// //   });

// //   observer.observe(wrapper);
// //   return () => observer.disconnect();
// // }, [rawSvg, fitView]); // ← no loading dependency — never reconnects

// // // ── Reveal map only when BOTH fitView has fired AND seats are done ────────
// // useEffect(() => {
// //   if (!rawSvg || loading) {
// //     setMapReady(false);
// //     fitDoneRef.current = false;
// //     return;
// //   }
// //   // rawSvg exists and loading is false — wait one frame for fitView to fire
// //   const id = requestAnimationFrame(() => {
// //     fitView();
// //     fitDoneRef.current = true;
// //     setMapReady(true);
// //   });
// //   return () => cancelAnimationFrame(id);
// // }, [rawSvg, loading, fitView]); // ← this controls reveal, not the observer

// //   // ── Reset mapReady when loading starts (e.g. date change) ────────────────
// //   useEffect(() => {
// //     if (loading) {
// //       setMapReady(false);
// //       fitDoneRef.current = false;
// //     }
// //   }, [loading]);

// //   // ── Zoom step ─────────────────────────────────────────────────────────────
// //   const zoomStep = useCallback((factor: number) => {
// //     const wrapper = wrapperRef.current;
// //     if (!wrapper) return;
// //     const { width: wW, height: wH } = wrapper.getBoundingClientRect();
// //     const oldScale = scaleRef.current;
// //     const newScale = Math.min(Math.max(oldScale * factor, 0.05), 4);
// //     const cx = wW / 2, cy = wH / 2;
// //     translateRef.current = {
// //       x: cx - (cx - translateRef.current.x) * (newScale / oldScale),
// //       y: cy - (cy - translateRef.current.y) * (newScale / oldScale),
// //     };
// //     scaleRef.current = newScale;
// //     applyTransform();
// //     setZoomDisplay(Math.round(newScale * 100));
// //   }, [applyTransform]);

// //   const zoomIn  = useCallback(() => zoomStep(1.25),     [zoomStep]);
// //   const zoomOut = useCallback(() => zoomStep(1 / 1.25), [zoomStep]);

// //   // ── Wheel zoom ────────────────────────────────────────────────────────────
// //   useEffect(() => {
// //     const el = wrapperRef.current;
// //     if (!el) return;
// //     const handler = (e: WheelEvent) => {
// //       e.preventDefault();
// //       const factor   = e.deltaY < 0 ? 1.1 : 1 / 1.1;
// //       const oldScale = scaleRef.current;
// //       const newScale = Math.min(Math.max(oldScale * factor, 0.05), 4);
// //       const rect     = el.getBoundingClientRect();
// //       translateRef.current = {
// //         x: (e.clientX - rect.left) -
// //            ((e.clientX - rect.left) - translateRef.current.x) * (newScale / oldScale),
// //         y: (e.clientY - rect.top) -
// //            ((e.clientY - rect.top)  - translateRef.current.y) * (newScale / oldScale),
// //       };
// //       scaleRef.current = newScale;
// //       applyTransform();
// //       setZoomDisplay(Math.round(newScale * 100));
// //     };
// //     el.addEventListener("wheel", handler, { passive: false });
// //     return () => el.removeEventListener("wheel", handler);
// //   }, [applyTransform]);

// //   // ── Pan handlers ──────────────────────────────────────────────────────────
// //   const onMouseDown = (e: React.MouseEvent) => {
// //     isPanning.current    = true;
// //     didDrag.current      = false;
// //     mouseDownPos.current = { x: e.clientX, y: e.clientY };
// //     panStart.current     = { ...translateRef.current };
// //     (e.currentTarget as HTMLElement).style.cursor = "grabbing";
// //   };

// //   const onMouseMove = (e: React.MouseEvent) => {
// //     if (!isPanning.current) return;
// //     const dx = e.clientX - mouseDownPos.current.x;
// //     const dy = e.clientY - mouseDownPos.current.y;
// //     if (!didDrag.current && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
// //       didDrag.current = true;
// //     }
// //     if (didDrag.current) {
// //       translateRef.current = { x: panStart.current.x + dx, y: panStart.current.y + dy };
// //       applyTransform();
// //     }
// //   };

// //   const onMouseUp = (e: React.MouseEvent) => {
// //     isPanning.current = false;
// //     (e.currentTarget as HTMLElement).style.cursor = "grab";
// //   };

// //   // ── Click on SVG → select / deselect seat ────────────────────────────────
// //   const onMapClick = (e: React.MouseEvent) => {
// //     if (didDrag.current) {
// //       didDrag.current = false;
// //       return;
// //     }

// //     const svgId = getSvgIdFromClick(e.target);
// //     if (!svgId) return;

// //     const seat = seats.find((s) => s.svgId === svgId);
// //     if (!seat) return;

// //     if (seat.status !== "available" && seat.status !== "yours") return;

// //     if (seat.id === selectedSeatId) {
// //       onSeatSelect(null);
// //     } else {
// //       onSeatSelect(seat.id);
// //     }
// //   };

// //   // ── Show spinner when: SVG not yet fetched OR seats loading ──────────────
// //   const showSpinner = !rawSvg || loading || !mapReady;

// //   // ─── Render ───────────────────────────────────────────────────────────────
// //   return (
// //     <div
// //       className="relative bg-[#F7F8FC] border border-[#EBEBF5] rounded-xl overflow-hidden"
// //       style={{ width: "100%", height: 520 }}
// //     >
// //       {/* Zoom controls — only show when map is ready */}
// //       {mapReady && (
// //         <div className="absolute top-3 right-3 z-20 flex flex-col gap-1.5">
// //           {([
// //             { icon: <ZoomIn    size={14} />, action: zoomIn,  title: "Zoom in"     },
// //             { icon: <ZoomOut   size={14} />, action: zoomOut, title: "Zoom out"    },
// //             { icon: <Maximize2 size={14} />, action: fitView, title: "Fit to view" },
// //           ] as const).map(({ icon, action, title }) => (
// //             <button
// //               key={title}
// //               onClick={(e) => { e.stopPropagation(); action(); }}
// //               title={title}
// //               className="w-8 h-8 rounded-lg bg-white border border-[#EBEBF5] shadow-sm flex items-center justify-center hover:bg-gray-50 text-gray-600 transition-colors"
// //             >
// //               {icon}
// //             </button>
// //           ))}
// //         </div>
// //       )}

// //       {/* Zoom % — only show when map is ready */}
// //       {mapReady && (
// //         <div className="absolute top-3 left-3 z-20 text-[10px] font-semibold text-gray-400 bg-white/80 px-2 py-1 rounded-md border border-[#EBEBF5] select-none tabular-nums">
// //           {zoomDisplay}%
// //         </div>
// //       )}

// //       {/* Legend — only show when map is ready */}
// //       {mapReady && (
// //         <div className="absolute bottom-8 left-3 z-20 flex items-center gap-3 bg-white/80 px-3 py-1.5 rounded-md border border-[#EBEBF5] select-none">
// //           {[
// //             { color: "#059669", label: "Available"   },
// //             { color: "#dc2626", label: "Unavailable" },
// //             { color: "#6366f1", label: "Selected"    },
// //           ].map(({ color, label }) => (
// //             <span key={label} className="flex items-center gap-1 text-[10px] text-gray-500">
// //               <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: color }} />
// //               {label}
// //             </span>
// //           ))}
// //         </div>
// //       )}

// //       {/* Hint — only show when map is ready */}
// //       {mapReady && (
// //         <div className="absolute bottom-2 left-3 z-20 text-[10px] text-gray-400 bg-white/80 px-2 py-1 rounded-md border border-[#EBEBF5] select-none">
// //           Scroll to zoom · Drag to pan · Click a green seat to select / deselect
// //         </div>
// //       )}

// //       {/* Map viewport */}
// //       <div
// //         ref={wrapperRef}
// //         className="w-full h-full overflow-hidden select-none"
// //         onMouseDown={onMouseDown}
// //         onMouseMove={onMouseMove}
// //         onMouseUp={onMouseUp}
// //         onMouseLeave={onMouseUp}
// //         onClick={onMapClick}
// //         style={{ cursor: "grab" }}
// //       >
// //         {/* Single spinner — shown while SVG fetching, seats loading, or fitView not done */}
// //         {showSpinner && !svgError && (
// //           <div className="absolute inset-0 flex items-center justify-center bg-[#F7F8FC] z-10">
// //             <div className="flex flex-col items-center gap-3">
// //               <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
// //               <p className="text-[12.5px] text-gray-400">Loading floor plan…</p>
// //             </div>
// //           </div>
// //         )}

// //         {/* Error state */}
// //         {svgError && (
// //           <div className="absolute inset-0 flex items-center justify-center">
// //             <div className="text-center">
// //               <p className="text-[13px] text-gray-500 mb-1">Floor plan unavailable</p>
// //               <p className="text-[11.5px] text-gray-400">
// //                 Place SVG at{" "}
// //                 <code className="bg-gray-100 px-1 rounded">/public/floor-IT.svg</code>
// //               </p>
// //             </div>
// //           </div>
// //         )}

// //         {/* SVG map — rendered but invisible until fitView fires correctly */}
// //         {coloredSvg && (
// //           <div
// //             ref={transformRef}
// //             style={{
// //               transformOrigin: "top left",
// //               width: `${SVG_W}px`,
// //               height: `${SVG_H}px`,
// //               willChange: "transform",
// //               // Hidden until ResizeObserver confirms wrapper has real size
// //               // and fitView has been called — prevents the 25% flash
// //               visibility: mapReady ? "visible" : "hidden",
// //             }}
// //             dangerouslySetInnerHTML={{ __html: coloredSvg }}
// //           />
// //         )}
// //       </div>
// //     </div>
// //   );
// // };

// // export default SvgFloorMapPage;

// import React, { useCallback, useEffect, useRef, useState } from "react";
// import { Maximize2, ZoomIn, ZoomOut, Star, Zap } from "lucide-react";
// import { Seat } from "../types/Bookingform.types";

// // ─── Types ────────────────────────────────────────────────────────────────────
// export interface SeatWithSvgId extends Seat {}

// // ─── All seat <g> ids present in floor-IT.svg ────────────────────────────────
// const ALL_SVG_SEAT_IDS = [
//   "1","2","3","4","5","6","7","8","9","10",
//   "11","12","13","14","15","16","17","18","19","20",
//   "21","22","23","s24","25","26","27","28","29","30","31",
// ];

// const SVG_W = 2466;
// const SVG_H = 2039;

// // ─── Color palettes ───────────────────────────────────────────────────────────
// //
// // Rendering rules:
// //   status != available         → grey  (unavailable / booked)
// //   FULL_MATCH + available      → yellow/amber (best match)
// //   PARTIAL_MATCH + available   → green with badge
// //   available (no match)        → green
// //   selected                    → blue  (always overrides)
// //   yours                       → green (existing booking)

// const PALETTES: Record<string, {
//   body: string; bodyStroke: string;
//   armrest: string;
//   back: string; backStroke: string;
//   curve: string; arc: string;
//   opacity: string;
// }> = {
//   // Green — available, no preference selected or no match
//   available: {
//     body: "#d1fae5", bodyStroke: "#34d399",
//     armrest: "#a7f3d0",
//     back: "#059669", backStroke: "#047857",
//     curve: "#34d399", arc: "#6ee7b7",
//     opacity: "1",
//   },
//   // Yellow/amber — FULL_MATCH (best match)
//   best_match: {
//     body: "#fef3c7", bodyStroke: "#f59e0b",
//     armrest: "#fde68a",
//     back: "#d97706", backStroke: "#b45309",
//     curve: "#f59e0b", arc: "#fcd34d",
//     opacity: "1",
//   },
//   // Green — PARTIAL_MATCH (same as available; badge distinguishes it in UI)
//   partial_match: {
//     body: "#d1fae5", bodyStroke: "#34d399",
//     armrest: "#a7f3d0",
//     back: "#059669", backStroke: "#047857",
//     curve: "#34d399", arc: "#6ee7b7",
//     opacity: "1",
//   },
//   // Blue — selected by user (overrides everything)
//   selected: {
//     body: "#dbeafe", bodyStroke: "#3b82f6",
//     armrest: "#bfdbfe",
//     back: "#1d4ed8", backStroke: "#1e40af",
//     curve: "#3b82f6", arc: "#93c5fd",
//     opacity: "1",
//   },
//   // Red/grey — booked or unavailable
//   booked: {
//     body: "#f3f4f6", bodyStroke: "#9ca3af",
//     armrest: "#e5e7eb",
//     back: "#6b7280", backStroke: "#4b5563",
//     curve: "#9ca3af", arc: "#d1d5db",
//     opacity: "0.75",
//   },
//   unavailable: {
//     body: "#f3f4f6", bodyStroke: "#9ca3af",
//     armrest: "#e5e7eb",
//     back: "#6b7280", backStroke: "#4b5563",
//     curve: "#9ca3af", arc: "#d1d5db",
//     opacity: "0.75",
//   },
//   // Green tint — your existing booking
//   yours: {
//     body: "#d1fae5", bodyStroke: "#10b981",
//     armrest: "#6ee7b7",
//     back: "#059669", backStroke: "#047857",
//     curve: "#10b981", arc: "#6ee7b7",
//     opacity: "1",
//   },
//   // Fallback
//   unloaded: {
//     body: "#f3f4f6", bodyStroke: "#9ca3af",
//     armrest: "#e5e7eb",
//     back: "#6b7280", backStroke: "#4b5563",
//     curve: "#9ca3af", arc: "#d1d5db",
//     opacity: "0.6",
//   },
// };

// // ─── Derive palette key from seat state ───────────────────────────────────────
// function getPaletteKey(seat: SeatWithSvgId, isSelected: boolean): string {
//   if (isSelected) return "selected";
//   if (seat.status !== "available" && seat.status !== "yours") {
//     return seat.status; // "booked" | "unavailable"
//   }
//   if (seat.status === "yours") return "yours";

//   // Available seat — check preference match
//   const match = seat.preferenceMatchStatus;
//   if (match === "FULL_MATCH" || seat.uiState === "BEST_MATCH") return "best_match";
//   if (match === "PARTIAL_MATCH") return "partial_match";
//   return "available";
// }

// // ─── Recolor one seat block inside the raw SVG string ────────────────────────
// function recolorSeat(svg: string, svgId: string, paletteKey: string): string {
//   const p = PALETTES[paletteKey] ?? PALETTES.unloaded;

//   const openTag = `<g id="${svgId}">`;
//   const start = svg.indexOf(openTag);
//   if (start === -1) return svg;

//   const end = svg.indexOf("</g>", start);
//   if (end === -1) return svg;

//   const before = svg.slice(0, start);
//   let block = svg.slice(start, end + 4);
//   const after = svg.slice(end + 4);

//   block = block.replace(
//     /fill="#C8C8C8" stroke="#888888"/g,
//     `fill="${p.body}" stroke="${p.bodyStroke}"`
//   );
//   block = block.replace(
//     /fill="#B0B0B0" stroke="#888888"/g,
//     `fill="${p.armrest}" stroke="${p.bodyStroke}"`
//   );
//   block = block.replace(
//     /fill="#616161" stroke="#424242"/g,
//     `fill="${p.back}" stroke="${p.backStroke}"`
//   );
//   block = block.replace(/stroke="#707070"/g, `stroke="${p.curve}"`);
//   block = block.replace(/stroke="#A0A0A0"/g, `stroke="${p.arc}"`);

//   const isClickable =
//     paletteKey === "available" ||
//     paletteKey === "best_match" ||
//     paletteKey === "partial_match" ||
//     paletteKey === "yours" ||
//     paletteKey === "selected";

//   block = block.replace(
//     `<g id="${svgId}">`,
//     `<g id="${svgId}" style="opacity:${p.opacity};cursor:${
//       isClickable ? "pointer" : "default"
//     }">`
//   );

//   return before + block + after;
// }

// // ─── Build fully-colored SVG string ──────────────────────────────────────────
// function buildColoredSvg(
//   rawSvg: string,
//   seats: SeatWithSvgId[],
//   selectedSeatId: string | null
// ): string {
//   const seatMap = new Map<string, SeatWithSvgId>();
//   seats.forEach((s) => seatMap.set(s.svgId, s));

//   let svg = rawSvg;
//   ALL_SVG_SEAT_IDS.forEach((svgId) => {
//     const seat = seatMap.get(svgId);
//     let key: string;
//     if (!seat) {
//       key = "unloaded";
//     } else {
//       key = getPaletteKey(seat, seat.id === selectedSeatId);
//     }
//     svg = recolorSeat(svg, svgId, key);
//   });
//   return svg;
// }

// // ─── Walk up the click target to find a seat svgId ───────────────────────────
// function getSvgIdFromClick(target: EventTarget | null): string | null {
//   let el = target as Element | null;
//   while (el) {
//     if (el.tagName?.toLowerCase() === "svg") return null;
//     const id = el.getAttribute("id");
//     if (id && ALL_SVG_SEAT_IDS.includes(id)) return id;
//     el = el.parentElement;
//   }
//   return null;
// }

// // ─── Tooltip data ─────────────────────────────────────────────────────────────
// interface TooltipState {
//   visible: boolean;
//   x: number;
//   y: number;
//   seat: SeatWithSvgId | null;
// }

// // ─── Seat Tooltip Component ───────────────────────────────────────────────────
// const SeatTooltip: React.FC<{ tooltip: TooltipState; containerRect: DOMRect | null }> = ({
//   tooltip,
//   containerRect,
// }) => {
//   if (!tooltip.visible || !tooltip.seat || !containerRect) return null;

//   const seat = tooltip.seat;

//   const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
//     available:   { label: "Available",   color: "#059669", bg: "#d1fae5" },
//     booked:      { label: "Booked",      color: "#6b7280", bg: "#f3f4f6" },
//     unavailable: { label: "Unavailable", color: "#6b7280", bg: "#f3f4f6" },
//     yours:       { label: "Your Booking",color: "#059669", bg: "#d1fae5" },
//   };

//   const matchConfig: Record<string, { label: string; color: string; bg: string; icon: string }> = {
//     FULL_MATCH:    { label: "Best Match",     color: "#b45309", bg: "#fef3c7", icon: "⭐" },
//     PARTIAL_MATCH: { label: "Partial Match",  color: "#047857", bg: "#dcfce7", icon: "✦" },
//     NO_MATCH:      { label: "No Match",       color: "#6b7280", bg: "#f3f4f6", icon: "" },
//   };

//   const sc = statusConfig[seat.status] ?? statusConfig.unavailable;
//   const mc = seat.preferenceMatchStatus ? matchConfig[seat.preferenceMatchStatus] : null;

//   // Position tooltip — stay within container
//   const TIP_W = 220;
//   const TIP_H = 180; // rough estimate
//   const PADDING = 12;

//   let left = tooltip.x + 14;
//   let top = tooltip.y - 10;

//   if (left + TIP_W > containerRect.width - PADDING) {
//     left = tooltip.x - TIP_W - 14;
//   }
//   if (top + TIP_H > containerRect.height - PADDING) {
//     top = containerRect.height - TIP_H - PADDING;
//   }
//   if (top < PADDING) top = PADDING;

//   return (
//     <div
//       style={{
//         position: "absolute",
//         left,
//         top,
//         width: TIP_W,
//         pointerEvents: "none",
//         zIndex: 50,
//       }}
//     >
//       {/* Arrow */}
//       <div
//         style={{
//           position: "absolute",
//           left: left < tooltip.x ? "auto" : -6,
//           right: left < tooltip.x ? -6 : "auto",
//           top: 16,
//           width: 12,
//           height: 12,
//           background: "white",
//           border: "1px solid #e5e7eb",
//           borderRight: left < tooltip.x ? "1px solid #e5e7eb" : "none",
//           borderBottom: left < tooltip.x ? "1px solid #e5e7eb" : "none",
//           borderLeft: left < tooltip.x ? "none" : "1px solid #e5e7eb",
//           borderTop: left < tooltip.x ? "none" : "1px solid #e5e7eb",
//           transform: left < tooltip.x ? "rotate(-45deg)" : "rotate(135deg)",
//         }}
//       />

//       {/* Card */}
//       <div
//         style={{
//           background: "white",
//           border: "1px solid #e5e7eb",
//           borderRadius: 12,
//           padding: "12px 14px",
//           boxShadow: "0 8px 24px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)",
//           fontFamily: "'DM Sans', 'Outfit', system-ui, sans-serif",
//         }}
//       >
//         {/* Seat label + status badge */}
//         <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
//           <div>
//             <div style={{ fontSize: 13, fontWeight: 700, color: "#111827", letterSpacing: "-0.01em" }}>
//               {seat.label}
//             </div>
//             {seat.status === "yours" && (
//               <div style={{ fontSize: 10, color: "#6b7280", marginTop: 1 }}>Your booking</div>
//             )}
//           </div>
//           <span
//             style={{
//               fontSize: 10,
//               fontWeight: 600,
//               color: sc.color,
//               background: sc.bg,
//               borderRadius: 6,
//               padding: "2px 7px",
//               letterSpacing: "0.02em",
//               textTransform: "uppercase",
//             }}
//           >
//             {sc.label}
//           </span>
//         </div>

//         {/* Preference match badge */}
//         {mc && seat.preferenceMatchStatus !== "NO_MATCH" && (
//           <div
//             style={{
//               display: "flex",
//               alignItems: "center",
//               gap: 5,
//               background: mc.bg,
//               borderRadius: 7,
//               padding: "4px 9px",
//               marginBottom: 8,
//             }}
//           >
//             {mc.icon && (
//               <span style={{ fontSize: 11 }}>{mc.icon}</span>
//             )}
//             <span style={{ fontSize: 11, fontWeight: 600, color: mc.color }}>
//               {mc.label}
//             </span>
//             {seat.matchedAmenityCount !== undefined && seat.requestedAmenityCount !== undefined && (
//               <span style={{ fontSize: 10, color: mc.color, opacity: 0.8, marginLeft: "auto" }}>
//                 {seat.matchedAmenityCount}/{seat.requestedAmenityCount} pref
//               </span>
//             )}
//           </div>
//         )}

//         {/* Divider */}
//         {(seat.amenities.length > 0 || (seat.matchedAmenityNames ?? []).length > 0) && (
//           <div style={{ borderTop: "1px solid #f3f4f6", marginBottom: 8 }} />
//         )}

//         {/* Matched amenities */}
//         {(seat.matchedAmenityNames ?? []).length > 0 && (
//           <div style={{ marginBottom: 6 }}>
//             <div style={{ fontSize: 10, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
//               Matched
//             </div>
//             <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
//               {(seat.matchedAmenityNames ?? []).map((name) => (
//                 <span
//                   key={name}
//                   style={{
//                     fontSize: 10,
//                     fontWeight: 500,
//                     color: "#047857",
//                     background: "#d1fae5",
//                     borderRadius: 5,
//                     padding: "2px 7px",
//                   }}
//                 >
//                   ✓ {name}
//                 </span>
//               ))}
//             </div>
//           </div>
//         )}

//         {/* All amenities */}
//         {seat.amenities.length > 0 && (
//           <div>
//             <div style={{ fontSize: 10, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
//               Amenities
//             </div>
//             <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
//               {seat.amenities.map((a) => {
//                 const isMatched = (seat.matchedAmenityNames ?? [])
//                   .map((n) => n.toLowerCase())
//                   .some((n) => n.includes(a) || a.includes(n));
//                 return (
//                   <span
//                     key={a}
//                     style={{
//                       fontSize: 10,
//                       fontWeight: 500,
//                       color: isMatched ? "#047857" : "#374151",
//                       background: isMatched ? "#d1fae5" : "#f3f4f6",
//                       borderRadius: 5,
//                       padding: "2px 7px",
//                       textTransform: "capitalize",
//                     }}
//                   >
//                     {a}
//                   </span>
//                 );
//               })}
//             </div>
//           </div>
//         )}

//         {/* Click hint for selectable seats */}
//         {(seat.status === "available" || seat.status === "yours") && (
//           <div
//             style={{
//               marginTop: 8,
//               fontSize: 10,
//               color: "#9ca3af",
//               textAlign: "center",
//             }}
//           >
//             Click to {seat.status === "yours" ? "view" : "select"}
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// // ─── Props ────────────────────────────────────────────────────────────────────
// interface SvgFloorMapPageProps {
//   seats: SeatWithSvgId[];
//   selectedSeatId: string | null;
//   onSeatSelect: (seatId: string | null) => void;
//   loading?: boolean;
//   siteName?: string;
//   buildingName?: string;
//   floorName?: string;
// }

// // ─── Component ────────────────────────────────────────────────────────────────
// export const SvgFloorMapPage: React.FC<SvgFloorMapPageProps> = ({
//   seats,
//   selectedSeatId,
//   onSeatSelect,
//   loading = false,
// }) => {
//   const wrapperRef   = useRef<HTMLDivElement>(null);
//   const transformRef = useRef<HTMLDivElement>(null);

//   const scaleRef     = useRef(1);
//   const translateRef = useRef({ x: 0, y: 0 });
//   const isPanning    = useRef(false);
//   const panStart     = useRef({ x: 0, y: 0 });
//   const mouseDownPos = useRef({ x: 0, y: 0 });
//   const didDrag      = useRef(false);
//   const fitDoneRef   = useRef(false);

//   const [rawSvg,      setRawSvg]      = useState<string | null>(null);
//   const [svgError,    setSvgError]    = useState(false);
//   const [zoomDisplay, setZoomDisplay] = useState(100);
//   const [mapReady,    setMapReady]    = useState(false);

//   const [tooltip, setTooltip] = useState<TooltipState>({
//     visible: false,
//     x: 0,
//     y: 0,
//     seat: null,
//   });
//   const [containerRect, setContainerRect] = useState<DOMRect | null>(null);
//   const tooltipTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

//   const coloredSvg =
//     rawSvg && !loading && seats.length > 0
//       ? buildColoredSvg(rawSvg, seats, selectedSeatId)
//       : null;

//   // ── Fetch raw SVG once ────────────────────────────────────────────────────
//   useEffect(() => {
//     fetch("/floor-IT.svg")
//       .then((r) => {
//         if (!r.ok) throw new Error(`HTTP ${r.status}`);
//         return r.text();
//       })
//       .then(setRawSvg)
//       .catch(() => setSvgError(true));
//   }, []);

//   // ── applyTransform ────────────────────────────────────────────────────────
//   const applyTransform = useCallback(() => {
//     const el = transformRef.current;
//     if (!el) return;
//     el.style.transform = `translate(${translateRef.current.x}px,${translateRef.current.y}px) scale(${scaleRef.current})`;
//   }, []);

//   // ── fitView ───────────────────────────────────────────────────────────────
//   const fitView = useCallback(() => {
//     const wrapper = wrapperRef.current;
//     if (!wrapper) return;
//     const { width: wW, height: wH } = wrapper.getBoundingClientRect();
//     if (wW === 0 || wH === 0) return;
//     const scale = Math.min(wW / SVG_W, wH / SVG_H);
//     scaleRef.current = scale;
//     translateRef.current = {
//       x: (wW - SVG_W * scale) / 2,
//       y: (wH - SVG_H * scale) / 2,
//     };
//     applyTransform();
//     setZoomDisplay(Math.round(scale * 100));
//   }, [applyTransform]);

//   // ── ResizeObserver ────────────────────────────────────────────────────────
//   useEffect(() => {
//     const wrapper = wrapperRef.current;
//     if (!wrapper || !rawSvg) return;
//     const observer = new ResizeObserver((entries) => {
//       for (const entry of entries) {
//         const { width, height } = entry.contentRect;
//         if (width > 0 && height > 0) fitView();
//       }
//     });
//     observer.observe(wrapper);
//     return () => observer.disconnect();
//   }, [rawSvg, fitView]);

//   // ── Reveal map ────────────────────────────────────────────────────────────
//   useEffect(() => {
//     if (!rawSvg || loading) {
//       setMapReady(false);
//       fitDoneRef.current = false;
//       return;
//     }
//     const id = requestAnimationFrame(() => {
//       fitView();
//       fitDoneRef.current = true;
//       setMapReady(true);
//     });
//     return () => cancelAnimationFrame(id);
//   }, [rawSvg, loading, fitView]);

//   useEffect(() => {
//     if (loading) {
//       setMapReady(false);
//       fitDoneRef.current = false;
//     }
//   }, [loading]);

//   // ── Zoom step ─────────────────────────────────────────────────────────────
//   const zoomStep = useCallback(
//     (factor: number) => {
//       const wrapper = wrapperRef.current;
//       if (!wrapper) return;
//       const { width: wW, height: wH } = wrapper.getBoundingClientRect();
//       const oldScale = scaleRef.current;
//       const newScale = Math.min(Math.max(oldScale * factor, 0.05), 4);
//       const cx = wW / 2,
//         cy = wH / 2;
//       translateRef.current = {
//         x: cx - (cx - translateRef.current.x) * (newScale / oldScale),
//         y: cy - (cy - translateRef.current.y) * (newScale / oldScale),
//       };
//       scaleRef.current = newScale;
//       applyTransform();
//       setZoomDisplay(Math.round(newScale * 100));
//     },
//     [applyTransform]
//   );

//   const zoomIn  = useCallback(() => zoomStep(1.25),     [zoomStep]);
//   const zoomOut = useCallback(() => zoomStep(1 / 1.25), [zoomStep]);

//   // ── Wheel zoom ────────────────────────────────────────────────────────────
//   useEffect(() => {
//     const el = wrapperRef.current;
//     if (!el) return;
//     const handler = (e: WheelEvent) => {
//       e.preventDefault();
//       const factor   = e.deltaY < 0 ? 1.1 : 1 / 1.1;
//       const oldScale = scaleRef.current;
//       const newScale = Math.min(Math.max(oldScale * factor, 0.05), 4);
//       const rect     = el.getBoundingClientRect();
//       translateRef.current = {
//         x:
//           e.clientX -
//           rect.left -
//           (e.clientX - rect.left - translateRef.current.x) *
//             (newScale / oldScale),
//         y:
//           e.clientY -
//           rect.top -
//           (e.clientY - rect.top - translateRef.current.y) *
//             (newScale / oldScale),
//       };
//       scaleRef.current = newScale;
//       applyTransform();
//       setZoomDisplay(Math.round(newScale * 100));
//     };
//     el.addEventListener("wheel", handler, { passive: false });
//     return () => el.removeEventListener("wheel", handler);
//   }, [applyTransform]);

//   // ── Pan handlers ──────────────────────────────────────────────────────────
//   const onMouseDown = (e: React.MouseEvent) => {
//     isPanning.current    = true;
//     didDrag.current      = false;
//     mouseDownPos.current = { x: e.clientX, y: e.clientY };
//     panStart.current     = { ...translateRef.current };
//     (e.currentTarget as HTMLElement).style.cursor = "grabbing";
//     hideTooltip();
//   };

//   const onMouseMove = (e: React.MouseEvent) => {
//     if (!isPanning.current) return;
//     const dx = e.clientX - mouseDownPos.current.x;
//     const dy = e.clientY - mouseDownPos.current.y;
//     if (!didDrag.current && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
//       didDrag.current = true;
//     }
//     if (didDrag.current) {
//       translateRef.current = {
//         x: panStart.current.x + dx,
//         y: panStart.current.y + dy,
//       };
//       applyTransform();
//     }
//   };

//   const onMouseUp = (e: React.MouseEvent) => {
//     isPanning.current = false;
//     (e.currentTarget as HTMLElement).style.cursor = "grab";
//   };

//   // ── Tooltip helpers ───────────────────────────────────────────────────────
//   const hideTooltip = useCallback(() => {
//     if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);
//     setTooltip((t) => ({ ...t, visible: false, seat: null }));
//   }, []);

//   const showTooltipForSvgId = useCallback(
//     (svgId: string, x: number, y: number) => {
//       const seat = seats.find((s) => s.svgId === svgId);
//       if (!seat) return;
//       if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);
//       setTooltip({ visible: true, x, y, seat });
//     },
//     [seats]
//   );

//   // ── Hover on SVG → tooltip ────────────────────────────────────────────────
//   const onMapMouseMove = (e: React.MouseEvent) => {
//     if (isPanning.current && didDrag.current) return;
//     // Update container rect for positioning
//     if (!containerRect && wrapperRef.current) {
//       setContainerRect(wrapperRef.current.getBoundingClientRect());
//     }

//     const svgId = getSvgIdFromClick(e.target);
//     if (!svgId) {
//       // Hovering over empty space — delay hide so tooltip doesn't flicker
//       if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);
//       tooltipTimeoutRef.current = setTimeout(hideTooltip, 120);
//       return;
//     }

//     const wrapper = wrapperRef.current;
//     if (!wrapper) return;
//     const rect = wrapper.getBoundingClientRect();
//     const x    = e.clientX - rect.left;
//     const y    = e.clientY - rect.top;

//     showTooltipForSvgId(svgId, x, y);
//     setContainerRect(rect);
//   };

//   const onMapMouseLeave = (e: React.MouseEvent) => {
//     onMouseUp(e);
//     tooltipTimeoutRef.current = setTimeout(hideTooltip, 200);
//   };

//   // ── Click on SVG → select / deselect seat ────────────────────────────────
//   const onMapClick = (e: React.MouseEvent) => {
//     if (didDrag.current) {
//       didDrag.current = false;
//       return;
//     }

//     const svgId = getSvgIdFromClick(e.target);
//     if (!svgId) return;

//     const seat = seats.find((s) => s.svgId === svgId);
//     if (!seat) return;

//     if (seat.status !== "available" && seat.status !== "yours") return;

//     if (seat.id === selectedSeatId) {
//       onSeatSelect(null);
//     } else {
//       onSeatSelect(seat.id);
//     }
//   };

//   // ── Derived counts for legend ─────────────────────────────────────────────
//   const hasPreferences = seats.some(
//     (s) =>
//       s.preferenceMatchStatus === "FULL_MATCH" ||
//       s.preferenceMatchStatus === "PARTIAL_MATCH"
//   );

//   const bestMatchCount    = seats.filter((s) => s.preferenceMatchStatus === "FULL_MATCH" && s.status === "available").length;
//   const partialMatchCount = seats.filter((s) => s.preferenceMatchStatus === "PARTIAL_MATCH" && s.status === "available").length;
//   const availableCount    = seats.filter((s) => s.status === "available").length;

//   const showSpinner = !rawSvg || loading || !mapReady;

//   // ─── Render ───────────────────────────────────────────────────────────────
//   return (
//     <div
//       className="relative bg-[#F7F8FC] border border-[#EBEBF5] rounded-xl overflow-hidden"
//       style={{ width: "100%", height: 520 }}
//     >
//       {/* Zoom controls */}
//       {mapReady && (
//         <div className="absolute top-3 right-3 z-20 flex flex-col gap-1.5">
//           {(
//             [
//               { icon: <ZoomIn size={14} />,    action: zoomIn,  title: "Zoom in"     },
//               { icon: <ZoomOut size={14} />,   action: zoomOut, title: "Zoom out"    },
//               { icon: <Maximize2 size={14} />, action: fitView, title: "Fit to view" },
//             ] as const
//           ).map(({ icon, action, title }) => (
//             <button
//               key={title}
//               onClick={(e) => { e.stopPropagation(); action(); }}
//               title={title}
//               className="w-8 h-8 rounded-lg bg-white border border-[#EBEBF5] shadow-sm flex items-center justify-center hover:bg-gray-50 text-gray-600 transition-colors"
//             >
//               {icon}
//             </button>
//           ))}
//         </div>
//       )}

//       {/* Zoom % */}
//       {mapReady && (
//         <div className="absolute top-3 left-3 z-20 text-[10px] font-semibold text-gray-400 bg-white/80 px-2 py-1 rounded-md border border-[#EBEBF5] select-none tabular-nums">
//           {zoomDisplay}%
//         </div>
//       )}

//       {/* Legend */}
//       {mapReady && (
//         <div className="absolute bottom-8 left-3 z-20 flex items-center gap-3 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg border border-[#EBEBF5] shadow-sm select-none flex-wrap max-w-[calc(100%-1.5rem)]">
//           {hasPreferences && (
//             <span className="flex items-center gap-1.5 text-[10px] text-gray-600 font-medium">
//               <span className="w-2.5 h-2.5 rounded-full inline-block bg-amber-400 ring-1 ring-amber-500" />
//               Best Match
//               {bestMatchCount > 0 && (
//                 <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-semibold">
//                   {bestMatchCount}
//                 </span>
//               )}
//             </span>
//           )}
//           <span className="flex items-center gap-1.5 text-[10px] text-gray-600 font-medium">
//             <span className="w-2.5 h-2.5 rounded-full inline-block bg-emerald-500" />
//             Available
//             {availableCount > 0 && (
//               <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-semibold">
//                 {availableCount}
//               </span>
//             )}
//           </span>
//           {hasPreferences && partialMatchCount > 0 && (
//             <span className="flex items-center gap-1.5 text-[10px] text-gray-600 font-medium">
//               <span className="relative w-2.5 h-2.5 inline-block">
//                 <span className="absolute inset-0 rounded-full bg-emerald-500" />
//                 <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-amber-400 border border-white" />
//               </span>
//               Partial Match
//               <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-semibold">
//                 {partialMatchCount}
//               </span>
//             </span>
//           )}
//           <span className="flex items-center gap-1.5 text-[10px] text-gray-600 font-medium">
//             <span className="w-2.5 h-2.5 rounded-full inline-block bg-gray-400" />
//             Unavailable
//           </span>
//           <span className="flex items-center gap-1.5 text-[10px] text-gray-600 font-medium">
//             <span className="w-2.5 h-2.5 rounded-full inline-block bg-blue-500" />
//             Selected
//           </span>
//         </div>
//       )}

//       {/* Hint */}
//       {mapReady && (
//         <div className="absolute bottom-2 left-3 z-20 text-[10px] text-gray-400 bg-white/80 px-2 py-1 rounded-md border border-[#EBEBF5] select-none">
//           Scroll to zoom · Drag to pan · Click a seat to select
//         </div>
//       )}

//       {/* Map viewport */}
//       <div
//         ref={wrapperRef}
//         className="w-full h-full overflow-hidden select-none"
//         onMouseDown={onMouseDown}
//         onMouseMove={(e) => {
//           onMouseMove(e);
//           onMapMouseMove(e);
//         }}
//         onMouseUp={onMouseUp}
//         onMouseLeave={onMapMouseLeave}
//         onClick={onMapClick}
//         style={{ cursor: "grab" }}
//       >
//         {/* Spinner */}
//         {showSpinner && !svgError && (
//           <div className="absolute inset-0 flex items-center justify-center bg-[#F7F8FC] z-10">
//             <div className="flex flex-col items-center gap-3">
//               <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
//               <p className="text-[12.5px] text-gray-400">Loading floor plan…</p>
//             </div>
//           </div>
//         )}

//         {/* Error state */}
//         {svgError && (
//           <div className="absolute inset-0 flex items-center justify-center">
//             <div className="text-center">
//               <p className="text-[13px] text-gray-500 mb-1">Floor plan unavailable</p>
//               <p className="text-[11.5px] text-gray-400">
//                 Place SVG at{" "}
//                 <code className="bg-gray-100 px-1 rounded">/public/floor-IT.svg</code>
//               </p>
//             </div>
//           </div>
//         )}

//         {/* SVG map */}
//         {coloredSvg && (
//           <div
//             ref={transformRef}
//             style={{
//               transformOrigin: "top left",
//               width: `${SVG_W}px`,
//               height: `${SVG_H}px`,
//               willChange: "transform",
//               visibility: mapReady ? "visible" : "hidden",
//             }}
//             dangerouslySetInnerHTML={{ __html: coloredSvg }}
//           />
//         )}

//         {/* Tooltip — rendered inside map viewport for correct positioning */}
//         <SeatTooltip tooltip={tooltip} containerRect={containerRect} />
//       </div>
//     </div>
//   );
// };

// export default SvgFloorMapPage;

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Maximize2, ZoomIn, ZoomOut } from "lucide-react";
import { Seat } from "../types/Bookingform.types";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface SeatWithSvgId extends Seat {}

// ─── All seat <g> ids present in floor-IT.svg ────────────────────────────────
const ALL_SVG_SEAT_IDS = [
  "1","2","3","4","5","6","7","8","9","10",
  "11","12","13","14","15","16","17","18","19","20",
  "21","22","23","s24","25","26","27","28","29","30","31",
];

const SVG_W = 2466;
const SVG_H = 2039;

// ─── Color palettes ───────────────────────────────────────────────────────────
//
// Rendering rules:
//   status != available         → grey  (unavailable / booked)
//   FULL_MATCH + available      → yellow/amber (best match)
//   PARTIAL_MATCH + available   → green with badge
//   available (no match)        → green
//   selected                    → blue  (always overrides)
//   yours                       → green (existing booking)

const PALETTES: Record<string, {
  body: string; bodyStroke: string;
  armrest: string;
  back: string; backStroke: string;
  curve: string; arc: string;
  opacity: string;
}> = {
  available: {
    body: "#d1fae5", bodyStroke: "#34d399",
    armrest: "#a7f3d0",
    back: "#059669", backStroke: "#047857",
    curve: "#34d399", arc: "#6ee7b7",
    opacity: "1",
  },
  // best_match: {
  //   body: "#fef3c7", bodyStroke: "#f59e0b",
  //   armrest: "#fde68a",
  //   back: "#d97706", backStroke: "#b45309",
  //   curve: "#f59e0b", arc: "#fcd34d",
  //   opacity: "1",
  // },
  best_match: {
  body: "#facc15",         // dark rich yellow
  bodyStroke: "#eab308",   // yellow-500

  armrest: "#fde047",      // yellow-300

  back: "#a16207",         // yellow-700
  backStroke: "#854d0e",   // yellow-800

  curve: "#ca8a04",        // yellow-600
  arc: "#fbbf24",          // amber-400

  opacity: "1",
},
  // partial_match: {
  //   body: "#d1fae5", bodyStroke: "#34d399",
  //   armrest: "#a7f3d0",
  //   back: "#059669", backStroke: "#047857",
  //   curve: "#34d399", arc: "#6ee7b7",
  //   opacity: "1",
  // },
  partial_match: {
  body: "#fefce8",          // lighter yellow
  bodyStroke: "#facc15",   // yellow-400

  armrest: "#fef9c3",      // yellow-100

  back: "#eab308",         // yellow-500
  backStroke: "#ca8a04",   // yellow-600

  curve: "#facc15",        // yellow-400
  arc: "#fef08a",          // yellow-200

  opacity: "1",
},

  selected: {
    body: "#dbeafe", bodyStroke: "#3b82f6",
    armrest: "#bfdbfe",
    back: "#1d4ed8", backStroke: "#1e40af",
    curve: "#3b82f6", arc: "#93c5fd",
    opacity: "1",
  },
  booked: {
    body: "#f3f4f6", bodyStroke: "#9ca3af",
    armrest: "#e5e7eb",
    back: "#6b7280", backStroke: "#4b5563",
    curve: "#9ca3af", arc: "#d1d5db",
    opacity: "0.75",
  },
  unavailable: {
    body: "#f3f4f6", bodyStroke: "#9ca3af",
    armrest: "#e5e7eb",
    back: "#6b7280", backStroke: "#4b5563",
    curve: "#9ca3af", arc: "#d1d5db",
    opacity: "0.75",
  },
  yours: {
    body: "#d1fae5", bodyStroke: "#10b981",
    armrest: "#6ee7b7",
    back: "#059669", backStroke: "#047857",
    curve: "#10b981", arc: "#6ee7b7",
    opacity: "1",
  },
  unloaded: {
    body: "#f3f4f6", bodyStroke: "#9ca3af",
    armrest: "#e5e7eb",
    back: "#6b7280", backStroke: "#4b5563",
    curve: "#9ca3af", arc: "#d1d5db",
    opacity: "0.6",
  },
};

// ─── Derive palette key from seat state ───────────────────────────────────────
function getPaletteKey(seat: SeatWithSvgId, isSelected: boolean): string {
  if (isSelected) return "selected";
  if (seat.status !== "available" && seat.status !== "yours") {
    return seat.status; // "booked" | "unavailable"
  }
  if (seat.status === "yours") return "yours";

  const match = seat.preferenceMatchStatus;
  if (match === "FULL_MATCH" || seat.uiState === "BEST_MATCH") return "best_match";
  if (match === "PARTIAL_MATCH") return "partial_match";
  return "available";
}

// ─── Recolor one seat block inside the raw SVG string ────────────────────────
function recolorSeat(svg: string, svgId: string, paletteKey: string): string {
  const p = PALETTES[paletteKey] ?? PALETTES.unloaded;

  const openTag = `<g id="${svgId}">`;
  const start = svg.indexOf(openTag);
  if (start === -1) return svg;

  const end = svg.indexOf("</g>", start);
  if (end === -1) return svg;

  const before = svg.slice(0, start);
  let block = svg.slice(start, end + 4);
  const after = svg.slice(end + 4);

  block = block.replace(
    /fill="#C8C8C8" stroke="#888888"/g,
    `fill="${p.body}" stroke="${p.bodyStroke}"`
  );
  block = block.replace(
    /fill="#B0B0B0" stroke="#888888"/g,
    `fill="${p.armrest}" stroke="${p.bodyStroke}"`
  );
  block = block.replace(
    /fill="#616161" stroke="#424242"/g,
    `fill="${p.back}" stroke="${p.backStroke}"`
  );
  block = block.replace(/stroke="#707070"/g, `stroke="${p.curve}"`);
  block = block.replace(/stroke="#A0A0A0"/g, `stroke="${p.arc}"`);

  const isClickable =
    paletteKey === "available" ||
    paletteKey === "best_match" ||
    paletteKey === "partial_match" ||
    paletteKey === "yours" ||
    paletteKey === "selected";

  block = block.replace(
    `<g id="${svgId}">`,
    `<g id="${svgId}" style="opacity:${p.opacity};cursor:${
      isClickable ? "pointer" : "default"
    }">`
  );

  return before + block + after;
}

// ─── Build fully-colored SVG string ──────────────────────────────────────────
function buildColoredSvg(
  rawSvg: string,
  seats: SeatWithSvgId[],
  selectedSeatId: string | null
): string {
  const seatMap = new Map<string, SeatWithSvgId>();
  seats.forEach((s) => seatMap.set(s.svgId, s));

  let svg = rawSvg;
  ALL_SVG_SEAT_IDS.forEach((svgId) => {
    const seat = seatMap.get(svgId);
    const key = !seat
      ? "unloaded"
      : getPaletteKey(seat, seat.id === selectedSeatId);
    svg = recolorSeat(svg, svgId, key);
  });
  return svg;
}

// ─── Walk up the click target to find a seat svgId ───────────────────────────
function getSvgIdFromClick(target: EventTarget | null): string | null {
  let el = target as Element | null;
  while (el) {
    if (el.tagName?.toLowerCase() === "svg") return null;
    const id = el.getAttribute("id");
    if (id && ALL_SVG_SEAT_IDS.includes(id)) return id;
    el = el.parentElement;
  }
  return null;
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────
interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  seat: SeatWithSvgId | null;
}

const SeatTooltip: React.FC<{
  tooltip: TooltipState;
  containerRect: DOMRect | null;
}> = ({ tooltip, containerRect }) => {
  if (!tooltip.visible || !tooltip.seat || !containerRect) return null;

  const seat = tooltip.seat;

  const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
    available:   { label: "Available",    color: "#059669", bg: "#d1fae5" },
    booked:      { label: "Booked",       color: "#6b7280", bg: "#f3f4f6" },
    unavailable: { label: "Unavailable",  color: "#6b7280", bg: "#f3f4f6" },
    yours:       { label: "Your Booking", color: "#059669", bg: "#d1fae5" },
  };

  const matchConfig: Record<string, { label: string; color: string; bg: string; icon: string }> = {
    FULL_MATCH:    { label: "Best Match",    color: "#b45309", bg: "#fef3c7", icon: "⭐" },
    PARTIAL_MATCH: { label: "Partial Match", color: "#b45309", bg: "#fefce8", icon: "✦"  },
    NO_MATCH:      { label: "No Match",      color: "#6b7280", bg: "#f3f4f6", icon: ""   },
  };

  const sc = statusConfig[seat.status] ?? statusConfig.unavailable;
  const mc = seat.preferenceMatchStatus ? matchConfig[seat.preferenceMatchStatus] : null;

  const TIP_W  = 220;
  const TIP_H  = 180;
  const PADDING = 12;

  let left = tooltip.x + 14;
  let top  = tooltip.y - 10;

  if (left + TIP_W > containerRect.width - PADDING) left = tooltip.x - TIP_W - 14;
  if (top + TIP_H > containerRect.height - PADDING) top  = containerRect.height - TIP_H - PADDING;
  if (top < PADDING) top = PADDING;

  const arrowOnRight = left < tooltip.x;

  return (
    <div
      style={{
        position: "absolute",
        left,
        top,
        width: TIP_W,
        pointerEvents: "none",
        zIndex: 50,
      }}
    >
      {/* Arrow */}
      <div
        style={{
          position: "absolute",
          left:  arrowOnRight ? "auto" : -6,
          right: arrowOnRight ? -6    : "auto",
          top: 16,
          width: 12,
          height: 12,
          background: "white",
          border: "1px solid #e5e7eb",
          borderRight:  arrowOnRight ? "1px solid #e5e7eb" : "none",
          borderBottom: arrowOnRight ? "1px solid #e5e7eb" : "none",
          borderLeft:   arrowOnRight ? "none" : "1px solid #e5e7eb",
          borderTop:    arrowOnRight ? "none" : "1px solid #e5e7eb",
          transform: arrowOnRight ? "rotate(-45deg)" : "rotate(135deg)",
        }}
      />

      {/* Card */}
      <div
        style={{
          background: "white",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: "12px 14px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)",
          fontFamily: "'DM Sans', 'Outfit', system-ui, sans-serif",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#111827", letterSpacing: "-0.01em" }}>
              {seat.label}
            </div>
            {seat.status === "yours" && (
              <div style={{ fontSize: 10, color: "#6b7280", marginTop: 1 }}>Your booking</div>
            )}
          </div>
          <span
            style={{
              fontSize: 10, fontWeight: 600,
              color: sc.color, background: sc.bg,
              borderRadius: 6, padding: "2px 7px",
              letterSpacing: "0.02em", textTransform: "uppercase",
            }}
          >
            {sc.label}
          </span>
        </div>

        {/* Preference match badge */}
        {mc && seat.preferenceMatchStatus !== "NO_MATCH" && (
          <div
            style={{
              display: "flex", alignItems: "center", gap: 5,
              background: mc.bg, borderRadius: 7,
              padding: "4px 9px", marginBottom: 8,
            }}
          >
            {mc.icon && <span style={{ fontSize: 11 }}>{mc.icon}</span>}
            <span style={{ fontSize: 11, fontWeight: 600, color: mc.color }}>{mc.label}</span>
            {seat.matchedAmenityCount !== undefined && seat.requestedAmenityCount !== undefined && (
              <span style={{ fontSize: 10, color: mc.color, opacity: 0.8, marginLeft: "auto" }}>
                {seat.matchedAmenityCount}/{seat.requestedAmenityCount} pref
              </span>
            )}
          </div>
        )}

        {/* Divider */}
        {(seat.amenities.length > 0 || (seat.matchedAmenityNames ?? []).length > 0) && (
          <div style={{ borderTop: "1px solid #f3f4f6", marginBottom: 8 }} />
        )}

        {/* Matched amenities */}
        {(seat.matchedAmenityNames ?? []).length > 0 && (
          <div style={{ marginBottom: 6 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
              Matched
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {(seat.matchedAmenityNames ?? []).map((name) => (
                <span key={name} style={{ fontSize: 10, fontWeight: 500, color: "#047857", background: "#d1fae5", borderRadius: 5, padding: "2px 7px" }}>
                  ✓ {name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* All amenities */}
        {seat.amenities.length > 0 && (
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
              Amenities
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {seat.amenities.map((a) => {
                const isMatched = (seat.matchedAmenityNames ?? [])
                  .map((n) => n.toLowerCase())
                  .some((n) => n.includes(a) || a.includes(n));
                return (
                  <span
                    key={a}
                    style={{
                      fontSize: 10, fontWeight: 500,
                      color: isMatched ? "#047857" : "#374151",
                      background: isMatched ? "#d1fae5" : "#f3f4f6",
                      borderRadius: 5, padding: "2px 7px",
                      textTransform: "capitalize",
                    }}
                  >
                    {a}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Click hint */}
        {(seat.status === "available" || seat.status === "yours") && (
          <div style={{ marginTop: 8, fontSize: 10, color: "#9ca3af", textAlign: "center" }}>
            Click to {seat.status === "yours" ? "view" : "select"}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Props ────────────────────────────────────────────────────────────────────
interface SvgFloorMapPageProps {
  seats: SeatWithSvgId[];
  selectedSeatId: string | null;
  onSeatSelect: (seatId: string | null) => void;
  loading?: boolean;
  siteName?: string;
  buildingName?: string;
  floorName?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────
export const SvgFloorMapPage: React.FC<SvgFloorMapPageProps> = ({
  seats,
  selectedSeatId,
  onSeatSelect,
  loading = false,
}) => {
  const wrapperRef   = useRef<HTMLDivElement>(null);
  const transformRef = useRef<HTMLDivElement>(null);

  const scaleRef     = useRef(1);
  const translateRef = useRef({ x: 0, y: 0 });
  const isPanning    = useRef(false);
  const panStart     = useRef({ x: 0, y: 0 });
  const mouseDownPos = useRef({ x: 0, y: 0 });
  const didDrag      = useRef(false);
  const fitDoneRef   = useRef(false);

  const [rawSvg,      setRawSvg]      = useState<string | null>(null);
  const [svgError,    setSvgError]    = useState(false);
  const [zoomDisplay, setZoomDisplay] = useState(100);
  const [mapReady,    setMapReady]    = useState(false);

  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false, x: 0, y: 0, seat: null,
  });
  // ✅ Store containerRect in a ref — avoids re-renders on every mouse move
  const containerRectRef    = useRef<DOMRect | null>(null);
  const tooltipTimeoutRef   = useRef<ReturnType<typeof setTimeout> | null>(null);

  const coloredSvg =
    rawSvg && !loading && seats.length > 0
      ? buildColoredSvg(rawSvg, seats, selectedSeatId)
      : null;

  // ── Fetch raw SVG once ────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/floor-IT.svg")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      })
      .then(setRawSvg)
      .catch(() => setSvgError(true));
  }, []);

  // ── applyTransform ────────────────────────────────────────────────────────
  const applyTransform = useCallback(() => {
    const el = transformRef.current;
    if (!el) return;
    el.style.transform = `translate(${translateRef.current.x}px,${translateRef.current.y}px) scale(${scaleRef.current})`;
  }, []);

  // ── fitView ───────────────────────────────────────────────────────────────
  const fitView = useCallback(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const { width: wW, height: wH } = wrapper.getBoundingClientRect();
    if (wW === 0 || wH === 0) return;
    const scale = Math.min(wW / SVG_W, wH / SVG_H);
    scaleRef.current = scale;
    translateRef.current = {
      x: (wW - SVG_W * scale) / 2,
      y: (wH - SVG_H * scale) / 2,
    };
    applyTransform();
    setZoomDisplay(Math.round(scale * 100));
  }, [applyTransform]);

  // ── ResizeObserver ────────────────────────────────────────────────────────
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper || !rawSvg) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) fitView();
      }
    });
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, [rawSvg, fitView]);

  // ── Reveal map ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!rawSvg || loading) {
      setMapReady(false);
      fitDoneRef.current = false;
      return;
    }
    const id = requestAnimationFrame(() => {
      fitView();
      fitDoneRef.current = true;
      setMapReady(true);
    });
    return () => cancelAnimationFrame(id);
  }, [rawSvg, loading, fitView]);

  useEffect(() => {
    if (loading) {
      setMapReady(false);
      fitDoneRef.current = false;
    }
  }, [loading]);

  // ── Zoom step ─────────────────────────────────────────────────────────────
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

  // ── Wheel zoom ────────────────────────────────────────────────────────────
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const factor   = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      const oldScale = scaleRef.current;
      const newScale = Math.min(Math.max(oldScale * factor, 0.05), 4);
      const rect     = el.getBoundingClientRect();
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

  // ── Tooltip helpers ───────────────────────────────────────────────────────
  const hideTooltip = useCallback(() => {
    if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);
    setTooltip((t) => ({ ...t, visible: false, seat: null }));
  }, []);

  const showTooltipForSvgId = useCallback(
    (svgId: string, x: number, y: number) => {
      const seat = seats.find((s) => s.svgId === svgId);
      if (!seat) return;
      if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);
      setTooltip({ visible: true, x, y, seat });
    },
    [seats]
  );

  // ── Pan handlers ──────────────────────────────────────────────────────────
  const onMouseDown = (e: React.MouseEvent) => {
    isPanning.current    = true;
    didDrag.current      = false;
    mouseDownPos.current = { x: e.clientX, y: e.clientY };
    panStart.current     = { ...translateRef.current };
    (e.currentTarget as HTMLElement).style.cursor = "grabbing";
    //  Do NOT call hideTooltip here — it caused re-renders that swallowed clicks
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isPanning.current) return;
    const dx = e.clientX - mouseDownPos.current.x;
    const dy = e.clientY - mouseDownPos.current.y;
    if (!didDrag.current && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
      didDrag.current = true;
    }
    if (didDrag.current) {
      translateRef.current = {
        x: panStart.current.x + dx,
        y: panStart.current.y + dy,
      };
      applyTransform();
    }
  };

  const onMouseUp = (e: React.MouseEvent) => {
    isPanning.current = false;
    (e.currentTarget as HTMLElement).style.cursor = "grab";
  };

  // ── Hover on SVG → tooltip ────────────────────────────────────────────────
  const onMapMouseMove = (e: React.MouseEvent) => {
    // Don't show tooltip while actively panning
    if (isPanning.current && didDrag.current) return;

    // ✅ Update containerRect via ref — zero re-renders
    if (wrapperRef.current) {
      containerRectRef.current = wrapperRef.current.getBoundingClientRect();
    }

    const svgId = getSvgIdFromClick(e.target);
    if (!svgId) {
      if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);
      tooltipTimeoutRef.current = setTimeout(hideTooltip, 120);
      return;
    }

    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const rect = wrapper.getBoundingClientRect();
    const x    = e.clientX - rect.left;
    const y    = e.clientY - rect.top;

    showTooltipForSvgId(svgId, x, y);
  };

  const onMapMouseLeave = () => {
    // ✅ Inline reset — no setState calls that could swallow subsequent click
    isPanning.current = false;
    if (wrapperRef.current) wrapperRef.current.style.cursor = "grab";
    tooltipTimeoutRef.current = setTimeout(hideTooltip, 200);
  };

  // ── Click on SVG → select / deselect seat ────────────────────────────────
  const onMapClick = (e: React.MouseEvent) => {
    // If the mouse moved more than 4px it was a pan, not a click
    if (didDrag.current) {
      didDrag.current = false;
      return;
    }

    const svgId = getSvgIdFromClick(e.target);
    if (!svgId) return;

    const seat = seats.find((s) => s.svgId === svgId);
    if (!seat) return;

    // Only available / yours seats are selectable
    if (seat.status !== "available" && seat.status !== "yours") return;

    // Hide tooltip immediately on select
    hideTooltip();

    if (seat.id === selectedSeatId) {
      onSeatSelect(null);     // deselect
    } else {
      onSeatSelect(seat.id);  // select → triggers booking flow upstream
    }
  };

  // ── Legend counts ─────────────────────────────────────────────────────────
  const hasPreferences  = seats.some(
    (s) => s.preferenceMatchStatus === "FULL_MATCH" || s.preferenceMatchStatus === "PARTIAL_MATCH"
  );
  const bestMatchCount    = seats.filter((s) => s.preferenceMatchStatus === "FULL_MATCH"    && s.status === "available").length;
  const partialMatchCount = seats.filter((s) => s.preferenceMatchStatus === "PARTIAL_MATCH" && s.status === "available").length;
  const availableCount    = seats.filter((s) => s.status === "available").length;

  const showSpinner = !rawSvg || loading || !mapReady;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div
      className="relative bg-[#F7F8FC] border border-[#EBEBF5] rounded-xl overflow-hidden"
      style={{ width: "100%", height: 520 }}
    >
      {/* Zoom controls */}
      {mapReady && (
        <div className="absolute top-3 right-3 z-20 flex flex-col gap-1.5">
          {(
            [
              { icon: <ZoomIn size={14} />,    action: zoomIn,  title: "Zoom in"     },
              { icon: <ZoomOut size={14} />,   action: zoomOut, title: "Zoom out"    },
              { icon: <Maximize2 size={14} />, action: fitView, title: "Fit to view" },
            ] as const
          ).map(({ icon, action, title }) => (
            <button
              key={title}
              onClick={(e) => { e.stopPropagation(); action(); }}
              title={title}
              className="w-8 h-8 rounded-lg bg-white border border-[#EBEBF5] shadow-sm flex items-center justify-center hover:bg-gray-50 text-gray-600 transition-colors"
            >
              {icon}
            </button>
          ))}
        </div>
      )}

      {/* Zoom % */}
      {mapReady && (
        <div className="absolute top-3 left-3 z-20 text-[10px] font-semibold text-gray-400 bg-white/80 px-2 py-1 rounded-md border border-[#EBEBF5] select-none tabular-nums">
          {zoomDisplay}%
        </div>
      )}

      {/* Legend */}
      {mapReady && (
        <div className="absolute bottom-8 left-3 z-20 flex items-center gap-3 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg border border-[#EBEBF5] shadow-sm select-none flex-wrap max-w-[calc(100%-1.5rem)]">
          {hasPreferences && (
            <span className="flex items-center gap-1.5 text-[10px] text-gray-600 font-medium">
              <span className="w-2.5 h-2.5 rounded-full inline-block bg-amber-400 ring-1 ring-amber-500" />
              Best Match
              {bestMatchCount > 0 && (
                <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-semibold">
                  {bestMatchCount}
                </span>
              )}
            </span>
          )}
          <span className="flex items-center gap-1.5 text-[10px] text-gray-600 font-medium">
            <span className="w-2.5 h-2.5 rounded-full inline-block bg-emerald-500" />
            Available
            {availableCount > 0 && (
              <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-semibold">
                {availableCount}
              </span>
            )}
          </span>
          {hasPreferences && partialMatchCount > 0 && (
            <span className="flex items-center gap-1.5 text-[10px] text-gray-600 font-medium">
              <span className="relative w-2.5 h-2.5 inline-block">
                <span className="absolute inset-0 rounded-full bg-emerald-500" />
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-amber-400 border border-white" />
              </span>
              Partial Match
              <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-semibold">
                {partialMatchCount}
              </span>
            </span>
          )}
          <span className="flex items-center gap-1.5 text-[10px] text-gray-600 font-medium">
            <span className="w-2.5 h-2.5 rounded-full inline-block bg-gray-400" />
            Unavailable
          </span>
          <span className="flex items-center gap-1.5 text-[10px] text-gray-600 font-medium">
            <span className="w-2.5 h-2.5 rounded-full inline-block bg-blue-500" />
            Selected
          </span>
        </div>
      )}

      {/* Hint */}
      {mapReady && (
        <div className="absolute bottom-2 left-3 z-20 text-[10px] text-gray-400 bg-white/80 px-2 py-1 rounded-md border border-[#EBEBF5] select-none">
          Scroll to zoom · Drag to pan · Click a seat to select
        </div>
      )}

      {/* Map viewport */}
      <div
        ref={wrapperRef}
        className="w-full h-full overflow-hidden select-none"
        style={{ cursor: "grab" }}
        onMouseDown={onMouseDown}
        onMouseMove={(e) => {
          onMouseMove(e);
          onMapMouseMove(e);
        }}
        onMouseUp={onMouseUp}
        onMouseLeave={onMapMouseLeave}
        onClick={onMapClick}
      >
        {/* Spinner */}
        {showSpinner && !svgError && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#F7F8FC] z-10">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
              <p className="text-[12.5px] text-gray-400">Loading floor plan…</p>
            </div>
          </div>
        )}

        {/* Error state */}
        {svgError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className="text-[13px] text-gray-500 mb-1">Floor plan unavailable</p>
              <p className="text-[11.5px] text-gray-400">
                Place SVG at{" "}
                <code className="bg-gray-100 px-1 rounded">/public/floor-IT.svg</code>
              </p>
            </div>
          </div>
        )}

        {/* SVG map */}
        {coloredSvg && (
          <div
            ref={transformRef}
            style={{
              transformOrigin: "top left",
              width: `${SVG_W}px`,
              height: `${SVG_H}px`,
              willChange: "transform",
              visibility: mapReady ? "visible" : "hidden",
            }}
            dangerouslySetInnerHTML={{ __html: coloredSvg }}
          />
        )}

        {/* ✅ Tooltip reads from ref for positioning — no extra state */}
        {tooltip.visible && tooltip.seat && containerRectRef.current && (
          <SeatTooltip
            tooltip={tooltip}
            containerRect={containerRectRef.current}
          />
        )}
      </div>
    </div>
  );
};

export default SvgFloorMapPage;