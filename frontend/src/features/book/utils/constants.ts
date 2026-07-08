import type {
  SeatPalette,
  DayStatusConfig,
  TooltipStatusConfig,
  PreferenceMatchConfig,
} from "../types/Bookingform.types";

// ── Floor map SVG dimensions ───────────────────────────────────────────────────
export const SVG_W = 2466;
export const SVG_H = 2039;

// ── Zoom limits & steps ─────────────────────────────────────────────────────────
export const ZOOM_MIN = 0.05;
export const ZOOM_MAX = 4;
export const ZOOM_BUTTON_FACTOR = 1.25;
export const ZOOM_WHEEL_FACTOR = 1.1;

// ── Tooltip layout ────────────────────────────────────────────────────────────
export const TOOLTIP_WIDTH = 248;
export const TOOLTIP_PADDING = 12;

// ── Seat color palettes (keyed by seat status / match) ─────────────────────────
export const SEAT_PALETTES: Record<string, SeatPalette> = {
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
    body: "#c7d2fe", bodyStroke: "#6366f1",
    armrest: "#a5b4fc",
    back: "#4338ca", backStroke: "#3730a3",
    curve: "#6366f1", arc: "#818cf8",
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

// ── Daily availability strip status styles ──────────────────────────────────────
export const DAY_STATUS_CONFIG: Record<string, DayStatusConfig> = {
  AVAILABLE:   { bg: "#d1fae5", text: "#065f46", dot: "#10b981", label: "Available"    },
  BOOKED:      { bg: "#fee2e2", text: "#991b1b", dot: "#ef4444", label: "Booked"       },
  BLOCKED:     { bg: "#f3f4f6", text: "#374151", dot: "#9ca3af", label: "Blocked"      },
  UNAVAILABLE: { bg: "#f3f4f6", text: "#374151", dot: "#9ca3af", label: "Unavailable"  },
  YOURS:       { bg: "#dbeafe", text: "#1e40af", dot: "#3b82f6", label: "Your Booking" },
};

// ── Seat tooltip status / preference-match styles ────────────────────────────────
export const SEAT_STATUS_CONFIG: Record<string, TooltipStatusConfig> = {
  available:   { label: "Available",    color: "#059669", bg: "#d1fae5" },
  booked:      { label: "Booked",       color: "#dc2626", bg: "#fee2e2" },
  unavailable: { label: "Unavailable",  color: "#6b7280", bg: "#f3f4f6" },
  yours:       { label: "Your Booking", color: "#1d4ed8", bg: "#dbeafe" },
};

export const PREFERENCE_MATCH_CONFIG: Record<string, PreferenceMatchConfig> = {
  FULL_MATCH:    { label: "Best Match",    color: "#92400e", bg: "#fef3c7", icon: "⭐" },
  PARTIAL_MATCH: { label: "Partial Match", color: "#92400e", bg: "#fefce8", icon: "✦"  },
  NO_MATCH:      { label: "No Match",      color: "#6b7280", bg: "#f3f4f6", icon: ""   },
};
