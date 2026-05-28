// // // // // // // // // // "use client";

// // // // // // // // // // import { useState } from "react";
// // // // // // // // // // import { Button } from "@/components/ui/button";
// // // // // // // // // // import { cn } from "@/lib/utils";

// // // // // // // // // // import {
// // // // // // // // // //   MousePointer,
// // // // // // // // // //   Plus,
// // // // // // // // // //   SquareDashed,
// // // // // // // // // //   Hand,
// // // // // // // // // // } from "lucide-react";

// // // // // // // // // // export default function LayoutPreview() {
// // // // // // // // // //   // 🔹 Tabs
// // // // // // // // // //   const tabs = [
// // // // // // // // // //     "Layout Preview",
// // // // // // // // // //     "Seat Summary",
// // // // // // // // // //     "Amenities",
// // // // // // // // // //     "Blocked Areas",
// // // // // // // // // //   ];

// // // // // // // // // //   // 🔹 Active tool
// // // // // // // // // //   const [activeTool, setActiveTool] = useState("Select");

// // // // // // // // // //   // 🔹 Tools list
// // // // // // // // // //   const tools = [
// // // // // // // // // //     { name: "Select", icon: MousePointer },
// // // // // // // // // //     { name: "Add Seat", icon: Plus },
// // // // // // // // // //     { name: "Add Area", icon: SquareDashed },
// // // // // // // // // //     { name: "Pan", icon: Hand },
// // // // // // // // // //   ];

// // // // // // // // // //   return (
// // // // // // // // // //     <div>

// // // // // // // // // //       {/* ---------------- TABS ---------------- */}
// // // // // // // // // //       <div className="flex gap-6 border-b pb-2 mb-4">
// // // // // // // // // //         {tabs.map((tab, index) => (
// // // // // // // // // //           <span
// // // // // // // // // //             key={index}
// // // // // // // // // //             className={cn(
// // // // // // // // // //               "cursor-pointer text-sm",
// // // // // // // // // //               index === 0
// // // // // // // // // //                 ? "text-indigo-600 font-medium border-b-2 border-indigo-600 pb-1"
// // // // // // // // // //                 : "text-gray-500"
// // // // // // // // // //             )}
// // // // // // // // // //           >
// // // // // // // // // //             {tab}
// // // // // // // // // //           </span>
// // // // // // // // // //         ))}
// // // // // // // // // //       </div>

// // // // // // // // // //       {/* ---------------- MAIN LAYOUT ---------------- */}
// // // // // // // // // //       <div className="flex">

// // // // // // // // // //         {/* -------- LEFT TOOLBAR -------- */}
// // // // // // // // // //         <div className="flex flex-col gap-3 mr-4">

// // // // // // // // // //           {tools.map((tool) => {
// // // // // // // // // //             const Icon = tool.icon;

// // // // // // // // // //             return (
// // // // // // // // // //               <Button
// // // // // // // // // //                 key={tool.name}
// // // // // // // // // //                 variant="outline"
// // // // // // // // // //                 className={cn(
// // // // // // // // // //                   "flex flex-col items-center justify-center w-20 h-20 text-xs gap-1",
// // // // // // // // // //                   activeTool === tool.name &&
// // // // // // // // // //                     "border-indigo-500 text-indigo-600"
// // // // // // // // // //                 )}
// // // // // // // // // //                 onClick={() => setActiveTool(tool.name)}
// // // // // // // // // //               >
// // // // // // // // // //                 <Icon className="w-4 h-4" />
// // // // // // // // // //                 {tool.name}
// // // // // // // // // //               </Button>
// // // // // // // // // //             );
// // // // // // // // // //           })}

// // // // // // // // // //         </div>

// // // // // // // // // //         {/* -------- SVG PREVIEW AREA -------- */}
// // // // // // // // // //         <div className="flex-1 border rounded-md h-[500px] flex items-center justify-center">
// // // // // // // // // //           <span className="text-gray-400">
// // // // // // // // // //             SVG Layout Preview (Coming Soon)
// // // // // // // // // //           </span>
// // // // // // // // // //         </div>

// // // // // // // // // //       </div>

// // // // // // // // // //     </div>
// // // // // // // // // //   );
// // // // // // // // // // }


// // // // // // // // // "use client";

// // // // // // // // // import { useState } from "react";
// // // // // // // // // import { Button } from "@/components/ui/button";
// // // // // // // // // import { cn } from "@/lib/utils";
// // // // // // // // // import {
// // // // // // // // //   MousePointer,
// // // // // // // // //   Plus,
// // // // // // // // //   SquareDashed,
// // // // // // // // //   Hand,
// // // // // // // // // } from "lucide-react";

// // // // // // // // // export default function LayoutPreview() {
// // // // // // // // //   const [activeTool, setActiveTool] = useState("Select");

// // // // // // // // //   const tabs = [
// // // // // // // // //     "Layout Preview",
// // // // // // // // //     "Seat Summary",
// // // // // // // // //     "Amenities",
// // // // // // // // //     "Blocked Areas",
// // // // // // // // //   ];

// // // // // // // // //   const tools = [
// // // // // // // // //     { name: "Select", icon: MousePointer },
// // // // // // // // //     { name: "Add Seat", icon: Plus },
// // // // // // // // //     { name: "Add Area", icon: SquareDashed },
// // // // // // // // //     { name: "Pan", icon: Hand },
// // // // // // // // //   ];

// // // // // // // // //   return (
// // // // // // // // //     <div className="space-y-4">

// // // // // // // // //       {/* ---------------- TABS ---------------- */}
// // // // // // // // //       <div className="flex gap-6 border-b">
// // // // // // // // //         {tabs.map((tab, i) => (
// // // // // // // // //           <span
// // // // // // // // //             key={tab}
// // // // // // // // //             className={cn(
// // // // // // // // //               "pb-2 text-sm cursor-pointer",
// // // // // // // // //               i === 0
// // // // // // // // //                 ? "text-indigo-600 border-b-2 border-indigo-600 font-medium"
// // // // // // // // //                 : "text-gray-500"
// // // // // // // // //             )}
// // // // // // // // //           >
// // // // // // // // //             {tab}
// // // // // // // // //           </span>
// // // // // // // // //         ))}
// // // // // // // // //       </div>

// // // // // // // // //       {/* ---------------- TOP BAR (TIP + LEGEND + ZOOM) ---------------- */}
// // // // // // // // //       <div className="flex items-center justify-between">

// // // // // // // // //         {/* LEFT SIDE */}
// // // // // // // // //         <div className="flex items-center gap-4">

// // // // // // // // //           {/* TIP */}
// // // // // // // // //           <div className="bg-blue-50 text-blue-600 px-3 py-1 rounded-md text-sm">
// // // // // // // // //             Tip: Click on a seat to view details or edit
// // // // // // // // //           </div>

// // // // // // // // //           {/* LEGEND */}
// // // // // // // // //           <div className="flex items-center gap-4 text-sm text-gray-600">

// // // // // // // // //             <div className="flex items-center gap-1">
// // // // // // // // //               <span className="w-3 h-3 bg-green-500 rounded-full"></span>
// // // // // // // // //               Available
// // // // // // // // //             </div>

// // // // // // // // //             <div className="flex items-center gap-1">
// // // // // // // // //               <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
// // // // // // // // //               Booked
// // // // // // // // //             </div>

// // // // // // // // //             <div className="flex items-center gap-1">
// // // // // // // // //               <span className="w-3 h-3 bg-red-500 rounded-full"></span>
// // // // // // // // //               Blocked
// // // // // // // // //             </div>

// // // // // // // // //             <div className="flex items-center gap-1">
// // // // // // // // //               <span className="w-3 h-3 bg-gray-400 rounded-full"></span>
// // // // // // // // //               Non-bookable
// // // // // // // // //             </div>

// // // // // // // // //           </div>
// // // // // // // // //         </div>

// // // // // // // // //         {/* RIGHT SIDE (ZOOM) */}
// // // // // // // // //         <div className="flex items-center gap-2 text-sm">

// // // // // // // // //           <span className="text-gray-600">Zoom</span>

// // // // // // // // //           <button className="border px-2 py-1 rounded">-</button>

// // // // // // // // //           <span className="w-10 text-center">100%</span>

// // // // // // // // //           <button className="border px-2 py-1 rounded">+</button>

// // // // // // // // //         </div>
// // // // // // // // //       </div>

// // // // // // // // //       {/* ---------------- MAIN CONTENT ---------------- */}
// // // // // // // // //       <div className="flex gap-4">

// // // // // // // // //         {/* TOOLBAR */}
// // // // // // // // //         <div className="flex flex-col gap-3">

// // // // // // // // //           {tools.map((tool) => {
// // // // // // // // //             const Icon = tool.icon;

// // // // // // // // //             return (
// // // // // // // // //               <Button
// // // // // // // // //                 key={tool.name}
// // // // // // // // //                 variant="outline"
// // // // // // // // //                 className={cn(
// // // // // // // // //                   "flex flex-col items-center justify-center w-20 h-20 text-xs gap-1",
// // // // // // // // //                   activeTool === tool.name &&
// // // // // // // // //                     "border-indigo-500 text-indigo-600"
// // // // // // // // //                 )}
// // // // // // // // //                 onClick={() => setActiveTool(tool.name)}
// // // // // // // // //               >
// // // // // // // // //                 <Icon className="w-4 h-4" />
// // // // // // // // //                 {tool.name}
// // // // // // // // //               </Button>
// // // // // // // // //             );
// // // // // // // // //           })}

// // // // // // // // //         </div>

// // // // // // // // //         {/* SVG CONTAINER */}
// // // // // // // // //         <div className="relative flex-1 border rounded-md bg-white h-[600px] flex items-center justify-center">

// // // // // // // // //           <span className="text-gray-400">
// // // // // // // // //             SVG Layout Preview (Coming Soon)
// // // // // // // // //           </span>

// // // // // // // // //           {/* SHOW AREAS BUTTON */}
// // // // // // // // //           <button className="absolute bottom-4 left-4 border px-3 py-1 rounded text-sm bg-white">
// // // // // // // // //             Show Areas
// // // // // // // // //           </button>

// // // // // // // // //         </div>

// // // // // // // // //       </div>
// // // // // // // // //     </div>
// // // // // // // // //   );
// // // // // // // // // }

// // // // // // // // // "use client";

// // // // // // // // // import { useLayoutSvg } from "../hooks/useLayoutDetails";
// // // // // // // // // import { Layout } from "../types/layout.types";



// // // // // // // // // interface LayoutSvgCanvasProps {
// // // // // // // // //   layout: Layout | null;
// // // // // // // // //   zoom: number;
// // // // // // // // // }

// // // // // // // // // export default function LayoutSvgCanvas({ layout, zoom }: LayoutSvgCanvasProps) {
// // // // // // // // //   const { svgContent, loading, error } = useLayoutSvg(
// // // // // // // // //     layout?.layout_file_url ?? null
// // // // // // // // //   );

// // // // // // // // //   // ── empty state ────────────────────────────────────────────────────────────
// // // // // // // // //   if (!layout) {
// // // // // // // // //     return (
// // // // // // // // //       <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
// // // // // // // // //         Select a location and layout version to preview
// // // // // // // // //       </div>
// // // // // // // // //     );
// // // // // // // // //   }

// // // // // // // // //   // ── loading ────────────────────────────────────────────────────────────────
// // // // // // // // //   if (loading) {
// // // // // // // // //     return (
// // // // // // // // //       <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
// // // // // // // // //         Loading layout…
// // // // // // // // //       </div>
// // // // // // // // //     );
// // // // // // // // //   }

// // // // // // // // //   // ── non-fetchable URL (e.g. s3:// pseudo-URIs in dev/test data) ────────────
// // // // // // // // //   // if (!layout.layout_file_url.startsWith("https://")) {
// // // // // // // // //   //   return (
// // // // // // // // //   //     <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
// // // // // // // // //   //       SVG Layout Preview (Coming Soon)
// // // // // // // // //   //     </div>
// // // // // // // // //   //   );
// // // // // // // // //   // }
// // // // // // // // //   // ── non-fetchable URL (e.g. s3:// pseudo-URIs in dev/test data) ────────────
// // // // // // // // // if (!layout.layout_file_url?.startsWith("https://")) {
// // // // // // // // //   return (
// // // // // // // // //     <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
// // // // // // // // //       SVG Layout Preview (Coming Soon)
// // // // // // // // //     </div>
// // // // // // // // //   );
// // // // // // // // // }

// // // // // // // // //   // ── fetch error ────────────────────────────────────────────────────────────
// // // // // // // // //   if (error) {
// // // // // // // // //     return (
// // // // // // // // //       <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-400 text-sm">
// // // // // // // // //         <span>Unable to load SVG preview</span>
// // // // // // // // //         <a
// // // // // // // // //           href={layout.layout_file_url}
// // // // // // // // //           target="_blank"
// // // // // // // // //           rel="noreferrer"
// // // // // // // // //           className="text-indigo-500 underline text-xs"
// // // // // // // // //         >
// // // // // // // // //           Open file directly ↗
// // // // // // // // //         </a>
// // // // // // // // //       </div>
// // // // // // // // //     );
// // // // // // // // //   }

// // // // // // // // //   // ── svg ────────────────────────────────────────────────────────────────────
// // // // // // // // //   return (
// // // // // // // // //     <div
// // // // // // // // //       style={{
// // // // // // // // //         transform: `scale(${zoom / 100})`,
// // // // // // // // //         transformOrigin: "top left",
// // // // // // // // //         // expand the div so the scaled-down SVG doesn't leave a gap
// // // // // // // // //         width: `${(100 * 100) / zoom}%`,
// // // // // // // // //         height: `${(100 * 100) / zoom}%`,
// // // // // // // // //       }}
// // // // // // // // //       dangerouslySetInnerHTML={{ __html: svgContent ?? "" }}
// // // // // // // // //     />
// // // // // // // // //   );
// // // // // // // // // }

// // // // // // // // "use client";

// // // // // // // // import { useState } from "react";
// // // // // // // // import { Layout } from "../types/layout.types";
// // // // // // // // import LayoutSvgCanvas from "./LayoutSvgCanvas";

// // // // // // // // interface LayoutPreviewProps {
// // // // // // // //   layout: Layout | null;
// // // // // // // // }

// // // // // // // // export default function LayoutPreview({ layout }: LayoutPreviewProps) {
// // // // // // // //   const [zoom, setZoom] = useState(100);

// // // // // // // //   return (
// // // // // // // //     <div className="flex flex-col bg-white rounded-lg border border-gray-200 overflow-hidden h-full">

// // // // // // // //       {/* Zoom toolbar */}
// // // // // // // //       <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
// // // // // // // //         <span className="text-sm font-medium text-gray-600">Preview</span>
// // // // // // // //         <div className="flex items-center gap-2">
// // // // // // // //           <button
// // // // // // // //             onClick={() => setZoom((z) => Math.max(25, z - 10))}
// // // // // // // //             className="px-2 py-1 text-sm rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
// // // // // // // //             disabled={zoom <= 25}
// // // // // // // //           >
// // // // // // // //             −
// // // // // // // //           </button>
// // // // // // // //           <span className="text-sm text-gray-500 w-12 text-center">{zoom}%</span>
// // // // // // // //           <button
// // // // // // // //             onClick={() => setZoom((z) => Math.min(200, z + 10))}
// // // // // // // //             className="px-2 py-1 text-sm rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
// // // // // // // //             disabled={zoom >= 200}
// // // // // // // //           >
// // // // // // // //             +
// // // // // // // //           </button>
// // // // // // // //           <button
// // // // // // // //             onClick={() => setZoom(100)}
// // // // // // // //             className="px-2 py-1 text-xs rounded border border-gray-200 hover:bg-gray-50 text-gray-400"
// // // // // // // //           >
// // // // // // // //             Reset
// // // // // // // //           </button>
// // // // // // // //         </div>
// // // // // // // //       </div>

// // // // // // // //       {/* Canvas */}
// // // // // // // //       <div className="relative flex-1 overflow-hidden min-h-[500px]">
// // // // // // // //         <LayoutSvgCanvas layout={layout} zoom={zoom} />
// // // // // // // //       </div>

// // // // // // // //     </div>
// // // // // // // //   );
// // // // // // // // }

// // // // // // // "use client";

// // // // // // // import React, { useCallback, useEffect, useRef, useState } from "react";
// // // // // // // import { Maximize2, ZoomIn, ZoomOut, X, MapPin, Tag, Hash, Building2, Layers } from "lucide-react";
// // // // // // // import {
// // // // // // //   Dialog,
// // // // // // //   DialogContent,
// // // // // // //   DialogHeader,
// // // // // // //   DialogTitle,
// // // // // // // } from "@/components/ui/dialog";
// // // // // // // import { Badge } from "@/components/ui/badge";
// // // // // // // import { Layout } from "../types/layout.types";

// // // // // // // // ─── Types ────────────────────────────────────────────────────────────────────

// // // // // // // interface ClickedSeat {
// // // // // // //   svgId: string;
// // // // // // //   x: number;
// // // // // // //   y: number;
// // // // // // // }

// // // // // // // interface LayoutPreviewProps {
// // // // // // //   layout: Layout | null;
// // // // // // // }

// // // // // // // // ─── Helpers ──────────────────────────────────────────────────────────────────

// // // // // // // /** Extract all <g id="..."> IDs from raw SVG text */
// // // // // // // function extractSeatIds(svgText: string): string[] {
// // // // // // //   const ids: string[] = [];
// // // // // // //   const regex = /<g\s+id="([^"]+)"/g;
// // // // // // //   let match;
// // // // // // //   while ((match = regex.exec(svgText)) !== null) {
// // // // // // //     ids.push(match[1]);
// // // // // // //   }
// // // // // // //   return ids;
// // // // // // // }

// // // // // // // /** Walk up the DOM to find which seat <g id="..."> was clicked */
// // // // // // // function getSeatIdFromClick(
// // // // // // //   target: EventTarget | null,
// // // // // // //   knownIds: Set<string>
// // // // // // // ): string | null {
// // // // // // //   let el = target as Element | null;
// // // // // // //   while (el) {
// // // // // // //     if (el.tagName?.toLowerCase() === "svg") return null;
// // // // // // //     const id = el.getAttribute?.("id");
// // // // // // //     if (id && knownIds.has(id)) return id;
// // // // // // //     el = el.parentElement;
// // // // // // //   }
// // // // // // //   return null;
// // // // // // // }

// // // // // // // /** Highlight a seat in the SVG by adding a coloured overlay stroke */
// // // // // // // function highlightSeat(svgText: string, svgId: string): string {
// // // // // // //   const openTag = `<g id="${svgId}">`;
// // // // // // //   const start = svgText.indexOf(openTag);
// // // // // // //   if (start === -1) return svgText;
// // // // // // //   return (
// // // // // // //     svgText.slice(0, start) +
// // // // // // //     `<g id="${svgId}" style="cursor:pointer;filter:drop-shadow(0 0 6px rgba(99,102,241,0.8))">` +
// // // // // // //     svgText.slice(start + openTag.length)
// // // // // // //   );
// // // // // // // }

// // // // // // // /** Make all known seat <g> elements show a pointer cursor */
// // // // // // // function addPointerCursors(svgText: string, ids: string[]): string {
// // // // // // //   let result = svgText;
// // // // // // //   ids.forEach((id) => {
// // // // // // //     result = result.replace(
// // // // // // //       `<g id="${id}">`,
// // // // // // //       `<g id="${id}" style="cursor:pointer">`
// // // // // // //     );
// // // // // // //   });
// // // // // // //   return result;
// // // // // // // }

// // // // // // // // ─── Seat Info Dialog ─────────────────────────────────────────────────────────

// // // // // // // const SeatInfoDialog: React.FC<{
// // // // // // //   open: boolean;
// // // // // // //   onClose: () => void;
// // // // // // //   svgId: string | null;
// // // // // // //   layout: Layout | null;
// // // // // // // }> = ({ open, onClose, svgId, layout }) => {
// // // // // // //   if (!svgId || !layout) return null;

// // // // // // //   const statusConfig: Record<string, { label: string; color: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
// // // // // // //     PUBLISHED: { label: "Published",  color: "bg-emerald-100 text-emerald-700 border-emerald-200", variant: "outline" },
// // // // // // //     DRAFT:     { label: "Draft",      color: "bg-amber-100  text-amber-700  border-amber-200",     variant: "outline" },
// // // // // // //     ARCHIVED:  { label: "Archived",   color: "bg-gray-100   text-gray-600   border-gray-200",      variant: "outline" },
// // // // // // //   };

// // // // // // //   const sc = statusConfig[layout.status] ?? statusConfig.DRAFT;

// // // // // // //   return (
// // // // // // //     <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
// // // // // // //       <DialogContent className="max-w-sm rounded-2xl p-0 overflow-hidden border border-gray-100 shadow-2xl">

// // // // // // //         {/* Header band */}
// // // // // // //         <div className="bg-gradient-to-br from-indigo-600 to-violet-600 px-5 pt-5 pb-6 text-white">
// // // // // // //           <DialogHeader>
// // // // // // //             <div className="flex items-start justify-between gap-3">
// // // // // // //               <div>
// // // // // // //                 <p className="text-[11px] font-semibold uppercase tracking-widest text-indigo-200 mb-1">
// // // // // // //                   Seat Element
// // // // // // //                 </p>
// // // // // // //                 <DialogTitle className="text-2xl font-black tracking-tight text-white">
// // // // // // //                   #{svgId}
// // // // // // //                 </DialogTitle>
// // // // // // //               </div>
// // // // // // //               <span className={`mt-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${sc.color}`}>
// // // // // // //                 {sc.label}
// // // // // // //               </span>
// // // // // // //             </div>
// // // // // // //           </DialogHeader>
// // // // // // //         </div>

// // // // // // //         {/* Body */}
// // // // // // //         <div className="px-5 py-4 space-y-4">

// // // // // // //           {/* Layout info */}
// // // // // // //           <div className="space-y-2.5">
// // // // // // //             <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
// // // // // // //               Layout Info
// // // // // // //             </p>

// // // // // // //             <Row icon={<Tag size={13} />}      label="Layout"   value={layout.layout_name} />
// // // // // // //             <Row icon={<Hash size={13} />}     label="Version"  value={`v${layout.version_no}`} />
// // // // // // //             <Row icon={<Layers size={13} />}   label="Type"     value={layout.layout_type} />
// // // // // // //           </div>

// // // // // // //           <div className="border-t border-gray-100" />

// // // // // // //           {/* Location */}
// // // // // // //           <div className="space-y-2.5">
// // // // // // //             <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
// // // // // // //               Location
// // // // // // //             </p>
// // // // // // //             <Row icon={<MapPin size={13} />}    label="Site"     value={layout.site_name} />
// // // // // // //             <Row icon={<Building2 size={13} />} label="Building" value={layout.building_name} />
// // // // // // //             <Row icon={<Layers size={13} />}    label="Floor"    value={layout.floor_name} />
// // // // // // //           </div>

// // // // // // //           <div className="border-t border-gray-100" />

// // // // // // //           {/* IDs */}
// // // // // // //           <div className="space-y-2.5">
// // // // // // //             <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
// // // // // // //               References
// // // // // // //             </p>
// // // // // // //             <Row label="SVG Element ID" value={svgId}             mono />
// // // // // // //             <Row label="Layout ID"      value={layout.layout_id}  mono />
// // // // // // //             <Row label="Floor ID"       value={layout.floor_id}   mono />
// // // // // // //           </div>

// // // // // // //           {/* Uploaded by */}
// // // // // // //           <div className="border-t border-gray-100" />
// // // // // // //           <div className="flex items-center gap-3 py-1">
// // // // // // //             <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[11px] font-black flex-shrink-0">
// // // // // // //               {layout.uploaded_by_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
// // // // // // //             </div>
// // // // // // //             <div>
// // // // // // //               <p className="text-[12px] font-semibold text-gray-800 leading-tight">{layout.uploaded_by_name}</p>
// // // // // // //               <p className="text-[10px] text-gray-400">{layout.uploaded_by_role.replace(/_/g, " ")}</p>
// // // // // // //             </div>
// // // // // // //           </div>
// // // // // // //         </div>
// // // // // // //       </DialogContent>
// // // // // // //     </Dialog>
// // // // // // //   );
// // // // // // // };

// // // // // // // const Row: React.FC<{
// // // // // // //   icon?: React.ReactNode;
// // // // // // //   label: string;
// // // // // // //   value: string;
// // // // // // //   mono?: boolean;
// // // // // // // }> = ({ icon, label, value, mono }) => (
// // // // // // //   <div className="flex items-center justify-between gap-4">
// // // // // // //     <div className="flex items-center gap-1.5 text-[11px] text-gray-500 min-w-0">
// // // // // // //       {icon && <span className="text-gray-400 flex-shrink-0">{icon}</span>}
// // // // // // //       <span className="truncate">{label}</span>
// // // // // // //     </div>
// // // // // // //     <span
// // // // // // //       className={`text-[11px] font-semibold text-gray-800 text-right truncate max-w-[55%] ${
// // // // // // //         mono ? "font-mono bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100" : ""
// // // // // // //       }`}
// // // // // // //     >
// // // // // // //       {value}
// // // // // // //     </span>
// // // // // // //   </div>
// // // // // // // );

// // // // // // // // ─── Main Component ───────────────────────────────────────────────────────────

// // // // // // // const SVG_W = 2466;
// // // // // // // const SVG_H = 2039;

// // // // // // // export default function LayoutPreview({ layout }: LayoutPreviewProps) {
// // // // // // //   const wrapperRef   = useRef<HTMLDivElement>(null);
// // // // // // //   const transformRef = useRef<HTMLDivElement>(null);

// // // // // // //   const scaleRef      = useRef(1);
// // // // // // //   const translateRef  = useRef({ x: 0, y: 0 });
// // // // // // //   const isPanning     = useRef(false);
// // // // // // //   const panStart      = useRef({ x: 0, y: 0 });
// // // // // // //   const mouseDownPos  = useRef({ x: 0, y: 0 });
// // // // // // //   const didDrag       = useRef(false);

// // // // // // //   const [rawSvg,      setRawSvg]      = useState<string | null>(null);
// // // // // // //   const [svgError,    setSvgError]    = useState(false);
// // // // // // //   const [zoomDisplay, setZoomDisplay] = useState(100);
// // // // // // //   const [mapReady,    setMapReady]    = useState(false);
// // // // // // //   const [loading,     setLoading]     = useState(false);

// // // // // // //   // known <g id> set parsed from the SVG
// // // // // // //   const seatIdsRef = useRef<Set<string>>(new Set());

// // // // // // //   // dialog state
// // // // // // //   const [dialogOpen,    setDialogOpen]    = useState(false);
// // // // // // //   const [clickedSeatId, setClickedSeatId] = useState<string | null>(null);

// // // // // // //   // ── Fetch SVG whenever layout changes ──────────────────────────────────────
// // // // // // //   useEffect(() => {
// // // // // // //     const url = layout?.layout_file_url;
// // // // // // //     if (!url || !url.startsWith("https://")) {
// // // // // // //       setRawSvg(null);
// // // // // // //       setSvgError(false);
// // // // // // //       setMapReady(false);
// // // // // // //       return;
// // // // // // //     }

// // // // // // //     setLoading(true);
// // // // // // //     setRawSvg(null);
// // // // // // //     setSvgError(false);
// // // // // // //     setMapReady(false);

// // // // // // //     fetch(url)
// // // // // // //       .then((r) => {
// // // // // // //         if (!r.ok) throw new Error(`HTTP ${r.status}`);
// // // // // // //         return r.text();
// // // // // // //       })
// // // // // // //       .then((text) => {
// // // // // // //         // Make fluid
// // // // // // //         const fluid = text
// // // // // // //           .replace(/\bwidth="[^"]*"/, 'width="100%"')
// // // // // // //           .replace(/\bheight="[^"]*"/, 'height="100%"');

// // // // // // //         // Parse seat IDs
// // // // // // //         const ids = extractSeatIds(fluid);
// // // // // // //         seatIdsRef.current = new Set(ids);

