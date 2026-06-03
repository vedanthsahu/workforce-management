import React, { useCallback, useEffect, useRef, useState } from "react";
import { Maximize2, ZoomIn, ZoomOut } from "lucide-react";
import { Seat } from "../types/Bookingform.types";

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

const SVG_W = 2466;
const SVG_H = 2039;

// ─── Extract all <g id="..."> values from raw SVG text ───────────────────────

function extractSeatIds(svgText: string): string[] {
  const ids: string[] = [];
  const regex = /<g\s+id="([^"]+)"/g;
  let match;
  while ((match = regex.exec(svgText)) !== null) ids.push(match[1]);
  return ids;
}

// ─── Color palettes ───────────────────────────────────────────────────────────
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
  best_match: {
    body: "#facc15", bodyStroke: "#eab308",
    armrest: "#fde047",
    back: "#a16207", backStroke: "#854d0e",
    curve: "#ca8a04", arc: "#fbbf24",
    opacity: "1",
  },
  partial_match: {
    body: "#fefce8", bodyStroke: "#facc15",
    armrest: "#fef9c3",
    back: "#eab308", backStroke: "#ca8a04",
    curve: "#facc15", arc: "#fef08a",
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

function getPaletteKey(seat: SeatWithSvgId, isSelected: boolean): string {
  if (isSelected) return "selected";
  if (seat.status !== "available" && seat.status !== "yours") return seat.status;
  const match = seat.preferenceMatchStatus;
  if (match === "FULL_MATCH" || seat.uiState === "BEST_MATCH") return "best_match";
  if (match === "PARTIAL_MATCH") return "partial_match";
  if (seat.status === "yours") return "yours";
  return "available";
}

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
  block = block.replace(/fill="#C8C8C8" stroke="#888888"/g, `fill="${p.body}" stroke="${p.bodyStroke}"`);
  block = block.replace(/fill="#B0B0B0" stroke="#888888"/g, `fill="${p.armrest}" stroke="${p.bodyStroke}"`);
  block = block.replace(/fill="#616161" stroke="#424242"/g, `fill="${p.back}" stroke="${p.backStroke}"`);
  block = block.replace(/stroke="#707070"/g, `stroke="${p.curve}"`);
  block = block.replace(/stroke="#A0A0A0"/g, `stroke="${p.arc}"`);
  const isClickable = ["available", "best_match", "partial_match", "yours", "selected"].includes(paletteKey);
  block = block.replace(
    `<g id="${svgId}">`,
    `<g id="${svgId}" style="opacity:${p.opacity};cursor:${isClickable ? "pointer" : "default"}">`
  );
  return before + block + after;
}

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

// ─── Day calendar strip ───────────────────────────────────────────────────────

const DAY_STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  AVAILABLE:   { bg: "#d1fae5", text: "#065f46", dot: "#10b981", label: "Available"    },
  BOOKED:      { bg: "#fee2e2", text: "#991b1b", dot: "#ef4444", label: "Booked"       },
  BLOCKED:     { bg: "#f3f4f6", text: "#374151", dot: "#9ca3af", label: "Blocked"      },
  UNAVAILABLE: { bg: "#f3f4f6", text: "#374151", dot: "#9ca3af", label: "Unavailable"  },
  YOURS:       { bg: "#dbeafe", text: "#1e40af", dot: "#3b82f6", label: "Your Booking" },
};

function fmtShortDate(iso: string): { day: string; date: string; month: string } {
  const d = new Date(iso + "T00:00:00");
  return {
    day:   d.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 2),
    date:  d.getDate().toString(),
    month: d.toLocaleDateString("en-US", { month: "short" }),
  };
}

