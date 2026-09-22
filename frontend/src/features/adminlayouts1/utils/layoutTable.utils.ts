import type { LayoutSelection } from "../hooks/useLayoutSelection";

// Cabin/conference/meeting/training room seats are grouped under one svg id
// containing a "CBN"/"CFR"/"MR"/"TR" segment (e.g. "HYD-PRV-F11-CBN-04",
// "HYD-PRV-F11-CFR-02", "HYD-PRV-F11-MR-01", "HYD-PRV-F11-TR-01"), not a
// dedicated field.
export const ROOM_SVG_ID_PATTERN = /(^|[-_])(cbn|cfr|mr|tr)([-_]|$)/i;

export const LEGEND = [
  { label: "Bookable", color: "#22C55E" },
  { label: "Non-bookable", color: "#F59E0B" },
  { label: "Inactive", color: "#EF4444" },
  { label: "Unconfigured", color: "#D1D5DB" },
] as const;

// Non-published layouts fall out of this list on their own once they've sat
// untouched (by updated_at) past their status's threshold — otherwise old
// drafts/archived rows accumulate forever. Published layouts are exempt and
// never auto-hide.
export const HIDE_AFTER_DAYS: Partial<Record<string, number>> = {
  DRAFT: 15,
  ARCHIVED: 30,
  DELETED: 5,
};

// ─── FloorLayoutsPage default selection ─────────────────────────────────────
export const DEFAULT_LAYOUT_SELECTION: LayoutSelection = {
  siteId: "", buildingId: "", floorId: "",
  siteName: "", buildingName: "", floorName: "",
};