// // // // // // //         // Add pointer cursors to all seat elements
// // // // // // //         const withCursors = addPointerCursors(fluid, ids);
// // // // // // //         setRawSvg(withCursors);
// // // // // // //       })
// // // // // // //       .catch(() => setSvgError(true))
// // // // // // //       .finally(() => setLoading(false));
// // // // // // //   }, [layout?.layout_file_url]);

// // // // // // //   // ── applyTransform ─────────────────────────────────────────────────────────
// // // // // // //   const applyTransform = useCallback(() => {
// // // // // // //     const el = transformRef.current;
// // // // // // //     if (!el) return;
// // // // // // //     el.style.transform = `translate(${translateRef.current.x}px,${translateRef.current.y}px) scale(${scaleRef.current})`;
// // // // // // //   }, []);

// // // // // // //   // ── fitView ────────────────────────────────────────────────────────────────
// // // // // // //   const fitView = useCallback(() => {
// // // // // // //     const wrapper = wrapperRef.current;
// // // // // // //     if (!wrapper) return;
// // // // // // //     const { width: wW, height: wH } = wrapper.getBoundingClientRect();
// // // // // // //     if (wW === 0 || wH === 0) return;
// // // // // // //     const scale = Math.min(wW / SVG_W, wH / SVG_H);
// // // // // // //     scaleRef.current = scale;
// // // // // // //     translateRef.current = {
// // // // // // //       x: (wW - SVG_W * scale) / 2,
// // // // // // //       y: (wH - SVG_H * scale) / 2,
// // // // // // //     };
// // // // // // //     applyTransform();
// // // // // // //     setZoomDisplay(Math.round(scale * 100));
// // // // // // //   }, [applyTransform]);

// // // // // // //   // ── ResizeObserver ─────────────────────────────────────────────────────────
// // // // // // //   useEffect(() => {
// // // // // // //     const wrapper = wrapperRef.current;
// // // // // // //     if (!wrapper || !rawSvg) return;
// // // // // // //     const observer = new ResizeObserver(() => fitView());
// // // // // // //     observer.observe(wrapper);
// // // // // // //     return () => observer.disconnect();
// // // // // // //   }, [rawSvg, fitView]);

// // // // // // //   // ── Reveal map ─────────────────────────────────────────────────────────────
// // // // // // //   useEffect(() => {
// // // // // // //     if (!rawSvg || loading) { setMapReady(false); return; }
// // // // // // //     const id = requestAnimationFrame(() => { fitView(); setMapReady(true); });
// // // // // // //     return () => cancelAnimationFrame(id);
// // // // // // //   }, [rawSvg, loading, fitView]);

// // // // // // //   // ── Zoom ───────────────────────────────────────────────────────────────────
// // // // // // //   const zoomStep = useCallback((factor: number) => {
// // // // // // //     const wrapper = wrapperRef.current;
// // // // // // //     if (!wrapper) return;
// // // // // // //     const { width: wW, height: wH } = wrapper.getBoundingClientRect();
// // // // // // //     const oldScale = scaleRef.current;
// // // // // // //     const newScale = Math.min(Math.max(oldScale * factor, 0.05), 4);
// // // // // // //     const cx = wW / 2, cy = wH / 2;
// // // // // // //     translateRef.current = {
// // // // // // //       x: cx - (cx - translateRef.current.x) * (newScale / oldScale),
// // // // // // //       y: cy - (cy - translateRef.current.y) * (newScale / oldScale),
// // // // // // //     };
// // // // // // //     scaleRef.current = newScale;
// // // // // // //     applyTransform();
// // // // // // //     setZoomDisplay(Math.round(newScale * 100));
// // // // // // //   }, [applyTransform]);

// // // // // // //   const zoomIn  = useCallback(() => zoomStep(1.25),     [zoomStep]);
// // // // // // //   const zoomOut = useCallback(() => zoomStep(1 / 1.25), [zoomStep]);

// // // // // // //   // ── Wheel zoom ─────────────────────────────────────────────────────────────
// // // // // // //   useEffect(() => {
// // // // // // //     const el = wrapperRef.current;
// // // // // // //     if (!el) return;
// // // // // // //     const handler = (e: WheelEvent) => {
// // // // // // //       e.preventDefault();
// // // // // // //       const factor   = e.deltaY < 0 ? 1.1 : 1 / 1.1;
// // // // // // //       const oldScale = scaleRef.current;
// // // // // // //       const newScale = Math.min(Math.max(oldScale * factor, 0.05), 4);
// // // // // // //       const rect     = el.getBoundingClientRect();
// // // // // // //       translateRef.current = {
// // // // // // //         x: e.clientX - rect.left - (e.clientX - rect.left - translateRef.current.x) * (newScale / oldScale),
// // // // // // //         y: e.clientY - rect.top  - (e.clientY - rect.top  - translateRef.current.y) * (newScale / oldScale),
// // // // // // //       };
// // // // // // //       scaleRef.current = newScale;
// // // // // // //       applyTransform();
// // // // // // //       setZoomDisplay(Math.round(newScale * 100));
// // // // // // //     };
// // // // // // //     el.addEventListener("wheel", handler, { passive: false });
// // // // // // //     return () => el.removeEventListener("wheel", handler);
// // // // // // //   }, [applyTransform]);

// // // // // // //   // ── Pan ────────────────────────────────────────────────────────────────────
// // // // // // //   const onMouseDown = (e: React.MouseEvent) => {
// // // // // // //     isPanning.current    = true;
// // // // // // //     didDrag.current      = false;
// // // // // // //     mouseDownPos.current = { x: e.clientX, y: e.clientY };
// // // // // // //     panStart.current     = { ...translateRef.current };
// // // // // // //     (e.currentTarget as HTMLElement).style.cursor = "grabbing";
// // // // // // //   };

// // // // // // //   const onMouseMove = (e: React.MouseEvent) => {
// // // // // // //     if (!isPanning.current) return;
// // // // // // //     const dx = e.clientX - mouseDownPos.current.x;
// // // // // // //     const dy = e.clientY - mouseDownPos.current.y;
// // // // // // //     if (!didDrag.current && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
// // // // // // //       didDrag.current = true;
// // // // // // //     }
// // // // // // //     if (didDrag.current) {
// // // // // // //       translateRef.current = { x: panStart.current.x + dx, y: panStart.current.y + dy };
// // // // // // //       applyTransform();
// // // // // // //     }
// // // // // // //   };

// // // // // // //   const onMouseUp = (e: React.MouseEvent) => {
// // // // // // //     isPanning.current = false;
// // // // // // //     (e.currentTarget as HTMLElement).style.cursor = "grab";
// // // // // // //   };

// // // // // // //   const onMouseLeave = () => {
// // // // // // //     isPanning.current = false;
// // // // // // //     if (wrapperRef.current) wrapperRef.current.style.cursor = "grab";
// // // // // // //   };

// // // // // // //   // ── Click → open dialog ────────────────────────────────────────────────────
// // // // // // //   const onMapClick = (e: React.MouseEvent) => {
// // // // // // //     if (didDrag.current) { didDrag.current = false; return; }
// // // // // // //     const svgId = getSeatIdFromClick(e.target, seatIdsRef.current);
// // // // // // //     if (!svgId) return;
// // // // // // //     setClickedSeatId(svgId);
// // // // // // //     setDialogOpen(true);
// // // // // // //   };

// // // // // // //   // ── Derived highlighted SVG ────────────────────────────────────────────────
// // // // // // //   const displaySvg = rawSvg && clickedSeatId && dialogOpen
// // // // // // //     ? highlightSeat(rawSvg, clickedSeatId)
// // // // // // //     : rawSvg;

// // // // // // //   const showSpinner = loading || (!rawSvg && !svgError && !!layout?.layout_file_url);

// // // // // // //   // ── Empty state ────────────────────────────────────────────────────────────
// // // // // // //   if (!layout) {
// // // // // // //     return (
// // // // // // //       <div className="flex items-center justify-center h-full min-h-[460px] bg-gray-50 rounded-xl border border-dashed border-gray-200">
// // // // // // //         <div className="text-center text-gray-400">
// // // // // // //           <Layers className="mx-auto mb-2 opacity-30" size={32} />
// // // // // // //           <p className="text-sm">Select a layout to preview</p>
// // // // // // //         </div>
// // // // // // //       </div>
// // // // // // //     );
// // // // // // //   }

// // // // // // //   return (
// // // // // // //     <>
// // // // // // //       <div
// // // // // // //         className="relative bg-[#F7F8FC] border border-[#EBEBF5] rounded-xl overflow-hidden"
// // // // // // //         style={{ width: "100%", height: 520 }}
// // // // // // //       >
// // // // // // //         {/* Toolbar */}
// // // // // // //         {mapReady && (
// // // // // // //           <>
// // // // // // //             {/* Zoom % badge */}
// // // // // // //             <div className="absolute top-3 left-3 z-20 text-[10px] font-semibold text-gray-400 bg-white/90 px-2 py-1 rounded-md border border-[#EBEBF5] select-none tabular-nums">
// // // // // // //               {zoomDisplay}%
// // // // // // //             </div>

// // // // // // //             {/* Zoom controls */}
// // // // // // //             <div className="absolute top-3 right-3 z-20 flex flex-col gap-1.5">
// // // // // // //               {([
// // // // // // //                 { icon: <ZoomIn size={14} />,    action: zoomIn,  title: "Zoom in"     },
// // // // // // //                 { icon: <ZoomOut size={14} />,   action: zoomOut, title: "Zoom out"    },
// // // // // // //                 { icon: <Maximize2 size={14} />, action: fitView, title: "Fit to view" },
// // // // // // //               ] as const).map(({ icon, action, title }) => (
// // // // // // //                 <button
// // // // // // //                   key={title}
// // // // // // //                   onClick={(e) => { e.stopPropagation(); action(); }}
// // // // // // //                   title={title}
// // // // // // //                   className="w-8 h-8 rounded-lg bg-white border border-[#EBEBF5] shadow-sm flex items-center justify-center hover:bg-gray-50 text-gray-600 transition-colors"
// // // // // // //                 >
// // // // // // //                   {icon}
// // // // // // //                 </button>
// // // // // // //               ))}
// // // // // // //             </div>

// // // // // // //             {/* Hint */}
// // // // // // //             <div className="absolute bottom-2 left-3 z-20 text-[10px] text-gray-400 bg-white/80 px-2 py-1 rounded-md border border-[#EBEBF5] select-none">
// // // // // // //               Scroll to zoom · Drag to pan · Click a seat to inspect
// // // // // // //             </div>
// // // // // // //           </>
// // // // // // //         )}

// // // // // // //         {/* Viewport */}
// // // // // // //         <div
// // // // // // //           ref={wrapperRef}
// // // // // // //           className="w-full h-full overflow-hidden select-none"
// // // // // // //           style={{ cursor: "grab" }}
// // // // // // //           onMouseDown={onMouseDown}
// // // // // // //           onMouseMove={onMouseMove}
// // // // // // //           onMouseUp={onMouseUp}
// // // // // // //           onMouseLeave={onMouseLeave}
// // // // // // //           onClick={onMapClick}
// // // // // // //         >
// // // // // // //           {/* Spinner */}
// // // // // // //           {showSpinner && (
// // // // // // //             <div className="absolute inset-0 flex items-center justify-center bg-[#F7F8FC] z-10">
// // // // // // //               <div className="flex flex-col items-center gap-3">
// // // // // // //                 <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
// // // // // // //                 <p className="text-[12px] text-gray-400">Loading floor plan…</p>
// // // // // // //               </div>
// // // // // // //             </div>
// // // // // // //           )}

// // // // // // //           {/* Error */}
// // // // // // //           {svgError && (
// // // // // // //             <div className="absolute inset-0 flex items-center justify-center">
// // // // // // //               <div className="text-center">
// // // // // // //                 <p className="text-[13px] text-gray-500 mb-1">Could not load floor plan</p>
// // // // // // //                 <p className="text-[11px] text-gray-400 font-mono break-all px-6">
// // // // // // //                   {layout.layout_file_url}
// // // // // // //                 </p>
// // // // // // //               </div>
// // // // // // //             </div>
// // // // // // //           )}

// // // // // // //           {/* SVG canvas */}
// // // // // // //           {displaySvg && (
// // // // // // //             <div
// // // // // // //               ref={transformRef}
// // // // // // //               style={{
// // // // // // //                 transformOrigin: "top left",
// // // // // // //                 width:      `${SVG_W}px`,
// // // // // // //                 height:     `${SVG_H}px`,
// // // // // // //                 willChange: "transform",
// // // // // // //                 visibility: mapReady ? "visible" : "hidden",
// // // // // // //               }}
// // // // // // //               dangerouslySetInnerHTML={{ __html: displaySvg }}
// // // // // // //             />
// // // // // // //           )}
// // // // // // //         </div>
// // // // // // //       </div>

// // // // // // //       {/* Seat info dialog */}
// // // // // // //       <SeatInfoDialog
// // // // // // //         open={dialogOpen}
// // // // // // //         onClose={() => { setDialogOpen(false); setClickedSeatId(null); }}
// // // // // // //         svgId={clickedSeatId}
// // // // // // //         layout={layout}
// // // // // // //       />
// // // // // // //     </>
// // // // // // //   );
// // // // // // // }

// // // // // // // "use client";

// // // // // // // import React, { useCallback, useEffect, useRef, useState } from "react";
// // // // // // // import {
// // // // // // //   Maximize2, ZoomIn, ZoomOut, Layers,
// // // // // // //   Tag, Hash, Building2, MapPin,
// // // // // // // } from "lucide-react";
// // // // // // // import {
// // // // // // //   Dialog, DialogContent, DialogHeader, DialogTitle,
// // // // // // // } from "@/components/ui/dialog";
// // // // // // // import { Layout } from "../types/layout.types";
// // // // // // // import {
// // // // // // //   fetchAllPreferences,
// // // // // // //   fetchSeatPreferences,
// // // // // // //   saveSeatPreferences,
// // // // // // //   Preference,
// // // // // // // } from "../services/layoutService";

// // // // // // // // ─── Types ────────────────────────────────────────────────────────────────────

// // // // // // // interface LayoutPreviewProps {
// // // // // // //   layout: Layout | null;
// // // // // // // }

// // // // // // // // ─── Helpers ──────────────────────────────────────────────────────────────────

// // // // // // // function extractSeatIds(svgText: string): string[] {
// // // // // // //   const ids: string[] = [];
// // // // // // //   const regex = /<g\s+id="([^"]+)"/g;
// // // // // // //   let match;
// // // // // // //   while ((match = regex.exec(svgText)) !== null) ids.push(match[1]);
// // // // // // //   return ids;
// // // // // // // }

// // // // // // // function getSeatIdFromClick(
// // // // // // //   target: EventTarget | null,
// // // // // // //   knownIds: Set<string>
// // // // // // // ): string | null {
// // // // // // //   let el = target as Element | null;
// // // // // // //   while (el) {
// // // // // // //     if (el.tagName?.toLowerCase() === "svg") return null;
// // // // // // //     const id = el.getAttribute?.("id");
// // // // // // //     if (id && knownIds.has(id)) return id;
// // // // // // //     el = el.parentElement;
// // // // // // //   }
// // // // // // //   return null;
// // // // // // // }

// // // // // // // function highlightSeat(svgText: string, svgId: string): string {
// // // // // // //   const openTag = `<g id="${svgId}">`;
// // // // // // //   const start = svgText.indexOf(openTag);
// // // // // // //   if (start === -1) return svgText;
// // // // // // //   return (
// // // // // // //     svgText.slice(0, start) +
// // // // // // //     `<g id="${svgId}" style="cursor:pointer;filter:drop-shadow(0 0 6px rgba(99,102,241,0.8))">` +
// // // // // // //     svgText.slice(start + openTag.length)
// // // // // // //   );
// // // // // // // }

// // // // // // // function addPointerCursors(svgText: string, ids: string[]): string {
// // // // // // //   let result = svgText;
// // // // // // //   ids.forEach((id) => {
// // // // // // //     result = result.replace(`<g id="${id}">`, `<g id="${id}" style="cursor:pointer">`);
// // // // // // //   });
// // // // // // //   return result;
// // // // // // // }

// // // // // // // // ─── Icon map (preference icon_name → Tabler icon class) ─────────────────────

// // // // // // // const ICON_MAP: Record<string, string> = {
// // // // // // //   window:        "ti-window",
// // // // // // //   desk:          "ti-table",
// // // // // // //   monitor:       "ti-device-desktop",
// // // // // // //   restroom:      "ti-building-community",
// // // // // // //   chair:         "ti-armchair",
// // // // // // //   quiet:         "ti-ear-off",
// // // // // // //   kitchen:       "ti-tools-kitchen-2",
// // // // // // //   collaboration: "ti-users-group",
// // // // // // // };

// // // // // // // function prefIcon(iconName: string): string {
// // // // // // //   return ICON_MAP[iconName] ?? "ti-star";
// // // // // // // }

// // // // // // // // ─── Type colors ──────────────────────────────────────────────────────────────

// // // // // // // const TYPE_COLOR: Record<string, { bg: string; text: string }> = {
// // // // // // //   SEATING:     { bg: "var(--color-background-info)",    text: "var(--color-text-info)"    },
// // // // // // //   EQUIPMENT:   { bg: "var(--color-background-success)", text: "var(--color-text-success)" },
// // // // // // //   LOCATION:    { bg: "var(--color-background-warning)", text: "var(--color-text-warning)" },
// // // // // // //   ENVIRONMENT: { bg: "#EEEDFE",                         text: "#3C3489"                   },
// // // // // // // };

// // // // // // // function typeColor(type: string) {
// // // // // // //   return TYPE_COLOR[type] ?? { bg: "var(--color-background-secondary)", text: "var(--color-text-secondary)" };
// // // // // // // }

// // // // // // // // ─── Row helper ───────────────────────────────────────────────────────────────

// // // // // // // const Row: React.FC<{
// // // // // // //   icon?: React.ReactNode;
// // // // // // //   label: string;
// // // // // // //   value: string;
// // // // // // //   mono?: boolean;
// // // // // // // }> = ({ icon, label, value, mono }) => (
// // // // // // //   <div className="flex items-center justify-between gap-4">
// // // // // // //     <div className="flex items-center gap-1.5 text-[11px] text-gray-500 min-w-0">
// // // // // // //       {icon && <span className="text-gray-400 flex-shrink-0">{icon}</span>}
// // // // // // //       <span className="truncate">{label}</span>
// // // // // // //     </div>
// // // // // // //     <span className={`text-[11px] font-semibold text-gray-800 text-right truncate max-w-[55%] ${
// // // // // // //       mono ? "font-mono bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100" : ""
// // // // // // //     }`}>
// // // // // // //       {value}
// // // // // // //     </span>
// // // // // // //   </div>
// // // // // // // );

// // // // // // // // ─── Seat Dialog ──────────────────────────────────────────────────────────────

// // // // // // // const SeatDialog: React.FC<{
// // // // // // //   open: boolean;
// // // // // // //   onClose: () => void;
// // // // // // //   svgId: string | null;
// // // // // // //   layout: Layout | null;
// // // // // // // }> = ({ open, onClose, svgId, layout }) => {
// // // // // // //   const [tab, setTab] = useState<"info" | "amenities">("info");

// // // // // // //   // amenities state
// // // // // // //   const [allPrefs,     setAllPrefs]     = useState<Preference[]>([]);
// // // // // // //   const [selected,     setSelected]     = useState<Set<string>>(new Set());
// // // // // // //   const [loadingPrefs, setLoadingPrefs] = useState(false);
// // // // // // //   const [saving,       setSaving]       = useState(false);
// // // // // // //   const [saveError,    setSaveError]    = useState(false);
// // // // // // //   const [saved,        setSaved]        = useState(false);

// // // // // // //   // fetch all preferences + seat's existing preferences when dialog opens
// // // // // // //   useEffect(() => {
// // // // // // //     if (!open || !svgId) return;
// // // // // // //     setTab("info");
// // // // // // //     setSaved(false);
// // // // // // //     setSaveError(false);
// // // // // // //     setLoadingPrefs(true);

// // // // // // //     Promise.all([
// // // // // // //       fetchAllPreferences(),
// // // // // // //       fetchSeatPreferences(svgId),
// // // // // // //     ])
// // // // // // //       .then(([prefs, savedIds]) => {
// // // // // // //         setAllPrefs(prefs);
// // // // // // //         setSelected(new Set(savedIds));
// // // // // // //       })
// // // // // // //       .catch(console.error)
// // // // // // //       .finally(() => setLoadingPrefs(false));
// // // // // // //   }, [open, svgId]);

// // // // // // //   const toggle = (id: string) => {
// // // // // // //     setSelected((prev) => {
// // // // // // //       const next = new Set(prev);
// // // // // // //       next.has(id) ? next.delete(id) : next.add(id);
// // // // // // //       return next;
// // // // // // //     });
// // // // // // //     setSaved(false);
// // // // // // //   };

// // // // // // //   const handleSave = async () => {
// // // // // // //     if (!svgId || !layout) return;
// // // // // // //     setSaving(true);
// // // // // // //     setSaveError(false);
// // // // // // //     try {
// // // // // // //       await saveSeatPreferences(svgId, layout.layout_id, [...selected]);
// // // // // // //       setSaved(true);
// // // // // // //     } catch {
// // // // // // //       setSaveError(true);
// // // // // // //     } finally {
// // // // // // //       setSaving(false);
// // // // // // //     }
// // // // // // //   };

// // // // // // //   if (!svgId || !layout) return null;

// // // // // // //   // Group preferences by type
// // // // // // //   const grouped = allPrefs.reduce<Record<string, Preference[]>>((acc, p) => {
// // // // // // //     (acc[p.preference_type] ??= []).push(p);
// // // // // // //     return acc;
// // // // // // //   }, {});

// // // // // // //   const statusConfig: Record<string, { label: string; color: string }> = {
// // // // // // //     PUBLISHED: { label: "Published", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
// // // // // // //     DRAFT:     { label: "Draft",     color: "bg-amber-100  text-amber-700  border-amber-200"     },
// // // // // // //     ARCHIVED:  { label: "Archived",  color: "bg-gray-100   text-gray-600   border-gray-200"      },
// // // // // // //   };
// // // // // // //   const sc = statusConfig[layout.status] ?? statusConfig.DRAFT;

// // // // // // //   return (
// // // // // // //     <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
// // // // // // //       <DialogContent className="max-w-md rounded-2xl p-0 overflow-hidden border border-gray-100 shadow-2xl">

// // // // // // //         {/* Header */}
// // // // // // //         <div className="bg-gradient-to-br from-indigo-600 to-violet-600 px-5 pt-5 pb-4 text-white">
// // // // // // //           <DialogHeader>
// // // // // // //             <div className="flex items-start justify-between gap-3">
// // // // // // //               <div>
// // // // // // //                 <p className="text-[11px] font-semibold uppercase tracking-widest text-indigo-200 mb-1">
// // // // // // //                   Seat Element
// // // // // // //                 </p>
// // // // // // //                 <DialogTitle className="text-2xl font-black tracking-tight text-white">
// // // // // // //                   #{svgId}
// // // // // // //                 </DialogTitle>
// // // // // // //               </div>
// // // // // // //               <span className={`mt-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${sc.color}`}>
// // // // // // //                 {sc.label}
// // // // // // //               </span>
// // // // // // //             </div>
// // // // // // //           </DialogHeader>

// // // // // // //           {/* Tabs */}
// // // // // // //           <div className="flex gap-1 mt-4">
// // // // // // //             {(["info", "amenities"] as const).map((t) => (
// // // // // // //               <button
// // // // // // //                 key={t}
// // // // // // //                 onClick={() => setTab(t)}
// // // // // // //                 className={`px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-colors capitalize ${
// // // // // // //                   tab === t
// // // // // // //                     ? "bg-white/20 text-white"
// // // // // // //                     : "text-indigo-200 hover:bg-white/10"
// // // // // // //                 }`}
// // // // // // //               >
// // // // // // //                 {t === "amenities" ? `Amenities${selected.size > 0 ? ` (${selected.size})` : ""}` : t}
// // // // // // //               </button>
// // // // // // //             ))}
// // // // // // //           </div>
// // // // // // //         </div>

// // // // // // //         {/* Body */}
// // // // // // //         <div className="overflow-y-auto" style={{ maxHeight: 420 }}>

// // // // // // //           {/* ── INFO TAB ── */}
// // // // // // //           {tab === "info" && (
// // // // // // //             <div className="px-5 py-4 space-y-4">
// // // // // // //               <div className="space-y-2.5">
// // // // // // //                 <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Layout Info</p>
// // // // // // //                 <Row icon={<Tag size={13} />}    label="Layout"  value={layout.layout_name} />
// // // // // // //                 <Row icon={<Hash size={13} />}   label="Version" value={`v${layout.version_no}`} />
// // // // // // //                 <Row icon={<Layers size={13} />} label="Type"    value={layout.layout_type} />
// // // // // // //               </div>
// // // // // // //               <div className="border-t border-gray-100" />
// // // // // // //               <div className="space-y-2.5">
// // // // // // //                 <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Location</p>
// // // // // // //                 <Row icon={<MapPin size={13} />}    label="Site"     value={layout.site_name} />
// // // // // // //                 <Row icon={<Building2 size={13} />} label="Building" value={layout.building_name} />
// // // // // // //                 <Row icon={<Layers size={13} />}    label="Floor"    value={layout.floor_name} />
// // // // // // //               </div>
// // // // // // //               <div className="border-t border-gray-100" />
// // // // // // //               <div className="space-y-2.5">
// // // // // // //                 <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">References</p>
// // // // // // //                 <Row label="SVG Element ID" value={svgId}            mono />
// // // // // // //                 <Row label="Layout ID"      value={layout.layout_id} mono />
// // // // // // //                 <Row label="Floor ID"       value={layout.floor_id}  mono />
// // // // // // //               </div>
// // // // // // //               <div className="border-t border-gray-100" />
// // // // // // //               <div className="flex items-center gap-3 py-1">
// // // // // // //                 <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[11px] font-black flex-shrink-0">
// // // // // // //                   {layout.uploaded_by_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
// // // // // // //                 </div>
// // // // // // //                 <div>
// // // // // // //                   <p className="text-[12px] font-semibold text-gray-800 leading-tight">{layout.uploaded_by_name}</p>
// // // // // // //                   <p className="text-[10px] text-gray-400">{layout.uploaded_by_role.replace(/_/g, " ")}</p>
// // // // // // //                 </div>
// // // // // // //               </div>
// // // // // // //             </div>
// // // // // // //           )}

// // // // // // //           {/* ── AMENITIES TAB ── */}
// // // // // // //           {tab === "amenities" && (
// // // // // // //             <div className="px-5 py-4">
// // // // // // //               {loadingPrefs ? (
// // // // // // //                 <div className="flex items-center justify-center py-10">
// // // // // // //                   <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
// // // // // // //                 </div>
// // // // // // //               ) : allPrefs.length === 0 ? (
// // // // // // //                 <p className="text-[12px] text-gray-400 text-center py-8">No amenities found.</p>
// // // // // // //               ) : (
// // // // // // //                 <div className="space-y-5">
// // // // // // //                   {Object.entries(grouped).map(([type, prefs]) => {
// // // // // // //                     const tc = typeColor(type);
// // // // // // //                     return (
// // // // // // //                       <div key={type}>
// // // // // // //                         <div className="flex items-center gap-2 mb-2.5">
// // // // // // //                           <span
// // // // // // //                             className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded"
// // // // // // //                             style={{ background: tc.bg, color: tc.text }}
// // // // // // //                           >
// // // // // // //                             {type}
// // // // // // //                           </span>
// // // // // // //                         </div>
// // // // // // //                         <div className="space-y-1.5">
// // // // // // //                           {prefs.map((p) => {
// // // // // // //                             const isOn = selected.has(p.preference_id);
// // // // // // //                             return (
// // // // // // //                               <button
// // // // // // //                                 key={p.preference_id}
// // // // // // //                                 onClick={() => toggle(p.preference_id)}
// // // // // // //                                 className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all ${
// // // // // // //                                   isOn
// // // // // // //                                     ? "border-indigo-300 bg-indigo-50"
// // // // // // //                                     : "border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50"
// // // // // // //                                 }`}
// // // // // // //                               >
// // // // // // //                                 {/* icon */}
// // // // // // //                                 <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
// // // // // // //                                   isOn ? "bg-indigo-100" : "bg-gray-100"
// // // // // // //                                 }`}>
// // // // // // //                                   <i
// // // // // // //                                     className={`ti ${prefIcon(p.icon_name)} text-[16px] ${
// // // // // // //                                       isOn ? "text-indigo-600" : "text-gray-500"
// // // // // // //                                     }`}
// // // // // // //                                     aria-hidden="true"
// // // // // // //                                   />
// // // // // // //                                 </div>