const DayCalendarStrip: React.FC<{
  dailyStatuses: { booking_date: string; status: string }[];
}> = ({ dailyStatuses }) => {
  if (!dailyStatuses || dailyStatuses.length === 0) return null;
  const shown = dailyStatuses.slice(0, 7);
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 }}>
        Daily Availability
      </div>
      <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
        {shown.map(({ booking_date, status }) => {
          const cfg = DAY_STATUS_CONFIG[status.toUpperCase()] ?? DAY_STATUS_CONFIG.UNAVAILABLE;
          const { day, date } = fmtShortDate(booking_date);
          return (
            <div
              key={booking_date}
              title={`${booking_date}: ${cfg.label}`}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                background: cfg.bg, borderRadius: 6, padding: "4px 5px", minWidth: 28,
              }}
            >
              <span style={{ fontSize: 9, color: cfg.text, fontWeight: 600, lineHeight: 1 }}>{day}</span>
              <span style={{ fontSize: 11, color: cfg.text, fontWeight: 800, lineHeight: 1 }}>{date}</span>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: cfg.dot, flexShrink: 0 }} />
            </div>
          );
        })}
        {dailyStatuses.length > 7 && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 9, color: "#6b7280", fontWeight: 600,
            background: "#f9fafb", borderRadius: 6, padding: "4px 5px", minWidth: 28,
          }}>
            +{dailyStatuses.length - 7}
          </div>
        )}
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
}> = ({ tooltip, containerRect }) => {
  if (!tooltip.visible || !tooltip.seat || !containerRect) return null;

  const seat = tooltip.seat;
  const avail = seat.availabilitySummary;

  const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
    available:   { label: "Available",    color: "#059669", bg: "#d1fae5" },
    booked:      { label: "Booked",       color: "#dc2626", bg: "#fee2e2" },
    unavailable: { label: "Unavailable",  color: "#6b7280", bg: "#f3f4f6" },
    yours:       { label: "Your Booking", color: "#1d4ed8", bg: "#dbeafe" },
  };

  const matchConfig: Record<string, { label: string; color: string; bg: string; icon: string }> = {
    FULL_MATCH:    { label: "Best Match",    color: "#92400e", bg: "#fef3c7", icon: "⭐" },
    PARTIAL_MATCH: { label: "Partial Match", color: "#92400e", bg: "#fefce8", icon: "✦"  },
    NO_MATCH:      { label: "No Match",      color: "#6b7280", bg: "#f3f4f6", icon: ""   },
  };

  const sc  = statusConfig[seat.status] ?? statusConfig.unavailable;
  const mc  = seat.preferenceMatchStatus ? matchConfig[seat.preferenceMatchStatus] : null;
  const pct = avail?.availability_percentage ?? null;

  const TIP_W  = 248;
  const PADDING = 12;

  let left = tooltip.x + 14;
  let top  = tooltip.y - 10;

  if (left + TIP_W > containerRect.width - PADDING) left = tooltip.x - TIP_W - 14;
  if (top < PADDING) top = PADDING;

  const arrowOnRight = left < tooltip.x;

  return (
    <div style={{ position: "absolute", left, top, width: TIP_W, pointerEvents: "none", zIndex: 50 }}>
      <div style={{
        position: "absolute",
        left:  arrowOnRight ? "auto" : -6,
        right: arrowOnRight ? -6    : "auto",
        top: 20,
        width: 12, height: 12,
        background: "white",
        border: "1px solid #e5e7eb",
        borderRight:  arrowOnRight ? "1px solid #e5e7eb" : "none",
        borderBottom: arrowOnRight ? "1px solid #e5e7eb" : "none",
        borderLeft:   arrowOnRight ? "none" : "1px solid #e5e7eb",
        borderTop:    arrowOnRight ? "none" : "1px solid #e5e7eb",
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

        {/* Matched amenities */}
        {(seat.matchedAmenityNames ?? []).length > 0 && (
          <>
            <div style={{ borderTop: "1px solid #f3f4f6" }} />
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 }}>
                Matched Amenities
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {(seat.matchedAmenityNames ?? []).map((name) => (
                  <span key={name} style={{
                    fontSize: 10, fontWeight: 600,
                    color: "#047857", background: "#d1fae5",
                    borderRadius: 5, padding: "2px 8px",
                    display: "flex", alignItems: "center", gap: 3,
                  }}>
                    <span style={{ fontSize: 9 }}>✓</span> {name}
                  </span>
                ))}
              </div>
            </div>
          </>
        )}

        {/* All seat amenities */}
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
                  return (
                    <span key={a} style={{
                      fontSize: 10, fontWeight: 500,
                      color: isMatched ? "#047857" : "#374151",
                      background: isMatched ? "#d1fae5" : "#f3f4f6",
                      borderRadius: 5, padding: "2px 8px", textTransform: "capitalize",
                    }}>
                      {a}
                    </span>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* No amenity fallback */}
        {(seat.amenities.length === 0 && (seat.matchedAmenityNames ?? []).length === 0) && (
          <>
            <div style={{ borderTop: "1px solid #f3f4f6" }} />
            <div style={{ fontSize: 10, color: "#9ca3af", textAlign: "center", fontStyle: "italic" }}>
              No amenity information available
            </div>
          </>
        )}

        {/* Click hint */}
        {(seat.status === "available" || seat.status === "yours") && (
          <div style={{
            marginTop: 2, fontSize: 10, color: "#9ca3af", textAlign: "center",
            background: "#f9fafb", borderRadius: 6, padding: "4px 0",
          }}>
            {seat.status === "yours" ? "↩ Click to deselect" : "↵ Click to select this seat"}
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
}

// ─── Component ────────────────────────────────────────────────────────────────
export const SvgFloorMapPage: React.FC<SvgFloorMapPageProps> = ({
  seats,
  selectedSeatId,
  onSeatSelect,
  loading = false,
  svgUrl,
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

  // Dynamically extracted seat IDs from the SVG — no hardcoding
  const [svgSeatIds,    setSvgSeatIds]    = useState<string[]>([]);
  const svgSeatIdsSet = useRef<Set<string>>(new Set());

  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false, x: 0, y: 0, seat: null,
  });
  const containerRectRef  = useRef<DOMRect | null>(null);
  const tooltipTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const coloredSvg =
    rawSvg && !loading && seats.length > 0 && svgSeatIds.length > 0
      ? buildColoredSvg(rawSvg, svgSeatIds, seats, selectedSeatId)
      : rawSvg && !loading && svgSeatIds.length > 0
        ? rawSvg  // show uncolored SVG while seats are still loading
        : null;

  // ── Fetch SVG from dynamic URL ────────────────────────────────────────────
  useEffect(() => {
    setRawSvg(null);
    setSvgError(false);
    setMapReady(false);
    setSvgSeatIds([]);
    svgSeatIdsSet.current = new Set();
    fitDoneRef.current = false;

    if (!svgUrl) return;

    fetch(svgUrl)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      })
      .then((text) => {
        // Extract <g id="..."> values dynamically — these are the seat IDs
        const ids = extractSeatIds(text);
        setSvgSeatIds(ids);
        svgSeatIdsSet.current = new Set(ids);
        setRawSvg(text);
      })
      .catch(() => setSvgError(true));
  }, [svgUrl]);

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

  // ── Zoom ─────────────────────────────────────────────────────────────────
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
      if (seat.status === "booked" || seat.status === "unavailable") return;
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
    console.log("clicked seat:", seat?.id, "status:", seat?.status, "svgId:", svgId);
    if (!seat) return;
    if (seat.status !== "available" && seat.status !== "yours") return;
    hideTooltip();
    onSeatSelect(seat.id === selectedSeatId ? null : seat.id);
  };

  // ── Legend counts ─────────────────────────────────────────────────────────
  const hasPreferences    = seats.some((s) => s.preferenceMatchStatus === "FULL_MATCH" || s.preferenceMatchStatus === "PARTIAL_MATCH");
  const partialMatchCount = seats.filter((s) => s.preferenceMatchStatus === "PARTIAL_MATCH" && s.status === "available").length;

  const showSpinner  = (!!svgUrl && !rawSvg && !svgError) || loading || (!!rawSvg && !mapReady);
  const showNoLayout = !svgUrl && !loading;

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
              transformOrigin: "top left",
              width: `${SVG_W}px`,
              height: `${SVG_H}px`,
              willChange: "transform",
              visibility: mapReady ? "visible" : "hidden",
            }}
            dangerouslySetInnerHTML={{ __html: coloredSvg }}
          />
        )}

        {tooltip.visible && tooltip.seat && containerRectRef.current && (
          <SeatTooltip tooltip={tooltip} containerRect={containerRectRef.current} />
        )}
      </div>
    </div>
  );
};

export default SvgFloorMapPage;