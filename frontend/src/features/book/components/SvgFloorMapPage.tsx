import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Maximize2, ZoomIn, ZoomOut } from "lucide-react";
import { Seat, Preference } from "../types/Bookingform.types";
import {
  SVG_W,
  SVG_H,
  ZOOM_MAX,
  ZOOM_BUTTON_FACTOR,
  ZOOM_WHEEL_FACTOR,
  TOOLTIP_WIDTH,
  TOOLTIP_PADDING,
  SEAT_PALETTES,
  SEAT_STATUS_CONFIG,
  PREFERENCE_MATCH_CONFIG,
} from "../utils/constants";
import { getAmenityColor } from "@/features/amenities/utils/amenityColors";
import { extractSeatIds } from "@/lib/svg/extractSeatIds";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface SeatWithSvgId extends Seat {
  availabilitySummary?: {
    status: string;
    available_dates: string[];
    unavailable_dates: string[];
    booked_dates: string[];
    blocked_dates: string[];
    daily_statuses: { booking_date: string; status: string }[];
    total_requested_days: number;
    total_available_days: number;
    availability_percentage: number;
  } | null;
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

// Flat status colors used when a seat's artwork doesn't match the hardcoded
// chair-icon template (see the fallback in recolorSeat below). Several
// SEAT_PALETTES "body" tones (e.g. partial_match's #fefce8, booked/
// unavailable/unloaded's #f3f4f6) are pale shading tones meant for a
// multi-part chair icon, not a flat single fill — used directly, they read as
// blank/white on the floor plan. This map picks a solid, clearly-visible tone
// per status instead.
const FALLBACK_FILL: Record<string, string> = {
  available: "#22C55E",
  yours: "#22C55E",
  selected: "#6366f1",
  best_match: "#EAB308",
  partial_match: "#FDE047",
  booked: "#9CA3AF",
  unavailable: "#9CA3AF",
  unloaded: "#9CA3AF",
};

// Cabin/conference/meeting/training room seats are grouped under one svg id
// containing a "CBN"/"CFR"/"MR"/"TR" segment (e.g. "HYD-PRV-F11-CBN-04",
// "HYD-PRV-F11-CFR-02", "HYD-PRV-F11-MR-01", "HYD-PRV-F11-TR-01"), not a
// dedicated field. When available, best/partial match, or selected, they
// keep the floor plan's original artwork colors instead of being flooded
// with a solid status fill (while staying clickable, and while selected
// still showing the pulse/glow highlight); when booked/unavailable they
// still recolor like any other seat.
const ROOM_SVG_ID_PATTERN = /(^|[-_])(cbn|cfr|mr|tr)([-_]|$)/i;

function isRoomSvgId(svgId: string): boolean {
  return ROOM_SVG_ID_PATTERN.test(svgId);
}

// Escapes regex metacharacters so seat/room ids containing them (e.g. "F9.1")
// can be safely interpolated into a RegExp instead of being misinterpreted as
// pattern syntax.
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Locates a seat/room's opening <g> tag by its `id` attribute regardless of
// what other attributes the tag carries or what order they're in. Different
// floor-plan exports (e.g. rooms whose group already carries a `transform`
// from the design tool, unlike simple chair icons) don't reliably produce the
// exact literal `<g id="X">` a naive indexOf search assumes — when that
// assumption fails for a given id, recolorSeat silently no-ops for it (no
// fill, no border, no selection glow), which is what made rooms miss their
// selection border on some uploaded layouts but not others.
function findGroupOpenTag(svg: string, svgId: string): { start: number; openTag: string } | null {
  const regex = new RegExp(`<g\\b[^>]*\\bid=["']${escapeRegExp(svgId)}["'][^>]*>`);
  const match = svg.match(regex);
  if (!match || match.index === undefined) return null;
  return { start: match.index, openTag: match[0] };
}

// Merges a class name and extra CSS declarations into an existing opening
// tag's `class`/`style` attributes (creating them if absent) instead of
// assuming the tag has neither yet — needed now that the tag being modified
// may be the original export's tag (which can already carry its own
// attributes), not always the bare `<g id="X">` this code used to assume.
function withAddedAttrs(openTag: string, className: string, extraStyle: string): string {
  let tag = openTag;
  if (className) {
    tag = /\sclass="/.test(tag)
      ? tag.replace(/\sclass="([^"]*)"/, (_m, existing) => ` class="${existing}${existing ? " " : ""}${className}"`)
      : tag.replace(/>$/, ` class="${className}">`);
  }
  if (extraStyle) {
    tag = /\sstyle="/.test(tag)
      ? tag.replace(/\sstyle="([^"]*)"/, (_m, existing) =>
          ` style="${existing}${existing && !existing.trim().endsWith(";") ? ";" : ""}${extraStyle}"`
        )
      : tag.replace(/>$/, ` style="${extraStyle}">`);
  }
  return tag;
}

function getPaletteKey(seat: SeatWithSvgId, isSelected: boolean): string {
  if (isSelected) return "selected";
  if (seat.status !== "available" && seat.status !== "yours") return seat.status;
  const match = seat.preferenceMatchStatus;
  if (match === "FULL_MATCH" || seat.uiState === "BEST_MATCH") return "best_match";
  if (match === "PARTIAL_MATCH") return "partial_match";
  if (seat.status === "yours") return "yours";
  return "available";
}

// Finds the closing "</g>" tag that actually matches the group opened at
// `start`, by tracking <g ...> opens vs </g> closes (depth-aware) instead of
// naively taking the first "</g>" found after `start`. Room groups (CBN/CFR/
// MR) contain nested <g> sub-groups — a naive indexOf("</g>", start) would
// close the first inner sub-group instead of the room's own outer group,
// causing only a small/arbitrary fragment of the room to be affected by any
// recoloring below (which is what produced inconsistent results between
// different rooms depending on how their first nested group happened to be
// sized/positioned).
function findMatchingGroupEnd(svg: string, start: number): number {
  const tagRegex = /<g\b[^>]*>|<\/g>/g;
  tagRegex.lastIndex = start;
  let depth = 0;
  let match: RegExpExecArray | null;
  while ((match = tagRegex.exec(svg)) !== null) {
    if (match[0] === "</g>") {
      depth--;
      if (depth === 0) return match.index;
    } else {
      depth++;
    }
  }
  return -1;
}