// // // // // // //                                 {/* text */}
// // // // // // //                                 <div className="flex-1 min-w-0">
// // // // // // //                                   <p className={`text-[12px] font-semibold leading-tight truncate ${
// // // // // // //                                     isOn ? "text-indigo-700" : "text-gray-700"
// // // // // // //                                   }`}>
// // // // // // //                                     {p.preference_name}
// // // // // // //                                   </p>
// // // // // // //                                   <p className="text-[10px] text-gray-400 truncate mt-0.5">
// // // // // // //                                     {p.description}
// // // // // // //                                   </p>
// // // // // // //                                 </div>

// // // // // // //                                 {/* toggle indicator */}
// // // // // // //                                 <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
// // // // // // //                                   isOn
// // // // // // //                                     ? "bg-indigo-600 border-indigo-600"
// // // // // // //                                     : "border-gray-300 bg-white"
// // // // // // //                                 }`}>
// // // // // // //                                   {isOn && (
// // // // // // //                                     <svg viewBox="0 0 10 8" className="w-2.5 h-2 text-white fill-current">
// // // // // // //                                       <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
// // // // // // //                                     </svg>
// // // // // // //                                   )}
// // // // // // //                                 </div>
// // // // // // //                               </button>
// // // // // // //                             );
// // // // // // //                           })}
// // // // // // //                         </div>
// // // // // // //                       </div>
// // // // // // //                     );
// // // // // // //                   })}
// // // // // // //                 </div>
// // // // // // //               )}
// // // // // // //             </div>
// // // // // // //           )}
// // // // // // //         </div>

// // // // // // //         {/* Footer — save button shown only on amenities tab */}
// // // // // // //         {tab === "amenities" && !loadingPrefs && (
// // // // // // //           <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between gap-3">
// // // // // // //             <div className="text-[11px]">
// // // // // // //               {saveError && <span className="text-red-500">Save failed. Try again.</span>}
// // // // // // //               {saved && !saveError && <span className="text-emerald-600">Saved successfully.</span>}
// // // // // // //             </div>
// // // // // // //             <button
// // // // // // //               onClick={handleSave}
// // // // // // //               disabled={saving}
// // // // // // //               className="px-4 py-2 text-[12px] font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
// // // // // // //             >
// // // // // // //               {saving ? "Saving…" : "Save amenities"}
// // // // // // //             </button>
// // // // // // //           </div>
// // // // // // //         )}
// // // // // // //       </DialogContent>
// // // // // // //     </Dialog>
// // // // // // //   );
// // // // // // // };

// // // // // // // // ─── Main Component ───────────────────────────────────────────────────────────

// // // // // // // const SVG_W = 2466;
// // // // // // // const SVG_H = 2039;

// // // // // // // export default function LayoutPreview({ layout }: LayoutPreviewProps) {
// // // // // // //   const wrapperRef   = useRef<HTMLDivElement>(null);
// // // // // // //   const transformRef = useRef<HTMLDivElement>(null);

// // // // // // //   const scaleRef     = useRef(1);
// // // // // // //   const translateRef = useRef({ x: 0, y: 0 });
// // // // // // //   const isPanning    = useRef(false);
// // // // // // //   const panStart     = useRef({ x: 0, y: 0 });
// // // // // // //   const mouseDownPos = useRef({ x: 0, y: 0 });
// // // // // // //   const didDrag      = useRef(false);

// // // // // // //   const [rawSvg,      setRawSvg]      = useState<string | null>(null);
// // // // // // //   const [svgError,    setSvgError]    = useState(false);
// // // // // // //   const [zoomDisplay, setZoomDisplay] = useState(100);
// // // // // // //   const [mapReady,    setMapReady]    = useState(false);
// // // // // // //   const [loading,     setLoading]     = useState(false);

// // // // // // //   const seatIdsRef = useRef<Set<string>>(new Set());

// // // // // // //   const [dialogOpen,    setDialogOpen]    = useState(false);
// // // // // // //   const [clickedSeatId, setClickedSeatId] = useState<string | null>(null);

// // // // // // //   // ── Fetch SVG ──────────────────────────────────────────────────────────────
// // // // // // //   useEffect(() => {
// // // // // // //     const url = layout?.layout_file_url;
// // // // // // //     if (!url || !url.startsWith("https://")) {
// // // // // // //       setRawSvg(null); setSvgError(false); setMapReady(false); return;
// // // // // // //     }
// // // // // // //     setLoading(true); setRawSvg(null); setSvgError(false); setMapReady(false);
// // // // // // //     fetch(url)
// // // // // // //       .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.text(); })
// // // // // // //       .then((text) => {
// // // // // // //         const fluid = text
// // // // // // //           .replace(/\bwidth="[^"]*"/, 'width="100%"')
// // // // // // //           .replace(/\bheight="[^"]*"/, 'height="100%"');
// // // // // // //         const ids = extractSeatIds(fluid);
// // // // // // //         seatIdsRef.current = new Set(ids);
// // // // // // //         setRawSvg(addPointerCursors(fluid, ids));
// // // // // // //       })
// // // // // // //       .catch(() => setSvgError(true))
// // // // // // //       .finally(() => setLoading(false));
// // // // // // //   }, [layout?.layout_file_url]);

// // // // // // //   const applyTransform = useCallback(() => {
// // // // // // //     const el = transformRef.current;
// // // // // // //     if (!el) return;
// // // // // // //     el.style.transform = `translate(${translateRef.current.x}px,${translateRef.current.y}px) scale(${scaleRef.current})`;
// // // // // // //   }, []);

// // // // // // //   const fitView = useCallback(() => {
// // // // // // //     const wrapper = wrapperRef.current;
// // // // // // //     if (!wrapper) return;
// // // // // // //     const { width: wW, height: wH } = wrapper.getBoundingClientRect();
// // // // // // //     if (wW === 0 || wH === 0) return;
// // // // // // //     const scale = Math.min(wW / SVG_W, wH / SVG_H);
// // // // // // //     scaleRef.current = scale;
// // // // // // //     translateRef.current = { x: (wW - SVG_W * scale) / 2, y: (wH - SVG_H * scale) / 2 };
// // // // // // //     applyTransform();
// // // // // // //     setZoomDisplay(Math.round(scale * 100));
// // // // // // //   }, [applyTransform]);

// // // // // // //   useEffect(() => {
// // // // // // //     const wrapper = wrapperRef.current;
// // // // // // //     if (!wrapper || !rawSvg) return;
// // // // // // //     const observer = new ResizeObserver(() => fitView());
// // // // // // //     observer.observe(wrapper);
// // // // // // //     return () => observer.disconnect();
// // // // // // //   }, [rawSvg, fitView]);

// // // // // // //   useEffect(() => {
// // // // // // //     if (!rawSvg || loading) { setMapReady(false); return; }
// // // // // // //     const id = requestAnimationFrame(() => { fitView(); setMapReady(true); });
// // // // // // //     return () => cancelAnimationFrame(id);
// // // // // // //   }, [rawSvg, loading, fitView]);

// // // // // // //   const zoomStep = useCallback((factor: number) => {
// // // // // // //     const wrapper = wrapperRef.current;
// // // // // // //     if (!wrapper) return;
// // // // // // //     const { width: wW, height: wH } = wrapper.getBoundingClientRect();
// // // // // // //     const oldScale = scaleRef.current;
// // // // // // //     const newScale = Math.min(Math.max(oldScale * factor, 0.05), 4);
// // // // // // //     const cx = wW / 2, cy = wH / 2;
// // // // // // //     translateRef.current = {
// // // // // // //       x: cx - (cx - translateRef.current.x) * (newScale / oldScale),
// // // // // // //       y: cy - (cy - translateRef.current.y) * (newScale / oldScale),
// // // // // // //     };
// // // // // // //     scaleRef.current = newScale;
// // // // // // //     applyTransform();
// // // // // // //     setZoomDisplay(Math.round(newScale * 100));
// // // // // // //   }, [applyTransform]);

// // // // // // //   const zoomIn  = useCallback(() => zoomStep(1.25),     [zoomStep]);
// // // // // // //   const zoomOut = useCallback(() => zoomStep(1 / 1.25), [zoomStep]);

// // // // // // //   useEffect(() => {
// // // // // // //     const el = wrapperRef.current;
// // // // // // //     if (!el) return;
// // // // // // //     const handler = (e: WheelEvent) => {
// // // // // // //       e.preventDefault();
// // // // // // //       const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
// // // // // // //       const oldScale = scaleRef.current;
// // // // // // //       const newScale = Math.min(Math.max(oldScale * factor, 0.05), 4);
// // // // // // //       const rect = el.getBoundingClientRect();
// // // // // // //       translateRef.current = {
// // // // // // //         x: e.clientX - rect.left - (e.clientX - rect.left - translateRef.current.x) * (newScale / oldScale),
// // // // // // //         y: e.clientY - rect.top  - (e.clientY - rect.top  - translateRef.current.y) * (newScale / oldScale),
// // // // // // //       };
// // // // // // //       scaleRef.current = newScale;
// // // // // // //       applyTransform();
// // // // // // //       setZoomDisplay(Math.round(newScale * 100));
// // // // // // //     };
// // // // // // //     el.addEventListener("wheel", handler, { passive: false });
// // // // // // //     return () => el.removeEventListener("wheel", handler);
// // // // // // //   }, [applyTransform]);

// // // // // // //   const onMouseDown = (e: React.MouseEvent) => {
// // // // // // //     isPanning.current = true; didDrag.current = false;
// // // // // // //     mouseDownPos.current = { x: e.clientX, y: e.clientY };
// // // // // // //     panStart.current = { ...translateRef.current };
// // // // // // //     (e.currentTarget as HTMLElement).style.cursor = "grabbing";
// // // // // // //   };

// // // // // // //   const onMouseMove = (e: React.MouseEvent) => {
// // // // // // //     if (!isPanning.current) return;
// // // // // // //     const dx = e.clientX - mouseDownPos.current.x;
// // // // // // //     const dy = e.clientY - mouseDownPos.current.y;
// // // // // // //     if (!didDrag.current && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) didDrag.current = true;
// // // // // // //     if (didDrag.current) {
// // // // // // //       translateRef.current = { x: panStart.current.x + dx, y: panStart.current.y + dy };
// // // // // // //       applyTransform();
// // // // // // //     }
// // // // // // //   };

// // // // // // //   const onMouseUp = (e: React.MouseEvent) => {
// // // // // // //     isPanning.current = false;
// // // // // // //     (e.currentTarget as HTMLElement).style.cursor = "grab";
// // // // // // //   };

// // // // // // //   const onMouseLeave = () => {
// // // // // // //     isPanning.current = false;
// // // // // // //     if (wrapperRef.current) wrapperRef.current.style.cursor = "grab";
// // // // // // //   };

// // // // // // //   const onMapClick = (e: React.MouseEvent) => {
// // // // // // //     if (didDrag.current) { didDrag.current = false; return; }
// // // // // // //     const svgId = getSeatIdFromClick(e.target, seatIdsRef.current);
// // // // // // //     if (!svgId) return;
// // // // // // //     setClickedSeatId(svgId);
// // // // // // //     setDialogOpen(true);
// // // // // // //   };

// // // // // // //   const displaySvg = rawSvg && clickedSeatId && dialogOpen
// // // // // // //     ? highlightSeat(rawSvg, clickedSeatId)
// // // // // // //     : rawSvg;

// // // // // // //   const showSpinner = loading || (!rawSvg && !svgError && !!layout?.layout_file_url);

// // // // // // //   if (!layout) {
// // // // // // //     return (
// // // // // // //       <div className="flex items-center justify-center h-full min-h-[460px] bg-gray-50 rounded-xl border border-dashed border-gray-200">
// // // // // // //         <div className="text-center text-gray-400">
// // // // // // //           <Layers className="mx-auto mb-2 opacity-30" size={32} />
// // // // // // //           <p className="text-sm">Select a layout to preview</p>
// // // // // // //         </div>
// // // // // // //       </div>
// // // // // // //     );
// // // // // // //   }

// // // // // // //   return (
// // // // // // //     <>
// // // // // // //       <div
// // // // // // //         className="relative bg-[#F7F8FC] border border-[#EBEBF5] rounded-xl overflow-hidden"
// // // // // // //         style={{ width: "100%", height: 520 }}
// // // // // // //       >
// // // // // // //         {mapReady && (
// // // // // // //           <>
// // // // // // //             <div className="absolute top-3 left-3 z-20 text-[10px] font-semibold text-gray-400 bg-white/90 px-2 py-1 rounded-md border border-[#EBEBF5] select-none tabular-nums">
// // // // // // //               {zoomDisplay}%
// // // // // // //             </div>
// // // // // // //             <div className="absolute top-3 right-3 z-20 flex flex-col gap-1.5">
// // // // // // //               {([
// // // // // // //                 { icon: <ZoomIn size={14} />,    action: zoomIn,  title: "Zoom in"     },
// // // // // // //                 { icon: <ZoomOut size={14} />,   action: zoomOut, title: "Zoom out"    },
// // // // // // //                 { icon: <Maximize2 size={14} />, action: fitView, title: "Fit to view" },
// // // // // // //               ] as const).map(({ icon, action, title }) => (
// // // // // // //                 <button
// // // // // // //                   key={title}
// // // // // // //                   onClick={(e) => { e.stopPropagation(); action(); }}
// // // // // // //                   title={title}
// // // // // // //                   className="w-8 h-8 rounded-lg bg-white border border-[#EBEBF5] shadow-sm flex items-center justify-center hover:bg-gray-50 text-gray-600 transition-colors"
// // // // // // //                 >
// // // // // // //                   {icon}
// // // // // // //                 </button>
// // // // // // //               ))}
// // // // // // //             </div>
// // // // // // //             <div className="absolute bottom-2 left-3 z-20 text-[10px] text-gray-400 bg-white/80 px-2 py-1 rounded-md border border-[#EBEBF5] select-none">
// // // // // // //               Scroll to zoom · Drag to pan · Click a seat to configure
// // // // // // //             </div>
// // // // // // //           </>
// // // // // // //         )}

// // // // // // //         <div
// // // // // // //           ref={wrapperRef}
// // // // // // //           className="w-full h-full overflow-hidden select-none"
// // // // // // //           style={{ cursor: "grab" }}
// // // // // // //           onMouseDown={onMouseDown}
// // // // // // //           onMouseMove={onMouseMove}
// // // // // // //           onMouseUp={onMouseUp}
// // // // // // //           onMouseLeave={onMouseLeave}
// // // // // // //           onClick={onMapClick}
// // // // // // //         >
// // // // // // //           {showSpinner && (
// // // // // // //             <div className="absolute inset-0 flex items-center justify-center bg-[#F7F8FC] z-10">
// // // // // // //               <div className="flex flex-col items-center gap-3">
// // // // // // //                 <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
// // // // // // //                 <p className="text-[12px] text-gray-400">Loading floor plan…</p>
// // // // // // //               </div>
// // // // // // //             </div>
// // // // // // //           )}

// // // // // // //           {svgError && (
// // // // // // //             <div className="absolute inset-0 flex items-center justify-center">
// // // // // // //               <div className="text-center">
// // // // // // //                 <p className="text-[13px] text-gray-500 mb-1">Could not load floor plan</p>
// // // // // // //                 <p className="text-[11px] text-gray-400 font-mono break-all px-6">{layout.layout_file_url}</p>
// // // // // // //               </div>
// // // // // // //             </div>
// // // // // // //           )}

// // // // // // //           {displaySvg && (
// // // // // // //             <div
// // // // // // //               ref={transformRef}
// // // // // // //               style={{
// // // // // // //                 transformOrigin: "top left",
// // // // // // //                 width:      `${SVG_W}px`,
// // // // // // //                 height:     `${SVG_H}px`,
// // // // // // //                 willChange: "transform",
// // // // // // //                 visibility: mapReady ? "visible" : "hidden",
// // // // // // //               }}
// // // // // // //               dangerouslySetInnerHTML={{ __html: displaySvg }}
// // // // // // //             />
// // // // // // //           )}
// // // // // // //         </div>
// // // // // // //       </div>

// // // // // // //       <SeatDialog
// // // // // // //         open={dialogOpen}
// // // // // // //         onClose={() => { setDialogOpen(false); setClickedSeatId(null); }}
// // // // // // //         svgId={clickedSeatId}
// // // // // // //         layout={layout}
// // // // // // //       />
// // // // // // //     </>
// // // // // // //   );
// // // // // // // }

// // // // // // "use client";

// // // // // // import React, { useCallback, useEffect, useRef, useState } from "react";
// // // // // // import {
// // // // // //   Maximize2, ZoomIn, ZoomOut, Layers,
// // // // // //   Tag, Hash, Building2, MapPin,
// // // // // // } from "lucide-react";
// // // // // // import {
// // // // // //   Dialog, DialogContent, DialogHeader, DialogTitle,
// // // // // // } from "@/components/ui/dialog";
// // // // // // import { Layout } from "../types/layout.types";
// // // // // // import {
// // // // // //   fetchAllPreferences,
// // // // // //   saveSeatPreferences,
// // // // // //   Preference,
// // // // // // } from "../services/layoutService";

// // // // // // // ─── Types ────────────────────────────────────────────────────────────────────

// // // // // // interface LayoutPreviewProps {
// // // // // //   layout: Layout | null;
// // // // // // }

// // // // // // // ─── Helpers ──────────────────────────────────────────────────────────────────

// // // // // // function extractSeatIds(svgText: string): string[] {
// // // // // //   const ids: string[] = [];
// // // // // //   const regex = /<g\s+id="([^"]+)"/g;
// // // // // //   let match;
// // // // // //   while ((match = regex.exec(svgText)) !== null) ids.push(match[1]);
// // // // // //   return ids;
// // // // // // }

// // // // // // function getSeatIdFromClick(
// // // // // //   target: EventTarget | null,
// // // // // //   knownIds: Set<string>
// // // // // // ): string | null {
// // // // // //   let el = target as Element | null;
// // // // // //   while (el) {
// // // // // //     if (el.tagName?.toLowerCase() === "svg") return null;
// // // // // //     const id = el.getAttribute?.("id");
// // // // // //     if (id && knownIds.has(id)) return id;
// // // // // //     el = el.parentElement;
// // // // // //   }
// // // // // //   return null;
// // // // // // }

// // // // // // function highlightSeat(svgText: string, svgId: string): string {
// // // // // //   const openTag = `<g id="${svgId}">`;
// // // // // //   const start = svgText.indexOf(openTag);
// // // // // //   if (start === -1) return svgText;
// // // // // //   return (
// // // // // //     svgText.slice(0, start) +
// // // // // //     `<g id="${svgId}" style="cursor:pointer;filter:drop-shadow(0 0 6px rgba(99,102,241,0.8))">` +
// // // // // //     svgText.slice(start + openTag.length)
// // // // // //   );
// // // // // // }

// // // // // // function addPointerCursors(svgText: string, ids: string[]): string {
// // // // // //   let result = svgText;
// // // // // //   ids.forEach((id) => {
// // // // // //     result = result.replace(`<g id="${id}">`, `<g id="${id}" style="cursor:pointer">`);
// // // // // //   });
// // // // // //   return result;
// // // // // // }

// // // // // // // ─── Icon map ─────────────────────────────────────────────────────────────────

// // // // // // const ICON_MAP: Record<string, string> = {
// // // // // //   window:        "ti-window",
// // // // // //   desk:          "ti-table",
// // // // // //   monitor:       "ti-device-desktop",
// // // // // //   restroom:      "ti-building-community",
// // // // // //   chair:         "ti-armchair",
// // // // // //   quiet:         "ti-ear-off",
// // // // // //   kitchen:       "ti-tools-kitchen-2",
// // // // // //   collaboration: "ti-users-group",
// // // // // // };

// // // // // // function prefIcon(iconName: string): string {
// // // // // //   return ICON_MAP[iconName] ?? "ti-star";
// // // // // // }

// // // // // // // ─── Type badge colors ────────────────────────────────────────────────────────

// // // // // // const TYPE_COLOR: Record<string, { bg: string; text: string }> = {
// // // // // //   SEATING:     { bg: "#EFF6FF", text: "#1D4ED8" },
// // // // // //   EQUIPMENT:   { bg: "#F0FDF4", text: "#15803D" },
// // // // // //   LOCATION:    { bg: "#FFFBEB", text: "#B45309" },
// // // // // //   ENVIRONMENT: { bg: "#EEEDFE", text: "#3C3489" },
// // // // // // };

// // // // // // function typeColor(type: string) {
// // // // // //   return TYPE_COLOR[type] ?? { bg: "#F3F4F6", text: "#6B7280" };
// // // // // // }

// // // // // // // ─── Field component — label above, value in input-style box ─────────────────

// // // // // // const Field: React.FC<{
// // // // // //   label: string;
// // // // // //   value: string;
// // // // // //   mono?: boolean;
// // // // // //   icon?: React.ReactNode;
// // // // // //   half?: boolean;
// // // // // // }> = ({ label, value, mono, icon, half }) => (
// // // // // //   <div className={half ? "flex flex-col gap-1" : "flex flex-col gap-1"}>
// // // // // //     <label className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
// // // // // //       {label}
// // // // // //     </label>
// // // // // //     <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 ${
// // // // // //       mono ? "font-mono" : ""
// // // // // //     }`}>
// // // // // //       {icon && <span className="text-gray-400 flex-shrink-0">{icon}</span>}
// // // // // //       <span className={`text-[12px] text-gray-800 font-medium truncate ${mono ? "text-[11px]" : ""}`}>
// // // // // //         {value}
// // // // // //       </span>
// // // // // //     </div>
// // // // // //   </div>
// // // // // // );

// // // // // // // ─── Section heading ──────────────────────────────────────────────────────────

// // // // // // const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
// // // // // //   <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">
// // // // // //     {children}
// // // // // //   </p>
// // // // // // );

// // // // // // // ─── Seat Dialog ──────────────────────────────────────────────────────────────

// // // // // // const SeatDialog: React.FC<{
// // // // // //   open: boolean;
// // // // // //   onClose: () => void;
// // // // // //   svgId: string | null;
// // // // // //   layout: Layout | null;
// // // // // // }> = ({ open, onClose, svgId, layout }) => {
// // // // // //   const [allPrefs,     setAllPrefs]     = useState<Preference[]>([]);
// // // // // //   const [selected,     setSelected]     = useState<Set<string>>(new Set());
// // // // // //   const [loadingPrefs, setLoadingPrefs] = useState(false);
// // // // // //   const [saving,       setSaving]       = useState(false);
// // // // // //   const [saveError,    setSaveError]    = useState(false);
// // // // // //   const [saved,        setSaved]        = useState(false);

// // // // // //   useEffect(() => {
// // // // // //     if (!open) return;
// // // // // //     setSelected(new Set());
// // // // // //     setSaved(false);
// // // // // //     setSaveError(false);
// // // // // //     setLoadingPrefs(true);
// // // // // //     fetchAllPreferences()
// // // // // //       .then(setAllPrefs)
// // // // // //       .catch(console.error)
// // // // // //       .finally(() => setLoadingPrefs(false));
// // // // // //   }, [open]);

// // // // // //   const toggle = (id: string) => {
// // // // // //     setSelected((prev) => {
// // // // // //       const next = new Set(prev);
// // // // // //       next.has(id) ? next.delete(id) : next.add(id);
// // // // // //       return next;
// // // // // //     });
// // // // // //     setSaved(false);
// // // // // //   };

// // // // // //   const handleSave = async () => {
// // // // // //     if (!svgId || !layout) return;
// // // // // //     setSaving(true);
// // // // // //     setSaveError(false);
// // // // // //     try {
// // // // // //       await saveSeatPreferences(svgId, layout.layout_id, [...selected]);
// // // // // //       setSaved(true);
// // // // // //     } catch {
// // // // // //       setSaveError(true);
// // // // // //     } finally {
// // // // // //       setSaving(false);
// // // // // //     }
// // // // // //   };

// // // // // //   if (!svgId || !layout) return null;

// // // // // //   const grouped = allPrefs.reduce<Record<string, Preference[]>>((acc, p) => {
// // // // // //     (acc[p.preference_type] ??= []).push(p);
// // // // // //     return acc;
// // // // // //   }, {});

// // // // // //   const statusConfig: Record<string, { label: string; bg: string; text: string; border: string }> = {
// // // // // //     PUBLISHED: { label: "Published", bg: "#D1FAE5", text: "#065F46", border: "#6EE7B7" },
// // // // // //     DRAFT:     { label: "Draft",     bg: "#FEF3C7", text: "#92400E", border: "#FCD34D" },
// // // // // //     ARCHIVED:  { label: "Archived",  bg: "#F3F4F6", text: "#4B5563", border: "#D1D5DB" },
// // // // // //   };
// // // // // //   const sc = statusConfig[layout.status] ?? statusConfig.DRAFT;

// // // // // //   return (
// // // // // //     <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
// // // // // //       <DialogContent className="max-w-lg rounded-2xl p-0 overflow-hidden border border-gray-100 shadow-2xl">

// // // // // //         {/* ── Header ── */}
// // // // // //         <div className="bg-gradient-to-br from-indigo-600 to-violet-600 px-5 pt-5 pb-5 text-white">
// // // // // //           <DialogHeader>
// // // // // //             <div className="flex items-start justify-between gap-3">
// // // // // //               <div>
// // // // // //                 <p className="text-[11px] font-semibold uppercase tracking-widest text-indigo-200 mb-1">
// // // // // //                   Seat Configuration
// // // // // //                 </p>
// // // // // //                 <DialogTitle className="text-2xl font-black tracking-tight text-white">
// // // // // //                   {svgId}
// // // // // //                 </DialogTitle>
// // // // // //               </div>
// // // // // //               <span
// // // // // //                 className="mt-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border"
// // // // // //                 style={{ background: sc.bg, color: sc.text, borderColor: sc.border }}
// // // // // //               >
// // // // // //                 {sc.label}
// // // // // //               </span>
// // // // // //             </div>
// // // // // //           </DialogHeader>
// // // // // //         </div>

// // // // // //         {/* ── Scrollable body ── */}
// // // // // //         <div className="overflow-y-auto" style={{ maxHeight: 560 }}>

// // // // // //           {/* ── Seat Details ── */}
// // // // // //           <div className="px-5 pt-5 pb-4">
// // // // // //             <SectionLabel>Seat Details</SectionLabel>
// // // // // //             <div className="grid grid-cols-2 gap-3">
// // // // // //               <Field label="SVG Element ID" value={svgId}  mono />
// // // // // //               <Field label="Layout ID"      value={layout.layout_id} mono />
// // // // // //               <Field label="Floor ID"       value={layout.floor_id}  mono />
// // // // // //               <Field label="Version"        value={`v${layout.version_no}`} icon={<Hash size={12} />} />
// // // // // //             </div>
// // // // // //           </div>

// // // // // //           <div className="mx-5 border-t border-gray-100" />

// // // // // //           {/* ── Layout Info ── */}
// // // // // //           <div className="px-5 py-4">
// // // // // //             <SectionLabel>Layout Info</SectionLabel>
// // // // // //             <div className="grid grid-cols-2 gap-3">
// // // // // //               <div className="col-span-2">
// // // // // //                 <Field label="Layout Name" value={layout.layout_name} icon={<Tag size={12} />} />
// // // // // //               </div>
// // // // // //               <Field label="Layout Type" value={layout.layout_type} />
// // // // // //               <Field
// // // // // //                 label="Status"
// // // // // //                 value={layout.status}
// // // // // //               />
// // // // // //             </div>
// // // // // //           </div>

