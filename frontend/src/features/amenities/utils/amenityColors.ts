import {
  Hand, Users, Armchair, Wifi, Link2, HandCoins, Coffee, MapPin,
  Ellipsis, ParkingCircle, ShieldCheck, ShelvingUnit, Cpu, HeartPulse, Monitor, Tag,
  type LucideIcon,
} from "lucide-react";

export interface AmenityColorSwatch {
  /** Solid color, e.g. for dots/icons in inline-styled contexts. */
  hex: string;
  /** Light background, for inline-styled badges. */
  bgHex: string;
  /** Tailwind classes for badges built with utility classes. */
  bg: string;
  text: string;
  border: string;
  dot: string;
  icon: LucideIcon;
}

// Every amenity belongs to one of these 15 fixed categories (see
// GET /amenity-categories), so the category — not the individual amenity —
// owns the color. All amenities in the same category share one color,
// and that color is used everywhere an amenity is shown in the app.
const CATEGORY_COLORS: Record<string, AmenityColorSwatch> = {
  "ACCESSIBILITY":       { hex: "#14b8a6", bgHex: "#f0fdfa", bg: "bg-teal-50",     text: "text-teal-700",     border: "border-teal-200",     dot: "bg-teal-500",     icon: Hand },
  "COLLABORATION":       { hex: "#8b5cf6", bgHex: "#f5f3ff", bg: "bg-violet-50",   text: "text-violet-700",   border: "border-violet-200",   dot: "bg-violet-500",   icon: Users },
  "COMFORT":             { hex: "#ec4899", bgHex: "#fdf2f8", bg: "bg-pink-50",     text: "text-pink-700",     border: "border-pink-200",     dot: "bg-pink-500",     icon: Armchair },
  "CONNECTIVITY":        { hex: "#0ea5e9", bgHex: "#f0f9ff", bg: "bg-sky-50",      text: "text-sky-700",      border: "border-sky-200",      dot: "bg-sky-500",      icon: Wifi },
  "ENVIRONMENT":         { hex: "#a855f7", bgHex: "#faf5ff", bg: "bg-purple-50",   text: "text-purple-700",   border: "border-purple-200",   dot: "bg-purple-500",   icon: Link2 },
  "FACILITIES":          { hex: "#f59e0b", bgHex: "#fffbeb", bg: "bg-amber-50",    text: "text-amber-700",    border: "border-amber-200",    dot: "bg-amber-500",    icon: HandCoins },
  "FOOD & BEVERAGE":     { hex: "#f97316", bgHex: "#fff7ed", bg: "bg-orange-50",   text: "text-orange-700",   border: "border-orange-200",   dot: "bg-orange-500",   icon: Coffee },
  "LOCATION PREFERENCE": { hex: "#f43f5e", bgHex: "#fff1f2", bg: "bg-rose-50",     text: "text-rose-700",     border: "border-rose-200",     dot: "bg-rose-500",     icon: MapPin },
  "OTHER":               { hex: "#64748b", bgHex: "#f8fafc", bg: "bg-slate-50",    text: "text-slate-700",    border: "border-slate-200",    dot: "bg-slate-500",    icon: Ellipsis },
  "PARKING":             { hex: "#10b981", bgHex: "#ecfdf5", bg: "bg-emerald-50",  text: "text-emerald-700",  border: "border-emerald-200",  dot: "bg-emerald-500",  icon: ParkingCircle },
  "SAFETY & SECURITY":   { hex: "#ef4444", bgHex: "#fef2f2", bg: "bg-red-50",      text: "text-red-700",      border: "border-red-200",      dot: "bg-red-500",      icon: ShieldCheck },
  "STORAGE":             { hex: "#6366f1", bgHex: "#eef2ff", bg: "bg-indigo-50",   text: "text-indigo-700",   border: "border-indigo-200",   dot: "bg-indigo-500",   icon: ShelvingUnit },
  "TECHNOLOGY":          { hex: "#3b82f6", bgHex: "#eff6ff", bg: "bg-blue-50",     text: "text-blue-700",     border: "border-blue-200",     dot: "bg-blue-500",     icon: Cpu },
  "WELLNESS":            { hex: "#84cc16", bgHex: "#f7fee7", bg: "bg-lime-50",     text: "text-lime-700",     border: "border-lime-200",     dot: "bg-lime-500",     icon: HeartPulse },
  "WORKSPACE":           { hex: "#d946ef", bgHex: "#fdf4ff", bg: "bg-fuchsia-50",  text: "text-fuchsia-700",  border: "border-fuchsia-200",  dot: "bg-fuchsia-500",  icon: Monitor },
};

const CATEGORY_COLOR_LIST = Object.values(CATEGORY_COLORS);

const DEFAULT_COLOR: AmenityColorSwatch = {
  hex: "#6b7280", bgHex: "#f9fafb", bg: "bg-gray-50", text: "text-gray-600", border: "border-gray-200", dot: "bg-gray-400", icon: Tag,
};

function hashString(value: string): number {
  const key = value.trim().toLowerCase();
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = key.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

/**
 * Color for a category. One of the 15 fixed categories gets its exact,
 * assigned color. A category outside that fixed set (e.g. a newly added
 * one) still gets a color from the same 15-color palette — deterministically
 * hashed from its name — so colors repeat/cycle rather than falling back to
 * a flat gray "unknown" look.
 */
export function getCategoryColor(categoryName: string | null | undefined): AmenityColorSwatch {
  if (!categoryName) return DEFAULT_COLOR;
  const known = CATEGORY_COLORS[categoryName.trim().toUpperCase()];
  if (known) return known;
  return CATEGORY_COLOR_LIST[hashString(categoryName) % CATEGORY_COLOR_LIST.length];
}

/**
 * Color for an amenity. Pass `category` whenever it's known (seat/amenity
 * data that carries a category) for an exact match with the Amenities admin
 * table. When only the amenity's name is available (some booking-flow
 * surfaces only carry amenity name strings), falls back to a deterministic
 * pick from the same 15-category palette, keyed by name, so the color is
 * still stable across renders and drawn from the same color set.
 */
export function getAmenityColor(name: string | null | undefined, category?: string | null): AmenityColorSwatch {
  if (category) return getCategoryColor(category);
  if (!name) return DEFAULT_COLOR;
  return CATEGORY_COLOR_LIST[hashString(name) % CATEGORY_COLOR_LIST.length];
}