function recolorSeat(svg: string, svgId: string, paletteKey: string): string {
  const p = SEAT_PALETTES[paletteKey] ?? SEAT_PALETTES.unloaded;
  const found = findGroupOpenTag(svg, svgId);
  if (!found) return svg;
  const { start, openTag } = found;
  const end = findMatchingGroupEnd(svg, start);
  if (end === -1) return svg;
  const before = svg.slice(0, start);
  let block = svg.slice(start, end + 4);
  const after = svg.slice(end + 4);

  // Rooms keep their original artwork (no flood-fill) for available, best
  // match, partial match, AND selected — selection is communicated purely
  // via the border/glow pulse added below, not a solid fill.
  const isAvailableFamily =
    paletteKey === "available" ||
    paletteKey === "best_match" ||
    paletteKey === "partial_match" ||
    paletteKey === "selected";
  const isRoom = isRoomSvgId(svgId);
  const skipRoomColor = isRoom && isAvailableFamily;
  // Booked/unavailable rooms: never flood-fill every path to one flat color
  // like a regular seat — a room is full illustrated artwork (table, chairs,
  // plants…), not a single-shape chair icon, so replacing every fill turns
  // it into one opaque grey blob with all detail gone. Instead leave the
  // artwork's own colors alone and desaturate + dim the whole group via a
  // CSS filter/opacity, so it still reads as "this room" — just a
  // transparent grey overlay, not a solid block.
  const isGreyedRoom = isRoom && !isAvailableFamily;

  if (!skipRoomColor && !isGreyedRoom) {
    const beforeRecolor = block;
    block = block.replace(/fill="#C8C8C8" stroke="#888888"/g, `fill="${p.body}" stroke="${p.bodyStroke}"`);
    block = block.replace(/fill="#B0B0B0" stroke="#888888"/g, `fill="${p.armrest}" stroke="${p.bodyStroke}"`);
    block = block.replace(/fill="#616161" stroke="#424242"/g, `fill="${p.back}" stroke="${p.backStroke}"`);
    block = block.replace(/stroke="#707070"/g, `stroke="${p.curve}"`);
    block = block.replace(/stroke="#A0A0A0"/g, `stroke="${p.arc}"`);

    // Fallback: this chair-icon recolor only targets one specific hardcoded
    // palette (#C8C8C8/#B0B0B0/#616161). Real uploaded floor plans (e.g. this
    // site's actual SVG) draw every seat part with a uniform fill (#2F2F2F)
    // differentiated only by stroke, so none of the replacements above match
    // anything and the seat silently stays in its native color regardless of
    // status. When that happens, recolor every fill in the group to a flat
    // status color directly so availability is never invisible.
    if (block === beforeRecolor) {
      const fallbackFill = FALLBACK_FILL[paletteKey] ?? p.body;
      block = block.replace(/fill="(?!none")[^"]*"/g, `fill="${fallbackFill}"`);

      // Seats sit flush against their neighbors with zero gap. An outer glow
      // (CSS filter/drop-shadow) gets painted over on the touching side by
      // whichever neighbor is drawn later in the SVG's document order, so it
      // only ever shows on edges facing open space. A `stroke` painted
      // directly on each shape is part of the same paint step as its fill,
      // so it can't be erased by a later sibling — giving a complete border
      // on every side, including shared edges. Applied to every status (not
      // just best/partial match) for a consistent look across the map.
      const borderColor = "#000000";
      const borderWidth = "32";
      // `stroke` and `stroke-width` are added independently: many real
      // exports set stroke="none" with no stroke-width at all, so
      // "already has a stroke attribute" is not a reliable signal that a
      // usable width exists too — checking each attribute separately
      // guarantees every shape ends up with both, instead of some shapes
      // getting recolored to black but keeping the default 1-unit width
      // (invisible against a canvas tens of thousands of units wide).
      block = block.replace(/<(path|rect|polygon|circle|ellipse)\b(?![^>]*\sstroke=)/g, `<$1 stroke="${borderColor}"`);
      block = block.replace(/<(path|rect|polygon|circle|ellipse)\b(?![^>]*\sstroke-width=)/g, `<$1 stroke-width="${borderWidth}"`);
      block = block.replace(/stroke="[^"]*"/g, `stroke="${borderColor}"`);
      block = block.replace(/stroke-width="[^"]*"/g, `stroke-width="${borderWidth}"`);
    }
  }

  const isClickable = ["available", "best_match", "partial_match", "yours", "selected"].includes(paletteKey);
  const isSelected = paletteKey === "selected";
  // A regular seat's own selection glow stays a CSS class/filter directly on
  // its (small, simple, unrotated, unmasked) group — that's cheap, was never
  // the thing that misbehaved, and a chair icon is small/simple enough that
  // the "filter buried inside a huge document" quirk doesn't apply the way
  // it did for rooms. A room's selection border is rendered separately, as a
  // plain React-owned <rect> in its own small sibling <svg> overlay (see
  // selectionHighlightBox / the JSX render below), for two reasons specific
  // to rooms: (1) some rooms' groups carry a `transform="rotate(...)"` from
  // the original export, which swaps width/height and moves the origin, so
  // a border sized from this raw pre-transform markup lands wrong for
  // exactly those rooms; only getBBox()+getCTM() on the live rendered
  // element gets that right. (2) a room's `filter: drop-shadow(...)` was
  // found to intermittently stop rendering on ordinary mouse movement
  // (likely a paint/compositing quirk tied to a room group's complexity —
  // nested masks/clip-paths, large size), which a completely separate
  // sibling SVG sidesteps. A rectangular bounding-box overlay isn't used for
  // seats at all (not just left as a class) because on a small chair icon it
  // reads as an awkward floating square rather than a highlight on the
  // chair — the seat's own solid blue fill (FALLBACK_FILL.selected above)
  // already makes selection unambiguous without one.
  const pulseClass = isSelected && !isRoom ? "_sel-pulse" : "";
  const groupOpacity = isGreyedRoom ? "0.45" : p.opacity;
  const roomGreyFilter = isGreyedRoom ? "filter:grayscale(1) saturate(0.5);" : "";
  const newOpenTag = withAddedAttrs(
    openTag,
    pulseClass,
    `opacity:${groupOpacity};cursor:${isClickable ? "pointer" : "default"};${roomGreyFilter}`
  );
  block = block.replace(openTag, newOpenTag);
  return before + block + after;
}