// // // // // //           <div className="mx-5 border-t border-gray-100" />

// // // // // //           {/* ── Location ── */}
// // // // // //           <div className="px-5 py-4">
// // // // // //             <SectionLabel>Location</SectionLabel>
// // // // // //             <div className="grid grid-cols-2 gap-3">
// // // // // //               <div className="col-span-2">
// // // // // //                 <Field label="Site" value={layout.site_name} icon={<MapPin size={12} />} />
// // // // // //               </div>
// // // // // //               <Field label="Building" value={layout.building_name} icon={<Building2 size={12} />} />
// // // // // //               <Field label="Floor"    value={layout.floor_name}    icon={<Layers size={12} />} />
// // // // // //             </div>
// // // // // //           </div>

// // // // // //           <div className="mx-5 border-t border-gray-100" />

// // // // // //           {/* ── Uploaded By ── */}
// // // // // //           <div className="px-5 py-4">
// // // // // //             <SectionLabel>Uploaded By</SectionLabel>
// // // // // //             <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50">
// // // // // //               <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[11px] font-black flex-shrink-0">
// // // // // //                 {layout.uploaded_by_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
// // // // // //               </div>
// // // // // //               <div className="min-w-0">
// // // // // //                 <p className="text-[12px] font-semibold text-gray-800 leading-tight truncate">
// // // // // //                   {layout.uploaded_by_name}
// // // // // //                 </p>
// // // // // //                 <p className="text-[10px] text-gray-400 truncate">
// // // // // //                   {layout.uploaded_by_role.replace(/_/g, " ")} · {layout.uploaded_by_department}
// // // // // //                 </p>
// // // // // //               </div>
// // // // // //             </div>
// // // // // //           </div>

// // // // // //           <div className="mx-5 border-t border-gray-100" />

// // // // // //           {/* ── Amenities ── */}
// // // // // //           <div className="px-5 py-4">
// // // // // //             <div className="flex items-center justify-between mb-3">
// // // // // //               <SectionLabel>Amenities</SectionLabel>
// // // // // //               {selected.size > 0 && (
// // // // // //                 <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full -mt-3">
// // // // // //                   {selected.size} selected
// // // // // //                 </span>
// // // // // //               )}
// // // // // //             </div>

// // // // // //             {loadingPrefs ? (
// // // // // //               <div className="flex items-center justify-center py-8">
// // // // // //                 <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
// // // // // //               </div>
// // // // // //             ) : allPrefs.length === 0 ? (
// // // // // //               <p className="text-[12px] text-gray-400 text-center py-6">No amenities available.</p>
// // // // // //             ) : (
// // // // // //               <div className="space-y-4">
// // // // // //                 {Object.entries(grouped).map(([type, prefs]) => {
// // // // // //                   const tc = typeColor(type);
// // // // // //                   return (
// // // // // //                     <div key={type}>
// // // // // //                       <div className="mb-2">
// // // // // //                         <span
// // // // // //                           className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded"
// // // // // //                           style={{ background: tc.bg, color: tc.text }}
// // // // // //                         >
// // // // // //                           {type}
// // // // // //                         </span>
// // // // // //                       </div>
// // // // // //                       <div className="grid grid-cols-2 gap-2">
// // // // // //                         {prefs.map((p) => {
// // // // // //                           const isOn = selected.has(p.preference_id);
// // // // // //                           return (
// // // // // //                             <button
// // // // // //                               key={p.preference_id}
// // // // // //                               onClick={() => toggle(p.preference_id)}
// // // // // //                               className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-left transition-all ${
// // // // // //                                 isOn
// // // // // //                                   ? "border-indigo-300 bg-indigo-50"
// // // // // //                                   : "border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-white"
// // // // // //                               }`}
// // // // // //                             >
// // // // // //                               <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${
// // // // // //                                 isOn ? "bg-indigo-100" : "bg-white border border-gray-200"
// // // // // //                               }`}>
// // // // // //                                 <i
// // // // // //                                   className={`ti ${prefIcon(p.icon_name)} text-[14px] ${
// // // // // //                                     isOn ? "text-indigo-600" : "text-gray-400"
// // // // // //                                   }`}
// // // // // //                                   aria-hidden="true"
// // // // // //                                 />
// // // // // //                               </div>
// // // // // //                               <div className="flex-1 min-w-0">
// // // // // //                                 <p className={`text-[11px] font-semibold leading-tight truncate ${
// // // // // //                                   isOn ? "text-indigo-700" : "text-gray-700"
// // // // // //                                 }`}>
// // // // // //                                   {p.preference_name}
// // // // // //                                 </p>
// // // // // //                               </div>
// // // // // //                               {/* checkbox dot */}
// // // // // //                               <div className={`w-3.5 h-3.5 rounded-full border flex-shrink-0 flex items-center justify-center ${
// // // // // //                                 isOn ? "bg-indigo-600 border-indigo-600" : "border-gray-300"
// // // // // //                               }`}>
// // // // // //                                 {isOn && (
// // // // // //                                   <svg viewBox="0 0 6 5" className="w-1.5 h-1.5">
// // // // // //                                     <path d="M0.5 2.5l1.5 1.5L5.5 0.5" stroke="white" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
// // // // // //                                   </svg>
// // // // // //                                 )}
// // // // // //                               </div>
// // // // // //                             </button>
// // // // // //                           );
// // // // // //                         })}
// // // // // //                       </div>
// // // // // //                     </div>
// // // // // //                   );
// // // // // //                 })}
// // // // // //               </div>
// // // // // //             )}
// // // // // //           </div>
// // // // // //         </div>

// // // // // //         {/* ── Footer ── */}
// // // // // //         {!loadingPrefs && (
// // // // // //           <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between gap-3 bg-white">
// // // // // //             <div className="text-[11px]">
// // // // // //               {saveError && <span className="text-red-500">Save failed. Try again.</span>}
// // // // // //               {saved && !saveError && <span className="text-emerald-600">Saved successfully.</span>}
// // // // // //             </div>
// // // // // //             <button
// // // // // //               onClick={handleSave}
// // // // // //               disabled={saving || selected.size === 0}
// // // // // //               className="px-4 py-2 text-[12px] font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
// // // // // //             >
// // // // // //               {saving ? "Saving…" : "Save amenities"}
// // // // // //             </button>
// // // // // //           </div>
// // // // // //         )}

// // // // // //       </DialogContent>
// // // // // //     </Dialog>
// // // // // //   );
// // // // // // };

// // // // // // // ─── Main Component ───────────────────────────────────────────────────────────

// // // // // // const SVG_W = 2466;
// // // // // // const SVG_H = 2039;

// // // // // // export default function LayoutPreview({ layout }: LayoutPreviewProps) {
// // // // // //   const wrapperRef   = useRef<HTMLDivElement>(null);
// // // // // //   const transformRef = useRef<HTMLDivElement>(null);

// // // // // //   const scaleRef     = useRef(1);
// // // // // //   const translateRef = useRef({ x: 0, y: 0 });
// // // // // //   const isPanning    = useRef(false);
// // // // // //   const panStart     = useRef({ x: 0, y: 0 });
// // // // // //   const mouseDownPos = useRef({ x: 0, y: 0 });
// // // // // //   const didDrag      = useRef(false);

// // // // // //   const [rawSvg,      setRawSvg]      = useState<string | null>(null);
// // // // // //   const [svgError,    setSvgError]    = useState(false);
// // // // // //   const [zoomDisplay, setZoomDisplay] = useState(100);
// // // // // //   const [mapReady,    setMapReady]    = useState(false);
// // // // // //   const [loading,     setLoading]     = useState(false);

// // // // // //   const seatIdsRef = useRef<Set<string>>(new Set());

// // // // // //   const [dialogOpen,    setDialogOpen]    = useState(false);
// // // // // //   const [clickedSeatId, setClickedSeatId] = useState<string | null>(null);

// // // // // //   useEffect(() => {
// // // // // //     const url = layout?.layout_file_url;
// // // // // //     if (!url || !url.startsWith("https://")) {
// // // // // //       setRawSvg(null); setSvgError(false); setMapReady(false); return;
// // // // // //     }
// // // // // //     setLoading(true); setRawSvg(null); setSvgError(false); setMapReady(false);
// // // // // //     fetch(url)
// // // // // //       .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.text(); })
// // // // // //       .then((text) => {
// // // // // //         const fluid = text
// // // // // //           .replace(/\bwidth="[^"]*"/, 'width="100%"')
// // // // // //           .replace(/\bheight="[^"]*"/, 'height="100%"');
// // // // // //         const ids = extractSeatIds(fluid);
// // // // // //         seatIdsRef.current = new Set(ids);
// // // // // //         setRawSvg(addPointerCursors(fluid, ids));
// // // // // //       })
// // // // // //       .catch(() => setSvgError(true))
// // // // // //       .finally(() => setLoading(false));
// // // // // //   }, [layout?.layout_file_url]);

// // // // // //   const applyTransform = useCallback(() => {
// // // // // //     const el = transformRef.current;
// // // // // //     if (!el) return;
// // // // // //     el.style.transform = `translate(${translateRef.current.x}px,${translateRef.current.y}px) scale(${scaleRef.current})`;
// // // // // //   }, []);

// // // // // //   const fitView = useCallback(() => {
// // // // // //     const wrapper = wrapperRef.current;
// // // // // //     if (!wrapper) return;
// // // // // //     const { width: wW, height: wH } = wrapper.getBoundingClientRect();
// // // // // //     if (wW === 0 || wH === 0) return;
// // // // // //     const scale = Math.min(wW / SVG_W, wH / SVG_H);
// // // // // //     scaleRef.current = scale;
// // // // // //     translateRef.current = { x: (wW - SVG_W * scale) / 2, y: (wH - SVG_H * scale) / 2 };
// // // // // //     applyTransform();
// // // // // //     setZoomDisplay(Math.round(scale * 100));
// // // // // //   }, [applyTransform]);

// // // // // //   useEffect(() => {
// // // // // //     const wrapper = wrapperRef.current;
// // // // // //     if (!wrapper || !rawSvg) return;
// // // // // //     const observer = new ResizeObserver(() => fitView());
// // // // // //     observer.observe(wrapper);
// // // // // //     return () => observer.disconnect();
// // // // // //   }, [rawSvg, fitView]);

// // // // // //   useEffect(() => {
// // // // // //     if (!rawSvg || loading) { setMapReady(false); return; }
// // // // // //     const id = requestAnimationFrame(() => { fitView(); setMapReady(true); });
// // // // // //     return () => cancelAnimationFrame(id);
// // // // // //   }, [rawSvg, loading, fitView]);

// // // // // //   const zoomStep = useCallback((factor: number) => {
// // // // // //     const wrapper = wrapperRef.current;
// // // // // //     if (!wrapper) return;
// // // // // //     const { width: wW, height: wH } = wrapper.getBoundingClientRect();
// // // // // //     const oldScale = scaleRef.current;
// // // // // //     const newScale = Math.min(Math.max(oldScale * factor, 0.05), 4);
// // // // // //     const cx = wW / 2, cy = wH / 2;
// // // // // //     translateRef.current = {
// // // // // //       x: cx - (cx - translateRef.current.x) * (newScale / oldScale),
// // // // // //       y: cy - (cy - translateRef.current.y) * (newScale / oldScale),
// // // // // //     };
// // // // // //     scaleRef.current = newScale;
// // // // // //     applyTransform();
// // // // // //     setZoomDisplay(Math.round(newScale * 100));
// // // // // //   }, [applyTransform]);

// // // // // //   const zoomIn  = useCallback(() => zoomStep(1.25),     [zoomStep]);
// // // // // //   const zoomOut = useCallback(() => zoomStep(1 / 1.25), [zoomStep]);

// // // // // //   useEffect(() => {
// // // // // //     const el = wrapperRef.current;
// // // // // //     if (!el) return;
// // // // // //     const handler = (e: WheelEvent) => {
// // // // // //       e.preventDefault();
// // // // // //       const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
// // // // // //       const oldScale = scaleRef.current;
// // // // // //       const newScale = Math.min(Math.max(oldScale * factor, 0.05), 4);
// // // // // //       const rect = el.getBoundingClientRect();
// // // // // //       translateRef.current = {
// // // // // //         x: e.clientX - rect.left - (e.clientX - rect.left - translateRef.current.x) * (newScale / oldScale),
// // // // // //         y: e.clientY - rect.top  - (e.clientY - rect.top  - translateRef.current.y) * (newScale / oldScale),
// // // // // //       };
// // // // // //       scaleRef.current = newScale;
// // // // // //       applyTransform();
// // // // // //       setZoomDisplay(Math.round(newScale * 100));
// // // // // //     };
// // // // // //     el.addEventListener("wheel", handler, { passive: false });
// // // // // //     return () => el.removeEventListener("wheel", handler);
// // // // // //   }, [applyTransform]);

// // // // // //   const onMouseDown = (e: React.MouseEvent) => {
// // // // // //     isPanning.current = true; didDrag.current = false;
// // // // // //     mouseDownPos.current = { x: e.clientX, y: e.clientY };
// // // // // //     panStart.current = { ...translateRef.current };
// // // // // //     (e.currentTarget as HTMLElement).style.cursor = "grabbing";
// // // // // //   };

// // // // // //   const onMouseMove = (e: React.MouseEvent) => {
// // // // // //     if (!isPanning.current) return;
// // // // // //     const dx = e.clientX - mouseDownPos.current.x;
// // // // // //     const dy = e.clientY - mouseDownPos.current.y;
// // // // // //     if (!didDrag.current && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) didDrag.current = true;
// // // // // //     if (didDrag.current) {
// // // // // //       translateRef.current = { x: panStart.current.x + dx, y: panStart.current.y + dy };
// // // // // //       applyTransform();
// // // // // //     }
// // // // // //   };

// // // // // //   const onMouseUp = (e: React.MouseEvent) => {
// // // // // //     isPanning.current = false;
// // // // // //     (e.currentTarget as HTMLElement).style.cursor = "grab";
// // // // // //   };

// // // // // //   const onMouseLeave = () => {
// // // // // //     isPanning.current = false;
// // // // // //     if (wrapperRef.current) wrapperRef.current.style.cursor = "grab";
// // // // // //   };

// // // // // //   const onMapClick = (e: React.MouseEvent) => {
// // // // // //     if (didDrag.current) { didDrag.current = false; return; }
// // // // // //     const svgId = getSeatIdFromClick(e.target, seatIdsRef.current);
// // // // // //     if (!svgId) return;
// // // // // //     setClickedSeatId(svgId);
// // // // // //     setDialogOpen(true);
// // // // // //   };

// // // // // //   const displaySvg = rawSvg && clickedSeatId && dialogOpen
// // // // // //     ? highlightSeat(rawSvg, clickedSeatId)
// // // // // //     : rawSvg;

// // // // // //   const showSpinner = loading || (!rawSvg && !svgError && !!layout?.layout_file_url);

// // // // // //   if (!layout) {
// // // // // //     return (
// // // // // //       <div className="flex items-center justify-center h-full min-h-[460px] bg-gray-50 rounded-xl border border-dashed border-gray-200">
// // // // // //         <div className="text-center text-gray-400">
// // // // // //           <Layers className="mx-auto mb-2 opacity-30" size={32} />
// // // // // //           <p className="text-sm">Select a layout to preview</p>
// // // // // //         </div>
// // // // // //       </div>
// // // // // //     );
// // // // // //   }

// // // // // //   return (
// // // // // //     <>
// // // // // //       <div
// // // // // //         className="relative bg-[#F7F8FC] border border-[#EBEBF5] rounded-xl overflow-hidden"
// // // // // //         style={{ width: "100%", height: 520 }}
// // // // // //       >
// // // // // //         {mapReady && (
// // // // // //           <>
// // // // // //             <div className="absolute top-3 left-3 z-20 text-[10px] font-semibold text-gray-400 bg-white/90 px-2 py-1 rounded-md border border-[#EBEBF5] select-none tabular-nums">
// // // // // //               {zoomDisplay}%
// // // // // //             </div>
// // // // // //             <div className="absolute top-3 right-3 z-20 flex flex-col gap-1.5">
// // // // // //               {([
// // // // // //                 { icon: <ZoomIn size={14} />,    action: zoomIn,  title: "Zoom in"     },
// // // // // //                 { icon: <ZoomOut size={14} />,   action: zoomOut, title: "Zoom out"    },
// // // // // //                 { icon: <Maximize2 size={14} />, action: fitView, title: "Fit to view" },
// // // // // //               ] as const).map(({ icon, action, title }) => (
// // // // // //                 <button
// // // // // //                   key={title}
// // // // // //                   onClick={(e) => { e.stopPropagation(); action(); }}
// // // // // //                   title={title}
// // // // // //                   className="w-8 h-8 rounded-lg bg-white border border-[#EBEBF5] shadow-sm flex items-center justify-center hover:bg-gray-50 text-gray-600 transition-colors"
// // // // // //                 >
// // // // // //                   {icon}
// // // // // //                 </button>
// // // // // //               ))}
// // // // // //             </div>
// // // // // //             <div className="absolute bottom-2 left-3 z-20 text-[10px] text-gray-400 bg-white/80 px-2 py-1 rounded-md border border-[#EBEBF5] select-none">
// // // // // //               Scroll to zoom · Drag to pan · Click a seat to configure
// // // // // //             </div>
// // // // // //           </>
// // // // // //         )}

// // // // // //         <div
// // // // // //           ref={wrapperRef}
// // // // // //           className="w-full h-full overflow-hidden select-none"
// // // // // //           style={{ cursor: "grab" }}
// // // // // //           onMouseDown={onMouseDown}
// // // // // //           onMouseMove={onMouseMove}
// // // // // //           onMouseUp={onMouseUp}
// // // // // //           onMouseLeave={onMouseLeave}
// // // // // //           onClick={onMapClick}
// // // // // //         >
// // // // // //           {showSpinner && (
// // // // // //             <div className="absolute inset-0 flex items-center justify-center bg-[#F7F8FC] z-10">
// // // // // //               <div className="flex flex-col items-center gap-3">
// // // // // //                 <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
// // // // // //                 <p className="text-[12px] text-gray-400">Loading floor plan…</p>
// // // // // //               </div>
// // // // // //             </div>
// // // // // //           )}

// // // // // //           {svgError && (
// // // // // //             <div className="absolute inset-0 flex items-center justify-center">
// // // // // //               <div className="text-center">
// // // // // //                 <p className="text-[13px] text-gray-500 mb-1">Could not load floor plan</p>
// // // // // //                 <p className="text-[11px] text-gray-400 font-mono break-all px-6">{layout.layout_file_url}</p>
// // // // // //               </div>
// // // // // //             </div>
// // // // // //           )}

// // // // // //           {displaySvg && (
// // // // // //             <div
// // // // // //               ref={transformRef}
// // // // // //               style={{
// // // // // //                 transformOrigin: "top left",
// // // // // //                 width:      `${SVG_W}px`,
// // // // // //                 height:     `${SVG_H}px`,
// // // // // //                 willChange: "transform",
// // // // // //                 visibility: mapReady ? "visible" : "hidden",
// // // // // //               }}
// // // // // //               dangerouslySetInnerHTML={{ __html: displaySvg }}
// // // // // //             />
// // // // // //           )}
// // // // // //         </div>
// // // // // //       </div>

// // // // // //       <SeatDialog
// // // // // //         open={dialogOpen}
// // // // // //         onClose={() => { setDialogOpen(false); setClickedSeatId(null); }}
// // // // // //         svgId={clickedSeatId}
// // // // // //         layout={layout}
// // // // // //       />
// // // // // //     </>
// // // // // //   );
// // // // // // }

// // // // // "use client";

// // // // // import React, { useCallback, useEffect, useRef, useState } from "react";
// // // // // import {
// // // // //   Maximize2, ZoomIn, ZoomOut, Layers,
// // // // // } from "lucide-react";
// // // // // import {
// // // // //   Dialog, DialogContent, DialogHeader, DialogTitle,
// // // // // } from "@/components/ui/dialog";
// // // // // import { Layout } from "../types/layout.types";
// // // // // import {
// // // // //   fetchAllPreferences,
// // // // //   saveSeatPreferences,
// // // // //   Preference,
// // // // // } from "../services/layoutService";

// // // // // interface LayoutPreviewProps {
// // // // //   layout: Layout | null;
// // // // // }

// // // // // // ─── SVG Helpers ──────────────────────────────────────────────────────────────

// // // // // function extractSeatIds(svgText: string): string[] {
// // // // //   const ids: string[] = [];
// // // // //   const regex = /<g\s+id="([^"]+)"/g;
// // // // //   let match;
// // // // //   while ((match = regex.exec(svgText)) !== null) ids.push(match[1]);
// // // // //   return ids;
// // // // // }

// // // // // function getSeatIdFromClick(
// // // // //   target: EventTarget | null,
// // // // //   knownIds: Set<string>
// // // // // ): string | null {
// // // // //   let el = target as Element | null;
// // // // //   while (el) {
// // // // //     if (el.tagName?.toLowerCase() === "svg") return null;
// // // // //     const id = el.getAttribute?.("id");
// // // // //     if (id && knownIds.has(id)) return id;
// // // // //     el = el.parentElement;
// // // // //   }
// // // // //   return null;
// // // // // }

// // // // // function highlightSeat(svgText: string, svgId: string): string {
// // // // //   const openTag = `<g id="${svgId}">`;
// // // // //   const start = svgText.indexOf(openTag);
// // // // //   if (start === -1) return svgText;
// // // // //   return (
// // // // //     svgText.slice(0, start) +
// // // // //     `<g id="${svgId}" style="cursor:pointer;filter:drop-shadow(0 0 6px rgba(99,102,241,0.8))">` +
// // // // //     svgText.slice(start + openTag.length)
// // // // //   );
// // // // // }

// // // // // function addPointerCursors(svgText: string, ids: string[]): string {
// // // // //   let result = svgText;
// // // // //   ids.forEach((id) => {
// // // // //     result = result.replace(`<g id="${id}">`, `<g id="${id}" style="cursor:pointer">`);
// // // // //   });
// // // // //   return result;
// // // // // }

// // // // // // ─── Icon map ─────────────────────────────────────────────────────────────────

// // // // // const ICON_MAP: Record<string, string> = {
// // // // //   window:        "ti-window",
// // // // //   desk:          "ti-table",
// // // // //   monitor:       "ti-device-desktop",
// // // // //   restroom:      "ti-building-community",
// // // // //   chair:         "ti-armchair",
// // // // //   quiet:         "ti-ear-off",
// // // // //   kitchen:       "ti-tools-kitchen-2",
// // // // //   collaboration: "ti-users-group",
// // // // // };

// // // // // function prefIcon(iconName: string): string {
// // // // //   return ICON_MAP[iconName] ?? "ti-star";
// // // // // }

// // // // // // ─── Type badge colors ────────────────────────────────────────────────────────

// // // // // const TYPE_COLOR: Record<string, { bg: string; text: string }> = {
// // // // //   SEATING:     { bg: "#EFF6FF", text: "#1D4ED8" },
// // // // //   EQUIPMENT:   { bg: "#F0FDF4", text: "#15803D" },
// // // // //   LOCATION:    { bg: "#FFFBEB", text: "#B45309" },
// // // // //   ENVIRONMENT: { bg: "#EEEDFE", text: "#3C3489" },
// // // // // };

// // // // // function typeColor(type: string) {
// // // // //   return TYPE_COLOR[type] ?? { bg: "#F3F4F6", text: "#6B7280" };
// // // // // }

// // // // // // ─── Field ────────────────────────────────────────────────────────────────────

// // // // // const Field: React.FC<{ label: string; value: string; mono?: boolean }> = ({
// // // // //   label,
// // // // //   value,
// // // // //   mono,
// // // // // }) => (
// // // // //   <div className="flex flex-col gap-1">
// // // // //     <label className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
// // // // //       {label}
// // // // //     </label>
// // // // //     <div className={`px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 ${mono ? "font-mono" : ""}`}>
// // // // //       <span className="text-[12px] text-gray-800 font-medium truncate block">
// // // // //         {value}
// // // // //       </span>
// // // // //     </div>
// // // // //   </div>
// // // // // );

// // // // // // ─── Seat Dialog ──────────────────────────────────────────────────────────────

// // // // // const SeatDialog: React.FC<{
// // // // //   open: boolean;
// // // // //   onClose: () => void;
// // // // //   svgId: string | null;
// // // // //   layout: Layout | null;
// // // // // }> = ({ open, onClose, svgId, layout }) => {
// // // // //   const [allPrefs,     setAllPrefs]     = useState<Preference[]>([]);
// // // // //   const [selected,     setSelected]     = useState<Set<string>>(new Set());
// // // // //   const [loadingPrefs, setLoadingPrefs] = useState(false);
// // // // //   const [saving,       setSaving]       = useState(false);
// // // // //   const [saveError,    setSaveError]    = useState(false);
// // // // //   const [saved,        setSaved]        = useState(false);

// // // // //   useEffect(() => {
// // // // //     if (!open) return;
// // // // //     setSelected(new Set());
// // // // //     setSaved(false);
// // // // //     setSaveError(false);
// // // // //     setLoadingPrefs(true);
// // // // //     fetchAllPreferences()
// // // // //       .then(setAllPrefs)
// // // // //       .catch(console.error)
// // // // //       .finally(() => setLoadingPrefs(false));
// // // // //   }, [open]);

// // // // //   const toggle = (id: string) => {
// // // // //     setSelected((prev) => {
// // // // //       const next = new Set(prev);
// // // // //       next.has(id) ? next.delete(id) : next.add(id);
// // // // //       return next;
// // // // //     });
// // // // //     setSaved(false);
// // // // //   };

// // // // //   const handleSave = async () => {
// // // // //     if (!svgId || !layout) return;
// // // // //     setSaving(true);
// // // // //     setSaveError(false);
// // // // //     try {
// // // // //       await saveSeatPreferences(svgId, layout.layout_id, [...selected]);
// // // // //       setSaved(true);
// // // // //     } catch {
// // // // //       setSaveError(true);
// // // // //     } finally {
// // // // //       setSaving(false);
// // // // //     }
// // // // //   };

// // // // //   if (!svgId || !layout) return null;

// // // // //   return (
// // // // //     <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
// // // // //       <DialogContent className="max-w-sm rounded-xl p-0 overflow-hidden gap-0 [&>button:last-child]:hidden">

// // // // //         {/* Header */}
// // // // //         <DialogHeader className="px-5 pt-5 pb-4 border-b">
// // // // //           <p className="text-xs font-medium text-muted-foreground mb-0.5">
// // // // //             Seat Configuration
// // // // //           </p>
// // // // //           <DialogTitle className="text-base font-semibold text-foreground">
// // // // //             {svgId}
// // // // //           </DialogTitle>
// // // // //         </DialogHeader>

// // // // //         {/* Body */}
// // // // //         <div className="overflow-y-auto" style={{ maxHeight: 480 }}>

// // // // //           {/* Seat Details */}
// // // // //           <div className="px-5 pt-4 pb-4 border-b">
// // // // //             <p className="text-xs font-medium text-muted-foreground mb-3">
// // // // //               Seat Details
// // // // //             </p>
// // // // //             <div className="grid grid-cols-2 gap-2">
// // // // //               {[
// // // // //                 { label: "SVG Element ID", value: svgId },
// // // // //                 { label: "Floor ID",       value: layout.floor_id },
// // // // //               ].map(({ label, value }) => (
// // // // //                 <div key={label} className="flex flex-col gap-1">
// // // // //                   <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
// // // // //                     {label}
// // // // //                   </span>
// // // // //                   <span className="text-xs font-medium text-foreground font-mono bg-muted px-2.5 py-1.5 rounded-md border">
// // // // //                     {value}
// // // // //                   </span>
// // // // //                 </div>
// // // // //               ))}
// // // // //             </div>
// // // // //           </div>

