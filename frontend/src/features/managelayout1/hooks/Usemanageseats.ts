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
    fetchSeats,
    updateSeat,
    markDirty,
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
  }, [layoutId]);

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
      if (query && s.seat_code.toLowerCase() !== query)                                                          return false;
      if (filters.seat_type !== "All" && (s.seat_type ?? "").toUpperCase() !== filters.seat_type.toUpperCase()) return false;
      if (filters.status    !== "All" && (s.status    ?? "").toUpperCase() !== filters.status.toUpperCase())    return false;
      if (filters.bookable  !== "All" && s.is_bookable !== (filters.bookable === "Yes"))                        return false;
      if (filters.amenity   !== "All" && !s.amenity_ids.includes(filters.amenity))                              return false;
      return true;
    });
  }, [seats, filters]);

  // Static list — always show all types regardless of what's configured
  const seatTypes = ["All", "STANDARD", "WINDOW", "CABIN", "ACCESSIBLE", "HOT_DESK"];

  // ── Selection ──────────────────────────────────────────────────────────
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleSelect = useCallback((svgId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(svgId) ? next.delete(svgId) : next.add(svgId);
      return next;
    });
  }, []);

  const selectAll      = useCallback(() => setSelected(new Set(filteredSeats.map((s) => s.seat_svg_id))), [filteredSeats]);
  const clearSelection = useCallback(() => setSelected(new Set()), []);

  const isAllSelected   = filteredSeats.length > 0 && filteredSeats.every((s) => selected.has(s.seat_svg_id));
  const isIndeterminate = selected.size > 0 && !isAllSelected;

  // ── Edit panel ─────────────────────────────────────────────────────────
  const [editingSeat, setEditingSeat] = useState<Seat | null>(null);

  const openEditPanel  = useCallback((seat: Seat) => setEditingSeat(seat), []);
  const closeEditPanel = useCallback(() => setEditingSeat(null), []);

  // ── Save seat ──────────────────────────────────────────────────────────
  const saveSeat = useCallback(async (payload: SeatUpdatePayload) => {
    const seat = seats.find((s) => s.seat_svg_id === payload.seat_svg_id);
    if (!seat) throw new Error("Seat not found");

    await configureSeat(seat.layout_seat_mapping_id, {
      seat_name:   seat.seat_code,
      seat_type:   payload.seat_type,
      status:      payload.status,
      is_bookable: payload.is_bookable,
      is_reserved: seat.is_reserved,
      amenity_ids: payload.amenity_ids.map(Number),
    });

    const updated: Seat = {
      ...seat,
      seat_type:     payload.seat_type,
      status:        payload.status,
      is_bookable:   payload.is_bookable,
      is_configured: true,
      amenity_ids:   payload.amenity_ids,
      notes:         payload.notes ?? seat.notes,
    };

    updateSeat(updated);
    markDirty();
    setEditingSeat(null);

    return updated;
  }, [seats, updateSeat, markDirty]);

  // ── Bulk edit ──────────────────────────────────────────────────────────
  const [bulkOpen, setBulkOpen] = useState(false);

  const openBulkEdit  = useCallback(() => setBulkOpen(true),  []);
  const closeBulkEdit = useCallback(() => setBulkOpen(false), []);

  const saveBulk = useCallback(async (payload: BulkUpdatePayload) => {
    const affectedSeats = seats.filter((s) => payload.seat_svg_ids.includes(s.seat_svg_id));
    if (affectedSeats.length === 0) return;

    const mappingIds = affectedSeats.map((s) => s.layout_seat_mapping_id);
    const first      = affectedSeats[0];

    await bulkConfigureSeats(mappingIds, {
      seat_type:   payload.seat_type   ?? first.seat_type   ?? "STANDARD",
      status:      payload.status      ?? first.status      ?? "ACTIVE",
      is_bookable: payload.is_bookable ?? first.is_bookable ?? true,
      is_reserved: first.is_reserved,
      amenity_ids: (payload.amenity_ids ?? first.amenity_ids).map(Number),
    });

    await fetchSeats(layoutId);
    markDirty();

    clearSelection();
    setBulkOpen(false);
  }, [seats, layoutId, clearSelection, fetchSeats, markDirty]);

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
    filters,
    updateFilter,
    resetFilters,
    seatTypes,

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