// ─── Selection border (transform-aware overlay, rooms only) ───────────────────
//
// Rooms keep their original artwork colors when selected (no flood-fill), so
// unlike a regular seat's flat blue selected-fill there's no other signal
// that a room is selected — only this rendered overlay border. Some rooms'
// <g>/<rect> carry a `transform="rotate(...)"` from the original export (a
// 90° rotation swaps width/height and moves the origin); any border computed
// from raw markup (a CSS `outline`, or math done on the string before the
// SVG is even in the DOM) gets the wrong box for exactly those rooms while
// looking fine for unrotated ones. getBBox() + getCTM(), read from the live
// rendered element, give the correct on-screen box either way.
//
// The box is only COMPUTED here; it's rendered as a normal React <rect> in
// its own small sibling <svg> overlay (see selectionHighlightBox state and
// the JSX render), not appended imperatively into the multi-megabyte
// floor-plan SVG. An earlier version did exactly that (a `filter:
// drop-shadow(...)` on a node inside the document) and it was found to
// intermittently stop rendering on ordinary mouse movement with no error and
// no state change behind it — most likely a paint/compositing quirk tied to
// a room's complexity (nested masks/clip-paths, large size) inside such a
// large document. A separate sibling SVG sidesteps that entirely. Regular
// seats don't have this problem (small, simple, unrotated, unmasked groups)
// and keep their glow as a plain CSS class instead — see the "_sel-pulse"
// pulseClass in recolorSeat above.
const SELECTION_OVERLAY_DEBUG = true;

interface SelectionHighlightBox {
  x: number;
  y: number;
  width: number;
  height: number;
  strokeWidth: number;
  haloNear: number;
  haloFar: number;
  // The room's own actual (unpadded) box — used to mask out the highlight's
  // interior so its glow/stroke never visually washes over the room's own
  // artwork, however far the blur reaches (see the JSX render's <mask>).
  innerX: number;
  innerY: number;
  innerWidth: number;
  innerHeight: number;
}