// // // // //           {/* Amenities */}
// // // // //           <div className="px-5 py-4">
// // // // //             <div className="flex items-center justify-between mb-3">
// // // // //               <p className="text-xs font-medium text-muted-foreground">
// // // // //                 Amenities
// // // // //               </p>
// // // // //               {selected.size > 0 && (
// // // // //                 <span className="text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
// // // // //                   {selected.size} selected
// // // // //                 </span>
// // // // //               )}
// // // // //             </div>

// // // // //             {loadingPrefs ? (
// // // // //               <div className="flex items-center justify-center py-8">
// // // // //                 <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
// // // // //               </div>
// // // // //             ) : allPrefs.length === 0 ? (
// // // // //               <p className="text-xs text-muted-foreground text-center py-6">
// // // // //                 No amenities available.
// // // // //               </p>
// // // // //             ) : (
// // // // //               <div className="grid grid-cols-2 gap-1.5">
// // // // //                 {allPrefs.map((p) => {
// // // // //                   const isOn = selected.has(p.preference_id);
// // // // //                   return (
// // // // //                     <button
// // // // //                       key={p.preference_id}
// // // // //                       onClick={() => toggle(p.preference_id)}
// // // // //                       className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg border text-left transition-colors ${
// // // // //                         isOn
// // // // //                           ? "border-primary/40 bg-primary/5 text-primary"
// // // // //                           : "border-border bg-background hover:bg-muted/50 text-foreground"
// // // // //                       }`}
// // // // //                     >
// // // // //                       <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
// // // // //                         isOn ? "bg-primary border-primary" : "border-input"
// // // // //                       }`}>
// // // // //                         {isOn && (
// // // // //                           <svg viewBox="0 0 8 7" className="w-2.5 h-2.5">
// // // // //                             <path
// // // // //                               d="M1 3.5l2 2L7 1"
// // // // //                               stroke="white"
// // // // //                               strokeWidth="1.5"
// // // // //                               fill="none"
// // // // //                               strokeLinecap="round"
// // // // //                               strokeLinejoin="round"
// // // // //                             />
// // // // //                           </svg>
// // // // //                         )}
// // // // //                       </div>
// // // // //                       <span className="text-xs font-medium flex-1 truncate">
// // // // //                         {p.preference_name}
// // // // //                       </span>
// // // // //                     </button>
// // // // //                   );
// // // // //                 })}
// // // // //               </div>
// // // // //             )}
// // // // //           </div>
// // // // //         </div>

// // // // //         {/* Footer */}
// // // // //         {!loadingPrefs && (
// // // // //           <div className="px-5 py-3 border-t flex items-center justify-between gap-3 bg-background">
// // // // //             <div className="text-xs">
// // // // //               {saveError && (
// // // // //                 <span className="text-destructive">Save failed. Try again.</span>
// // // // //               )}
// // // // //               {saved && !saveError && (
// // // // //                 <span className="text-emerald-600">Saved successfully.</span>
// // // // //               )}
// // // // //             </div>
// // // // //             <div className="flex items-center gap-2">
// // // // //               <button
// // // // //                 onClick={onClose}
// // // // //                 className="px-4 py-1.5 text-xs font-medium border border-input bg-background text-foreground rounded-md hover:bg-muted transition-colors"
// // // // //               >
// // // // //                 Cancel
// // // // //               </button>
// // // // //               <button
// // // // //                 onClick={handleSave}
// // // // //                 disabled={saving || selected.size === 0}
// // // // //                 className="px-4 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
// // // // //               >
// // // // //                 {saving ? "Saving…" : "Save"}
// // // // //               </button>
// // // // //             </div>
// // // // //           </div>
// // // // //         )}

// // // // //       </DialogContent>
// // // // //     </Dialog>
// // // // //   );
// // // // // };
// // // // // // ─── Main Component ───────────────────────────────────────────────────────────

// // // // // const SVG_W = 2466;
// // // // // const SVG_H = 2039;

// // // // // export default function LayoutPreview({ layout }: LayoutPreviewProps) {
// // // // //   const wrapperRef   = useRef<HTMLDivElement>(null);
// // // // //   const transformRef = useRef<HTMLDivElement>(null);

// // // // //   const scaleRef     = useRef(1);
// // // // //   const translateRef = useRef({ x: 0, y: 0 });
// // // // //   const isPanning    = useRef(false);
// // // // //   const panStart     = useRef({ x: 0, y: 0 });
// // // // //   const mouseDownPos = useRef({ x: 0, y: 0 });
// // // // //   const didDrag      = useRef(false);

// // // // //   const [rawSvg,      setRawSvg]      = useState<string | null>(null);
// // // // //   const [svgError,    setSvgError]    = useState(false);
// // // // //   const [zoomDisplay, setZoomDisplay] = useState(100);
// // // // //   const [mapReady,    setMapReady]    = useState(false);
// // // // //   const [loading,     setLoading]     = useState(false);

// // // // //   const seatIdsRef = useRef<Set<string>>(new Set());

// // // // //   const [dialogOpen,    setDialogOpen]    = useState(false);
// // // // //   const [clickedSeatId, setClickedSeatId] = useState<string | null>(null);

// // // // //   useEffect(() => {
// // // // //     const url = layout?.layout_file_url;
// // // // //     if (!url || !url.startsWith("https://")) {
// // // // //       setRawSvg(null); setSvgError(false); setMapReady(false); return;
// // // // //     }
// // // // //     setLoading(true); setRawSvg(null); setSvgError(false); setMapReady(false);
// // // // //     fetch(url)
// // // // //       .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.text(); })
// // // // //       .then((text) => {
// // // // //         const fluid = text
// // // // //           .replace(/\bwidth="[^"]*"/, 'width="100%"')
// // // // //           .replace(/\bheight="[^"]*"/, 'height="100%"');
// // // // //         const ids = extractSeatIds(fluid);
// // // // //         seatIdsRef.current = new Set(ids);
// // // // //         setRawSvg(addPointerCursors(fluid, ids));
// // // // //       })
// // // // //       .catch(() => setSvgError(true))
// // // // //       .finally(() => setLoading(false));
// // // // //   }, [layout?.layout_file_url]);

// // // // //   const applyTransform = useCallback(() => {
// // // // //     const el = transformRef.current;
// // // // //     if (!el) return;
// // // // //     el.style.transform = `translate(${translateRef.current.x}px,${translateRef.current.y}px) scale(${scaleRef.current})`;
// // // // //   }, []);

// // // // //   const fitView = useCallback(() => {
// // // // //     const wrapper = wrapperRef.current;
// // // // //     if (!wrapper) return;
// // // // //     const { width: wW, height: wH } = wrapper.getBoundingClientRect();
// // // // //     if (wW === 0 || wH === 0) return;
// // // // //     const scale = Math.min(wW / SVG_W, wH / SVG_H);
// // // // //     scaleRef.current = scale;
// // // // //     translateRef.current = { x: (wW - SVG_W * scale) / 2, y: (wH - SVG_H * scale) / 2 };
// // // // //     applyTransform();
// // // // //     setZoomDisplay(Math.round(scale * 100));
// // // // //   }, [applyTransform]);

// // // // //   useEffect(() => {
// // // // //     const wrapper = wrapperRef.current;
// // // // //     if (!wrapper || !rawSvg) return;
// // // // //     const observer = new ResizeObserver(() => fitView());
// // // // //     observer.observe(wrapper);
// // // // //     return () => observer.disconnect();
// // // // //   }, [rawSvg, fitView]);

// // // // //   useEffect(() => {
// // // // //     if (!rawSvg || loading) { setMapReady(false); return; }
// // // // //     const id = requestAnimationFrame(() => { fitView(); setMapReady(true); });
// // // // //     return () => cancelAnimationFrame(id);
// // // // //   }, [rawSvg, loading, fitView]);

// // // // //   const zoomStep = useCallback((factor: number) => {
// // // // //     const wrapper = wrapperRef.current;
// // // // //     if (!wrapper) return;
// // // // //     const { width: wW, height: wH } = wrapper.getBoundingClientRect();
// // // // //     const oldScale = scaleRef.current;
// // // // //     const newScale = Math.min(Math.max(oldScale * factor, 0.05), 4);
// // // // //     const cx = wW / 2, cy = wH / 2;
// // // // //     translateRef.current = {
// // // // //       x: cx - (cx - translateRef.current.x) * (newScale / oldScale),
// // // // //       y: cy - (cy - translateRef.current.y) * (newScale / oldScale),
// // // // //     };
// // // // //     scaleRef.current = newScale;
// // // // //     applyTransform();
// // // // //     setZoomDisplay(Math.round(newScale * 100));
// // // // //   }, [applyTransform]);

// // // // //   const zoomIn  = useCallback(() => zoomStep(1.25),     [zoomStep]);
// // // // //   const zoomOut = useCallback(() => zoomStep(1 / 1.25), [zoomStep]);

// // // // //   useEffect(() => {
// // // // //     const el = wrapperRef.current;
// // // // //     if (!el) return;
// // // // //     const handler = (e: WheelEvent) => {
// // // // //       e.preventDefault();
// // // // //       const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
// // // // //       const oldScale = scaleRef.current;
// // // // //       const newScale = Math.min(Math.max(oldScale * factor, 0.05), 4);
// // // // //       const rect = el.getBoundingClientRect();
// // // // //       translateRef.current = {
// // // // //         x: e.clientX - rect.left - (e.clientX - rect.left - translateRef.current.x) * (newScale / oldScale),
// // // // //         y: e.clientY - rect.top  - (e.clientY - rect.top  - translateRef.current.y) * (newScale / oldScale),
// // // // //       };
// // // // //       scaleRef.current = newScale;
// // // // //       applyTransform();
// // // // //       setZoomDisplay(Math.round(newScale * 100));
// // // // //     };
// // // // //     el.addEventListener("wheel", handler, { passive: false });
// // // // //     return () => el.removeEventListener("wheel", handler);
// // // // //   }, [applyTransform]);

// // // // //   const onMouseDown = (e: React.MouseEvent) => {
// // // // //     isPanning.current = true; didDrag.current = false;
// // // // //     mouseDownPos.current = { x: e.clientX, y: e.clientY };
// // // // //     panStart.current = { ...translateRef.current };
// // // // //     (e.currentTarget as HTMLElement).style.cursor = "grabbing";
// // // // //   };

// // // // //   const onMouseMove = (e: React.MouseEvent) => {
// // // // //     if (!isPanning.current) return;
// // // // //     const dx = e.clientX - mouseDownPos.current.x;
// // // // //     const dy = e.clientY - mouseDownPos.current.y;
// // // // //     if (!didDrag.current && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) didDrag.current = true;
// // // // //     if (didDrag.current) {
// // // // //       translateRef.current = { x: panStart.current.x + dx, y: panStart.current.y + dy };
// // // // //       applyTransform();
// // // // //     }
// // // // //   };

// // // // //   const onMouseUp = (e: React.MouseEvent) => {
// // // // //     isPanning.current = false;
// // // // //     (e.currentTarget as HTMLElement).style.cursor = "grab";
// // // // //   };

// // // // //   const onMouseLeave = () => {
// // // // //     isPanning.current = false;
// // // // //     if (wrapperRef.current) wrapperRef.current.style.cursor = "grab";
// // // // //   };

// // // // //   const onMapClick = (e: React.MouseEvent) => {
// // // // //     if (didDrag.current) { didDrag.current = false; return; }
// // // // //     const svgId = getSeatIdFromClick(e.target, seatIdsRef.current);
// // // // //     if (!svgId) return;
// // // // //     setClickedSeatId(svgId);
// // // // //     setDialogOpen(true);
// // // // //   };

// // // // //   const displaySvg = rawSvg && clickedSeatId && dialogOpen
// // // // //     ? highlightSeat(rawSvg, clickedSeatId)
// // // // //     : rawSvg;

// // // // //   const showSpinner = loading || (!rawSvg && !svgError && !!layout?.layout_file_url);

// // // // //   if (!layout) {
// // // // //     return (
// // // // //       <div className="flex items-center justify-center h-full min-h-[460px] bg-gray-50 rounded-xl border border-dashed border-gray-200">
// // // // //         <div className="text-center text-gray-400">
// // // // //           <Layers className="mx-auto mb-2 opacity-30" size={32} />
// // // // //           <p className="text-sm">Select a layout to preview</p>
// // // // //         </div>
// // // // //       </div>
// // // // //     );
// // // // //   }

// // // // //   return (
// // // // //     <>
// // // // //       <div
// // // // //         className="relative bg-[#F7F8FC] border border-[#EBEBF5] rounded-xl overflow-hidden"
// // // // //         style={{ width: "100%", height: 520 }}
// // // // //       >
// // // // //         {mapReady && (
// // // // //           <>
// // // // //             <div className="absolute top-3 left-3 z-20 text-[10px] font-semibold text-gray-400 bg-white/90 px-2 py-1 rounded-md border border-[#EBEBF5] select-none tabular-nums">
// // // // //               {zoomDisplay}%
// // // // //             </div>
// // // // //             <div className="absolute top-3 right-3 z-20 flex flex-col gap-1.5">
// // // // //               {([
// // // // //                 { icon: <ZoomIn size={14} />,    action: zoomIn,  title: "Zoom in"     },
// // // // //                 { icon: <ZoomOut size={14} />,   action: zoomOut, title: "Zoom out"    },
// // // // //                 { icon: <Maximize2 size={14} />, action: fitView, title: "Fit to view" },
// // // // //               ] as const).map(({ icon, action, title }) => (
// // // // //                 <button
// // // // //                   key={title}
// // // // //                   onClick={(e) => { e.stopPropagation(); action(); }}
// // // // //                   title={title}
// // // // //                   className="w-8 h-8 rounded-lg bg-white border border-[#EBEBF5] shadow-sm flex items-center justify-center hover:bg-gray-50 text-gray-600 transition-colors"
// // // // //                 >
// // // // //                   {icon}
// // // // //                 </button>
// // // // //               ))}
// // // // //             </div>
// // // // //             <div className="absolute bottom-2 left-3 z-20 text-[10px] text-gray-400 bg-white/80 px-2 py-1 rounded-md border border-[#EBEBF5] select-none">
// // // // //               Scroll to zoom · Drag to pan · Click a seat to configure
// // // // //             </div>
// // // // //           </>
// // // // //         )}

// // // // //         <div
// // // // //           ref={wrapperRef}
// // // // //           className="w-full h-full overflow-hidden select-none"
// // // // //           style={{ cursor: "grab" }}
// // // // //           onMouseDown={onMouseDown}
// // // // //           onMouseMove={onMouseMove}
// // // // //           onMouseUp={onMouseUp}
// // // // //           onMouseLeave={onMouseLeave}
// // // // //           onClick={onMapClick}
// // // // //         >
// // // // //           {showSpinner && (
// // // // //             <div className="absolute inset-0 flex items-center justify-center bg-[#F7F8FC] z-10">
// // // // //               <div className="flex flex-col items-center gap-3">
// // // // //                 <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
// // // // //                 <p className="text-[12px] text-gray-400">Loading floor plan…</p>
// // // // //               </div>
// // // // //             </div>
// // // // //           )}

// // // // //           {svgError && (
// // // // //             <div className="absolute inset-0 flex items-center justify-center">
// // // // //               <div className="text-center">
// // // // //                 <p className="text-[13px] text-gray-500 mb-1">Could not load floor plan</p>
// // // // //                 <p className="text-[11px] text-gray-400 font-mono break-all px-6">
// // // // //                   {layout.layout_file_url}
// // // // //                 </p>
// // // // //               </div>
// // // // //             </div>
// // // // //           )}

// // // // //           {displaySvg && (
// // // // //             <div
// // // // //               ref={transformRef}
// // // // //               style={{
// // // // //                 transformOrigin: "top left",
// // // // //                 width:      `${SVG_W}px`,
// // // // //                 height:     `${SVG_H}px`,
// // // // //                 willChange: "transform",
// // // // //                 visibility: mapReady ? "visible" : "hidden",
// // // // //               }}
// // // // //               dangerouslySetInnerHTML={{ __html: displaySvg }}
// // // // //             />
// // // // //           )}
// // // // //         </div>
// // // // //       </div>

// // // // //       <SeatDialog
// // // // //         open={dialogOpen}
// // // // //         onClose={() => { setDialogOpen(false); setClickedSeatId(null); }}
// // // // //         svgId={clickedSeatId}
// // // // //         layout={layout}
// // // // //       />
// // // // //     </>
// // // // //   );
// // // // // }

// // // // "use client";

// // // // import React, { useCallback, useEffect, useRef, useState } from "react";
// // // // import { Maximize2, ZoomIn, ZoomOut, Layers } from "lucide-react";
// // // // import {
// // // //   Dialog, DialogContent, DialogHeader, DialogTitle,
// // // // } from "@/components/ui/dialog";
// // // // import { Layout } from "../types/layout.types";
// // // // import {
// // // //   fetchAllPreferences, saveSeatPreferences, Preference,
// // // // } from "../services/layoutService";

// // // // interface LayoutPreviewProps {
// // // //   layout: Layout | null;
// // // // }

// // // // // ─── SVG Helpers ──────────────────────────────────────────────────────────────

// // // // function extractSeatIds(svgText: string): string[] {
// // // //   const ids: string[] = [];
// // // //   const regex = /<g\s+id="([^"]+)"/g;
// // // //   let match;
// // // //   while ((match = regex.exec(svgText)) !== null) ids.push(match[1]);
// // // //   return ids;
// // // // }

// // // // function getSeatIdFromClick(target: EventTarget | null, knownIds: Set<string>): string | null {
// // // //   let el = target as Element | null;
// // // //   while (el) {
// // // //     if (el.tagName?.toLowerCase() === "svg") return null;
// // // //     const id = el.getAttribute?.("id");
// // // //     if (id && knownIds.has(id)) return id;
// // // //     el = el.parentElement;
// // // //   }
// // // //   return null;
// // // // }

// // // // function highlightSeat(svgText: string, svgId: string): string {
// // // //   const openTag = `<g id="${svgId}">`;
// // // //   const start = svgText.indexOf(openTag);
// // // //   if (start === -1) return svgText;
// // // //   return (
// // // //     svgText.slice(0, start) +
// // // //     `<g id="${svgId}" style="cursor:pointer;filter:drop-shadow(0 0 6px rgba(99,102,241,0.8))">` +
// // // //     svgText.slice(start + openTag.length)
// // // //   );
// // // // }

// // // // function addPointerCursors(svgText: string, ids: string[]): string {
// // // //   let result = svgText;
// // // //   ids.forEach((id) => {
// // // //     result = result.replace(`<g id="${id}">`, `<g id="${id}" style="cursor:pointer">`);
// // // //   });
// // // //   return result;
// // // // }

// // // // // ─── Seat Dialog ──────────────────────────────────────────────────────────────

// // // // const SeatDialog: React.FC<{
// // // //   open: boolean;
// // // //   onClose: () => void;
// // // //   svgId: string | null;
// // // //   layout: Layout | null;
// // // // }> = ({ open, onClose, svgId, layout }) => {
// // // //   const [allPrefs, setAllPrefs]         = useState<Preference[]>([]);
// // // //   const [selected, setSelected]         = useState<Set<string>>(new Set());
// // // //   const [loadingPrefs, setLoadingPrefs] = useState(false);
// // // //   const [saving, setSaving]             = useState(false);
// // // //   const [saveError, setSaveError]       = useState(false);
// // // //   const [saved, setSaved]               = useState(false);

// // // //   useEffect(() => {
// // // //     if (!open) return;
// // // //     setSelected(new Set());
// // // //     setSaved(false);
// // // //     setSaveError(false);
// // // //     setLoadingPrefs(true);
// // // //     fetchAllPreferences()
// // // //       .then(setAllPrefs)
// // // //       .catch(console.error)
// // // //       .finally(() => setLoadingPrefs(false));
// // // //   }, [open]);

// // // //   const toggle = (id: string) => {
// // // //     setSelected((prev) => {
// // // //       const next = new Set(prev);
// // // //       next.has(id) ? next.delete(id) : next.add(id);
// // // //       return next;
// // // //     });
// // // //     setSaved(false);
// // // //   };

// // // //   const handleSave = async () => {
// // // //     if (!svgId || !layout) return;
// // // //     setSaving(true);
// // // //     setSaveError(false);
// // // //     try {
// // // //       await saveSeatPreferences(svgId, layout.layout_id, [...selected]);
// // // //       setSaved(true);
// // // //     } catch {
// // // //       setSaveError(true);
// // // //     } finally {
// // // //       setSaving(false);
// // // //     }
// // // //   };

// // // //   if (!svgId || !layout) return null;

// // // //   return (
// // // //     <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
// // // //       <DialogContent className="max-w-sm rounded-xl p-0 overflow-hidden gap-0 [&>button:last-child]:hidden">
// // // //         <DialogHeader className="px-5 pt-5 pb-4 border-b">
// // // //           <p className="text-xs font-medium text-muted-foreground mb-0.5">Seat Configuration</p>
// // // //           <DialogTitle className="text-base font-semibold text-foreground">{svgId}</DialogTitle>
// // // //         </DialogHeader>

// // // //         <div className="overflow-y-auto" style={{ maxHeight: 480 }}>
// // // //           <div className="px-5 pt-4 pb-4 border-b">
// // // //             <p className="text-xs font-medium text-muted-foreground mb-3">Seat Details</p>
// // // //             <div className="grid grid-cols-2 gap-2">
// // // //               {[
// // // //                 { label: "SVG Element ID", value: svgId },
// // // //                 { label: "Floor ID",       value: layout.floor_id },
// // // //               ].map(({ label, value }) => (
// // // //                 <div key={label} className="flex flex-col gap-1">
// // // //                   <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
// // // //                   <span className="text-xs font-medium text-foreground font-mono bg-muted px-2.5 py-1.5 rounded-md border">{value}</span>
// // // //                 </div>
// // // //               ))}
// // // //             </div>
// // // //           </div>

// // // //           <div className="px-5 py-4">
// // // //             <div className="flex items-center justify-between mb-3">
// // // //               <p className="text-xs font-medium text-muted-foreground">Amenities</p>
// // // //               {selected.size > 0 && (
// // // //                 <span className="text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
// // // //                   {selected.size} selected
// // // //                 </span>
// // // //               )}
// // // //             </div>

// // // //             {loadingPrefs ? (
// // // //               <div className="flex items-center justify-center py-8">
// // // //                 <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
// // // //               </div>
// // // //             ) : allPrefs.length === 0 ? (
// // // //               <p className="text-xs text-muted-foreground text-center py-6">No amenities available.</p>
// // // //             ) : (
// // // //               <div className="grid grid-cols-2 gap-1.5">
// // // //                 {allPrefs.map((p) => {
// // // //                   const isOn = selected.has(p.preference_id);
// // // //                   return (
// // // //                     <button
// // // //                       key={p.preference_id}
// // // //                       onClick={() => toggle(p.preference_id)}
// // // //                       className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg border text-left transition-colors ${
// // // //                         isOn
// // // //                           ? "border-primary/40 bg-primary/5 text-primary"
// // // //                           : "border-border bg-background hover:bg-muted/50 text-foreground"
// // // //                       }`}
// // // //                     >
// // // //                       <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
// // // //                         isOn ? "bg-primary border-primary" : "border-input"
// // // //                       }`}>
// // // //                         {isOn && (
// // // //                           <svg viewBox="0 0 8 7" className="w-2.5 h-2.5">
// // // //                             <path d="M1 3.5l2 2L7 1" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
// // // //                           </svg>
// // // //                         )}
// // // //                       </div>
// // // //                       <span className="text-xs font-medium flex-1 truncate">{p.preference_name}</span>
// // // //                     </button>
// // // //                   );
// // // //                 })}
// // // //               </div>
// // // //             )}
// // // //           </div>
// // // //         </div>

// // // //         {!loadingPrefs && (
// // // //           <div className="px-5 py-3 border-t flex items-center justify-between gap-3 bg-background">
// // // //             <div className="text-xs">
// // // //               {saveError && <span className="text-destructive">Save failed. Try again.</span>}
// // // //               {saved && !saveError && <span className="text-emerald-600">Saved successfully.</span>}
// // // //             </div>
// // // //             <div className="flex items-center gap-2">
// // // //               <button
// // // //                 onClick={onClose}
// // // //                 className="px-4 py-1.5 text-xs font-medium border border-input bg-background text-foreground rounded-md hover:bg-muted transition-colors"
// // // //               >
// // // //                 Cancel
// // // //               </button>
// // // //               <button
// // // //                 onClick={handleSave}
// // // //                 disabled={saving || selected.size === 0}
// // // //                 className="px-4 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
// // // //               >
// // // //                 {saving ? "Saving…" : "Save"}
// // // //               </button>
// // // //             </div>
// // // //           </div>
// // // //         )}
// // // //       </DialogContent>
// // // //     </Dialog>
// // // //   );
// // // // };

// // // // // ─── Legend ───────────────────────────────────────────────────────────────────

// // // // const LEGEND_ITEMS = [
// // // //   { label: "Available",    color: "#22C55E" },
// // // //   { label: "Bookable",     color: "#3B82F6" },
// // // //   { label: "Non-bookable", color: "#EF4444" },
// // // //   { label: "Unconfigured", color: "#D1D5DB" },
// // // // ] as const;

// // // // function PreviewLegend() {
// // // //   return (
// // // //     <div className="flex items-center gap-4">
// // // //       {LEGEND_ITEMS.map(({ label, color }) => (
// // // //         <span key={label} className="flex items-center gap-1.5 text-xs text-gray-500">
// // // //           <span
// // // //             className="w-2.5 h-2.5 rounded-full flex-shrink-0"
// // // //             style={{ backgroundColor: color }}
// // // //           />
// // // //           {label}
// // // //         </span>
// // // //       ))}
// // // //     </div>
// // // //   );
// // // // }

// // // // // ─── Main Component ───────────────────────────────────────────────────────────

// // // // const SVG_W = 2466;
// // // // const SVG_H = 2039;

// // // // export default function LayoutPreview({ layout }: LayoutPreviewProps) {
// // // //   const wrapperRef   = useRef<HTMLDivElement>(null);
// // // //   const transformRef = useRef<HTMLDivElement>(null);

// // // //   const scaleRef     = useRef(1);
// // // //   const translateRef = useRef({ x: 0, y: 0 });
// // // //   const isPanning    = useRef(false);
// // // //   const panStart     = useRef({ x: 0, y: 0 });
// // // //   const mouseDownPos = useRef({ x: 0, y: 0 });
// // // //   const didDrag      = useRef(false);

// // // //   const [rawSvg,      setRawSvg]      = useState<string | null>(null);
// // // //   const [svgError,    setSvgError]    = useState(false);
// // // //   const [zoomDisplay, setZoomDisplay] = useState(100);
// // // //   const [mapReady,    setMapReady]    = useState(false);
// // // //   const [loading,     setLoading]     = useState(false);

// // // //   const seatIdsRef = useRef<Set<string>>(new Set());

// // // //   const [dialogOpen,    setDialogOpen]    = useState(false);
// // // //   const [clickedSeatId, setClickedSeatId] = useState<string | null>(null);

// // // //   useEffect(() => {
// // // //     const url = layout?.layout_file_url;
// // // //     if (!url || !url.startsWith("https://")) {
// // // //       setRawSvg(null); setSvgError(false); setMapReady(false); return;
// // // //     }
// // // //     setLoading(true); setRawSvg(null); setSvgError(false); setMapReady(false);
// // // //     fetch(url)
// // // //       .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.text(); })
// // // //       .then((text) => {
// // // //         const fluid = text
// // // //           .replace(/\bwidth="[^"]*"/, 'width="100%"')
// // // //           .replace(/\bheight="[^"]*"/, 'height="100%"');
// // // //         const ids = extractSeatIds(fluid);
// // // //         seatIdsRef.current = new Set(ids);
// // // //         setRawSvg(addPointerCursors(fluid, ids));
// // // //       })
// // // //       .catch(() => setSvgError(true))
// // // //       .finally(() => setLoading(false));
// // // //   }, [layout?.layout_file_url]);

// // // //   const applyTransform = useCallback(() => {
// // // //     const el = transformRef.current;
// // // //     if (!el) return;
// // // //     el.style.transform = `translate(${translateRef.current.x}px,${translateRef.current.y}px) scale(${scaleRef.current})`;
// // // //   }, []);

