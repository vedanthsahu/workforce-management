import { SeatStatus } from "@/features/managelayout1";

// ─── SVG helpers ─────────────────────────────────────────────────────────────
// Fallback canvas size used when a layout's own <svg viewBox>/width/height
// can't be read -- see resolveSvgDims in LayoutPreview.tsx.
export const SVG_W = 2466;
export const SVG_H = 2039;

// Cabin/conference/meeting/training room seats are grouped under one svg id
// containing a "CBN"/"CFR"/"MR"/"TR" segment (e.g. "HYD-PRV-F11-CBN-04",
// "HYD-PRV-F11-CFR-02", "HYD-PRV-F11-MR-01", "HYD-PRV-F11-TR-01"), not a
// dedicated field.
export const ROOM_SVG_ID_PATTERN = /(^|[-_])(cbn|cfr|mr|tr)([-_]|$)/i;

// ─── Seat Config Dialog ──────────────────────────────────────────────────────
export const SEAT_STATUSES: SeatStatus[] = ["ACTIVE", "INACTIVE"];

// ─── Legend ──────────────────────────────────────────────────────────────────
export const LEGEND_ITEMS = [
  { label: "Bookable", color: "#22C55E" },
  { label: "Non-bookable", color: "#F59E0B" },
  { label: "Inactive", color: "#EF4444" },
  { label: "Unconfigured", color: "#000000ff" },
] as const;

// ─── Sidebar prefetch ────────────────────────────────────────────────────────
// Static routes that never change — safe to prefetch unconditionally.
export const STATIC_PREFETCH_ROUTES = [
  "/admin/layouts/manage-seats",
  "/admin/amenities",
];
