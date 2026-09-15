"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import type { Layout } from "@/features/managelayout/types/layout.types";
import type {
  Seat,
  SeatFilters,
  SeatUpdatePayload,
  BulkUpdatePayload,
  ViewMode,
} from "../types/seat.types";
import { Preference } from "../types/layout.types";
import {
  getLayoutsByFloor,
  fetchAllPreferences,
} from "@/features/managelayout/services/layoutService";
import {
  configureSeat,
  bulkConfigureSeats,
} from "../services/seatService";
import { useSeatsStore } from "@/store/seatStore";
import {
  categoryOf,
  SEAT_TYPES,
  SpaceCategory,
} from "../utils/spaceCategory";

const DEFAULT_FILTERS: SeatFilters = {
  search:    "",
  seat_type: "All",
  status:    "All",
  bookable:  "All",
  amenity:   "All",
};

export function useManageSeats() {
  const searchParams = useSearchParams();

  const layoutId   = searchParams.get("layoutId")   ?? "";
  const floorId    = searchParams.get("floorId")    ?? "";
  const buildingId = searchParams.get("buildingId") ?? "";
  const siteId     = searchParams.get("siteId")     ?? "";

  // ── Zustand store ──────────────────────────────────────────────────────
  const {
    seats,
    stats,
    loading: statsLoading,
    isDirty,
    fetchSeats,
    updateSeat,
    applyLocalEdit,
    markDirty,
    clearDirty,
  } = useSeatsStore();

  // ── Layout ─────────────────────────────────────────────────────────────
  const [layout,        setLayout]        = useState<Layout | null>(null);
  const [layoutLoading, setLayoutLoading] = useState(true);
  const [layoutError,   setLayoutError]   = useState(false);

  useEffect(() => {
    if (!floorId || !layoutId) { setLayout(null); setLayoutLoading(false); return; }
    setLayoutLoading(true);
    setLayoutError(false);
    setLayout(null);

    getLayoutsByFloor(floorId)
      .then((layouts) => {
        const match = layouts.find((l) => String(l.layout_id) === String(layoutId));
        setLayout(match ?? layouts[0] ?? null);
      })
      .catch(() => setLayoutError(true))
      .finally(() => setLayoutLoading(false));
  }, [floorId, layoutId]);

  // ── Fetch seats into Zustand store ─────────────────────────────────────
  const [seatsError, setSeatsError] = useState(false);

  useEffect(() => {
    if (!layoutId) return;
    setSeatsError(false);
    fetchSeats(layoutId).catch(() => setSeatsError(true));
  }, [layoutId, fetchSeats]);

  // ── Preferences ────────────────────────────────────────────────────────
  const [preferences, setPreferences] = useState<Preference[]>([]);

  useEffect(() => {
    fetchAllPreferences().then(setPreferences).catch(console.error);
  }, []);

  // ── Space category (Manage Spaces tabs) ───────────────────────────────────
  // A seat's category is driven entirely by its real, configured seat_type —
  // never inferred from its SVG id (that's a prefill suggestion only, see
  // spaceCategory.ts). An unconfigured seat always falls under Seats. "ALL"
  // is a view-only tab (everything combined, matching the original flat
  // list this page had before category tabs existed) — it's the default
  // landing tab for exactly that reason, so opening the page still looks
  // like what it always did until an admin narrows to one category.
  const [activeCategory, setActiveCategoryState] = useState<SpaceCategory>("ALL");

  // ── Filters ────────────────────────────────────────────────────────────
  const [filters, setFilters] = useState<SeatFilters>(DEFAULT_FILTERS);

  const updateFilter = useCallback(<K extends keyof SeatFilters>(
    key: K,
    value: SeatFilters[K]
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => setFilters(DEFAULT_FILTERS), []);

  // Switching tabs resets everything that only makes sense within the
  // previous tab: the sub-type filter (Cabins/Conference Rooms have none —
  // carrying e.g. seat_type="WINDOW" across would silently empty the table
  // with no visible cause), the current selection (svg-id based; a
  // selection spanning tabs would bulk-edit rows the admin can no longer
  // see), and the edit panel (editing a seat that just scrolled out of view
  // is confusing).
  const setActiveCategory = useCallback((next: SpaceCategory) => {
    setActiveCategoryState(next);
    setFilters((prev) => ({ ...prev, seat_type: "All" }));
    setSelected(new Set());
    setEditingSeat(null);
  }, []);

  // The search box stays bound directly to `filters.search` (see
  // SeatFiltersBar) so every keystroke shows up immediately — debouncing
  // that would make typing itself feel laggy. What actually needs debouncing
  // is downstream of it: filteredSeats feeds LayoutPreview's colorSeats,
  // which runs a chain of regex passes over the full floor-plan SVG text,
  // so re-filtering (and re-coloring the map) on every single keystroke
  // instead of once the user pauses is real, wasted work and a flickery map.
  // Only `search` is debounced — the dropdown filters (seat_type/status/
  // bookable/amenity) already only fire once per discrete selection, not
  // per keystroke, so they don't have this problem.
  const [debouncedSearch, setDebouncedSearch] = useState(filters.search);
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(filters.search), 350);
    return () => clearTimeout(id);
  }, [filters.search]);

  // Stage 1 — every seat belonging to the active tab, before any filter is
  // applied. Drives the tab's stat cards and the table's "N Cabins" heading.
  // "ALL" shows every seat regardless of category — categoryOf never
  // returns "ALL" itself (it only classifies a seat into one of the 3 real
  // categories), so this has to special-case it rather than compare against it.
  const categorySeats = useMemo(
    () => activeCategory === "ALL" ? seats : seats.filter((s) => categoryOf(s.seat_type) === activeCategory),
    [seats, activeCategory]
  );

  // Stage 2 — the filter predicate, scoped to the active tab's seats only.
  const filteredSeats = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();
    return categorySeats.filter((s) => {
      if (query && !s.seat_code.toLowerCase().includes(query))                                                    return false;
      if (filters.seat_type !== "All" && (s.seat_type ?? "").toUpperCase() !== filters.seat_type.toUpperCase()) return false;
      if (filters.status    !== "All" && (s.status    ?? "").toUpperCase() !== filters.status.toUpperCase())    return false;
      if (filters.bookable  !== "All" && s.is_bookable !== (filters.bookable === "Yes"))                        return false;
      if (filters.amenity   !== "All" && !s.amenity_ids.includes(filters.amenity))                              return false;
      return true;
    });
  }, [categorySeats, debouncedSearch, filters.seat_type, filters.status, filters.bookable, filters.amenity]);

  // Tab badge counts — always over ALL seats, never scoped to the currently
  // active tab, or every tab but the active one would show 0. ALL's count
  // is the total; the other three are populated per-seat below.
  const categoryCounts = useMemo(() => {
    const counts: Record<SpaceCategory, number> = { ALL: seats.length, SEATS: 0, CABINS: 0, CONFERENCE_ROOMS: 0 };
    for (const s of seats) counts[categoryOf(s.seat_type)] += 1;
    return counts;
  }, [seats]);

  // The stat-card numbers for the active tab — same five metrics the page
  // showed for the whole layout before, now scoped to categorySeats, plus a
  // capacity total shown only for Conference Rooms.
  const categoryStats = useMemo(() => ({
    total:         categorySeats.length,
    configured:    categorySeats.filter((s) => s.is_configured).length,
    unconfigured:  categorySeats.filter((s) => !s.is_configured).length,
    nonBookable:   categorySeats.filter((s) => s.is_bookable === false).length,
    inactive:      categorySeats.filter((s) => s.status === "INACTIVE").length,
    totalCapacity: activeCategory === "CONFERENCE_ROOMS"
      ? categorySeats.reduce((sum, s) => sum + (s.capacity ?? 0), 0)
      : null,
  }), [categorySeats, activeCategory]);

  // Whether a filter is actually narrowing the seat list — driven by the
  // filter inputs themselves, not by comparing filteredSeats.length to
  // seats.length. Those two aren't equivalent: a real, active filter can
  // still land on the same count as the full seat list (e.g. by coincidence,
  // or if `seats` and the matched subset happen to be the same size), and
  // that shouldn't be read as "no filter applied" — doing so was silently
  // skipping the map's yellow highlight for genuine filter matches.
  //
  // Uses debouncedSearch, not filters.search, so this flips in lockstep with
  // filteredSeats — otherwise, mid-debounce, this would go true on the very
  // first keystroke while filteredSeats still reflected the previous
  // (possibly empty) query, briefly highlighting every seat as "matched".
  const hasActiveFilters =
    debouncedSearch.trim() !== "" ||
    filters.seat_type !== "All" ||
    filters.status    !== "All" ||
    filters.bookable  !== "All" ||
    filters.amenity   !== "All";

  // A tab that narrows to one real category (Cabins/Conference Rooms) is
  // itself a narrowing, even with no filters set — without this, switching
  // to the Cabins tab with nothing else filtered would leave the map
  // completely unhighlighted, reading as "the tab did nothing." ALL and
  // Seats are both "show everything normally" baseline states (ALL always
  // was; Seats is the largest/default-feeling category), so neither forces
  // a highlight on their own.
  const isMapHighlightActive = hasActiveFilters || (activeCategory !== "SEATS" && activeCategory !== "ALL");

  // Sub-type filter only exists under Seats — the original list, unchanged.
  // null signals "this tab has no sub-types, hide the dropdown" (also true
  // for ALL, since a mixed list has no single sub-type set to filter by).
  const subTypeOptions = activeCategory === "SEATS" ? ["All", ...SEAT_TYPES] : null;

  // ── Selection ──────────────────────────────────────────────────────────
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleSelect = useCallback((svgId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(svgId)) {
        next.delete(svgId);
      } else {
        next.add(svgId);
      }
      return next;
    });
  }, []);

  // Selection is no longer restricted to unconfigured seats — Cabins and
  // Conference Rooms only ever contain already-configured rows (an
  // unconfigured seat always shows under Seats, see categoryOf), so
  // excluding configured seats from selection would leave those two tabs
  // with nothing bulk-selectable at all. Any row in the active tab's
  // filtered list can now be selected, letting Bulk Edit both configure
  // fresh Seats rows and re-edit a batch of existing Cabins/Conference
  // Rooms together (see saveBulk's per-seat field resolution below, which
  // is what makes re-editing a mix of differing existing seats safe).
  const selectAll      = useCallback(() => setSelected(new Set(filteredSeats.map((s) => s.seat_svg_id))), [filteredSeats]);
  const clearSelection = useCallback(() => setSelected(new Set()), []);

  const isAllSelected   = filteredSeats.length > 0 && filteredSeats.every((s) => selected.has(s.seat_svg_id));
  const isIndeterminate = selected.size > 0 && !isAllSelected;

  // ── Edit panel ─────────────────────────────────────────────────────────
  const [editingSeat, setEditingSeat] = useState<Seat | null>(null);

  const openEditPanel  = useCallback((seat: Seat) => setEditingSeat(seat), []);
  const closeEditPanel = useCallback(() => setEditingSeat(null), []);

  // ── Save seat ──────────────────────────────────────────────────────────
  // For an already-published layout, edits are staged locally only (no PATCH)
  // until the admin explicitly publishes — see usePublishLayout, which
  // flushes everything still in dirtyMappingIds before re-syncing the live
  // layout. applyLocalEdit compares against the seat's original fetched
  // value, so editing it back to that value (e.g. Active -> Inactive ->
  // Active) un-marks it as pending instead of leaving it stuck dirty.
  const saveSeat = useCallback(async (payload: SeatUpdatePayload) => {
    const seat = seats.find((s) => s.seat_svg_id === payload.seat_svg_id);
    if (!seat) throw new Error("Seat not found");

    const isPublished = layout?.is_published === true;

    if (!isPublished) {
      await configureSeat(seat.layout_seat_mapping_id, {
        seat_name:   seat.seat_code,
        seat_type:   payload.seat_type,
        status:      payload.status,
        is_bookable: payload.is_bookable,
        is_reserved: seat.is_reserved,
        amenity_ids: payload.amenity_ids.map(Number),
        capacity:    payload.capacity,
      });
    }

    const updated: Seat = {
      ...seat,
      seat_type:     payload.seat_type,
      status:        payload.status,
      is_bookable:   payload.is_bookable,
      is_configured: true,
      amenity_ids:   payload.amenity_ids,
      notes:         payload.notes ?? seat.notes,
      capacity:      payload.capacity !== undefined ? payload.capacity : seat.capacity,
    };

    if (isPublished) {
      applyLocalEdit(updated);
    } else {
      updateSeat(updated);
      markDirty();
    }

    setEditingSeat(null);
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(payload.seat_svg_id);
      return next;
    });

    return updated;
  }, [seats, layout?.is_published, updateSeat, applyLocalEdit, markDirty]);

  // ── Bulk edit ──────────────────────────────────────────────────────────
  const [bulkOpen, setBulkOpen] = useState(false);

  const openBulkEdit  = useCallback(() => setBulkOpen(true),  []);
  const closeBulkEdit = useCallback(() => setBulkOpen(false), []);

  const saveBulk = useCallback(async (payload: BulkUpdatePayload) => {
    const affectedSeats = seats.filter((s) => payload.seat_svg_ids.includes(s.seat_svg_id));
    if (affectedSeats.length === 0) return;

    const isPublished = layout?.is_published === true;

    // Resolved PER SEAT — not from one shared "first selected seat"
    // snapshot. A field left blank in the bulk-edit form means "keep this
    // seat's own existing value," which only holds if each seat's own
    // current value is the fallback used for it. Falling back to a single
    // `first` seat's values for everyone was invisible while bulk edit only
    // ever targeted freshly-unconfigured seats (all sharing the same null
    // defaults) — but now that already-configured, possibly-differing
    // Cabins/Conference Rooms can be bulk-selected too (see selectAll
    // above), that shared fallback would silently overwrite every other
    // selected seat's untouched fields with whichever seat happened to be
    // first in the array.
    const resolveFor = (seat: Seat) => ({
      seat_type:   payload.seat_type   ?? seat.seat_type   ?? "STANDARD",
      status:      payload.status      ?? seat.status      ?? "ACTIVE",
      is_bookable: payload.is_bookable ?? seat.is_bookable ?? true,
      is_reserved: seat.is_reserved,
      amenity_ids: (payload.amenity_ids ?? seat.amenity_ids).map(Number),
      capacity:    payload.capacity !== undefined ? payload.capacity : seat.capacity,
    });

    if (isPublished) {
      // Local-only: apply to every affected seat's in-memory state and stage
      // it for the Publish flush. Deliberately no fetchSeats() here — nothing
      // changed server-side yet, and refetching would overwrite these edits
      // with the still-unchanged server state. applyLocalEdit compares each
      // seat against its original fetched value, so any seat this bulk edit
      // happens to land back on its original config is un-marked as pending.
      affectedSeats.forEach((seat) => {
        const resolved = resolveFor(seat);
        applyLocalEdit({
          ...seat,
          seat_type:     resolved.seat_type,
          status:        resolved.status,
          is_bookable:   resolved.is_bookable,
          is_configured: true,
          amenity_ids:   resolved.amenity_ids.map(String),
          capacity:      resolved.capacity,
        });
      });
    } else {
      // Each entry now carries its own fully-resolved fields (resolution
      // already happened above), so no shared `defaults` merge is needed.
      await bulkConfigureSeats({
        seats: affectedSeats.map((seat) => {
          const resolved = resolveFor(seat);
          return {
            layout_seat_mapping_id: Number(seat.layout_seat_mapping_id),
            seat_type:   resolved.seat_type,
            status:      resolved.status,
            is_bookable: resolved.is_bookable,
            is_reserved: resolved.is_reserved,
            amenity_ids: resolved.amenity_ids,
            capacity:    resolved.capacity,
          };
        }),
      });
      await fetchSeats(layoutId);
      markDirty();
    }

    clearSelection();
    setBulkOpen(false);
  }, [seats, layout?.is_published, layoutId, clearSelection, fetchSeats, markDirty, applyLocalEdit]);

  // ── Discard pending changes (already-published layout only) ────────────
  // Nothing was ever written server-side, so "discarding" just means
  // re-fetching the true server state and clearing the local dirty markers.
  const discardChanges = useCallback(async () => {
    if (!layoutId) return;
    await fetchSeats(layoutId);
    clearDirty();
  }, [layoutId, fetchSeats, clearDirty]);

  // ── View toggle ────────────────────────────────────────────────────────
  const [view, setView] = useState<ViewMode>("list");

  const handleSetView = useCallback((v: ViewMode) => {
    setView(v);
    if (v !== "list") {
      setEditingSeat(null);  // collapse edit sidebar when leaving list view
      setBulkOpen(false);    // close bulk edit panel too
    }
  }, []);

  return {
    // layout
    layout,
    layoutLoading,
    layoutError,

    // url params
    layoutId,
    floorId,
    buildingId,
    siteId,

    // stats
    stats,
    statsLoading,
    seatsError,

    // space category (Manage Spaces tabs)
    activeCategory,
    setActiveCategory,
    categoryCounts,
    categoryStats,

    // seats
    seats,
    categorySeats,
    filteredSeats,
    hasActiveFilters,
    isMapHighlightActive,
    filters,
    updateFilter,
    resetFilters,
    subTypeOptions,

    // unpublished (local-only) edits on an already-published layout
    isDirty,
    discardChanges,

    // preferences
    preferences,

    // selection
    selected,
    toggleSelect,
    selectAll,
    clearSelection,
    isAllSelected,
    isIndeterminate,

    // edit panel
    editingSeat,
    openEditPanel,
    closeEditPanel,
    saveSeat,

    // bulk
    bulkOpen,
    openBulkEdit,
    closeBulkEdit,
    saveBulk,

    // view
    view,
    setView: handleSetView,
  };
}