// // // //   const fitView = useCallback(() => {
// // // //     const wrapper = wrapperRef.current;
// // // //     if (!wrapper) return;
// // // //     const { width: wW, height: wH } = wrapper.getBoundingClientRect();
// // // //     if (wW === 0 || wH === 0) return;
// // // //     const scale = Math.min(wW / SVG_W, wH / SVG_H);
// // // //     scaleRef.current = scale;
// // // //     translateRef.current = { x: (wW - SVG_W * scale) / 2, y: (wH - SVG_H * scale) / 2 };
// // // //     applyTransform();
// // // //     setZoomDisplay(Math.round(scale * 100));
// // // //   }, [applyTransform]);

// // // //   useEffect(() => {
// // // //     const wrapper = wrapperRef.current;
// // // //     if (!wrapper || !rawSvg) return;
// // // //     const observer = new ResizeObserver(() => fitView());
// // // //     observer.observe(wrapper);
// // // //     return () => observer.disconnect();
// // // //   }, [rawSvg, fitView]);

// // // //   useEffect(() => {
// // // //     if (!rawSvg || loading) { setMapReady(false); return; }
// // // //     const id = requestAnimationFrame(() => { fitView(); setMapReady(true); });
// // // //     return () => cancelAnimationFrame(id);
// // // //   }, [rawSvg, loading, fitView]);

// // // //   const zoomStep = useCallback((factor: number) => {
// // // //     const wrapper = wrapperRef.current;
// // // //     if (!wrapper) return;
// // // //     const { width: wW, height: wH } = wrapper.getBoundingClientRect();
// // // //     const oldScale = scaleRef.current;
// // // //     const newScale = Math.min(Math.max(oldScale * factor, 0.05), 4);
// // // //     const cx = wW / 2, cy = wH / 2;
// // // //     translateRef.current = {
// // // //       x: cx - (cx - translateRef.current.x) * (newScale / oldScale),
// // // //       y: cy - (cy - translateRef.current.y) * (newScale / oldScale),
// // // //     };
// // // //     scaleRef.current = newScale;
// // // //     applyTransform();
// // // //     setZoomDisplay(Math.round(newScale * 100));
// // // //   }, [applyTransform]);

// // // //   const zoomIn  = useCallback(() => zoomStep(1.25),     [zoomStep]);
// // // //   const zoomOut = useCallback(() => zoomStep(1 / 1.25), [zoomStep]);

// // // //   useEffect(() => {
// // // //     const el = wrapperRef.current;
// // // //     if (!el) return;
// // // //     const handler = (e: WheelEvent) => {
// // // //       e.preventDefault();
// // // //       const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
// // // //       const oldScale = scaleRef.current;
// // // //       const newScale = Math.min(Math.max(oldScale * factor, 0.05), 4);
// // // //       const rect = el.getBoundingClientRect();
// // // //       translateRef.current = {
// // // //         x: e.clientX - rect.left - (e.clientX - rect.left - translateRef.current.x) * (newScale / oldScale),
// // // //         y: e.clientY - rect.top  - (e.clientY - rect.top  - translateRef.current.y) * (newScale / oldScale),
// // // //       };
// // // //       scaleRef.current = newScale;
// // // //       applyTransform();
// // // //       setZoomDisplay(Math.round(newScale * 100));
// // // //     };
// // // //     el.addEventListener("wheel", handler, { passive: false });
// // // //     return () => el.removeEventListener("wheel", handler);
// // // //   }, [applyTransform]);

// // // //   const onMouseDown = (e: React.MouseEvent) => {
// // // //     isPanning.current = true; didDrag.current = false;
// // // //     mouseDownPos.current = { x: e.clientX, y: e.clientY };
// // // //     panStart.current = { ...translateRef.current };
// // // //     (e.currentTarget as HTMLElement).style.cursor = "grabbing";
// // // //   };

// // // //   const onMouseMove = (e: React.MouseEvent) => {
// // // //     if (!isPanning.current) return;
// // // //     const dx = e.clientX - mouseDownPos.current.x;
// // // //     const dy = e.clientY - mouseDownPos.current.y;
// // // //     if (!didDrag.current && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) didDrag.current = true;
// // // //     if (didDrag.current) {
// // // //       translateRef.current = { x: panStart.current.x + dx, y: panStart.current.y + dy };
// // // //       applyTransform();
// // // //     }
// // // //   };

// // // //   const onMouseUp = (e: React.MouseEvent) => {
// // // //     isPanning.current = false;
// // // //     (e.currentTarget as HTMLElement).style.cursor = "grab";
// // // //   };

// // // //   const onMouseLeave = () => {
// // // //     isPanning.current = false;
// // // //     if (wrapperRef.current) wrapperRef.current.style.cursor = "grab";
// // // //   };

// // // //   const onMapClick = (e: React.MouseEvent) => {
// // // //     if (didDrag.current) { didDrag.current = false; return; }
// // // //     const svgId = getSeatIdFromClick(e.target, seatIdsRef.current);
// // // //     if (!svgId) return;
// // // //     setClickedSeatId(svgId);
// // // //     setDialogOpen(true);
// // // //   };

// // // //   const displaySvg = rawSvg && clickedSeatId && dialogOpen
// // // //     ? highlightSeat(rawSvg, clickedSeatId)
// // // //     : rawSvg;

// // // //   const showSpinner = loading || (!rawSvg && !svgError && !!layout?.layout_file_url);

// // // //   if (!layout) {
// // // //     return (
// // // //       <div className="flex flex-col gap-2">
// // // //         {/* legend row placeholder */}
// // // //         <div className="flex items-center justify-between px-1">
// // // //           <p className="text-sm font-medium text-gray-700">Layout Preview</p>
// // // //         </div>
// // // //         <div className="flex items-center justify-center h-[460px] bg-gray-50 rounded-xl border border-dashed border-gray-200">
// // // //           <div className="text-center text-gray-400">
// // // //             <Layers className="mx-auto mb-2 opacity-30" size={32} />
// // // //             <p className="text-sm">Select a layout to preview</p>
// // // //           </div>
// // // //         </div>
// // // //       </div>
// // // //     );
// // // //   }

// // // //   return (
// // // //     <>
// // // //       <div className="flex flex-col gap-2">

// // // //         {/* ── Header row: title + legend + zoom ──────────────────────────── */}
// // // //         <div className="flex items-center gap-4 flex-wrap">
// // // //           <p className="text-sm font-semibold text-gray-700 mr-auto">Layout Preview</p>
// // // //           <PreviewLegend />
// // // //           {mapReady && (
// // // //             <div className="flex items-center gap-1.5">
// // // //               <button
// // // //                 onClick={(e) => { e.stopPropagation(); zoomOut(); }}
// // // //                 className="w-7 h-7 rounded-md border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50 text-gray-600 transition-colors"
// // // //                 title="Zoom out"
// // // //               >
// // // //                 <ZoomOut size={13} />
// // // //               </button>
// // // //               <span className="text-xs font-semibold text-gray-500 tabular-nums w-10 text-center select-none">
// // // //                 {zoomDisplay}%
// // // //               </span>
// // // //               <button
// // // //                 onClick={(e) => { e.stopPropagation(); zoomIn(); }}
// // // //                 className="w-7 h-7 rounded-md border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50 text-gray-600 transition-colors"
// // // //                 title="Zoom in"
// // // //               >
// // // //                 <ZoomIn size={13} />
// // // //               </button>
// // // //             </div>
// // // //           )}
// // // //         </div>

// // // //         {/* ── Canvas ─────────────────────────────────────────────────────── */}
// // // //         <div
// // // //           className="relative bg-[#F7F8FC] border border-[#EBEBF5] rounded-xl overflow-hidden"
// // // //           style={{ width: "100%", height: 460 }}
// // // //         >
// // // //           {mapReady && (
// // // //             <div className="absolute top-3 right-3 z-20 flex flex-col gap-1.5">
// // // //               <button
// // // //                 onClick={(e) => { e.stopPropagation(); fitView(); }}
// // // //                 title="Fit to view"
// // // //                 className="w-8 h-8 rounded-lg bg-white border border-[#EBEBF5] shadow-sm flex items-center justify-center hover:bg-gray-50 text-gray-600 transition-colors"
// // // //               >
// // // //                 <Maximize2 size={14} />
// // // //               </button>
// // // //             </div>
// // // //           )}

// // // //           <div
// // // //             ref={wrapperRef}
// // // //             className="w-full h-full overflow-hidden select-none"
// // // //             style={{ cursor: "grab" }}
// // // //             onMouseDown={onMouseDown}
// // // //             onMouseMove={onMouseMove}
// // // //             onMouseUp={onMouseUp}
// // // //             onMouseLeave={onMouseLeave}
// // // //             onClick={onMapClick}
// // // //           >
// // // //             {showSpinner && (
// // // //               <div className="absolute inset-0 flex items-center justify-center bg-[#F7F8FC] z-10">
// // // //                 <div className="flex flex-col items-center gap-3">
// // // //                   <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
// // // //                   <p className="text-[12px] text-gray-400">Loading floor plan…</p>
// // // //                 </div>
// // // //               </div>
// // // //             )}

// // // //             {svgError && (
// // // //               <div className="absolute inset-0 flex items-center justify-center">
// // // //                 <div className="text-center">
// // // //                   <p className="text-[13px] text-gray-500 mb-1">Could not load floor plan</p>
// // // //                   <p className="text-[11px] text-gray-400 font-mono break-all px-6">
// // // //                     {layout.layout_file_url}
// // // //                   </p>
// // // //                 </div>
// // // //               </div>
// // // //             )}

// // // //             {displaySvg && (
// // // //               <div
// // // //                 ref={transformRef}
// // // //                 style={{
// // // //                   transformOrigin: "top left",
// // // //                   width:      `${SVG_W}px`,
// // // //                   height:     `${SVG_H}px`,
// // // //                   willChange: "transform",
// // // //                   visibility: mapReady ? "visible" : "hidden",
// // // //                 }}
// // // //                 dangerouslySetInnerHTML={{ __html: displaySvg }}
// // // //               />
// // // //             )}
// // // //           </div>
// // // //         </div>

// // // //         {/* ── Bottom: Fit to Screen button + hint ────────────────────────── */}
// // // //         {mapReady && (
// // // //           <div className="flex items-center justify-between px-0.5">
// // // //             <button
// // // //               onClick={fitView}
// // // //               className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors border border-gray-200 bg-white px-3 py-1.5 rounded-lg hover:bg-gray-50"
// // // //             >
// // // //               <Maximize2 size={12} />
// // // //               Fit to Screen
// // // //             </button>
// // // //             <p className="text-[10px] text-gray-400 select-none">
// // // //               Scroll to zoom · Drag to pan · Click a seat to configure
// // // //             </p>
// // // //           </div>
// // // //         )}

// // // //         {/* ── Draft banner ───────────────────────────────────────────────── */}
// // // //         {layout && !layout.is_published && layout.status !== "ARCHIVED" && (
// // // //           <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
// // // //             <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none"
// // // //               stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
// // // //               <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
// // // //             </svg>
// // // //             This is a draft layout. Publish to make it available for employee bookings.
// // // //           </div>
// // // //         )}
// // // //       </div>

// // // //       <SeatDialog
// // // //         open={dialogOpen}
// // // //         onClose={() => { setDialogOpen(false); setClickedSeatId(null); }}
// // // //         svgId={clickedSeatId}
// // // //         layout={layout}
// // // //       />
// // // //     </>
// // // //   );
// // // // }

// // // "use client";

// // // import React, { useCallback, useEffect, useRef, useState } from "react";
// // // import { Maximize2, ZoomIn, ZoomOut, Layers } from "lucide-react";
// // // import {
// // //   Dialog, DialogContent, DialogHeader, DialogTitle,
// // // } from "@/components/ui/dialog";
// // // import { Layout } from "../types/layout.types";
// // // import {
// // //   fetchAllPreferences, saveSeatPreferences, Preference,
// // // } from "../services/layoutService";

// // // interface LayoutPreviewProps {
// // //   layout: Layout | null;
// // // }

// // // // ─── SVG Helpers ──────────────────────────────────────────────────────────────

// // // function resolveUrl(url: string): string {
// // //   // Already absolute — use as-is
// // //   if (url.startsWith("http://") || url.startsWith("https://")) return url;
// // //   // Relative path — resolve against current origin (works in dev and prod)
// // //   if (typeof window !== "undefined") return `${window.location.origin}${url}`;
// // //   return url;
// // // }

// // // function extractSeatIds(svgText: string): string[] {
// // //   const ids: string[] = [];
// // //   const regex = /<g\s+id="([^"]+)"/g;
// // //   let match;
// // //   while ((match = regex.exec(svgText)) !== null) ids.push(match[1]);
// // //   return ids;
// // // }

// // // function getSeatIdFromClick(target: EventTarget | null, knownIds: Set<string>): string | null {
// // //   let el = target as Element | null;
// // //   while (el) {
// // //     if (el.tagName?.toLowerCase() === "svg") return null;
// // //     const id = el.getAttribute?.("id");
// // //     if (id && knownIds.has(id)) return id;
// // //     el = el.parentElement;
// // //   }
// // //   return null;
// // // }

// // // function highlightSeat(svgText: string, svgId: string): string {
// // //   const openTag = `<g id="${svgId}">`;
// // //   const start = svgText.indexOf(openTag);
// // //   if (start === -1) return svgText;
// // //   return (
// // //     svgText.slice(0, start) +
// // //     `<g id="${svgId}" style="cursor:pointer;filter:drop-shadow(0 0 6px rgba(99,102,241,0.8))">` +
// // //     svgText.slice(start + openTag.length)
// // //   );
// // // }

// // // function addPointerCursors(svgText: string, ids: string[]): string {
// // //   let result = svgText;
// // //   ids.forEach((id) => {
// // //     result = result.replace(`<g id="${id}">`, `<g id="${id}" style="cursor:pointer">`);
// // //   });
// // //   return result;
// // // }

// // // // ─── Seat Dialog ──────────────────────────────────────────────────────────────

// // // const SeatDialog: React.FC<{
// // //   open: boolean;
// // //   onClose: () => void;
// // //   svgId: string | null;
// // //   layout: Layout | null;
// // // }> = ({ open, onClose, svgId, layout }) => {
// // //   const [allPrefs, setAllPrefs]         = useState<Preference[]>([]);
// // //   const [selected, setSelected]         = useState<Set<string>>(new Set());
// // //   const [loadingPrefs, setLoadingPrefs] = useState(false);
// // //   const [saving, setSaving]             = useState(false);
// // //   const [saveError, setSaveError]       = useState(false);
// // //   const [saved, setSaved]               = useState(false);

// // //   useEffect(() => {
// // //     if (!open) return;
// // //     setSelected(new Set());
// // //     setSaved(false);
// // //     setSaveError(false);
// // //     setLoadingPrefs(true);
// // //     fetchAllPreferences()
// // //       .then(setAllPrefs)
// // //       .catch(console.error)
// // //       .finally(() => setLoadingPrefs(false));
// // //   }, [open]);

// // //   const toggle = (id: string) => {
// // //     setSelected((prev) => {
// // //       const next = new Set(prev);
// // //       next.has(id) ? next.delete(id) : next.add(id);
// // //       return next;
// // //     });
// // //     setSaved(false);
// // //   };

// // //   const handleSave = async () => {
// // //     if (!svgId || !layout) return;
// // //     setSaving(true);
// // //     setSaveError(false);
// // //     try {
// // //       await saveSeatPreferences(svgId, layout.layout_id, [...selected]);
// // //       setSaved(true);
// // //     } catch {
// // //       setSaveError(true);
// // //     } finally {
// // //       setSaving(false);
// // //     }
// // //   };

// // //   if (!svgId || !layout) return null;

// // //   return (
// // //     <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
// // //       <DialogContent className="max-w-sm rounded-xl p-0 overflow-hidden gap-0 [&>button:last-child]:hidden">
// // //         <DialogHeader className="px-5 pt-5 pb-4 border-b">
// // //           <p className="text-xs font-medium text-muted-foreground mb-0.5">Seat Configuration</p>
// // //           <DialogTitle className="text-base font-semibold text-foreground">{svgId}</DialogTitle>
// // //         </DialogHeader>

// // //         <div className="overflow-y-auto" style={{ maxHeight: 480 }}>
// // //           <div className="px-5 pt-4 pb-4 border-b">
// // //             <p className="text-xs font-medium text-muted-foreground mb-3">Seat Details</p>
// // //             <div className="grid grid-cols-2 gap-2">
// // //               {[
// // //                 { label: "SVG Element ID", value: svgId },
// // //                 { label: "Floor ID",       value: layout.floor_id },
// // //               ].map(({ label, value }) => (
// // //                 <div key={label} className="flex flex-col gap-1">
// // //                   <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
// // //                   <span className="text-xs font-medium text-foreground font-mono bg-muted px-2.5 py-1.5 rounded-md border">{value}</span>
// // //                 </div>
// // //               ))}
// // //             </div>
// // //           </div>

// // //           <div className="px-5 py-4">
// // //             <div className="flex items-center justify-between mb-3">
// // //               <p className="text-xs font-medium text-muted-foreground">Amenities</p>
// // //               {selected.size > 0 && (
// // //                 <span className="text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
// // //                   {selected.size} selected
// // //                 </span>
// // //               )}
// // //             </div>

// // //             {loadingPrefs ? (
// // //               <div className="flex items-center justify-center py-8">
// // //                 <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
// // //               </div>
// // //             ) : allPrefs.length === 0 ? (
// // //               <p className="text-xs text-muted-foreground text-center py-6">No amenities available.</p>
// // //             ) : (
// // //               <div className="grid grid-cols-2 gap-1.5">
// // //                 {allPrefs.map((p) => {
// // //                   const isOn = selected.has(p.preference_id);
// // //                   return (
// // //                     <button
// // //                       key={p.preference_id}
// // //                       onClick={() => toggle(p.preference_id)}
// // //                       className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg border text-left transition-colors ${
// // //                         isOn
// // //                           ? "border-primary/40 bg-primary/5 text-primary"
// // //                           : "border-border bg-background hover:bg-muted/50 text-foreground"
// // //                       }`}
// // //                     >
// // //                       <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
// // //                         isOn ? "bg-primary border-primary" : "border-input"
// // //                       }`}>
// // //                         {isOn && (
// // //                           <svg viewBox="0 0 8 7" className="w-2.5 h-2.5">
// // //                             <path d="M1 3.5l2 2L7 1" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
// // //                           </svg>
// // //                         )}
// // //                       </div>
// // //                       <span className="text-xs font-medium flex-1 truncate">{p.preference_name}</span>
// // //                     </button>
// // //                   );
// // //                 })}
// // //               </div>
// // //             )}
// // //           </div>
// // //         </div>

// // //         {!loadingPrefs && (
// // //           <div className="px-5 py-3 border-t flex items-center justify-between gap-3 bg-background">
// // //             <div className="text-xs">
// // //               {saveError && <span className="text-destructive">Save failed. Try again.</span>}
// // //               {saved && !saveError && <span className="text-emerald-600">Saved successfully.</span>}
// // //             </div>
// // //             <div className="flex items-center gap-2">
// // //               <button
// // //                 onClick={onClose}
// // //                 className="px-4 py-1.5 text-xs font-medium border border-input bg-background text-foreground rounded-md hover:bg-muted transition-colors"
// // //               >
// // //                 Cancel
// // //               </button>
// // //               <button
// // //                 onClick={handleSave}
// // //                 disabled={saving || selected.size === 0}
// // //                 className="px-4 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
// // //               >
// // //                 {saving ? "Saving…" : "Save"}
// // //               </button>
// // //             </div>
// // //           </div>
// // //         )}
// // //       </DialogContent>
// // //     </Dialog>
// // //   );
// // // };

// // // // ─── Legend ───────────────────────────────────────────────────────────────────

// // // const LEGEND_ITEMS = [
// // //   { label: "Available",    color: "#22C55E" },
// // //   { label: "Bookable",     color: "#3B82F6" },
// // //   { label: "Non-bookable", color: "#EF4444" },
// // //   { label: "Unconfigured", color: "#D1D5DB" },
// // // ] as const;

// // // function PreviewLegend() {
// // //   return (
// // //     <div className="flex items-center gap-4">
// // //       {LEGEND_ITEMS.map(({ label, color }) => (
// // //         <span key={label} className="flex items-center gap-1.5 text-xs text-gray-500">
// // //           <span
// // //             className="w-2.5 h-2.5 rounded-full flex-shrink-0"
// // //             style={{ backgroundColor: color }}
// // //           />
// // //           {label}
// // //         </span>
// // //       ))}
// // //     </div>
// // //   );
// // // }

// // // // ─── Main Component ───────────────────────────────────────────────────────────

// // // const SVG_W = 2466;
// // // const SVG_H = 2039;

// // // export default function LayoutPreview({ layout }: LayoutPreviewProps) {
// // //   const wrapperRef   = useRef<HTMLDivElement>(null);
// // //   const transformRef = useRef<HTMLDivElement>(null);

// // //   const scaleRef     = useRef(1);
// // //   const translateRef = useRef({ x: 0, y: 0 });
// // //   const isPanning    = useRef(false);
// // //   const panStart     = useRef({ x: 0, y: 0 });
// // //   const mouseDownPos = useRef({ x: 0, y: 0 });
// // //   const didDrag      = useRef(false);

// // //   const [rawSvg,      setRawSvg]      = useState<string | null>(null);
// // //   const [svgError,    setSvgError]    = useState(false);
// // //   const [zoomDisplay, setZoomDisplay] = useState(100);
// // //   const [mapReady,    setMapReady]    = useState(false);
// // //   const [loading,     setLoading]     = useState(false);

// // //   const seatIdsRef = useRef<Set<string>>(new Set());

// // //   const [dialogOpen,    setDialogOpen]    = useState(false);
// // //   const [clickedSeatId, setClickedSeatId] = useState<string | null>(null);

// // //   useEffect(() => {
// // //     const rawUrl = layout?.layout_file_url;

// // //     // No URL at all — clear and bail
// // //     if (!rawUrl) {
// // //       setRawSvg(null); setSvgError(false); setMapReady(false); return;
// // //     }

// // //     const url = resolveUrl(rawUrl);

// // //     setLoading(true); setRawSvg(null); setSvgError(false); setMapReady(false);

// // //     fetch(url)
// // //       .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.text(); })
// // //       .then((text) => {
// // //         const fluid = text
// // //           .replace(/\bwidth="[^"]*"/, 'width="100%"')
// // //           .replace(/\bheight="[^"]*"/, 'height="100%"');
// // //         const ids = extractSeatIds(fluid);
// // //         seatIdsRef.current = new Set(ids);
// // //         setRawSvg(addPointerCursors(fluid, ids));
// // //       })
// // //       .catch(() => setSvgError(true))
// // //       .finally(() => setLoading(false));
// // //   }, [layout?.layout_file_url]);

// // //   const applyTransform = useCallback(() => {
// // //     const el = transformRef.current;
// // //     if (!el) return;
// // //     el.style.transform = `translate(${translateRef.current.x}px,${translateRef.current.y}px) scale(${scaleRef.current})`;
// // //   }, []);

// // //   const fitView = useCallback(() => {
// // //     const wrapper = wrapperRef.current;
// // //     if (!wrapper) return;
// // //     const { width: wW, height: wH } = wrapper.getBoundingClientRect();
// // //     if (wW === 0 || wH === 0) return;
// // //     const scale = Math.min(wW / SVG_W, wH / SVG_H);
// // //     scaleRef.current = scale;
// // //     translateRef.current = { x: (wW - SVG_W * scale) / 2, y: (wH - SVG_H * scale) / 2 };
// // //     applyTransform();
// // //     setZoomDisplay(Math.round(scale * 100));
// // //   }, [applyTransform]);

// // //   useEffect(() => {
// // //     const wrapper = wrapperRef.current;
// // //     if (!wrapper || !rawSvg) return;
// // //     const observer = new ResizeObserver(() => fitView());
// // //     observer.observe(wrapper);
// // //     return () => observer.disconnect();
// // //   }, [rawSvg, fitView]);

// // //   useEffect(() => {
// // //     if (!rawSvg || loading) { setMapReady(false); return; }
// // //     const id = requestAnimationFrame(() => { fitView(); setMapReady(true); });
// // //     return () => cancelAnimationFrame(id);
// // //   }, [rawSvg, loading, fitView]);

// // //   const zoomStep = useCallback((factor: number) => {
// // //     const wrapper = wrapperRef.current;
// // //     if (!wrapper) return;
// // //     const { width: wW, height: wH } = wrapper.getBoundingClientRect();
// // //     const oldScale = scaleRef.current;
// // //     const newScale = Math.min(Math.max(oldScale * factor, 0.05), 4);
// // //     const cx = wW / 2, cy = wH / 2;
// // //     translateRef.current = {
// // //       x: cx - (cx - translateRef.current.x) * (newScale / oldScale),
// // //       y: cy - (cy - translateRef.current.y) * (newScale / oldScale),
// // //     };
// // //     scaleRef.current = newScale;
// // //     applyTransform();
// // //     setZoomDisplay(Math.round(newScale * 100));
// // //   }, [applyTransform]);

// // //   const zoomIn  = useCallback(() => zoomStep(1.25),     [zoomStep]);
// // //   const zoomOut = useCallback(() => zoomStep(1 / 1.25), [zoomStep]);

// // //   useEffect(() => {
// // //     const el = wrapperRef.current;
// // //     if (!el) return;
// // //     const handler = (e: WheelEvent) => {
// // //       e.preventDefault();
// // //       const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
// // //       const oldScale = scaleRef.current;
// // //       const newScale = Math.min(Math.max(oldScale * factor, 0.05), 4);
// // //       const rect = el.getBoundingClientRect();
// // //       translateRef.current = {
// // //         x: e.clientX - rect.left - (e.clientX - rect.left - translateRef.current.x) * (newScale / oldScale),
// // //         y: e.clientY - rect.top  - (e.clientY - rect.top  - translateRef.current.y) * (newScale / oldScale),
// // //       };
// // //       scaleRef.current = newScale;
// // //       applyTransform();
// // //       setZoomDisplay(Math.round(newScale * 100));
// // //     };
// // //     el.addEventListener("wheel", handler, { passive: false });
// // //     return () => el.removeEventListener("wheel", handler);
// // //   }, [applyTransform]);

// // //   const onMouseDown = (e: React.MouseEvent) => {
// // //     isPanning.current = true; didDrag.current = false;
// // //     mouseDownPos.current = { x: e.clientX, y: e.clientY };
// // //     panStart.current = { ...translateRef.current };
// // //     (e.currentTarget as HTMLElement).style.cursor = "grabbing";
// // //   };

// // //   const onMouseMove = (e: React.MouseEvent) => {
// // //     if (!isPanning.current) return;
// // //     const dx = e.clientX - mouseDownPos.current.x;
// // //     const dy = e.clientY - mouseDownPos.current.y;
// // //     if (!didDrag.current && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) didDrag.current = true;
// // //     if (didDrag.current) {
// // //       translateRef.current = { x: panStart.current.x + dx, y: panStart.current.y + dy };
// // //       applyTransform();
// // //     }
// // //   };

// // //   const onMouseUp = (e: React.MouseEvent) => {
// // //     isPanning.current = false;
// // //     (e.currentTarget as HTMLElement).style.cursor = "grab";
// // //   };

// // //   const onMouseLeave = () => {
// // //     isPanning.current = false;
// // //     if (wrapperRef.current) wrapperRef.current.style.cursor = "grab";
// // //   };

// // //   const onMapClick = (e: React.MouseEvent) => {
// // //     if (didDrag.current) { didDrag.current = false; return; }
// // //     const svgId = getSeatIdFromClick(e.target, seatIdsRef.current);
// // //     if (!svgId) return;
// // //     setClickedSeatId(svgId);
// // //     setDialogOpen(true);
// // //   };

// // //   const displaySvg = rawSvg && clickedSeatId && dialogOpen
// // //     ? highlightSeat(rawSvg, clickedSeatId)
// // //     : rawSvg;

