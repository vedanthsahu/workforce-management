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

  // ── Filters ────────────────────────────────────────────────────────────
  const [filters, setFilters] = useState<SeatFilters>(DEFAULT_FILTERS);

  const updateFilter = useCallback(<K extends keyof SeatFilters>(
    key: K,
    value: SeatFilters[K]
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => setFilters(DEFAULT_FILTERS), []);

  const filteredSeats = useMemo(() => {
    const query = filters.search.trim().toLowerCase();
    return seats.filter((s) => {
      if (query && !s.seat_code.toLowerCase().includes(query))                                                    return false;
      if (filters.seat_type !== "All" && (s.seat_type ?? "").toUpperCase() !== filters.seat_type.toUpperCase()) return false;
      if (filters.status    !== "All" && (s.status    ?? "").toUpperCase() !== filters.status.toUpperCase())    return false;
      if (filters.bookable  !== "All" && s.is_bookable !== (filters.bookable === "Yes"))                        return false;
      if (filters.amenity   !== "All" && !s.amenity_ids.includes(filters.amenity))                              return false;
      return true;
    });
  }, [seats, filters]);

  // Whether a filter is actually narrowing the seat list — driven by the
  // filter inputs themselves, not by comparing filteredSeats.length to
  // seats.length. Those two aren't equivalent: a real, active filter can
  // still land on the same count as the full seat list (e.g. by coincidence,
  // or if `seats` and the matched subset happen to be the same size), and
  // that shouldn't be read as "no filter applied" — doing so was silently
  // skipping the map's yellow highlight for genuine filter matches.
  const hasActiveFilters =
    filters.search.trim() !== "" ||
    filters.seat_type !== "All" ||
    filters.status    !== "All" ||
    filters.bookable  !== "All" ||
    filters.amenity   !== "All";

  // Static list — always show all types regardless of what's configured
  const seatTypes = ["All", "STANDARD", "WINDOW", "CABIN", "ACCESSIBLE", "HOT_DESK"];

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

  const selectAll      = useCallback(() => setSelected(new Set(filteredSeats.filter((s) => !s.is_configured).map((s) => s.seat_svg_id))), [filteredSeats]);
  const clearSelection = useCallback(() => setSelected(new Set()), []);

  const unconfiguredSeats = filteredSeats.filter((s) => !s.is_configured);
  const isAllSelected   = unconfiguredSeats.length > 0 && unconfiguredSeats.every((s) => selected.has(s.seat_svg_id));
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

    const mappingIds  = affectedSeats.map((s) => s.layout_seat_mapping_id);
    const first        = affectedSeats[0];
    const isPublished  = layout?.is_published === true;

    const resolvedPayload = {
      seat_type:   payload.seat_type   ?? first.seat_type   ?? "STANDARD",
      status:      payload.status      ?? first.status      ?? "ACTIVE",
      is_bookable: payload.is_bookable ?? first.is_bookable ?? true,
      is_reserved: first.is_reserved,
      amenity_ids: (payload.amenity_ids ?? first.amenity_ids).map(Number),
    };

    if (isPublished) {
      // Local-only: apply to every affected seat's in-memory state and stage
      // it for the Publish flush. Deliberately no fetchSeats() here — nothing
      // changed server-side yet, and refetching would overwrite these edits
      // with the still-unchanged server state. applyLocalEdit compares each
      // seat against its original fetched value, so any seat this bulk edit
      // happens to land back on its original config is un-marked as pending.
      affectedSeats.forEach((seat) => {
        applyLocalEdit({
          ...seat,
          seat_type:     resolvedPayload.seat_type,
          status:        resolvedPayload.status,
          is_bookable:   resolvedPayload.is_bookable,
          is_configured: true,
          amenity_ids:   resolvedPayload.amenity_ids.map(String),
        });
      });
    } else {
      // All affected seats share one config, so it goes in `defaults` and
      // each entry only needs to carry its own mapping id.
      await bulkConfigureSeats({
        defaults: resolvedPayload,
        seats: mappingIds.map((id) => ({ layout_seat_mapping_id: Number(id) })),
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

    // seats
    seats,
    filteredSeats,
    hasActiveFilters,
    filters,
    updateFilter,
    resetFilters,
    seatTypes,

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
