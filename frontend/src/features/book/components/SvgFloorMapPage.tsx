import React, { useCallback, useEffect, useRef, useState } from "react";
import { Maximize2, ZoomIn, ZoomOut } from "lucide-react";
import { Seat } from "../types/Bookingform.types";
import {
  SVG_W,
  SVG_H,
  ZOOM_MIN,
  ZOOM_MAX,
  ZOOM_BUTTON_FACTOR,
  ZOOM_WHEEL_FACTOR,
  TOOLTIP_WIDTH,
  TOOLTIP_PADDING,
  SEAT_PALETTES,
  DAY_STATUS_CONFIG,
  SEAT_STATUS_CONFIG,
  PREFERENCE_MATCH_CONFIG,
} from "../utils/constants";

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

// ─── Extract all <g id="..."> values from raw SVG text ───────────────────────

function extractSeatIds(svgText: string): string[] {
  const ids: string[] = [];
  const seatIdPattern = /^\d+$|^[A-Z]+-.*-\d+$/;
  const regex = /<g\s+id="([^"]+)"/g;
  let match;
  while ((match = regex.exec(svgText)) !== null) {
    if (seatIdPattern.test(match[1])) ids.push(match[1]);
  }
  return ids;
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

function recolorSeat(svg: string, svgId: string, paletteKey: string): string {
  const p = SEAT_PALETTES[paletteKey] ?? SEAT_PALETTES.unloaded;
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
  const isSelected  = paletteKey === "selected";
  block = block.replace(
    `<g id="${svgId}">`,
    `<g id="${svgId}"${isSelected ? ` class="_sel-pulse"` : ""} style="opacity:${p.opacity};cursor:${isClickable ? "pointer" : "default"}">`
  );
  return before + block + after;
}

const SELECTED_PULSE_STYLE = `<style>
@keyframes _selGlow{
  0%,100%{filter:drop-shadow(0 0 4px #6366f1) drop-shadow(0 0 8px #818cf8);}
  50%{filter:drop-shadow(0 0 12px #6366f1) drop-shadow(0 0 24px #818cf8) brightness(1.12);}
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
  // Inject pulse keyframes when a seat is selected
  if (selectedSeatId) {
    const firstClose = svg.indexOf('>');
    if (firstClose !== -1) svg = svg.slice(0, firstClose + 1) + SELECTED_PULSE_STYLE + svg.slice(firstClose + 1);
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

// ─── Day calendar strip ───────────────────────────────────────────────────────

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

  const sc  = SEAT_STATUS_CONFIG[seat.status] ?? SEAT_STATUS_CONFIG.unavailable;
  const mc  = seat.preferenceMatchStatus ? PREFERENCE_MATCH_CONFIG[seat.preferenceMatchStatus] : null;
  const pct = avail?.availability_percentage ?? null;

  let left = tooltip.x + 14;
  let top  = tooltip.y - 10;

  if (left + TOOLTIP_WIDTH > containerRect.width - TOOLTIP_PADDING) left = tooltip.x - TOOLTIP_WIDTH - 14;
  if (top < TOOLTIP_PADDING) top = TOOLTIP_PADDING;

  const arrowOnRight = left < tooltip.x;

  return (
    <div style={{ position: "absolute", left, top, width: TOOLTIP_WIDTH, pointerEvents: "none", zIndex: 50 }}>
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
                  }}>
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
                  }}>
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
    const newScale = Math.min(Math.max(oldScale * factor, ZOOM_MIN), ZOOM_MAX);
    const cx = wW / 2, cy = wH / 2;
    translateRef.current = {
      x: cx - (cx - translateRef.current.x) * (newScale / oldScale),
      y: cy - (cy - translateRef.current.y) * (newScale / oldScale),
    };
    scaleRef.current = newScale;
    applyTransform();
    setZoomDisplay(Math.round(newScale * 100));
  }, [applyTransform]);

  const zoomIn  = useCallback(() => zoomStep(ZOOM_BUTTON_FACTOR),     [zoomStep]);
  const zoomOut = useCallback(() => zoomStep(1 / ZOOM_BUTTON_FACTOR), [zoomStep]);

  // ── Wheel zoom ────────────────────────────────────────────────────────────
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const factor   = e.deltaY < 0 ? ZOOM_WHEEL_FACTOR : 1 / ZOOM_WHEEL_FACTOR;
      const oldScale = scaleRef.current;
      const newScale = Math.min(Math.max(oldScale * factor, ZOOM_MIN), ZOOM_MAX);
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
  const hasPreferences    = seats.some((s) => s.preferenceMatchStatus === "FULL_MATCH" || s.preferenceMatchStatus === "PARTIAL_MATCH");
  const partialMatchCount = seats.filter((s) => s.preferenceMatchStatus === "PARTIAL_MATCH" && s.status === "available").length;

  const showSpinner  = (!!svgUrl && !rawSvg && !svgError) || loading || (!!rawSvg && !mapReady);
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
            Scroll to zoom · Drag to pan · Click a seat to select
          </span>
        </div>
      )}
    </>
  );
};

export default SvgFloorMapPage;