// // //   const showSpinner = loading || (!rawSvg && !svgError && !!layout?.layout_file_url);

// // //   if (!layout) {
// // //     return (
// // //       <div className="flex flex-col gap-2">
// // //         <div className="flex items-center justify-between px-1">
// // //           <p className="text-sm font-medium text-gray-700">Layout Preview</p>
// // //         </div>
// // //         <div className="flex items-center justify-center h-[460px] bg-gray-50 rounded-xl border border-dashed border-gray-200">
// // //           <div className="text-center text-gray-400">
// // //             <Layers className="mx-auto mb-2 opacity-30" size={32} />
// // //             <p className="text-sm">Select a layout to preview</p>
// // //           </div>
// // //         </div>
// // //       </div>
// // //     );
// // //   }

// // //   return (
// // //     <>
// // //       <div className="flex flex-col gap-2">

// // //         {/* ── Header row: title + legend + zoom ──────────────────────────── */}
// // //         <div className="flex items-center gap-4 flex-wrap">
// // //           <p className="text-sm font-semibold text-gray-700 mr-auto">Layout Preview</p>
// // //           <PreviewLegend />
// // //           {mapReady && (
// // //             <div className="flex items-center gap-1.5">
// // //               <button
// // //                 onClick={(e) => { e.stopPropagation(); zoomOut(); }}
// // //                 className="w-7 h-7 rounded-md border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50 text-gray-600 transition-colors"
// // //                 title="Zoom out"
// // //               >
// // //                 <ZoomOut size={13} />
// // //               </button>
// // //               <span className="text-xs font-semibold text-gray-500 tabular-nums w-10 text-center select-none">
// // //                 {zoomDisplay}%
// // //               </span>
// // //               <button
// // //                 onClick={(e) => { e.stopPropagation(); zoomIn(); }}
// // //                 className="w-7 h-7 rounded-md border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50 text-gray-600 transition-colors"
// // //                 title="Zoom in"
// // //               >
// // //                 <ZoomIn size={13} />
// // //               </button>
// // //             </div>
// // //           )}
// // //         </div>

// // //         {/* ── Canvas ─────────────────────────────────────────────────────── */}
// // //         <div
// // //           className="relative bg-[#F7F8FC] border border-[#EBEBF5] rounded-xl overflow-hidden"
// // //           style={{ width: "100%", height: 460 }}
// // //         >
// // //           {mapReady && (
// // //             <div className="absolute top-3 right-3 z-20 flex flex-col gap-1.5">
// // //               <button
// // //                 onClick={(e) => { e.stopPropagation(); fitView(); }}
// // //                 title="Fit to view"
// // //                 className="w-8 h-8 rounded-lg bg-white border border-[#EBEBF5] shadow-sm flex items-center justify-center hover:bg-gray-50 text-gray-600 transition-colors"
// // //               >
// // //                 <Maximize2 size={14} />
// // //               </button>
// // //             </div>
// // //           )}

// // //           <div
// // //             ref={wrapperRef}
// // //             className="w-full h-full overflow-hidden select-none"
// // //             style={{ cursor: "grab" }}
// // //             onMouseDown={onMouseDown}
// // //             onMouseMove={onMouseMove}
// // //             onMouseUp={onMouseUp}
// // //             onMouseLeave={onMouseLeave}
// // //             onClick={onMapClick}
// // //           >
// // //             {showSpinner && (
// // //               <div className="absolute inset-0 flex items-center justify-center bg-[#F7F8FC] z-10">
// // //                 <div className="flex flex-col items-center gap-3">
// // //                   <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
// // //                   <p className="text-[12px] text-gray-400">Loading floor plan…</p>
// // //                 </div>
// // //               </div>
// // //             )}

// // //             {svgError && (
// // //               <div className="absolute inset-0 flex items-center justify-center">
// // //                 <div className="text-center">
// // //                   <p className="text-[13px] text-gray-500 mb-1">Could not load floor plan</p>
// // //                   <p className="text-[11px] text-gray-400 font-mono break-all px-6">
// // //                     {layout.layout_file_url}
// // //                   </p>
// // //                 </div>
// // //               </div>
// // //             )}

// // //             {displaySvg && (
// // //               <div
// // //                 ref={transformRef}
// // //                 style={{
// // //                   transformOrigin: "top left",
// // //                   width:      `${SVG_W}px`,
// // //                   height:     `${SVG_H}px`,
// // //                   willChange: "transform",
// // //                   visibility: mapReady ? "visible" : "hidden",
// // //                 }}
// // //                 dangerouslySetInnerHTML={{ __html: displaySvg }}
// // //               />
// // //             )}
// // //           </div>
// // //         </div>

// // //         {/* ── Bottom: Fit to Screen button + hint ────────────────────────── */}
// // //         {mapReady && (
// // //           <div className="flex items-center justify-between px-0.5">
// // //             <button
// // //               onClick={fitView}
// // //               className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors border border-gray-200 bg-white px-3 py-1.5 rounded-lg hover:bg-gray-50"
// // //             >
// // //               <Maximize2 size={12} />
// // //               Fit to Screen
// // //             </button>
// // //             <p className="text-[10px] text-gray-400 select-none">
// // //               Scroll to zoom · Drag to pan · Click a seat to configure
// // //             </p>
// // //           </div>
// // //         )}

// // //         {/* ── Draft banner ───────────────────────────────────────────────── */}
// // //         {layout && !layout.is_published && layout.status !== "ARCHIVED" && (
// // //           <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
// // //             <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none"
// // //               stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
// // //               <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
// // //             </svg>
// // //             This is a draft layout. Publish to make it available for employee bookings.
// // //           </div>
// // //         )}
// // //       </div>

// // //       <SeatDialog
// // //         open={dialogOpen}
// // //         onClose={() => { setDialogOpen(false); setClickedSeatId(null); }}
// // //         svgId={clickedSeatId}
// // //         layout={layout}
// // //       />
// // //     </>
// // //   );
// // // }

// // "use client";

// // import React, { useCallback, useEffect, useRef, useState } from "react";
// // import { Maximize2, ZoomIn, ZoomOut, Layers } from "lucide-react";
// // import {
// //   Dialog, DialogContent, DialogHeader, DialogTitle,
// // } from "@/components/ui/dialog";
// // import { Layout } from "../types/layout.types";
// // import {
// //   fetchAllPreferences, saveSeatPreferences, Preference,
// // } from "../services/layoutService";

// // interface LayoutPreviewProps {
// //   layout: Layout | null;
// //   fillHeight?: boolean; // when true, canvas stretches to fill parent instead of fixed 460px
// // }

// // // ─── SVG Helpers ──────────────────────────────────────────────────────────────

// // function resolveUrl(url: string): string {
// //   if (url.startsWith("http://") || url.startsWith("https://")) return url;
// //   if (typeof window !== "undefined") return `${window.location.origin}${url}`;
// //   return url;
// // }

// // function extractSeatIds(svgText: string): string[] {
// //   const ids: string[] = [];
// //   const regex = /<g\s+id="([^"]+)"/g;
// //   let match;
// //   while ((match = regex.exec(svgText)) !== null) ids.push(match[1]);
// //   return ids;
// // }

// // function getSeatIdFromClick(target: EventTarget | null, knownIds: Set<string>): string | null {
// //   let el = target as Element | null;
// //   while (el) {
// //     if (el.tagName?.toLowerCase() === "svg") return null;
// //     const id = el.getAttribute?.("id");
// //     if (id && knownIds.has(id)) return id;
// //     el = el.parentElement;
// //   }
// //   return null;
// // }

// // function highlightSeat(svgText: string, svgId: string): string {
// //   const openTag = `<g id="${svgId}">`;
// //   const start = svgText.indexOf(openTag);
// //   if (start === -1) return svgText;
// //   return (
// //     svgText.slice(0, start) +
// //     `<g id="${svgId}" style="cursor:pointer;filter:drop-shadow(0 0 6px rgba(99,102,241,0.8))">` +
// //     svgText.slice(start + openTag.length)
// //   );
// // }

// // function addPointerCursors(svgText: string, ids: string[]): string {
// //   let result = svgText;
// //   ids.forEach((id) => {
// //     result = result.replace(`<g id="${id}">`, `<g id="${id}" style="cursor:pointer">`);
// //   });
// //   return result;
// // }

// // // ─── Seat Dialog ──────────────────────────────────────────────────────────────

// // const SeatDialog: React.FC<{
// //   open: boolean;
// //   onClose: () => void;
// //   svgId: string | null;
// //   layout: Layout | null;
// // }> = ({ open, onClose, svgId, layout }) => {
// //   const [allPrefs, setAllPrefs]         = useState<Preference[]>([]);
// //   const [selected, setSelected]         = useState<Set<string>>(new Set());
// //   const [loadingPrefs, setLoadingPrefs] = useState(false);
// //   const [saving, setSaving]             = useState(false);
// //   const [saveError, setSaveError]       = useState(false);
// //   const [saved, setSaved]               = useState(false);

// //   useEffect(() => {
// //     if (!open) return;
// //     setSelected(new Set());
// //     setSaved(false);
// //     setSaveError(false);
// //     setLoadingPrefs(true);
// //     fetchAllPreferences()
// //       .then(setAllPrefs)
// //       .catch(console.error)
// //       .finally(() => setLoadingPrefs(false));
// //   }, [open]);

// //   const toggle = (id: string) => {
// //     setSelected((prev) => {
// //       const next = new Set(prev);
// //       next.has(id) ? next.delete(id) : next.add(id);
// //       return next;
// //     });
// //     setSaved(false);
// //   };

// //   const handleSave = async () => {
// //     if (!svgId || !layout) return;
// //     setSaving(true);
// //     setSaveError(false);
// //     try {
// //       await saveSeatPreferences(svgId, layout.layout_id, [...selected]);
// //       setSaved(true);
// //     } catch {
// //       setSaveError(true);
// //     } finally {
// //       setSaving(false);
// //     }
// //   };

// //   if (!svgId || !layout) return null;

// //   return (
// //     <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
// //       <DialogContent className="max-w-sm rounded-xl p-0 overflow-hidden gap-0 [&>button:last-child]:hidden">
// //         <DialogHeader className="px-5 pt-5 pb-4 border-b">
// //           <p className="text-xs font-medium text-muted-foreground mb-0.5">Seat Configuration</p>
// //           <DialogTitle className="text-base font-semibold text-foreground">{svgId}</DialogTitle>
// //         </DialogHeader>

// //         <div className="overflow-y-auto" style={{ maxHeight: 480 }}>
// //           <div className="px-5 pt-4 pb-4 border-b">
// //             <p className="text-xs font-medium text-muted-foreground mb-3">Seat Details</p>
// //             <div className="grid grid-cols-2 gap-2">
// //               {[
// //                 { label: "SVG Element ID", value: svgId },
// //                 { label: "Floor ID",       value: layout.floor_id },
// //               ].map(({ label, value }) => (
// //                 <div key={label} className="flex flex-col gap-1">
// //                   <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
// //                   <span className="text-xs font-medium text-foreground font-mono bg-muted px-2.5 py-1.5 rounded-md border">{value}</span>
// //                 </div>
// //               ))}
// //             </div>
// //           </div>

// //           <div className="px-5 py-4">
// //             <div className="flex items-center justify-between mb-3">
// //               <p className="text-xs font-medium text-muted-foreground">Amenities</p>
// //               {selected.size > 0 && (
// //                 <span className="text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
// //                   {selected.size} selected
// //                 </span>
// //               )}
// //             </div>

// //             {loadingPrefs ? (
// //               <div className="flex items-center justify-center py-8">
// //                 <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
// //               </div>
// //             ) : allPrefs.length === 0 ? (
// //               <p className="text-xs text-muted-foreground text-center py-6">No amenities available.</p>
// //             ) : (
// //               <div className="grid grid-cols-2 gap-1.5">
// //                 {allPrefs.map((p) => {
// //                   const isOn = selected.has(p.preference_id);
// //                   return (
// //                     <button
// //                       key={p.preference_id}
// //                       onClick={() => toggle(p.preference_id)}
// //                       className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg border text-left transition-colors ${
// //                         isOn
// //                           ? "border-primary/40 bg-primary/5 text-primary"
// //                           : "border-border bg-background hover:bg-muted/50 text-foreground"
// //                       }`}
// //                     >
// //                       <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
// //                         isOn ? "bg-primary border-primary" : "border-input"
// //                       }`}>
// //                         {isOn && (
// //                           <svg viewBox="0 0 8 7" className="w-2.5 h-2.5">
// //                             <path d="M1 3.5l2 2L7 1" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
// //                           </svg>
// //                         )}
// //                       </div>
// //                       <span className="text-xs font-medium flex-1 truncate">{p.preference_name}</span>
// //                     </button>
// //                   );
// //                 })}
// //               </div>
// //             )}
// //           </div>
// //         </div>

// //         {!loadingPrefs && (
// //           <div className="px-5 py-3 border-t flex items-center justify-between gap-3 bg-background">
// //             <div className="text-xs">
// //               {saveError && <span className="text-destructive">Save failed. Try again.</span>}
// //               {saved && !saveError && <span className="text-emerald-600">Saved successfully.</span>}
// //             </div>
// //             <div className="flex items-center gap-2">
// //               <button
// //                 onClick={onClose}
// //                 className="px-4 py-1.5 text-xs font-medium border border-input bg-background text-foreground rounded-md hover:bg-muted transition-colors"
// //               >
// //                 Cancel
// //               </button>
// //               <button
// //                 onClick={handleSave}
// //                 disabled={saving || selected.size === 0}
// //                 className="px-4 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
// //               >
// //                 {saving ? "Saving…" : "Save"}
// //               </button>
// //             </div>
// //           </div>
// //         )}
// //       </DialogContent>
// //     </Dialog>
// //   );
// // };

// // // ─── Legend ───────────────────────────────────────────────────────────────────

// // const LEGEND_ITEMS = [
// //   { label: "Available",    color: "#22C55E" },
// //   { label: "Bookable",     color: "#3B82F6" },
// //   { label: "Non-bookable", color: "#EF4444" },
// //   { label: "Unconfigured", color: "#D1D5DB" },
// // ] as const;

// // function PreviewLegend() {
// //   return (
// //     <div className="flex items-center gap-4">
// //       {LEGEND_ITEMS.map(({ label, color }) => (
// //         <span key={label} className="flex items-center gap-1.5 text-xs text-gray-500">
// //           <span
// //             className="w-2.5 h-2.5 rounded-full flex-shrink-0"
// //             style={{ backgroundColor: color }}
// //           />
// //           {label}
// //         </span>
// //       ))}
// //     </div>
// //   );
// // }

// // // ─── Main Component ───────────────────────────────────────────────────────────

// // const SVG_W = 2466;
// // const SVG_H = 2039;

// // export default function LayoutPreview({ layout, fillHeight = false }: LayoutPreviewProps) {
// //   const wrapperRef   = useRef<HTMLDivElement>(null);
// //   const transformRef = useRef<HTMLDivElement>(null);

// //   const scaleRef     = useRef(1);
// //   const translateRef = useRef({ x: 0, y: 0 });
// //   const isPanning    = useRef(false);
// //   const panStart     = useRef({ x: 0, y: 0 });
// //   const mouseDownPos = useRef({ x: 0, y: 0 });
// //   const didDrag      = useRef(false);

// //   const [rawSvg,      setRawSvg]      = useState<string | null>(null);
// //   const [svgError,    setSvgError]    = useState(false);
// //   const [zoomDisplay, setZoomDisplay] = useState(100);
// //   const [mapReady,    setMapReady]    = useState(false);
// //   const [loading,     setLoading]     = useState(false);

// //   const seatIdsRef = useRef<Set<string>>(new Set());

// //   const [dialogOpen,    setDialogOpen]    = useState(false);
// //   const [clickedSeatId, setClickedSeatId] = useState<string | null>(null);

// //   useEffect(() => {
// //     const rawUrl = layout?.layout_file_url;
// //     if (!rawUrl) {
// //       setRawSvg(null); setSvgError(false); setMapReady(false); return;
// //     }
// //     const url = resolveUrl(rawUrl);
// //     setLoading(true); setRawSvg(null); setSvgError(false); setMapReady(false);
// //     fetch(url)
// //       .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.text(); })
// //       .then((text) => {
// //         const fluid = text
// //           .replace(/\bwidth="[^"]*"/, 'width="100%"')
// //           .replace(/\bheight="[^"]*"/, 'height="100%"');
// //         const ids = extractSeatIds(fluid);
// //         seatIdsRef.current = new Set(ids);
// //         setRawSvg(addPointerCursors(fluid, ids));
// //       })
// //       .catch(() => setSvgError(true))
// //       .finally(() => setLoading(false));
// //   }, [layout?.layout_file_url]);

// //   const applyTransform = useCallback(() => {
// //     const el = transformRef.current;
// //     if (!el) return;
// //     el.style.transform = `translate(${translateRef.current.x}px,${translateRef.current.y}px) scale(${scaleRef.current})`;
// //   }, []);

// //   const fitView = useCallback(() => {
// //     const wrapper = wrapperRef.current;
// //     if (!wrapper) return;
// //     const { width: wW, height: wH } = wrapper.getBoundingClientRect();
// //     if (wW === 0 || wH === 0) return;
// //     const scale = Math.min(wW / SVG_W, wH / SVG_H);
// //     scaleRef.current = scale;
// //     translateRef.current = { x: (wW - SVG_W * scale) / 2, y: (wH - SVG_H * scale) / 2 };
// //     applyTransform();
// //     setZoomDisplay(Math.round(scale * 100));
// //   }, [applyTransform]);

// //   useEffect(() => {
// //     const wrapper = wrapperRef.current;
// //     if (!wrapper || !rawSvg) return;
// //     const observer = new ResizeObserver(() => fitView());
// //     observer.observe(wrapper);
// //     return () => observer.disconnect();
// //   }, [rawSvg, fitView]);

// //   useEffect(() => {
// //     if (!rawSvg || loading) { setMapReady(false); return; }
// //     const id = requestAnimationFrame(() => { fitView(); setMapReady(true); });
// //     return () => cancelAnimationFrame(id);
// //   }, [rawSvg, loading, fitView]);

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

// //   useEffect(() => {
// //     const el = wrapperRef.current;
// //     if (!el) return;
// //     const handler = (e: WheelEvent) => {
// //       e.preventDefault();
// //       const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
// //       const oldScale = scaleRef.current;
// //       const newScale = Math.min(Math.max(oldScale * factor, 0.05), 4);
// //       const rect = el.getBoundingClientRect();
// //       translateRef.current = {
// //         x: e.clientX - rect.left - (e.clientX - rect.left - translateRef.current.x) * (newScale / oldScale),
// //         y: e.clientY - rect.top  - (e.clientY - rect.top  - translateRef.current.y) * (newScale / oldScale),
// //       };
// //       scaleRef.current = newScale;
// //       applyTransform();
// //       setZoomDisplay(Math.round(newScale * 100));
// //     };
// //     el.addEventListener("wheel", handler, { passive: false });
// //     return () => el.removeEventListener("wheel", handler);
// //   }, [applyTransform]);

// //   const onMouseDown = (e: React.MouseEvent) => {
// //     isPanning.current = true; didDrag.current = false;
// //     mouseDownPos.current = { x: e.clientX, y: e.clientY };
// //     panStart.current = { ...translateRef.current };
// //     (e.currentTarget as HTMLElement).style.cursor = "grabbing";
// //   };

// //   const onMouseMove = (e: React.MouseEvent) => {
// //     if (!isPanning.current) return;
// //     const dx = e.clientX - mouseDownPos.current.x;
// //     const dy = e.clientY - mouseDownPos.current.y;
// //     if (!didDrag.current && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) didDrag.current = true;
// //     if (didDrag.current) {
// //       translateRef.current = { x: panStart.current.x + dx, y: panStart.current.y + dy };
// //       applyTransform();
// //     }
// //   };

// //   const onMouseUp = (e: React.MouseEvent) => {
// //     isPanning.current = false;
// //     (e.currentTarget as HTMLElement).style.cursor = "grab";
// //   };

// //   const onMouseLeave = () => {
// //     isPanning.current = false;
// //     if (wrapperRef.current) wrapperRef.current.style.cursor = "grab";
// //   };

// //   const onMapClick = (e: React.MouseEvent) => {
// //     if (didDrag.current) { didDrag.current = false; return; }
// //     const svgId = getSeatIdFromClick(e.target, seatIdsRef.current);
// //     if (!svgId) return;
// //     setClickedSeatId(svgId);
// //     setDialogOpen(true);
// //   };

// //   const displaySvg = rawSvg && clickedSeatId && dialogOpen
// //     ? highlightSeat(rawSvg, clickedSeatId)
// //     : rawSvg;

// //   const showSpinner = loading || (!rawSvg && !svgError && !!layout?.layout_file_url);

// //   if (!layout) {
// //     return (
// //       <div className="flex flex-col gap-2">
// //         <div className="flex items-center justify-between px-1">
// //           <p className="text-sm font-medium text-gray-700">Layout Preview</p>
// //         </div>
// //         <div className="flex items-center justify-center h-[460px] bg-gray-50 rounded-xl border border-dashed border-gray-200">
// //           <div className="text-center text-gray-400">
// //             <Layers className="mx-auto mb-2 opacity-30" size={32} />
// //             <p className="text-sm">Select a layout to preview</p>
// //           </div>
// //         </div>
// //       </div>
// //     );
// //   }

// //   return (
// //     <>
// //       {/* Outer wrapper: flex column, fills parent height when fillHeight=true */}
// //       <div className={`flex flex-col gap-2 ${fillHeight ? "h-full" : ""}`}>

// //         {/* ── Header row: title + legend + zoom ──────────────────────────── */}
// //         <div className="flex items-center gap-4 flex-wrap flex-shrink-0">
// //           <p className="text-sm font-semibold text-gray-700 mr-auto">Layout Preview</p>
// //           <PreviewLegend />
// //           {mapReady && (
// //             <div className="flex items-center gap-1.5">
// //               <button
// //                 onClick={(e) => { e.stopPropagation(); zoomOut(); }}
// //                 className="w-7 h-7 rounded-md border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50 text-gray-600 transition-colors"
// //                 title="Zoom out"
// //               >
// //                 <ZoomOut size={13} />
// //               </button>
// //               <span className="text-xs font-semibold text-gray-500 tabular-nums w-10 text-center select-none">
// //                 {zoomDisplay}%
// //               </span>
// //               <button
// //                 onClick={(e) => { e.stopPropagation(); zoomIn(); }}
// //                 className="w-7 h-7 rounded-md border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50 text-gray-600 transition-colors"
// //                 title="Zoom in"
// //               >
// //                 <ZoomIn size={13} />
// //               </button>
// //             </div>
// //           )}
// //         </div>

// //         {/* ── Canvas ─────────────────────────────────────────────────────── */}
// //         {/* When fillHeight: flex-1 + min-h-0 so it stretches to fill remaining space */}
// //         {/* When not fillHeight: fixed 460px like before */}
// //         <div
// //           className={`relative bg-[#F7F8FC] border border-[#EBEBF5] rounded-xl overflow-hidden ${
// //             fillHeight ? "flex-1 min-h-0" : ""
// //           }`}
// //           style={fillHeight ? { width: "100%" } : { width: "100%", height: 460 }}
// //         >
// //           {mapReady && (
// //             <div className="absolute top-3 right-3 z-20 flex flex-col gap-1.5">
// //               <button
// //                 onClick={(e) => { e.stopPropagation(); fitView(); }}
// //                 title="Fit to view"
// //                 className="w-8 h-8 rounded-lg bg-white border border-[#EBEBF5] shadow-sm flex items-center justify-center hover:bg-gray-50 text-gray-600 transition-colors"
// //               >
// //                 <Maximize2 size={14} />
// //               </button>
// //             </div>
// //           )}

// //           <div
// //             ref={wrapperRef}
// //             className="w-full h-full overflow-hidden select-none"
// //             style={{ cursor: "grab" }}
// //             onMouseDown={onMouseDown}
// //             onMouseMove={onMouseMove}
// //             onMouseUp={onMouseUp}
// //             onMouseLeave={onMouseLeave}
// //             onClick={onMapClick}
// //           >
// //             {showSpinner && (
// //               <div className="absolute inset-0 flex items-center justify-center bg-[#F7F8FC] z-10">
// //                 <div className="flex flex-col items-center gap-3">
// //                   <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
// //                   <p className="text-[12px] text-gray-400">Loading floor plan…</p>
// //                 </div>
// //               </div>
// //             )}

// //             {svgError && (
// //               <div className="absolute inset-0 flex items-center justify-center">
// //                 <div className="text-center">
// //                   <p className="text-[13px] text-gray-500 mb-1">Could not load floor plan</p>
// //                   <p className="text-[11px] text-gray-400 font-mono break-all px-6">
// //                     {layout.layout_file_url}
// //                   </p>
// //                 </div>
// //               </div>
// //             )}

// //             {displaySvg && (
// //               <div
// //                 ref={transformRef}
// //                 style={{
// //                   transformOrigin: "top left",
// //                   width:      `${SVG_W}px`,
// //                   height:     `${SVG_H}px`,
// //                   willChange: "transform",
// //                   visibility: mapReady ? "visible" : "hidden",
// //                 }}
// //                 dangerouslySetInnerHTML={{ __html: displaySvg }}
// //               />
// //             )}
// //           </div>
// //         </div>

// //         {/* ── Bottom: Fit to Screen button + hint ────────────────────────── */}
// //         {mapReady && (
// //           <div className="flex items-center justify-between px-0.5 flex-shrink-0">
// //             <button
// //               onClick={fitView}
// //               className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors border border-gray-200 bg-white px-3 py-1.5 rounded-lg hover:bg-gray-50"
// //             >
// //               <Maximize2 size={12} />
// //               Fit to Screen
// //             </button>
// //             <p className="text-[10px] text-gray-400 select-none">
// //               Scroll to zoom · Drag to pan · Click a seat to configure
// //             </p>
// //           </div>
// //         )}

// //         {/* ── Draft banner ───────────────────────────────────────────────── */}
// //         {layout && !layout.is_published && layout.status !== "ARCHIVED" && (
// //           <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 flex-shrink-0">
// //             <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none"
// //               stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
// //               <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
// //             </svg>
// //             This is a draft layout. Publish to make it available for employee bookings.
// //           </div>
// //         )}
// //       </div>

// //       <SeatDialog
// //         open={dialogOpen}
// //         onClose={() => { setDialogOpen(false); setClickedSeatId(null); }}
// //         svgId={clickedSeatId}
// //         layout={layout}
// //       />
// //     </>
// //   );
// // }

// "use client";

// import React, { useCallback, useEffect, useRef, useState } from "react";
// import { Maximize2, ZoomIn, ZoomOut, Layers } from "lucide-react";
// import {
//   Dialog, DialogContent, DialogHeader, DialogTitle,
// } from "@/components/ui/dialog";
// import { Layout } from "../types/layout.types";
// import {
//   fetchAllPreferences, saveSeatPreferences, Preference,
// } from "../services/layoutService";

// interface LayoutPreviewProps {
//   layout: Layout | null;
//   fillHeight?: boolean;
// }

// // ─── SVG Helpers ──────────────────────────────────────────────────────────────

// function resolveUrl(url: string): string {
//   if (url.startsWith("http://") || url.startsWith("https://")) return url;
//   if (typeof window !== "undefined") return `${window.location.origin}${url}`;
//   return url;
// }

// function extractSeatIds(svgText: string): string[] {
//   const ids: string[] = [];
//   const regex = /<g\s+id="([^"]+)"/g;
//   let match;
//   while ((match = regex.exec(svgText)) !== null) ids.push(match[1]);
//   return ids;
// }

// function getSeatIdFromClick(target: EventTarget | null, knownIds: Set<string>): string | null {
//   let el = target as Element | null;
//   while (el) {
//     if (el.tagName?.toLowerCase() === "svg") return null;
//     const id = el.getAttribute?.("id");
//     if (id && knownIds.has(id)) return id;
//     el = el.parentElement;
//   }
//   return null;
// }