function computeTransformedBBox(
  svgRoot: SVGSVGElement,
  el: SVGGraphicsElement
): { x: number; y: number; width: number; height: number } | null {
  let bbox: DOMRect;
  try {
    bbox = el.getBBox();
  } catch (e) {
    if (SELECTION_OVERLAY_DEBUG) console.warn("[selection-highlight] getBBox() threw:", e);
    return null;
  }

  const ctm = el.getCTM();
  if (!ctm) {
    if (SELECTION_OVERLAY_DEBUG) {
      console.warn(
        "[selection-highlight] getCTM() returned null — element is likely inside a <defs>/<clipPath>/<mask>/<symbol> " +
          "(never directly rendered) or has display:none, not that it's simply unrotated."
      );
    }
    return null;
  }

  const corners = [
    [bbox.x, bbox.y],
    [bbox.x + bbox.width, bbox.y],
    [bbox.x, bbox.y + bbox.height],
    [bbox.x + bbox.width, bbox.y + bbox.height],
  ].map(([x, y]) => {
    const pt = svgRoot.createSVGPoint();
    pt.x = x;
    pt.y = y;
    return pt.matrixTransform(ctm);
  });

  const xs = corners.map((c) => c.x);
  const ys = corners.map((c) => c.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const width = maxX - minX;
  const height = maxY - minY;
  if (!isFinite(width) || !isFinite(height) || width <= 0 || height <= 0) {
    if (SELECTION_OVERLAY_DEBUG) console.warn("[selection-highlight] computed box has zero/invalid size — bailing.");
    return null;
  }

  return { x: minX, y: minY, width, height };
}

// Resolves the given seat or room's current on-screen box (padded and with a
// canvas-scaled stroke/halo size baked in) from the live rendered SVG, or
// null if it can't currently be located/measured. Pure — the caller (a
// useLayoutEffect) is responsible for putting the result into React state so
// it renders as a normal <rect>.
function resolveSelectionHighlightBox(svgRoot: SVGSVGElement, targetSvgId: string): SelectionHighlightBox | null {
  const matches = svgRoot.querySelectorAll(`#${CSS.escape(targetSvgId)}`);
  if (SELECTION_OVERLAY_DEBUG && matches.length !== 1) {
    console.warn(
      `[selection-highlight] expected exactly 1 element with id="${targetSvgId}", found ${matches.length}` +
        (matches.length > 1 ? " — duplicate ids in this SVG, using the first match." : " — no element with this id exists in the rendered DOM.")
    );
  }
  const target = matches[0] as SVGGraphicsElement | undefined;
  if (!target) return null;

  const box = computeTransformedBBox(svgRoot, target);
  if (!box) return null;

  // A fixed stroke width in absolute units is meaningless across this file's
  // full size range — rooms run from a few thousand to tens of thousands of
  // units wide, on a canvas that's itself ~100,000 units. Scaling both the
  // stroke and the halo/padding to a percentage of the room's own box keeps
  // the border visually proportionate whether the room is small or large,
  // instead of a fixed number being too thin on a big room. This is rooms-
  // only (see the isRoomSvgId gate where this is called), so there's no
  // flush-neighbor bleed concern the way there would be sizing this for a
  // seat — rooms have open space around them, so a bold, generous border and
  // halo reads as intentional emphasis rather than spilling onto anything.
  const minDim = Math.min(box.width, box.height);
  const strokeWidth = Math.max(minDim * 0.05, 45);
  const pad = strokeWidth * 0.6;

  return {
    x: box.x - pad,
    y: box.y - pad,
    width: box.width + pad * 2,
    height: box.height + pad * 2,
    strokeWidth,
    haloNear: strokeWidth * 1.8,
    haloFar: strokeWidth * 4.5,
    innerX: box.x,
    innerY: box.y,
    innerWidth: box.width,
    innerHeight: box.height,
  };
}

// Moves the given svgId's <g> block to just before </svg> so it always
// paints last — on top of every sibling — regardless of its original
// position in the file. Needed because adjacent seats are frequently drawn
// as flush, zero-gap shapes sharing an edge; whichever one is earlier in
// source order has its selection glow (a drop-shadow filter) overdrawn along
// that shared edge by whatever neighbor comes after it in paint order,
// making the glow look like it's missing on one or more sides instead of
// fully surrounding the seat. Relocating the selected element's markup
// guarantees it's always the topmost thing drawn. Only used for regular
// seats' CSS-class glow — rooms get their border from the separate sibling
// SVG overlay, which doesn't care about z-order inside this document at all.
//
// This only repositions the element in paint order, not on screen: it's
// safe as long as no ancestor <g> between the element and the root carries
// a `transform` the element depends on for its position (a clip-path alone
// is fine, since clipping to the full canvas is a no-op for content already
// inside it).
function bringToFront(svg: string, svgId: string): string {
  // Match by the `id="..."` attribute regardless of what other attributes
  // the tag carries or what order they're in (recolorSeat has usually added
  // `class`/`style` to this opening tag by this point).
  const found = findGroupOpenTag(svg, svgId);
  if (!found) return svg;
  const { start } = found;
  const end = findMatchingGroupEnd(svg, start);
  if (end === -1) return svg;

  const block = svg.slice(start, end + 4);
  const withoutBlock = svg.slice(0, start) + svg.slice(end + 4);
  const closeSvgIdx = withoutBlock.lastIndexOf("</svg>");
  if (closeSvgIdx === -1) return svg;

  return withoutBlock.slice(0, closeSvgIdx) + block + withoutBlock.slice(closeSvgIdx);
}

// The blur radius in a CSS `drop-shadow()` here resolves in this SVG's own
// user-unit coordinate system, not literal screen pixels — the same thing
// that made the room border invisible before it was scaled to the room's own
// size (see resolveSelectionHighlightBox above). A seat icon is only ~700-
// 1500 units wide on this ~100,000-unit canvas, so the original 4-24 unit
// blur was a rounding error: technically animating, but with no visible
// spill outside the chair's own outline. These values are sized to actually
// be visible at a seat's scale instead. Unlike the room's overlay, this
// stays a `filter` applied directly to the seat's own group rather than a
// separate <rect> — `drop-shadow()` blurs around the element's actual alpha
// silhouette (the chair's real outline), not a bounding box, which is
// exactly why this reads as a glow around the chair rather than the
// "floating square" a rectangular overlay looked like on a non-rectangular
// icon. Colors match the room overlay's three-tone violet halo (#4C1D95 /
// #7C3AED / #A78BFA in the JSX render below) so seat and room selection read
// as the same highlight language, even though the shape naturally differs —
// a chair-hugging glow here vs. a bordered rectangle there.
const SELECTED_PULSE_STYLE = `<style>
@keyframes _selGlow{
  0%,100%{filter:drop-shadow(0 0 40px #4C1D95) drop-shadow(0 0 90px #7C3AED) drop-shadow(0 0 150px #A78BFA);}
  50%{filter:drop-shadow(0 0 75px #4C1D95) drop-shadow(0 0 160px #7C3AED) drop-shadow(0 0 260px #A78BFA) brightness(1.15);}
}
._sel-pulse{animation:_selGlow 1.6s ease-in-out infinite;}
</style>`;

// svgSeatIds: dynamically extracted from the fetched SVG, not hardcoded
function buildColoredSvg(
  rawSvg: string,
  svgSeatIds: string[],
  seats: SeatWithSvgId[],
  selectedSeatId: string | null
): string {
  const seatMap = new Map<string, SeatWithSvgId>();
  seats.forEach((s) => seatMap.set(s.svgId, s));
  let svg = rawSvg;
  svgSeatIds.forEach((svgId) => {
    const seat = seatMap.get(svgId);
    const key = !seat ? "unloaded" : getPaletteKey(seat, seat.id === selectedSeatId);
    svg = recolorSeat(svg, svgId, key);
  });

  // Regular seats' glow is a CSS class/filter living in this document (see
  // pulseClass in recolorSeat) — it needs its keyframes injected and needs
  // to be brought to the front of paint order. Rooms don't use this path at
  // all (their border is the separate sibling <svg> overlay), so skip both
  // for a selected room — it doesn't have the "_sel-pulse" class to animate,
  // and reordering its markup would be pointless work.
  const selectedSeat = selectedSeatId ? seats.find((s) => s.id === selectedSeatId) : null;
  if (selectedSeat && !isRoomSvgId(selectedSeat.svgId)) {
    const firstClose = svg.indexOf(">");
    if (firstClose !== -1) svg = svg.slice(0, firstClose + 1) + SELECTED_PULSE_STYLE + svg.slice(firstClose + 1);
    svg = bringToFront(svg, selectedSeat.svgId);
  }

  return svg;
}

// svgSeatIds passed in so we don't rely on a hardcoded list
function getSvgIdFromClick(target: EventTarget | null, svgSeatIds: Set<string>): string | null {
  let el = target as Element | null;
  while (el) {
    if (el.tagName?.toLowerCase() === "svg") return null;
    const id = el.getAttribute("id");
    if (id && svgSeatIds.has(id)) return id;
    el = el.parentElement;
  }
  return null;
}

// ─── Availability percentage ring ─────────────────────────────────────────────

const AvailabilityRing: React.FC<{ pct: number; available: number; total: number }> = ({
  pct, available, total,
}) => {
  const r = 16;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const color = pct === 100 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <svg width={40} height={40} style={{ flexShrink: 0 }}>
        <circle cx={20} cy={20} r={r} fill="none" stroke="#f3f4f6" strokeWidth={4} />
        <circle
          cx={20} cy={20} r={r} fill="none"
          stroke={color} strokeWidth={4}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 20 20)"
          style={{ transition: "stroke-dasharray 0.4s ease" }}
        />
        <text x={20} y={24} textAnchor="middle" fontSize={9} fontWeight={700} fill={color}>
          {Math.round(pct)}%
        </text>
      </svg>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#111827" }}>
          {available}/{total} days
        </div>
        <div style={{ fontSize: 10, color: "#6b7280" }}>available</div>
      </div>
    </div>
  );
};

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
  categoryByName: Map<string, string | null | undefined>;
}> = ({ tooltip, containerRect, categoryByName }) => {
  // Measure the tooltip's actual rendered height (content varies per seat —
  // availability ring, daily strip, amenities, etc. — so a fixed constant
  // like TOOLTIP_WIDTH can't be used the same way for the vertical flip).
  // useLayoutEffect resolves this before paint, so there's no visible jump.
  const boxRef = useRef<HTMLDivElement>(null);
  const [measuredHeight, setMeasuredHeight] = useState(0);

  // No dependency array on purpose: re-measures on every render since the
  // tooltip's rendered content (and thus height) changes per seat, and the
  // `height !== measuredHeight` guard above already prevents render loops.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    const height = boxRef.current?.offsetHeight ?? 0;
    if (height !== measuredHeight) setMeasuredHeight(height);
  });

  if (!tooltip.visible || !tooltip.seat || !containerRect) return null;

  const seat = tooltip.seat;
  const avail = seat.availabilitySummary;

  const sc = SEAT_STATUS_CONFIG[seat.status] ?? SEAT_STATUS_CONFIG.unavailable;
  const mc = seat.preferenceMatchStatus ? PREFERENCE_MATCH_CONFIG[seat.preferenceMatchStatus] : null;
  const pct = avail?.availability_percentage ?? null;

  let left = tooltip.x + 14;
  let top = tooltip.y - 10;

  if (left + TOOLTIP_WIDTH > containerRect.width - TOOLTIP_PADDING) left = tooltip.x - TOOLTIP_WIDTH - 14;
  if (top < TOOLTIP_PADDING) top = TOOLTIP_PADDING;

  // Flip above the cursor when it would overflow the container's bottom edge.
  let flippedVertically = false;
  if (measuredHeight > 0 && top + measuredHeight > containerRect.height - TOOLTIP_PADDING) {
    flippedVertically = true;
    const flippedTop = tooltip.y - measuredHeight - 10;
    top = flippedTop >= TOOLTIP_PADDING
      ? flippedTop
      : Math.max(TOOLTIP_PADDING, containerRect.height - measuredHeight - TOOLTIP_PADDING);
  }

  const arrowOnRight = left < tooltip.x;

  return (
    <div ref={boxRef} style={{ position: "absolute", left, top, width: TOOLTIP_WIDTH, pointerEvents: "none", zIndex: 50 }}>
      <div style={{
        position: "absolute",
        left: arrowOnRight ? "auto" : -6,
        right: arrowOnRight ? -6 : "auto",
        top: flippedVertically ? "auto" : 20,
        bottom: flippedVertically ? 20 : "auto",
        width: 12, height: 12,
        background: "white",
        border: "1px solid #e5e7eb",
        borderRight: arrowOnRight ? "1px solid #e5e7eb" : "none",
        borderBottom: arrowOnRight ? "1px solid #e5e7eb" : "none",
        borderLeft: arrowOnRight ? "none" : "1px solid #e5e7eb",
        borderTop: arrowOnRight ? "none" : "1px solid #e5e7eb",
        transform: arrowOnRight ? "rotate(-45deg)" : "rotate(135deg)",
      }} />

      <div style={{
        background: "white",
        border: "1px solid #e5e7eb",
        borderRadius: 14,
        padding: "13px 14px",
        boxShadow: "0 12px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)",
        fontFamily: "'DM Sans', 'Outfit', system-ui, sans-serif",
        display: "flex", flexDirection: "column", gap: 10,
      }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#111827", letterSpacing: "-0.02em" }}>
              {seat.label}
            </div>
            {seat.status === "yours" && (
              <div style={{ fontSize: 10, color: "#6b7280", marginTop: 1 }}>Your booking</div>
            )}
          </div>
          <span style={{
            fontSize: 10, fontWeight: 700,
            color: sc.color, background: sc.bg,
            borderRadius: 6, padding: "3px 8px",
            letterSpacing: "0.02em", textTransform: "uppercase", flexShrink: 0,
          }}>
            {sc.label}
          </span>
        </div>

        {/* Availability ring */}
        {avail && avail.total_requested_days > 1 && pct !== null && (
          <>
            <div style={{ borderTop: "1px solid #f3f4f6" }} />
            <AvailabilityRing pct={pct} available={avail.total_available_days} total={avail.total_requested_days} />
          </>
        )}

        {/* Preference match badge */}
        {mc && seat.preferenceMatchStatus !== "NO_MATCH" && (
          <>
            <div style={{ borderTop: "1px solid #f3f4f6" }} />
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              background: mc.bg, borderRadius: 8, padding: "5px 9px",
            }}>
              {mc.icon && <span style={{ fontSize: 12 }}>{mc.icon}</span>}
              <span style={{ fontSize: 11, fontWeight: 700, color: mc.color }}>{mc.label}</span>
              {seat.matchedAmenityCount !== undefined && seat.requestedAmenityCount !== undefined && (
                <span style={{ fontSize: 10, color: mc.color, opacity: 0.8, marginLeft: "auto" }}>
                  {seat.matchedAmenityCount}/{seat.requestedAmenityCount} matched
                </span>
              )}
            </div>
          </>
        )}

        {/* Seat type — for available seats with no preference match */}
        {(seat.status === "available" || seat.status === "yours") &&
          seat.preferenceMatchStatus !== "FULL_MATCH" &&
          seat.preferenceMatchStatus !== "PARTIAL_MATCH" &&
          seat.amenities.length > 0 && (
            <>
              <div style={{ borderTop: "1px solid #f3f4f6" }} />
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 }}>
                  Seat Type
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {seat.amenities.map((a) => (
                    <span key={a} style={{
                      fontSize: 10, fontWeight: 500,
                      color: "#374151", background: "#f3f4f6",
                      borderRadius: 5, padding: "2px 8px", textTransform: "capitalize",
                      display: "inline-flex", alignItems: "center", gap: 4,
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: getAmenityColor(a, categoryByName.get(a.toLowerCase())).hex, flexShrink: 0 }} />
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}

        {/* Amenities — only for partial/full match */}
        {(seat.preferenceMatchStatus === "FULL_MATCH" || seat.preferenceMatchStatus === "PARTIAL_MATCH") && (
          <>
            {(seat.matchedAmenityNames ?? []).length > 0 && (
              <>
                <div style={{ borderTop: "1px solid #f3f4f6" }} />
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 }}>
                    Matched Amenities
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {(seat.matchedAmenityNames ?? []).map((name) => {
                      const color = getAmenityColor(name, categoryByName.get(name.toLowerCase()));
                      return (
                        <span key={name} style={{
                          fontSize: 10, fontWeight: 600,
                          color: color.hex, background: color.bgHex,
                          borderRadius: 5, padding: "2px 8px",
                          display: "flex", alignItems: "center", gap: 3,
                        }}>
                          <span style={{ fontSize: 9 }}>✓</span>
                          {name}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
            {seat.amenities.length > 0 &&
              JSON.stringify(seat.amenities) !== JSON.stringify(seat.matchedAmenityNames ?? []) && (
                <>
                  <div style={{ borderTop: "1px solid #f3f4f6" }} />
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 }}>
                      Amenities
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {seat.amenities.map((a) => {
                        const isMatched = (seat.matchedAmenityNames ?? [])
                          .map((n) => n.toLowerCase())
                          .some((n) => n.includes(a.toLowerCase()) || a.toLowerCase().includes(n));
                        const color = getAmenityColor(a, categoryByName.get(a.toLowerCase()));
                        return (
                          <span key={a} style={{
                            fontSize: 10, fontWeight: 500,
                            color: color.hex, background: color.bgHex,
                            borderRadius: 5, padding: "2px 8px", textTransform: "capitalize",
                            display: "inline-flex", alignItems: "center", gap: 4,
                          }}>
                            {isMatched && <span style={{ fontSize: 9 }}>✓</span>}
                            {a}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
          </>
        )}

        {/* Seat type for unavailable seats */}
        {(seat.status === "unavailable" || seat.status === "booked") && seat.amenities.length > 0 && (
          <>
            <div style={{ borderTop: "1px solid #f3f4f6" }} />
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 }}>
                Seat Type
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {seat.amenities.map((a) => (
                  <span key={a} style={{
                    fontSize: 10, fontWeight: 500,
                    color: "#374151", background: "#f3f4f6",
                    borderRadius: 5, padding: "2px 8px", textTransform: "capitalize",
                    display: "inline-flex", alignItems: "center", gap: 4,
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: getAmenityColor(a, categoryByName.get(a.toLowerCase())).hex, flexShrink: 0 }} />
                    {a}
                  </span>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Unavailable seat details */}
        {(seat.status === "unavailable" || seat.status === "booked") && avail && (
          <>
            <div style={{ borderTop: "1px solid #f3f4f6" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {(avail.booked_dates ?? []).length > 0 && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                    Booked Dates
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                    {avail.booked_dates.slice(0, 5).map((d) => (
                      <span key={d} style={{ fontSize: 10, fontWeight: 500, color: "#b45309", background: "#fef3c7", borderRadius: 5, padding: "2px 7px" }}>
                        {new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    ))}
                    {avail.booked_dates.length > 5 && (
                      <span style={{ fontSize: 10, color: "#9ca3af", padding: "2px 4px" }}>+{avail.booked_dates.length - 5} more</span>
                    )}
                  </div>
                </div>
              )}
              {(avail.blocked_dates ?? []).length > 0 && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                    Blocked Dates
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                    {avail.blocked_dates.slice(0, 5).map((d) => (
                      <span key={d} style={{ fontSize: 10, fontWeight: 500, color: "#6b7280", background: "#f3f4f6", borderRadius: 5, padding: "2px 7px" }}>
                        {new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    ))}
                    {avail.blocked_dates.length > 5 && (
                      <span style={{ fontSize: 10, color: "#9ca3af", padding: "2px 4px" }}>+{avail.blocked_dates.length - 5} more</span>
                    )}
                  </div>
                </div>
              )}
              {(avail.available_dates ?? []).length > 0 && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                    Next Available
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 600, color: "#047857", background: "#d1fae5", borderRadius: 5, padding: "2px 8px" }}>
                    {new Date(avail.available_dates[0] + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                </div>
              )}
            </div>
          </>
        )}

        {/* Click hint */}
        {(seat.status === "available" || seat.status === "yours") && (
          <div style={{
            marginTop: 2, fontSize: 10, color: "#9ca3af", textAlign: "center",
            background: "#f9fafb", borderRadius: 6, padding: "4px 0",
          }}>
            {seat.status === "yours" ? "↩ Click to deselect" : "↵ Click to select this space"}
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
  svgUrl?: string | null;
  siteName?: string;
  buildingName?: string;
  floorName?: string;
  preferences?: Preference[];
}

// ─── Component ────────────────────────────────────────────────────────────────
export const SvgFloorMapPage: React.FC<SvgFloorMapPageProps> = ({
  seats,
  selectedSeatId,
  onSeatSelect,
  loading = false,
  svgUrl,
  preferences = [],
}) => {
  const categoryByName = React.useMemo(
    () => new Map(preferences.map((p) => [p.name.toLowerCase(), p.category])),
    [preferences]
  );

  const wrapperRef = useRef<HTMLDivElement>(null);
  const transformRef = useRef<HTMLDivElement>(null);

  const scaleRef = useRef(1);
  const translateRef = useRef({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const mouseDownPos = useRef({ x: 0, y: 0 });
  const didDrag = useRef(false);
  const fitDoneRef = useRef(false);

  const [rawSvg, setRawSvg] = useState<string | null>(null);
  const [svgError, setSvgError] = useState(false);
  const [zoomDisplay, setZoomDisplay] = useState(100);
  const [mapReady, setMapReady] = useState(false);

  // Actual canvas size of the loaded SVG — read from its own markup, not
  // assumed to always match the SVG_W/SVG_H default.
  const [svgDims, setSvgDims] = useState<{ w: number; h: number }>({ w: SVG_W, h: SVG_H });

  // Dynamically extracted seat IDs from the SVG — no hardcoding
  const [svgSeatIds, setSvgSeatIds] = useState<string[]>([]);
  const svgSeatIdsSet = useRef<Set<string>>(new Set());

  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false, x: 0, y: 0, seat: null,
  });
  const containerRectRef = useRef<DOMRect | null>(null);
  const tooltipTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The currently-selected seat or room's on-screen highlight box, rendered
  // as a plain React <rect> in its own sibling <svg> overlay — see the
  // comment on resolveSelectionHighlightBox for why this isn't appended
  // directly into the (huge) floor-plan SVG.
  const [selectionHighlightBox, setSelectionHighlightBox] = useState<SelectionHighlightBox | null>(null);

  // buildColoredSvg runs a chain of regex replacements per seat over the
  // full raw SVG text — on a ~30MB floor plan that's real, synchronous CPU
  // work. Without memoization this ran on every render, including renders
  // triggered by state that has nothing to do with seat coloring (zoomDisplay
  // from every wheel tick/button click, tooltip from every mousemove over
  // the map), which is what made zoom/pan/hover feel heavy. Scoping the
  // dependency list to just what buildColoredSvg's output actually depends
  // on — rawSvg, loading, seats, selectedSeatId, svgSeatIds — means it now
  // only recomputes when the seat data or the loaded SVG itself changes.
  const coloredSvg = React.useMemo(() => {
    if (!rawSvg || loading || svgSeatIds.length === 0) return null;
    if (seats.length === 0) return rawSvg; // show uncolored SVG while seats are still loading
    return buildColoredSvg(rawSvg, svgSeatIds, seats, selectedSeatId);
  }, [rawSvg, loading, seats, selectedSeatId, svgSeatIds]);

  // Resolves the selected seat/room's on-screen box (see
  // resolveSelectionHighlightBox) once `coloredSvg` has actually been
  // committed by the dangerouslySetInnerHTML below — getBBox()/getCTM() only
  // return real numbers once the element is rendered, so this can't be done
  // as part of the buildColoredSvg string transform above. The box is stored
  // in React state and rendered as a normal <rect> further down — nothing
  // here touches the DOM directly.
  useLayoutEffect(() => {
    // Regular seats already turn solid blue on selection (see
    // FALLBACK_FILL.selected in recolorSeat) — a clear, unambiguous signal
    // on its own. This box overlay is a bounding rectangle, not a shape
    // outline, so on a small chair icon it reads as an awkward rounded
    // square floating around the chair rather than a highlight on it. Rooms
    // don't get a fill change when selected (skipRoomColor keeps their
    // original artwork), so this overlay is the only signal they have and
    // is worth it there — restrict it to rooms.
    const selectedSeat = selectedSeatId ? seats.find((s) => s.id === selectedSeatId) : null;
    const targetSvgId = selectedSeat && isRoomSvgId(selectedSeat.svgId) ? selectedSeat.svgId : null;

    if (SELECTION_OVERLAY_DEBUG) {
      console.log("[selection-highlight] effect fired", {
        coloredSvgLength: coloredSvg?.length ?? 0,
        selectedSeatId,
        targetSvgId,
        seatsLength: seats.length,
      });
    }

    if (!targetSvgId) {
      setSelectionHighlightBox(null);
      return;
    }
    const svgEl = transformRef.current?.querySelector("svg") as SVGSVGElement | null;
    if (!svgEl) {
      setSelectionHighlightBox(null);
      return;
    }
    setSelectionHighlightBox(resolveSelectionHighlightBox(svgEl, targetSvgId));
  }, [coloredSvg, selectedSeatId, seats]);

  // ── Fetch SVG from dynamic URL ────────────────────────────────────────────
  useEffect(() => {
    setRawSvg(null);
    setSvgError(false);
    setMapReady(false);
    setSvgSeatIds([]);
    svgSeatIdsSet.current = new Set();
    setSvgDims({ w: SVG_W, h: SVG_H });
    fitDoneRef.current = false;

    if (!svgUrl) return;

    fetch(svgUrl)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      })
      .then((text) => {
        // Extract <g id="..."> values dynamically — these are the seat IDs
        const ids = extractSeatIds(text, "SvgFloorMapPage");
        setSvgSeatIds(ids);
        svgSeatIdsSet.current = new Set(ids);
        setSvgDims(parseSvgDimensions(text));
        setRawSvg(text);
      })
      .catch(() => setSvgError(true));
  }, [svgUrl]);

  // ── applyTransform ────────────────────────────────────────────────────────
  // `animate` adds a short CSS transition for discrete, user-initiated steps
  // (zoom buttons) so they ease instead of jump-cutting. Continuous
  // interactions (wheel zoom, drag-pan, pinch) must stay untransitioned —
  // animating those would make them lag behind the cursor/fingers.
  const applyTransform = useCallback((animate = false) => {
    const el = transformRef.current;
    if (!el) return;
    el.style.transition = animate ? "transform 120ms ease-out" : "none";
    el.style.transform = `translate(${translateRef.current.x}px,${translateRef.current.y}px) scale(${scaleRef.current})`;
  }, []);

  // ── fitView ───────────────────────────────────────────────────────────────
  const fitView = useCallback(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const { width: wW, height: wH } = wrapper.getBoundingClientRect();
    if (wW === 0 || wH === 0) return;
    const scale = Math.min(wW / svgDims.w, wH / svgDims.h);
    scaleRef.current = scale;
    translateRef.current = {
      x: (wW - svgDims.w * scale) / 2,
      y: (wH - svgDims.h * scale) / 2,
    };
    applyTransform();
    setZoomDisplay(Math.round(scale * 100));
  }, [applyTransform, svgDims]);

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

  // ── Zoom ─────────────────────────────────────────────────────────────────
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
    const newScale = Math.min(Math.max(oldScale * factor, zoomFloor), ZOOM_MAX);
    const cx = wW / 2, cy = wH / 2;
    translateRef.current = {
      x: cx - (cx - translateRef.current.x) * (newScale / oldScale),
      y: cy - (cy - translateRef.current.y) * (newScale / oldScale),
    };
    scaleRef.current = newScale;
    // Both directions animate the same way now — making zoom-out snap
    // instantly while zoom-in eased created a jarring inconsistency (a
    // smooth zoom followed by an abrupt jump reads as a glitch, especially
    // when clicking zoom-out while a zoom-in transition is still settling).
    // Zooming out does reveal more of the oversized floor-plan canvas per
    // frame than zooming in, so the transition is kept short (120ms, see
    // applyTransform) rather than removed for one direction only — enough
    // frames to feel smooth without repainting that much geometry for long.
    applyTransform(true);
    setZoomDisplay(Math.round(newScale * 100));
  }, [applyTransform, svgDims]);

  const zoomIn = useCallback(() => zoomStep(ZOOM_BUTTON_FACTOR), [zoomStep]);
  const zoomOut = useCallback(() => zoomStep(1 / ZOOM_BUTTON_FACTOR), [zoomStep]);

  // ── Wheel zoom ────────────────────────────────────────────────────────────
  // A trackpad or a fast mouse wheel can fire many "wheel" events within a
  // single animation frame. Doing a full transform + React state update per
  // event (the old behavior) does redundant work the browser can't even
  // paint in time, which reads as stutter — especially on this floor plan's
  // oversized SVG canvas, which is already expensive to re-rasterize on any
  // scale change. Instead, accumulate the zoom factor from every event that
  // arrives before the next frame and apply it once, right before paint.
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
      const newScale = Math.min(Math.max(oldScale * factor, zoomFloor), ZOOM_MAX);
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
      const factor = e.deltaY < 0 ? ZOOM_WHEEL_FACTOR : 1 / ZOOM_WHEEL_FACTOR;
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
    isPanning.current = true;
    didDrag.current = false;
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

  const onMapMouseMove = (e: React.MouseEvent) => {
    if (isPanning.current && didDrag.current) return;
    if (wrapperRef.current) containerRectRef.current = wrapperRef.current.getBoundingClientRect();
    const svgId = getSvgIdFromClick(e.target, svgSeatIdsSet.current);
    if (!svgId) {
      if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);
      tooltipTimeoutRef.current = setTimeout(hideTooltip, 120);
      return;
    }
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const rect = wrapper.getBoundingClientRect();
    showTooltipForSvgId(svgId, e.clientX - rect.left, e.clientY - rect.top);
  };

  const onMapMouseLeave = () => {
    isPanning.current = false;
    if (wrapperRef.current) wrapperRef.current.style.cursor = "grab";
    tooltipTimeoutRef.current = setTimeout(hideTooltip, 200);
  };

  const onMapClick = (e: React.MouseEvent) => {
    if (didDrag.current) { didDrag.current = false; return; }
    const svgId = getSvgIdFromClick(e.target, svgSeatIdsSet.current);
    if (!svgId) return;
    const seat = seats.find((s) => s.svgId === svgId);
    if (!seat) return;
    if (seat.status !== "available" && seat.status !== "yours") return;
    hideTooltip();
    onSeatSelect(seat.id === selectedSeatId ? null : seat.id);
  };

  // ── Legend counts ─────────────────────────────────────────────────────────
  const hasPreferences = seats.some((s) => s.preferenceMatchStatus === "FULL_MATCH" || s.preferenceMatchStatus === "PARTIAL_MATCH");
  const partialMatchCount = seats.filter((s) => s.preferenceMatchStatus === "PARTIAL_MATCH" && s.status === "available").length;

  const showSpinner = (!!svgUrl && !rawSvg && !svgError) || loading || (!!rawSvg && !mapReady);
  const showNoLayout = !svgUrl && !loading;

  return (
    <>
      <div
        className="relative bg-[#F7F8FC] border border-[#EBEBF5] rounded-xl overflow-hidden"
        style={{ width: "100%", height: 520 }}
      >
        {/* Zoom controls */}
        {mapReady && (
          <div className="absolute top-3 right-3 z-20 flex flex-col gap-1.5">
            {(
              [
                { icon: <ZoomIn size={14} />, action: zoomIn, title: "Zoom in" },
                { icon: <ZoomOut size={14} />, action: zoomOut, title: "Zoom out" },
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

        {/* Map viewport */}
        <div
          ref={wrapperRef}
          className="w-full h-full overflow-hidden select-none"
          style={{ cursor: "grab" }}
          onMouseDown={onMouseDown}
          onMouseMove={(e) => { onMouseMove(e); onMapMouseMove(e); }}
          onMouseUp={onMouseUp}
          onMouseLeave={onMapMouseLeave}
          onClick={onMapClick}
        >
          {/* Loading spinner */}
          {showSpinner && !svgError && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#F7F8FC] z-10">
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                <p className="text-[12.5px] text-gray-400">Loading floor plan…</p>
              </div>
            </div>
          )}

          {/* Fetch error */}
          {svgError && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <p className="text-[13px] text-gray-500 mb-1">Floor plan unavailable</p>
                <p className="text-[11.5px] text-gray-400">
                  The layout file could not be loaded. Please try again or contact support.
                </p>
              </div>
            </div>
          )}

          {/* No layout configured */}
          {showNoLayout && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <p className="text-[13px] text-gray-500 mb-1">No floor plan available</p>
                <p className="text-[11.5px] text-gray-400">
                  No published layout has been configured for this floor.
                </p>
              </div>
            </div>
          )}

          {coloredSvg && (
            <div
              ref={transformRef}
              style={{
                position: "relative",
                transformOrigin: "top left",
                width: `${svgDims.w}px`,
                height: `${svgDims.h}px`,
                willChange: "transform",
                visibility: mapReady ? "visible" : "hidden",
              }}
            >
              <div
                style={{ width: "100%", height: "100%" }}
                dangerouslySetInnerHTML={{ __html: coloredSvg }}
              />
              {/* Selection border/glow (any selected seat or room) — a plain
                  React-owned <rect> in its own tiny sibling SVG, sharing the
                  same coordinate space (viewBox) as the floor plan above so
                  its box lines up exactly, but otherwise entirely decoupled
                  from that (huge, heavily masked/clipped) document. See
                  resolveSelectionHighlightBox for why it isn't drawn inside
                  that document instead. */}
              {selectionHighlightBox && (
                <svg
                  width={svgDims.w}
                  height={svgDims.h}
                  viewBox={`0 0 ${svgDims.w} ${svgDims.h}`}
                  style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
                >
                  <style>{`
                    @keyframes _selectionBorderPulse {
                      0%, 100% { opacity: 1; }
                      50% { opacity: 0.2; }
                    }
                  `}</style>
                  <defs>
                    {/* Punches the room's own actual box out of the highlight
                        layer below, so the glow/stroke — however far its blur
                        reaches — can only ever render outside the room, never
                        wash color over its own artwork. White = shown, black
                        = hidden, standard SVG luminance mask. */}
                    <mask id="_selection-outside-mask" maskUnits="userSpaceOnUse" x={0} y={0} width={svgDims.w} height={svgDims.h}>
                      <rect x={0} y={0} width={svgDims.w} height={svgDims.h} fill="white" />
                      <rect
                        x={selectionHighlightBox.innerX}
                        y={selectionHighlightBox.innerY}
                        width={selectionHighlightBox.innerWidth}
                        height={selectionHighlightBox.innerHeight}
                        fill="black"
                      />
                    </mask>
                  </defs>
                  {/* A crisp stroked outline reads as a hard-edged "box" no
                      matter how much drop-shadow blur is layered around it —
                      the line itself stays a solid, sharply-defined shape.
                      Using a semi-transparent FILL instead (masked down to
                      just the ring between the room's real edge and this
                      padded box) plus a `blur()` on top gives a source shape
                      that's already soft before any glow is added, so the
                      whole thing diffuses outward from the room rather than
                      looking like a square drawn around it. The mask still
                      keeps the inner cutoff at the room's real boundary
                      crisp, which is what actually prevents color bleeding
                      onto the room's own artwork — it's the outer edge that
                      needed to soften, not the inner one. */}
                  <rect
                    x={selectionHighlightBox.x}
                    y={selectionHighlightBox.y}
                    width={selectionHighlightBox.width}
                    height={selectionHighlightBox.height}
                    rx={selectionHighlightBox.strokeWidth * 0.5}
                    fill="#7C3AED"
                    fillOpacity={0.55}
                    mask="url(#_selection-outside-mask)"
                    style={{
                      filter: `blur(${selectionHighlightBox.strokeWidth * 0.6}px) drop-shadow(0 0 ${selectionHighlightBox.haloNear}px #7C3AED) drop-shadow(0 0 ${selectionHighlightBox.haloFar}px #A78BFA)`,
                      animation: "_selectionBorderPulse 1s ease-in-out infinite",
                    }}
                  />
                </svg>
              )}
            </div>
          )}

          {tooltip.visible && tooltip.seat && containerRectRef.current && (
            <SeatTooltip tooltip={tooltip} containerRect={containerRectRef.current} categoryByName={categoryByName} />
          )}
        </div>
      </div>

      {/* Legend + hint — below the map, never overlapping */}
      {mapReady && (
        <div className="flex items-center justify-between flex-wrap gap-2 px-1">
          <div className="flex items-center gap-3 flex-wrap">
            {hasPreferences && (
              <span className="flex items-center gap-1.5 text-[10px] text-gray-600 font-medium">
                <span className="w-2.5 h-2.5 rounded-full inline-block bg-amber-400 ring-1 ring-amber-500" />
                Best Match
              </span>
            )}
            <span className="flex items-center gap-1.5 text-[10px] text-gray-600 font-medium">
              <span className="w-2.5 h-2.5 rounded-full inline-block bg-emerald-500" />
              Available
            </span>
            {hasPreferences && partialMatchCount > 0 && (
              <span className="flex items-center gap-1.5 text-[10px] text-gray-600 font-medium">
                <span className="relative w-2.5 h-2.5 inline-block">
                  <span className="absolute inset-0 rounded-full bg-emerald-500" />
                  <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-amber-400 border border-white" />
                </span>
                Partial Match
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
          <span className="text-[10px] text-gray-400 select-none">
            Scroll to zoom · Drag to pan · Click a space to select
          </span>
        </div>
      )}
    </>
  );
};

export default SvgFloorMapPage;