// function highlightSeat(svgText: string, svgId: string): string {
//   const openTag = `<g id="${svgId}">`;
//   const start = svgText.indexOf(openTag);
//   if (start === -1) return svgText;
//   return (
//     svgText.slice(0, start) +
//     `<g id="${svgId}" style="cursor:pointer;filter:drop-shadow(0 0 6px rgba(99,102,241,0.8))">` +
//     svgText.slice(start + openTag.length)
//   );
// }

// function addPointerCursors(svgText: string, ids: string[]): string {
//   let result = svgText;
//   ids.forEach((id) => {
//     result = result.replace(`<g id="${id}">`, `<g id="${id}" style="cursor:pointer">`);
//   });
//   return result;
// }

// // ─── Seat Dialog ──────────────────────────────────────────────────────────────

// const SeatDialog: React.FC<{
//   open: boolean;
//   onClose: () => void;
//   svgId: string | null;
//   layout: Layout | null;
// }> = ({ open, onClose, svgId, layout }) => {
//   const [allPrefs, setAllPrefs]         = useState<Preference[]>([]);
//   const [selected, setSelected]         = useState<Set<string>>(new Set());
//   const [loadingPrefs, setLoadingPrefs] = useState(false);
//   const [saving, setSaving]             = useState(false);
//   const [saveError, setSaveError]       = useState(false);
//   const [saved, setSaved]               = useState(false);

//   useEffect(() => {
//     if (!open) return;
//     setSelected(new Set());
//     setSaved(false);
//     setSaveError(false);
//     setLoadingPrefs(true);
//     fetchAllPreferences()
//       .then(setAllPrefs)
//       .catch(console.error)
//       .finally(() => setLoadingPrefs(false));
//   }, [open]);

//   const toggle = (id: string) => {
//     setSelected((prev) => {
//       const next = new Set(prev);
//       next.has(id) ? next.delete(id) : next.add(id);
//       return next;
//     });
//     setSaved(false);
//   };

//   const handleSave = async () => {
//     if (!svgId || !layout) return;
//     setSaving(true);
//     setSaveError(false);
//     try {
//       await saveSeatPreferences(svgId, layout.layout_id, [...selected]);
//       setSaved(true);
//     } catch {
//       setSaveError(true);
//     } finally {
//       setSaving(false);
//     }
//   };

//   if (!svgId || !layout) return null;

//   return (
//     <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
//       <DialogContent className="max-w-sm rounded-xl p-0 overflow-hidden gap-0 [&>button:last-child]:hidden">
//         <DialogHeader className="px-5 pt-5 pb-4 border-b">
//           <p className="text-xs font-medium text-muted-foreground mb-0.5">Seat Configuration</p>
//           <DialogTitle className="text-base font-semibold text-foreground">{svgId}</DialogTitle>
//         </DialogHeader>

//         <div className="overflow-y-auto" style={{ maxHeight: 480 }}>
//           <div className="px-5 pt-4 pb-4 border-b">
//             <p className="text-xs font-medium text-muted-foreground mb-3">Seat Details</p>
//             <div className="grid grid-cols-2 gap-2">
//               {[
//                 { label: "SVG Element ID", value: svgId },
//                 { label: "Floor ID",       value: layout.floor_id },
//               ].map(({ label, value }) => (
//                 <div key={label} className="flex flex-col gap-1">
//                   <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
//                   <span className="text-xs font-medium text-foreground font-mono bg-muted px-2.5 py-1.5 rounded-md border">{value}</span>
//                 </div>
//               ))}
//             </div>
//           </div>

//           <div className="px-5 py-4">
//             <div className="flex items-center justify-between mb-3">
//               <p className="text-xs font-medium text-muted-foreground">Amenities</p>
//               {selected.size > 0 && (
//                 <span className="text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
//                   {selected.size} selected
//                 </span>
//               )}
//             </div>

//             {loadingPrefs ? (
//               <div className="flex items-center justify-center py-8">
//                 <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
//               </div>
//             ) : allPrefs.length === 0 ? (
//               <p className="text-xs text-muted-foreground text-center py-6">No amenities available.</p>
//             ) : (
//               <div className="grid grid-cols-2 gap-1.5">
//                 {allPrefs.map((p) => {
//                   const isOn = selected.has(p.preference_id);
//                   return (
//                     <button
//                       key={p.preference_id}
//                       onClick={() => toggle(p.preference_id)}
//                       className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg border text-left transition-colors ${
//                         isOn
//                           ? "border-primary/40 bg-primary/5 text-primary"
//                           : "border-border bg-background hover:bg-muted/50 text-foreground"
//                       }`}
//                     >
//                       <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
//                         isOn ? "bg-primary border-primary" : "border-input"
//                       }`}>
//                         {isOn && (
//                           <svg viewBox="0 0 8 7" className="w-2.5 h-2.5">
//                             <path d="M1 3.5l2 2L7 1" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
//                           </svg>
//                         )}
//                       </div>
//                       <span className="text-xs font-medium flex-1 truncate">{p.preference_name}</span>
//                     </button>
//                   );
//                 })}
//               </div>
//             )}
//           </div>
//         </div>

//         {!loadingPrefs && (
//           <div className="px-5 py-3 border-t flex items-center justify-between gap-3 bg-background">
//             <div className="text-xs">
//               {saveError && <span className="text-destructive">Save failed. Try again.</span>}
//               {saved && !saveError && <span className="text-emerald-600">Saved successfully.</span>}
//             </div>
//             <div className="flex items-center gap-2">
//               <button
//                 onClick={onClose}
//                 className="px-4 py-1.5 text-xs font-medium border border-input bg-background text-foreground rounded-md hover:bg-muted transition-colors"
//               >
//                 Cancel
//               </button>
//               <button
//                 onClick={handleSave}
//                 disabled={saving || selected.size === 0}
//                 className="px-4 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
//               >
//                 {saving ? "Saving…" : "Save"}
//               </button>
//             </div>
//           </div>
//         )}
//       </DialogContent>
//     </Dialog>
//   );
// };

// // ─── Legend ───────────────────────────────────────────────────────────────────

// const LEGEND_ITEMS = [
//   { label: "Available",    color: "#22C55E" },
//   { label: "Bookable",     color: "#3B82F6" },
//   { label: "Non-bookable", color: "#EF4444" },
//   { label: "Unconfigured", color: "#D1D5DB" },
// ] as const;

// function PreviewLegend() {
//   return (
//     <div className="flex items-center gap-4">
//       {LEGEND_ITEMS.map(({ label, color }) => (
//         <span key={label} className="flex items-center gap-1.5 text-xs text-gray-500">
//           <span
//             className="w-2.5 h-2.5 rounded-full flex-shrink-0"
//             style={{ backgroundColor: color }}
//           />
//           {label}
//         </span>
//       ))}
//     </div>
//   );
// }

// // ─── Main Component ───────────────────────────────────────────────────────────

// const SVG_W = 2466;
// const SVG_H = 2039;

// export default function LayoutPreview({ layout, fillHeight = false }: LayoutPreviewProps) {
//   const wrapperRef   = useRef<HTMLDivElement>(null);
//   const transformRef = useRef<HTMLDivElement>(null);

//   const scaleRef     = useRef(1);
//   const translateRef = useRef({ x: 0, y: 0 });
//   const isPanning    = useRef(false);
//   const panStart     = useRef({ x: 0, y: 0 });
//   const mouseDownPos = useRef({ x: 0, y: 0 });
//   const didDrag      = useRef(false);

//   const [rawSvg,      setRawSvg]      = useState<string | null>(null);
//   const [svgError,    setSvgError]    = useState(false);
//   const [zoomDisplay, setZoomDisplay] = useState(100);
//   const [mapReady,    setMapReady]    = useState(false);
//   const [loading,     setLoading]     = useState(false);

//   const seatIdsRef = useRef<Set<string>>(new Set());

//   const [dialogOpen,    setDialogOpen]    = useState(false);
//   const [clickedSeatId, setClickedSeatId] = useState<string | null>(null);

//   useEffect(() => {
//     const rawUrl = layout?.layout_file_url;
//     if (!rawUrl) {
//       setRawSvg(null); setSvgError(false); setMapReady(false); return;
//     }
//     const url = resolveUrl(rawUrl);
//     setLoading(true); setRawSvg(null); setSvgError(false); setMapReady(false);
//     fetch(url)
//       .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.text(); })
//       .then((text) => {
//         const fluid = text
//           .replace(/\bwidth="[^"]*"/, 'width="100%"')
//           .replace(/\bheight="[^"]*"/, 'height="100%"');
//         const ids = extractSeatIds(fluid);
//         seatIdsRef.current = new Set(ids);
//         setRawSvg(addPointerCursors(fluid, ids));
//       })
//       .catch(() => setSvgError(true))
//       .finally(() => setLoading(false));
//   }, [layout?.layout_file_url]);

//   const applyTransform = useCallback(() => {
//     const el = transformRef.current;
//     if (!el) return;
//     el.style.transform = `translate(${translateRef.current.x}px,${translateRef.current.y}px) scale(${scaleRef.current})`;
//   }, []);

//   const fitView = useCallback(() => {
//     const wrapper = wrapperRef.current;
//     if (!wrapper) return;
//     const { width: wW, height: wH } = wrapper.getBoundingClientRect();
//     if (wW === 0 || wH === 0) return;
//     const scale = Math.min(wW / SVG_W, wH / SVG_H);
//     scaleRef.current = scale;
//     translateRef.current = { x: (wW - SVG_W * scale) / 2, y: (wH - SVG_H * scale) / 2 };
//     applyTransform();
//     setZoomDisplay(Math.round(scale * 100));
//   }, [applyTransform]);

//   useEffect(() => {
//     const wrapper = wrapperRef.current;
//     if (!wrapper || !rawSvg) return;
//     const observer = new ResizeObserver(() => fitView());
//     observer.observe(wrapper);
//     return () => observer.disconnect();
//   }, [rawSvg, fitView]);

//   useEffect(() => {
//     if (!rawSvg || loading) { setMapReady(false); return; }
//     const id = requestAnimationFrame(() => { fitView(); setMapReady(true); });
//     return () => cancelAnimationFrame(id);
//   }, [rawSvg, loading, fitView]);

//   const zoomStep = useCallback((factor: number) => {
//     const wrapper = wrapperRef.current;
//     if (!wrapper) return;
//     const { width: wW, height: wH } = wrapper.getBoundingClientRect();
//     const oldScale = scaleRef.current;
//     const newScale = Math.min(Math.max(oldScale * factor, 0.05), 4);
//     const cx = wW / 2, cy = wH / 2;
//     translateRef.current = {
//       x: cx - (cx - translateRef.current.x) * (newScale / oldScale),
//       y: cy - (cy - translateRef.current.y) * (newScale / oldScale),
//     };
//     scaleRef.current = newScale;
//     applyTransform();
//     setZoomDisplay(Math.round(newScale * 100));
//   }, [applyTransform]);

//   const zoomIn  = useCallback(() => zoomStep(1.25),     [zoomStep]);
//   const zoomOut = useCallback(() => zoomStep(1 / 1.25), [zoomStep]);

//   useEffect(() => {
//     const el = wrapperRef.current;
//     if (!el) return;
//     const handler = (e: WheelEvent) => {
//       e.preventDefault();
//       const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
//       const oldScale = scaleRef.current;
//       const newScale = Math.min(Math.max(oldScale * factor, 0.05), 4);
//       const rect = el.getBoundingClientRect();
//       translateRef.current = {
//         x: e.clientX - rect.left - (e.clientX - rect.left - translateRef.current.x) * (newScale / oldScale),
//         y: e.clientY - rect.top  - (e.clientY - rect.top  - translateRef.current.y) * (newScale / oldScale),
//       };
//       scaleRef.current = newScale;
//       applyTransform();
//       setZoomDisplay(Math.round(newScale * 100));
//     };
//     el.addEventListener("wheel", handler, { passive: false });
//     return () => el.removeEventListener("wheel", handler);
//   }, [applyTransform]);

//   const onMouseDown = (e: React.MouseEvent) => {
//     isPanning.current = true; didDrag.current = false;
//     mouseDownPos.current = { x: e.clientX, y: e.clientY };
//     panStart.current = { ...translateRef.current };
//     (e.currentTarget as HTMLElement).style.cursor = "grabbing";
//   };

//   const onMouseMove = (e: React.MouseEvent) => {
//     if (!isPanning.current) return;
//     const dx = e.clientX - mouseDownPos.current.x;
//     const dy = e.clientY - mouseDownPos.current.y;
//     if (!didDrag.current && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) didDrag.current = true;
//     if (didDrag.current) {
//       translateRef.current = { x: panStart.current.x + dx, y: panStart.current.y + dy };
//       applyTransform();
//     }
//   };

//   const onMouseUp = (e: React.MouseEvent) => {
//     isPanning.current = false;
//     (e.currentTarget as HTMLElement).style.cursor = "grab";
//   };

//   const onMouseLeave = () => {
//     isPanning.current = false;
//     if (wrapperRef.current) wrapperRef.current.style.cursor = "grab";
//   };

//   const onMapClick = (e: React.MouseEvent) => {
//     if (didDrag.current) { didDrag.current = false; return; }
//     const svgId = getSeatIdFromClick(e.target, seatIdsRef.current);
//     if (!svgId) return;
//     setClickedSeatId(svgId);
//     setDialogOpen(true);
//   };

//   const displaySvg = rawSvg && clickedSeatId && dialogOpen
//     ? highlightSeat(rawSvg, clickedSeatId)
//     : rawSvg;

//   const showSpinner = loading || (!rawSvg && !svgError && !!layout?.layout_file_url);

//   if (!layout) {
//     return (
//       <div className="flex flex-col gap-2">
//         <div className="flex items-center justify-between px-1">
//           <p className="text-sm font-medium text-gray-700">Layout Preview</p>
//         </div>
//         <div className="flex items-center justify-center h-[460px] bg-gray-50 rounded-xl border border-dashed border-gray-200">
//           <div className="text-center text-gray-400">
//             <Layers className="mx-auto mb-2 opacity-30" size={32} />
//             <p className="text-sm">Select a layout to preview</p>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <>
//       {/*
//         Outer wrapper:
//         - When fillHeight=true  → flex column filling 100% of parent height
//         - When fillHeight=false → auto height (original behaviour)
//       */}
//       <div className={`flex flex-col gap-2 ${fillHeight ? "h-full" : ""}`}>

//         {/* ── Header row ─────────────────────────────────────────────────── */}
//         <div className="flex items-center gap-4 flex-wrap flex-shrink-0">
//           <p className="text-sm font-semibold text-gray-700 mr-auto">Layout Preview</p>
//           <PreviewLegend />
//           {mapReady && (
//             <div className="flex items-center gap-1.5">
//               <button
//                 onClick={(e) => { e.stopPropagation(); zoomOut(); }}
//                 className="w-7 h-7 rounded-md border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50 text-gray-600 transition-colors"
//                 title="Zoom out"
//               >
//                 <ZoomOut size={13} />
//               </button>
//               <span className="text-xs font-semibold text-gray-500 tabular-nums w-10 text-center select-none">
//                 {zoomDisplay}%
//               </span>
//               <button
//                 onClick={(e) => { e.stopPropagation(); zoomIn(); }}
//                 className="w-7 h-7 rounded-md border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50 text-gray-600 transition-colors"
//                 title="Zoom in"
//               >
//                 <ZoomIn size={13} />
//               </button>
//             </div>
//           )}
//         </div>

//         {/* ── Canvas ─────────────────────────────────────────────────────── */}
//         {/*
//           fillHeight=true  → flex-1 + min-h-0 so canvas stretches to fill
//                              all remaining height inside the outer flex column
//           fillHeight=false → fixed 460px (original behaviour, other pages untouched)
//         */}
//         <div
//           className={`relative bg-[#F7F8FC] border border-[#EBEBF5] rounded-xl overflow-hidden ${
//             fillHeight ? "flex-1 min-h-0" : ""
//           }`}
//           style={fillHeight ? { width: "100%" } : { width: "100%", height: 460 }}
//         >
//           {mapReady && (
//             <div className="absolute top-3 right-3 z-20 flex flex-col gap-1.5">
//               <button
//                 onClick={(e) => { e.stopPropagation(); fitView(); }}
//                 title="Fit to view"
//                 className="w-8 h-8 rounded-lg bg-white border border-[#EBEBF5] shadow-sm flex items-center justify-center hover:bg-gray-50 text-gray-600 transition-colors"
//               >
//                 <Maximize2 size={14} />
//               </button>
//             </div>
//           )}

//           <div
//             ref={wrapperRef}
//             className="w-full h-full overflow-hidden select-none"
//             style={{ cursor: "grab" }}
//             onMouseDown={onMouseDown}
//             onMouseMove={onMouseMove}
//             onMouseUp={onMouseUp}
//             onMouseLeave={onMouseLeave}
//             onClick={onMapClick}
//           >
//             {showSpinner && (
//               <div className="absolute inset-0 flex items-center justify-center bg-[#F7F8FC] z-10">
//                 <div className="flex flex-col items-center gap-3">
//                   <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
//                   <p className="text-[12px] text-gray-400">Loading floor plan…</p>
//                 </div>
//               </div>
//             )}

//             {svgError && (
//               <div className="absolute inset-0 flex items-center justify-center">
//                 <div className="text-center">
//                   <p className="text-[13px] text-gray-500 mb-1">Could not load floor plan</p>
//                   <p className="text-[11px] text-gray-400 font-mono break-all px-6">
//                     {layout.layout_file_url}
//                   </p>
//                 </div>
//               </div>
//             )}

//             {displaySvg && (
//               <div
//                 ref={transformRef}
//                 style={{
//                   transformOrigin: "top left",
//                   width:      `${SVG_W}px`,
//                   height:     `${SVG_H}px`,
//                   willChange: "transform",
//                   visibility: mapReady ? "visible" : "hidden",
//                 }}
//                 dangerouslySetInnerHTML={{ __html: displaySvg }}
//               />
//             )}
//           </div>
//         </div>

//         {/* ── Bottom bar ─────────────────────────────────────────────────── */}
//         {mapReady && (
//           <div className="flex items-center justify-between px-0.5 flex-shrink-0">
//             <button
//               onClick={fitView}
//               className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors border border-gray-200 bg-white px-3 py-1.5 rounded-lg hover:bg-gray-50"
//             >
//               <Maximize2 size={12} />
//               Fit to Screen
//             </button>
//             <p className="text-[10px] text-gray-400 select-none">
//               Scroll to zoom · Drag to pan · Click a seat to configure
//             </p>
//           </div>
//         )}

//         {/* ── Draft banner ───────────────────────────────────────────────── */}
//         {layout && !layout.is_published && layout.status !== "ARCHIVED" && (
//           <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 flex-shrink-0">
//             <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none"
//               stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
//               <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
//             </svg>
//             This is a draft layout. Publish to make it available for employee bookings.
//           </div>
//         )}
//       </div>

//       <SeatDialog
//         open={dialogOpen}
//         onClose={() => { setDialogOpen(false); setClickedSeatId(null); }}
//         svgId={clickedSeatId}
//         layout={layout}
//       />
//     </>
//   );
// }

"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Maximize2, ZoomIn, ZoomOut, Layers } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Layout } from "../types/layout.types";
import {
  fetchAllPreferences, saveSeatPreferences, Preference,
} from "../services/layoutService";

interface LayoutPreviewProps {
  layout: Layout | null;
  fillHeight?: boolean;
  canvasHeight?: number; // explicit px height when fillHeight=false
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

function addPointerCursors(svgText: string, ids: string[]): string {
  let result = svgText;
  ids.forEach((id) => {
    result = result.replace(`<g id="${id}">`, `<g id="${id}" style="cursor:pointer">`);
  });
  return result;
}

// ─── Seat Dialog ──────────────────────────────────────────────────────────────

const SeatDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  svgId: string | null;
  layout: Layout | null;
}> = ({ open, onClose, svgId, layout }) => {
  const [allPrefs, setAllPrefs]         = useState<Preference[]>([]);
  const [selected, setSelected]         = useState<Set<string>>(new Set());
  const [loadingPrefs, setLoadingPrefs] = useState(false);
  const [saving, setSaving]             = useState(false);
  const [saveError, setSaveError]       = useState(false);
  const [saved, setSaved]               = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelected(new Set());
    setSaved(false);
    setSaveError(false);
    setLoadingPrefs(true);
    fetchAllPreferences()
      .then(setAllPrefs)
      .catch(console.error)
      .finally(() => setLoadingPrefs(false));
  }, [open]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    setSaved(false);
  };

  const handleSave = async () => {
    if (!svgId || !layout) return;
    setSaving(true);
    setSaveError(false);
    try {
      await saveSeatPreferences(svgId, layout.layout_id, [...selected]);
      setSaved(true);
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  };

  if (!svgId || !layout) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm rounded-xl p-0 overflow-hidden gap-0 [&>button:last-child]:hidden">
        <DialogHeader className="px-5 pt-5 pb-4 border-b">
          <p className="text-xs font-medium text-muted-foreground mb-0.5">Seat Configuration</p>
          <DialogTitle className="text-base font-semibold text-foreground">{svgId}</DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto" style={{ maxHeight: 480 }}>
          <div className="px-5 pt-4 pb-4 border-b">
            <p className="text-xs font-medium text-muted-foreground mb-3">Seat Details</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "SVG Element ID", value: svgId },
                { label: "Floor ID",       value: layout.floor_id },
              ].map(({ label, value }) => (
                <div key={label} className="flex flex-col gap-1">
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
                  <span className="text-xs font-medium text-foreground font-mono bg-muted px-2.5 py-1.5 rounded-md border">{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="px-5 py-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-muted-foreground">Amenities</p>
              {selected.size > 0 && (
                <span className="text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  {selected.size} selected
                </span>
              )}
            </div>

            {loadingPrefs ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
              </div>
            ) : allPrefs.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">No amenities available.</p>
            ) : (
              <div className="grid grid-cols-2 gap-1.5">
                {allPrefs.map((p) => {
                  const isOn = selected.has(p.preference_id);
                  return (
                    <button
                      key={p.preference_id}
                      onClick={() => toggle(p.preference_id)}
                      className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg border text-left transition-colors ${
                        isOn
                          ? "border-primary/40 bg-primary/5 text-primary"
                          : "border-border bg-background hover:bg-muted/50 text-foreground"
                      }`}
                    >
                      <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                        isOn ? "bg-primary border-primary" : "border-input"
                      }`}>
                        {isOn && (
                          <svg viewBox="0 0 8 7" className="w-2.5 h-2.5">
                            <path d="M1 3.5l2 2L7 1" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                      <span className="text-xs font-medium flex-1 truncate">{p.preference_name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {!loadingPrefs && (
          <div className="px-5 py-3 border-t flex items-center justify-between gap-3 bg-background">
            <div className="text-xs">
              {saveError && <span className="text-destructive">Save failed. Try again.</span>}
              {saved && !saveError && <span className="text-emerald-600">Saved successfully.</span>}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-1.5 text-xs font-medium border border-input bg-background text-foreground rounded-md hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || selected.size === 0}
                className="px-4 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

// ─── Legend ───────────────────────────────────────────────────────────────────

const LEGEND_ITEMS = [
  { label: "Available",    color: "#22C55E" },
  { label: "Bookable",     color: "#3B82F6" },
  { label: "Non-bookable", color: "#EF4444" },
  { label: "Unconfigured", color: "#D1D5DB" },
] as const;

function PreviewLegend() {
  return (
    <div className="flex items-center gap-4">
      {LEGEND_ITEMS.map(({ label, color }) => (
        <span key={label} className="flex items-center gap-1.5 text-xs text-gray-500">
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: color }}
          />
          {label}
        </span>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const SVG_W = 2466;
const SVG_H = 2039;

// Default canvas heights per usage context
const DEFAULT_CANVAS_HEIGHT       = 460; // ManageLayoutPage (original)
const SEATS_PAGE_CANVAS_HEIGHT    = 420; // ManageSeatsPage  (slightly smaller)

export default function LayoutPreview({
  layout,
  fillHeight = false,
  canvasHeight,
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

  const [dialogOpen,    setDialogOpen]    = useState(false);
  const [clickedSeatId, setClickedSeatId] = useState<string | null>(null);

  // Resolved canvas height: explicit prop > default
  const resolvedHeight = canvasHeight ?? DEFAULT_CANVAS_HEIGHT;

  useEffect(() => {
    const rawUrl = layout?.layout_file_url;
    if (!rawUrl) {
      setRawSvg(null); setSvgError(false); setMapReady(false); return;
    }
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
        setRawSvg(addPointerCursors(fluid, ids));
      })
      .catch(() => setSvgError(true))
      .finally(() => setLoading(false));
  }, [layout?.layout_file_url]);

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

  const onMapClick = (e: React.MouseEvent) => {
    if (didDrag.current) { didDrag.current = false; return; }
    const svgId = getSeatIdFromClick(e.target, seatIdsRef.current);
    if (!svgId) return;
    setClickedSeatId(svgId);
    setDialogOpen(true);
  };

  const displaySvg = rawSvg && clickedSeatId && dialogOpen
    ? highlightSeat(rawSvg, clickedSeatId)
    : rawSvg;

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

        {/* ── Header row ─────────────────────────────────────────────────── */}
        <div className="flex items-center gap-4 flex-wrap flex-shrink-0">
          <p className="text-sm font-semibold text-gray-700 mr-auto">Layout Preview</p>
          <PreviewLegend />
          {mapReady && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={(e) => { e.stopPropagation(); zoomOut(); }}
                className="w-7 h-7 rounded-md border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50 text-gray-600 transition-colors"
                title="Zoom out"
              >
                <ZoomOut size={13} />
              </button>
              <span className="text-xs font-semibold text-gray-500 tabular-nums w-10 text-center select-none">
                {zoomDisplay}%
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); zoomIn(); }}
                className="w-7 h-7 rounded-md border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50 text-gray-600 transition-colors"
                title="Zoom in"
              >
                <ZoomIn size={13} />
              </button>
            </div>
          )}
        </div>

        {/* ── Canvas ─────────────────────────────────────────────────────── */}
        <div
          className={`relative bg-[#F7F8FC] border border-[#EBEBF5] rounded-xl overflow-hidden ${
            fillHeight ? "flex-1 min-h-0" : ""
          }`}
          style={
            fillHeight
              ? { width: "100%" }
              : { width: "100%", height: resolvedHeight }
          }
        >
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

          <div
            ref={wrapperRef}
            className="w-full h-full overflow-hidden select-none"
            style={{ cursor: "grab" }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseLeave}
            onClick={onMapClick}
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
                  <p className="text-[11px] text-gray-400 font-mono break-all px-6">
                    {layout.layout_file_url}
                  </p>
                </div>
              </div>
            )}

            {displaySvg && (
              <div
                ref={transformRef}
                style={{
                  transformOrigin: "top left",
                  width:      `${SVG_W}px`,
                  height:     `${SVG_H}px`,
                  willChange: "transform",
                  visibility: mapReady ? "visible" : "hidden",
                }}
                dangerouslySetInnerHTML={{ __html: displaySvg }}
              />
            )}
          </div>
        </div>

        {/* ── Bottom bar ─────────────────────────────────────────────────── */}
        {mapReady && (
          <div className="flex items-center justify-between px-0.5 flex-shrink-0">
            <button
              onClick={fitView}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors border border-gray-200 bg-white px-3 py-1.5 rounded-lg hover:bg-gray-50"
            >
              <Maximize2 size={12} />
              Fit to Screen
            </button>
            <p className="text-[10px] text-gray-400 select-none">
              Scroll to zoom · Drag to pan · Click a seat to configure
            </p>
          </div>
        )}

        {/* ── Draft banner ───────────────────────────────────────────────── */}
        {layout && !layout.is_published && layout.status !== "ARCHIVED" && (
          <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 flex-shrink-0">
            <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            This is a draft layout. Publish to make it available for employee bookings.
          </div>
        )}
      </div>

      <SeatDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setClickedSeatId(null); }}
        svgId={clickedSeatId}
        layout={layout}
      />
    </>
  );
}