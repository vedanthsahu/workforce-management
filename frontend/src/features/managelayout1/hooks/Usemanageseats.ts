// // // // "use client";

// // // // import { useCallback, useEffect, useMemo, useState } from "react";
// // // // import { useSearchParams } from "next/navigation";
// // // // import { axiosInstance } from "@/lib/http/axios";

// // // // import type { Layout, LayoutSeatStats } from "@/features/managelayout/types/layout.types";
// // // // import { fetchAllPreferences, Preference }           from "@/features/managelayout/services/layoutService";

// // // // import type {
// // // //   Seat,
// // // //   SeatFilters,
// // // //   SeatUpdatePayload,
// // // //   BulkUpdatePayload,
// // // //   ViewMode,
// // // // } from "../types/seat.types";

// // // // import {
// // // //   fetchSeatsByLayout,
// // // //   fetchLayoutSeatStats,
// // // //   updateSeat,
// // // //   bulkUpdateSeats,
// // // // } from "../services/seatService";

// // // // // ─────────────────────────────────────────────────────────────────────────────

// // // // const DEFAULT_FILTERS: SeatFilters = {
// // // //   search:    "",
// // // //   seat_type: "All",
// // // //   status:    "All",
// // // //   bookable:  "All",
// // // //   amenity:   "All",
// // // // };

// // // // // ─────────────────────────────────────────────────────────────────────────────

// // // // export function useManageSeats() {
// // // //   const searchParams = useSearchParams();
// // // //   const layoutId     = searchParams.get("layoutId");

// // // //   // ── Layout ─────────────────────────────────────────────────────────────
// // // //   const [layout,        setLayout]        = useState<Layout | null>(null);
// // // //   const [layoutLoading, setLayoutLoading] = useState(true);
// // // //   const [layoutError,   setLayoutError]   = useState(false);

// // // //   useEffect(() => {
// // // //     if (!layoutId) { setLayoutLoading(false); return; }
// // // //     setLayoutLoading(true);
// // // //     axiosInstance
// // // //       .get<Layout>(`/admin/floor-layouts/${layoutId}`)
// // // //       .then(({ data }) => setLayout(data))
// // // //       .catch(() => setLayoutError(true))
// // // //       .finally(() => setLayoutLoading(false));
// // // //   }, [layoutId]);

// // // //   // ── Preferences ────────────────────────────────────────────────────────
// // // //   const [preferences, setPreferences] = useState<Preference[]>([]);

// // // //   useEffect(() => {
// // // //     fetchAllPreferences()
// // // //       .then(setPreferences)
// // // //       .catch(console.error);
// // // //   }, []);

// // // //   // ── Seats + Stats ──────────────────────────────────────────────────────
// // // //   const [seats,        setSeats]        = useState<Seat[]>([]);
// // // //   const [stats,        setStats]        = useState<LayoutSeatStats | null>(null);
// // // //   const [statsLoading, setStatsLoading] = useState(false);

// // // //   const loadSeats = useCallback(async () => {
// // // //     if (!layoutId) return;
// // // //     setStatsLoading(true);
// // // //     try {
// // // //       const [seatsData, statsData] = await Promise.all([
// // // //         fetchSeatsByLayout(layoutId),
// // // //         fetchLayoutSeatStats(layoutId),
// // // //       ]);
// // // //       setSeats(seatsData);
// // // //       setStats(statsData);
// // // //     } catch (e) {
// // // //       console.error(e);
// // // //     } finally {
// // // //       setStatsLoading(false);
// // // //     }
// // // //   }, [layoutId]);

// // // //   useEffect(() => { loadSeats(); }, [loadSeats]);

// // // //   // ── Filters ────────────────────────────────────────────────────────────
// // // //   const [filters, setFilters] = useState<SeatFilters>(DEFAULT_FILTERS);

// // // //   const updateFilter = useCallback(<K extends keyof SeatFilters>(key: K, value: SeatFilters[K]) => {
// // // //     setFilters((prev) => ({ ...prev, [key]: value }));
// // // //   }, []);

// // // //   const resetFilters = useCallback(() => setFilters(DEFAULT_FILTERS), []);

// // // //   const filteredSeats = useMemo(() => {
// // // //     return seats.filter((s) => {
// // // //       if (filters.search    && !s.seat_code.toLowerCase().includes(filters.search.toLowerCase())) return false;
// // // //       if (filters.seat_type !== "All" && s.seat_type !== filters.seat_type) return false;
// // // //       if (filters.status    !== "All" && s.status    !== filters.status)    return false;
// // // //       if (filters.bookable  !== "All" && s.is_bookable !== (filters.bookable === "Yes")) return false;
// // // //       if (filters.amenity   !== "All" && !s.amenity_ids.includes(filters.amenity)) return false;
// // // //       return true;
// // // //     });
// // // //   }, [seats, filters]);

// // // //   const seatTypes = useMemo(() => ["All", ...new Set(seats.map((s) => s.seat_type))], [seats]);

// // // //   // ── Selection ──────────────────────────────────────────────────────────
// // // //   const [selected, setSelected] = useState<Set<string>>(new Set());

// // // //   const toggleSelect = useCallback((svgId: string) => {
// // // //     setSelected((prev) => {
// // // //       const next = new Set(prev);
// // // //       next.has(svgId) ? next.delete(svgId) : next.add(svgId);
// // // //       return next;
// // // //     });
// // // //   }, []);

// // // //   const selectAll = useCallback(
// // // //     () => setSelected(new Set(filteredSeats.map((s) => s.seat_svg_id))),
// // // //     [filteredSeats]
// // // //   );

// // // //   const clearSelection = useCallback(() => setSelected(new Set()), []);

// // // //   const isAllSelected   = filteredSeats.length > 0 && filteredSeats.every((s) => selected.has(s.seat_svg_id));
// // // //   const isIndeterminate = selected.size > 0 && !isAllSelected;

// // // //   // ── Edit panel ─────────────────────────────────────────────────────────
// // // //   const [editingSeat, setEditingSeat] = useState<Seat | null>(null);

// // // //   const openEditPanel  = useCallback((seat: Seat) => setEditingSeat(seat), []);
// // // //   const closeEditPanel = useCallback(() => setEditingSeat(null), []);

// // // //   const saveSeat = useCallback(async (payload: SeatUpdatePayload) => {
// // // //     const updated = await updateSeat(payload);
// // // //     setSeats((prev) => prev.map((s) => s.seat_svg_id === updated.seat_svg_id ? updated : s));
// // // //     if (layoutId) fetchLayoutSeatStats(layoutId).then(setStats).catch(() => {});
// // // //     return updated;
// // // //   }, [layoutId]);

// // // //   // ── Bulk edit ──────────────────────────────────────────────────────────
// // // //   const [bulkOpen, setBulkOpen] = useState(false);

// // // //   const openBulkEdit  = useCallback(() => setBulkOpen(true), []);
// // // //   const closeBulkEdit = useCallback(() => setBulkOpen(false), []);

// // // //   const saveBulk = useCallback(async (payload: BulkUpdatePayload) => {
// // // //     await bulkUpdateSeats(payload);
// // // //     await loadSeats();
// // // //     clearSelection();
// // // //     setBulkOpen(false);
// // // //   }, [loadSeats, clearSelection]);

// // // //   // ── View toggle ────────────────────────────────────────────────────────
// // // //   const [view, setView] = useState<ViewMode>("map");

// // // //   // ─────────────────────────────────────────────────────────────────────────
// // // //   return {
// // // //     // layout
// // // //     layout,
// // // //     layoutLoading,
// // // //     layoutError,

// // // //     // stats
// // // //     stats,
// // // //     statsLoading,

// // // //     // seats + filters
// // // //     filteredSeats,
// // // //     filters,
// // // //     updateFilter,
// // // //     resetFilters,
// // // //     seatTypes,

// // // //     // preferences
// // // //     preferences,

// // // //     // selection
// // // //     selected,
// // // //     toggleSelect,
// // // //     selectAll,
// // // //     clearSelection,
// // // //     isAllSelected,
// // // //     isIndeterminate,

// // // //     // edit panel
// // // //     editingSeat,
// // // //     openEditPanel,
// // // //     closeEditPanel,
// // // //     saveSeat,

// // // //     // bulk
// // // //     bulkOpen,
// // // //     openBulkEdit,
// // // //     closeBulkEdit,
// // // //     saveBulk,

// // // //     // view
// // // //     view,
// // // //     setView,
// // // //   };
// // // // }

// // // "use client";

// // // import { useCallback, useEffect, useMemo, useState } from "react";
// // // import { useSearchParams } from "next/navigation";
// // // import { axiosInstance } from "@/lib/http/axios";

// // // import type { Layout, LayoutSeatStats } from "@/features/managelayout/types/layout.types";
// // // import { fetchAllPreferences }           from "@/features/managelayout/services/layoutService";


// // // import type {
// // //   Seat,
// // //   SeatFilters,
// // //   SeatUpdatePayload,
// // //   BulkUpdatePayload,
// // //   ViewMode,
// // // } from "../types/seat.types";

// // // import {
// // //   fetchSeatsByLayout,
// // //   fetchLayoutSeatStats,
// // //   updateSeat,
// // //   bulkUpdateSeats,
// // // } from "../services/seatService";
// // // import { Preference } from "../types/layout.types";

// // // // ─────────────────────────────────────────────────────────────────────────────

// // // const DEFAULT_FILTERS: SeatFilters = {
// // //   search:    "",
// // //   seat_type: "All",
// // //   status:    "All",
// // //   bookable:  "All",
// // //   amenity:   "All",
// // // };

// // // // ─────────────────────────────────────────────────────────────────────────────

// // // export function useManageSeats() {
// // //   const searchParams = useSearchParams();
// // //   const layoutId     = searchParams.get("layoutId");

// // //   // ── Layout ─────────────────────────────────────────────────────────────
// // //   const [layout,        setLayout]        = useState<Layout | null>(null);
// // //   const [layoutLoading, setLayoutLoading] = useState(true);
// // //   const [layoutError,   setLayoutError]   = useState(false);

// // //   useEffect(() => {
// // //     if (!layoutId) { setLayoutLoading(false); return; }
// // //     setLayoutLoading(true);
// // //     axiosInstance
// // //       .get<Layout>(`/admin/floor-layouts/${layoutId}`)
// // //       .then(({ data }) => setLayout(data))
// // //       .catch(() => setLayoutError(true))
// // //       .finally(() => setLayoutLoading(false));
// // //   }, [layoutId]);

// // //   // ── Preferences ────────────────────────────────────────────────────────
// // //   const [preferences, setPreferences] = useState<Preference[]>([]);

// // //   useEffect(() => {
// // //     fetchAllPreferences()
// // //       .then(setPreferences)
// // //       .catch(console.error);
// // //   }, []);

// // //   // ── Seats + Stats ──────────────────────────────────────────────────────
// // //   const [seats,        setSeats]        = useState<Seat[]>([]);
// // //   const [stats,        setStats]        = useState<LayoutSeatStats | null>(null);
// // //   const [statsLoading, setStatsLoading] = useState(false);

// // //   const loadSeats = useCallback(async () => {
// // //     if (!layoutId) return;
// // //     setStatsLoading(true);
// // //     try {
// // //       const [seatsData, statsData] = await Promise.all([
// // //         fetchSeatsByLayout(layoutId),
// // //         fetchLayoutSeatStats(layoutId),
// // //       ]);
// // //       setSeats(seatsData);
// // //       setStats(statsData);
// // //     } catch (e) {
// // //       console.error(e);
// // //     } finally {
// // //       setStatsLoading(false);
// // //     }
// // //   }, [layoutId]);

// // //   useEffect(() => { loadSeats(); }, [loadSeats]);

// // //   // ── Filters ────────────────────────────────────────────────────────────
// // //   const [filters, setFilters] = useState<SeatFilters>(DEFAULT_FILTERS);

// // //   const updateFilter = useCallback(<K extends keyof SeatFilters>(key: K, value: SeatFilters[K]) => {
// // //     setFilters((prev) => ({ ...prev, [key]: value }));
// // //   }, []);

// // //   const resetFilters = useCallback(() => setFilters(DEFAULT_FILTERS), []);

// // //   const filteredSeats = useMemo(() => {
// // //     return seats.filter((s) => {
// // //       if (filters.search    && !s.seat_code.toLowerCase().includes(filters.search.toLowerCase())) return false;
// // //       if (filters.seat_type !== "All" && s.seat_type !== filters.seat_type) return false;
// // //       if (filters.status    !== "All" && s.status    !== filters.status)    return false;
// // //       if (filters.bookable  !== "All" && s.is_bookable !== (filters.bookable === "Yes")) return false;
// // //       if (filters.amenity   !== "All" && !s.amenity_ids.includes(filters.amenity)) return false;
// // //       return true;
// // //     });
// // //   }, [seats, filters]);

// // //   const seatTypes = useMemo(() => ["All", ...new Set(seats.map((s) => s.seat_type))], [seats]);

// // //   // ── Selection ──────────────────────────────────────────────────────────
// // //   const [selected, setSelected] = useState<Set<string>>(new Set());

// // //   const toggleSelect = useCallback((svgId: string) => {
// // //     setSelected((prev) => {
// // //       const next = new Set(prev);
// // //       next.has(svgId) ? next.delete(svgId) : next.add(svgId);
// // //       return next;
// // //     });
// // //   }, []);

// // //   const selectAll = useCallback(
// // //     () => setSelected(new Set(filteredSeats.map((s) => s.seat_svg_id))),
// // //     [filteredSeats]
// // //   );

// // //   const clearSelection = useCallback(() => setSelected(new Set()), []);

// // //   const isAllSelected   = filteredSeats.length > 0 && filteredSeats.every((s) => selected.has(s.seat_svg_id));
// // //   const isIndeterminate = selected.size > 0 && !isAllSelected;

// // //   // ── Edit panel ─────────────────────────────────────────────────────────
// // //   const [editingSeat, setEditingSeat] = useState<Seat | null>(null);

// // //   const openEditPanel  = useCallback((seat: Seat) => setEditingSeat(seat), []);
// // //   const closeEditPanel = useCallback(() => setEditingSeat(null), []);

// // //   const saveSeat = useCallback(async (payload: SeatUpdatePayload) => {
// // //     const updated = await updateSeat(payload);
// // //     setSeats((prev) => prev.map((s) => s.seat_svg_id === updated.seat_svg_id ? updated : s));
// // //     if (layoutId) fetchLayoutSeatStats(layoutId).then(setStats).catch(() => {});
// // //     return updated;
// // //   }, [layoutId]);

// // //   // ── Bulk edit ──────────────────────────────────────────────────────────
// // //   const [bulkOpen, setBulkOpen] = useState(false);

// // //   const openBulkEdit  = useCallback(() => setBulkOpen(true), []);
// // //   const closeBulkEdit = useCallback(() => setBulkOpen(false), []);

// // //   const saveBulk = useCallback(async (payload: BulkUpdatePayload) => {
// // //     await bulkUpdateSeats(payload);
// // //     await loadSeats();
// // //     clearSelection();
// // //     setBulkOpen(false);
// // //   }, [loadSeats, clearSelection]);

// // //   // ── View toggle ────────────────────────────────────────────────────────
// // //   const [view, setView] = useState<ViewMode>("map");

// // //   // ─────────────────────────────────────────────────────────────────────────
// // //   return {
// // //     // layout
// // //     layout,
// // //     layoutLoading,
// // //     layoutError,

// // //     // stats
// // //     stats,
// // //     statsLoading,

// // //     // seats + filters
// // //     filteredSeats,
// // //     filters,
// // //     updateFilter,
// // //     resetFilters,
// // //     seatTypes,

// // //     // preferences
// // //     preferences,

// // //     // selection
// // //     selected,
// // //     toggleSelect,
// // //     selectAll,
// // //     clearSelection,
// // //     isAllSelected,
// // //     isIndeterminate,

// // //     // edit panel
// // //     editingSeat,
// // //     openEditPanel,
// // //     closeEditPanel,
// // //     saveSeat,

// // //     // bulk
// // //     bulkOpen,
// // //     openBulkEdit,
// // //     closeBulkEdit,
// // //     saveBulk,

// // //     // view
// // //     view,
// // //     setView,
// // //   };
// // // }

// // "use client";

// // import { useCallback, useEffect, useMemo, useState } from "react";
// // import { useSearchParams } from "next/navigation";
// // import { axiosInstance } from "@/lib/http/axios";

// // import type { Layout, LayoutSeatStats } from "@/features/managelayout/types/layout.types";
// // import { fetchAllPreferences }           from "@/features/managelayout/services/layoutService";

// // import type {
// //   Seat,
// //   SeatFilters,
// //   SeatUpdatePayload,
// //   BulkUpdatePayload,
// //   ViewMode,
// // } from "../types/seat.types";

// // import {
// //   fetchSeatsByFloor,
// //   fetchLayoutSeatStats,
// //   updateSeat,
// //   bulkUpdateSeats,
// // } from "../services/seatService";
// // import { Preference } from "../types/layout.types";


// // // ─────────────────────────────────────────────────────────────────────────────

// // const DEFAULT_FILTERS: SeatFilters = {
// //   search:    "",
// //   seat_type: "All",
// //   status:    "All",
// //   bookable:  "All",
// //   amenity:   "All",
// // };

// // // ─────────────────────────────────────────────────────────────────────────────

// // export function useManageSeats() {
// //   const searchParams = useSearchParams();
// //   const layoutId     = searchParams.get("layoutId");
// //   const floorId      = searchParams.get("floorId");   // ← read floorId from URL

// //   // ── Layout ─────────────────────────────────────────────────────────────
// //   const [layout,        setLayout]        = useState<Layout | null>(null);
// //   const [layoutLoading, setLayoutLoading] = useState(true);
// //   const [layoutError,   setLayoutError]   = useState(false);

// //   useEffect(() => {
// //     if (!layoutId) { setLayoutLoading(false); return; }
// //     setLayoutLoading(true);
// //     axiosInstance
// //       .get<Layout>(`/admin/floor-layouts/${layoutId}`)
// //       .then(({ data }) => setLayout(data))
// //       .catch(() => setLayoutError(true))
// //       .finally(() => setLayoutLoading(false));
// //   }, [layoutId]);

// //   // ── Preferences ────────────────────────────────────────────────────────
// //   const [preferences, setPreferences] = useState<Preference[]>([]);

// //   useEffect(() => {
// //     fetchAllPreferences()
// //       .then(setPreferences)
// //       .catch(console.error);
// //   }, []);

// //   // ── Seats + Stats ──────────────────────────────────────────────────────
// //   const [seats,        setSeats]        = useState<Seat[]>([]);
// //   const [stats,        setStats]        = useState<LayoutSeatStats | null>(null);
// //   const [statsLoading, setStatsLoading] = useState(false);

// //   const loadSeats = useCallback(async () => {
// //     if (!floorId || !layoutId) return;   // ← guard both
// //     setStatsLoading(true);
// //     try {
// //       const [seatsData, statsData] = await Promise.all([
// //         fetchSeatsByFloor(floorId),      // ← use floorId, not layoutId
// //         fetchLayoutSeatStats(layoutId),
// //       ]);
// //       setSeats(seatsData);
// //       setStats(statsData);
// //     } catch (e) {
// //       console.error(e);
// //     } finally {
// //       setStatsLoading(false);
// //     }
// //   }, [floorId, layoutId]);              // ← both in deps

// //   useEffect(() => { loadSeats(); }, [loadSeats]);

// //   // ── Filters ────────────────────────────────────────────────────────────
// //   const [filters, setFilters] = useState<SeatFilters>(DEFAULT_FILTERS);

// //   const updateFilter = useCallback(<K extends keyof SeatFilters>(key: K, value: SeatFilters[K]) => {
// //     setFilters((prev) => ({ ...prev, [key]: value }));
// //   }, []);

// //   const resetFilters = useCallback(() => setFilters(DEFAULT_FILTERS), []);

// //   const filteredSeats = useMemo(() => {
// //     return seats.filter((s) => {
// //       if (filters.search    && !s.seat_code.toLowerCase().includes(filters.search.toLowerCase())) return false;
// //       if (filters.seat_type !== "All" && s.seat_type !== filters.seat_type) return false;
// //       if (filters.status    !== "All" && s.status    !== filters.status)    return false;
// //       if (filters.bookable  !== "All" && s.is_bookable !== (filters.bookable === "Yes")) return false;
// //       if (filters.amenity   !== "All" && !s.amenity_ids.includes(filters.amenity)) return false;
// //       return true;
// //     });
// //   }, [seats, filters]);

// //   const seatTypes = useMemo(() => ["All", ...new Set(seats.map((s) => s.seat_type))], [seats]);

// //   // ── Selection ──────────────────────────────────────────────────────────
// //   const [selected, setSelected] = useState<Set<string>>(new Set());

// //   const toggleSelect = useCallback((svgId: string) => {
// //     setSelected((prev) => {
// //       const next = new Set(prev);
// //       next.has(svgId) ? next.delete(svgId) : next.add(svgId);
// //       return next;
// //     });
// //   }, []);

// //   const selectAll = useCallback(
// //     () => setSelected(new Set(filteredSeats.map((s) => s.seat_svg_id))),
// //     [filteredSeats]
// //   );

// //   const clearSelection = useCallback(() => setSelected(new Set()), []);

// //   const isAllSelected   = filteredSeats.length > 0 && filteredSeats.every((s) => selected.has(s.seat_svg_id));
// //   const isIndeterminate = selected.size > 0 && !isAllSelected;

// //   // ── Edit panel ─────────────────────────────────────────────────────────
// //   const [editingSeat, setEditingSeat] = useState<Seat | null>(null);

// //   const openEditPanel  = useCallback((seat: Seat) => setEditingSeat(seat), []);
// //   const closeEditPanel = useCallback(() => setEditingSeat(null), []);

// //   const saveSeat = useCallback(async (payload: SeatUpdatePayload) => {
// //     const updated = await updateSeat(payload);
// //     setSeats((prev) => prev.map((s) => s.seat_svg_id === updated.seat_svg_id ? updated : s));
// //     if (layoutId) fetchLayoutSeatStats(layoutId).then(setStats).catch(() => {});
// //     return updated;
// //   }, [layoutId]);

// //   // ── Bulk edit ──────────────────────────────────────────────────────────
// //   const [bulkOpen, setBulkOpen] = useState(false);

// //   const openBulkEdit  = useCallback(() => setBulkOpen(true), []);
// //   const closeBulkEdit = useCallback(() => setBulkOpen(false), []);

// //   const saveBulk = useCallback(async (payload: BulkUpdatePayload) => {
// //     await bulkUpdateSeats(payload);
// //     await loadSeats();
// //     clearSelection();
// //     setBulkOpen(false);
// //   }, [loadSeats, clearSelection]);

// //   // ── View toggle ────────────────────────────────────────────────────────
// //   const [view, setView] = useState<ViewMode>("map");

// //   // ─────────────────────────────────────────────────────────────────────────
// //   return {
// //     // layout
// //     layout,
// //     layoutLoading,
// //     layoutError,

// //     // stats
// //     stats,
// //     statsLoading,

// //     // seats + filters
// //     filteredSeats,
// //     filters,
// //     updateFilter,
// //     resetFilters,
// //     seatTypes,

// //     // preferences
// //     preferences,

// //     // selection
// //     selected,
// //     toggleSelect,
// //     selectAll,
// //     clearSelection,
// //     isAllSelected,
// //     isIndeterminate,

// //     // edit panel
// //     editingSeat,
// //     openEditPanel,
// //     closeEditPanel,
// //     saveSeat,

// //     // bulk
// //     bulkOpen,
// //     openBulkEdit,
// //     closeBulkEdit,
// //     saveBulk,

// //     // view
// //     view,
// //     setView,

// //     // ids (exposed for child components if needed)
// //     layoutId,
// //     floorId,
// //   };
// // }

// "use client";

// import { useCallback, useMemo, useState } from "react";

// import type { Layout, LayoutSeatStats } from "@/features/managelayout/types/layout.types";
// import type {
//   Seat,
//   SeatFilters,
//   SeatUpdatePayload,
//   BulkUpdatePayload,
//   ViewMode,
// } from "../types/seat.types";
// import { Preference } from "../types/layout.types";


// // ─────────────────────────────────────────────────────────────────────────────
// // Static mock data
// // ─────────────────────────────────────────────────────────────────────────────

// const MOCK_PREFERENCES: Preference[] = [
//   { preference_id: "p1", preference_name: "Standing Desk",    preference_type: "Furniture",    description: "", icon_name: "" },
//   { preference_id: "p2", preference_name: "Dual Monitor",     preference_type: "Equipment",    description: "", icon_name: "" },
//   { preference_id: "p3", preference_name: "Near Window",      preference_type: "Location",     description: "", icon_name: "" },
//   { preference_id: "p4", preference_name: "Quiet Zone",       preference_type: "Environment",  description: "", icon_name: "" },
//   { preference_id: "p5", preference_name: "Wheelchair Access",preference_type: "Accessibility",description: "", icon_name: "" },
// ];

// const MOCK_LAYOUT: Layout = {
//   layout_id:        "47",
//   layout_name:      "BLR-A-f1",
//   version_no:       20,
//   status:           "ARCHIVED",
//   is_published:     false,
//   uploaded_by_name: "Chandana N M",
//   updated_at:       "2026-05-25T14:27:00Z",
//   layout_file_url:  "/layouts/layout.svg",
// } as unknown as Layout;

// const MOCK_STATS: LayoutSeatStats = {
//   total_seats:        48,
//   configured_seats:   42,
//   unconfigured_seats: 6,
//   non_bookable_seats: 4,
// } as unknown as LayoutSeatStats;

// const MOCK_SEATS: Seat[] = [
//   { seat_id: "s1",  seat_svg_id: "svg-1",  seat_code: "A-01", seat_type: "Workstation",  is_bookable: true,  status: "Active",      amenity_ids: ["p1","p2"], layout_id: "47", notes: "" },
//   { seat_id: "s2",  seat_svg_id: "svg-2",  seat_code: "A-02", seat_type: "Workstation",  is_bookable: true,  status: "Active",      amenity_ids: ["p3"],      layout_id: "47", notes: "" },
//   { seat_id: "s3",  seat_svg_id: "svg-3",  seat_code: "A-03", seat_type: "Cabin",        is_bookable: false, status: "Inactive",    amenity_ids: [],           layout_id: "47", notes: "" },
//   { seat_id: "s4",  seat_svg_id: "svg-4",  seat_code: "A-04", seat_type: "Meeting Room", is_bookable: true,  status: "Active",      amenity_ids: ["p4"],      layout_id: "47", notes: "" },
//   { seat_id: "s5",  seat_svg_id: "svg-5",  seat_code: "A-05", seat_type: "Workstation",  is_bookable: true,  status: "Maintenance", amenity_ids: ["p1"],      layout_id: "47", notes: "Under repair" },
//   { seat_id: "s6",  seat_svg_id: "svg-6",  seat_code: "A-06", seat_type: "Phone Booth",  is_bookable: true,  status: "Active",      amenity_ids: ["p5"],      layout_id: "47", notes: "" },
//   { seat_id: "s7",  seat_svg_id: "svg-7",  seat_code: "B-01", seat_type: "Workstation",  is_bookable: true,  status: "Active",      amenity_ids: ["p2","p3"], layout_id: "47", notes: "" },
//   { seat_id: "s8",  seat_svg_id: "svg-8",  seat_code: "B-02", seat_type: "Workstation",  is_bookable: false, status: "Inactive",    amenity_ids: [],           layout_id: "47", notes: "" },
//   { seat_id: "s9",  seat_svg_id: "svg-9",  seat_code: "B-03", seat_type: "Cabin",        is_bookable: true,  status: "Active",      amenity_ids: ["p1","p4"], layout_id: "47", notes: "" },
//   { seat_id: "s10", seat_svg_id: "svg-10", seat_code: "B-04", seat_type: "Meeting Room", is_bookable: true,  status: "Active",      amenity_ids: [],           layout_id: "47", notes: "" },
//   { seat_id: "s11", seat_svg_id: "svg-11", seat_code: "B-05", seat_type: "Workstation",  is_bookable: true,  status: "Active",      amenity_ids: ["p3"],      layout_id: "47", notes: "" },
//   { seat_id: "s12", seat_svg_id: "svg-12", seat_code: "B-06", seat_type: "Workstation",  is_bookable: true,  status: "Maintenance", amenity_ids: ["p2"],      layout_id: "47", notes: "" },
// ];

// // ─────────────────────────────────────────────────────────────────────────────

// const DEFAULT_FILTERS: SeatFilters = {
//   search:    "",
//   seat_type: "All",
//   status:    "All",
//   bookable:  "All",
//   amenity:   "All",
// };

// // ─────────────────────────────────────────────────────────────────────────────

// export function useManageSeats() {
//   // ── Layout (static) ────────────────────────────────────────────────────
//   const layout        = MOCK_LAYOUT;
//   const layoutLoading = false;
//   const layoutError   = false;

//   // ── Preferences (static) ───────────────────────────────────────────────
//   const preferences = MOCK_PREFERENCES;

//   // ── Seats + Stats (static, locally mutable) ────────────────────────────
//   const [seats, setSeats] = useState<Seat[]>(MOCK_SEATS);
//   const stats             = MOCK_STATS;
//   const statsLoading      = false;

//   // ── Filters ────────────────────────────────────────────────────────────
//   const [filters, setFilters] = useState<SeatFilters>(DEFAULT_FILTERS);

//   const updateFilter = useCallback(<K extends keyof SeatFilters>(key: K, value: SeatFilters[K]) => {
//     setFilters((prev) => ({ ...prev, [key]: value }));
//   }, []);

//   const resetFilters = useCallback(() => setFilters(DEFAULT_FILTERS), []);

//   const filteredSeats = useMemo(() => {
//     return seats.filter((s) => {
//       if (filters.search    && !s.seat_code.toLowerCase().includes(filters.search.toLowerCase())) return false;
//       if (filters.seat_type !== "All" && s.seat_type !== filters.seat_type) return false;
//       if (filters.status    !== "All" && s.status    !== filters.status)    return false;
//       if (filters.bookable  !== "All" && s.is_bookable !== (filters.bookable === "Yes")) return false;
//       if (filters.amenity   !== "All" && !s.amenity_ids.includes(filters.amenity)) return false;
//       return true;
//     });
//   }, [seats, filters]);

//   const seatTypes = useMemo(() => ["All", ...new Set(seats.map((s) => s.seat_type))], [seats]);

//   // ── Selection ──────────────────────────────────────────────────────────
//   const [selected, setSelected] = useState<Set<string>>(new Set());

//   const toggleSelect = useCallback((svgId: string) => {
//     setSelected((prev) => {
//       const next = new Set(prev);
//       next.has(svgId) ? next.delete(svgId) : next.add(svgId);
//       return next;
//     });
//   }, []);

//   const selectAll = useCallback(
//     () => setSelected(new Set(filteredSeats.map((s) => s.seat_svg_id))),
//     [filteredSeats]
//   );

//   const clearSelection = useCallback(() => setSelected(new Set()), []);

//   const isAllSelected   = filteredSeats.length > 0 && filteredSeats.every((s) => selected.has(s.seat_svg_id));
//   const isIndeterminate = selected.size > 0 && !isAllSelected;

//   // ── Edit panel ─────────────────────────────────────────────────────────
//   const [editingSeat, setEditingSeat] = useState<Seat | null>(null);

//   const openEditPanel  = useCallback((seat: Seat) => setEditingSeat(seat), []);
//   const closeEditPanel = useCallback(() => setEditingSeat(null), []);

//   const saveSeat = useCallback(async (payload: SeatUpdatePayload) => {
//     // Update in local state only (no API)
//     const updated: Seat = {
//       ...seats.find((s) => s.seat_svg_id === payload.seat_svg_id)!,
//       ...payload,
//     };
//     setSeats((prev) => prev.map((s) => s.seat_svg_id === updated.seat_svg_id ? updated : s));
//     return updated;
//   }, [seats]);

//   // ── Bulk edit ──────────────────────────────────────────────────────────
//   const [bulkOpen, setBulkOpen] = useState(false);

//   const openBulkEdit  = useCallback(() => setBulkOpen(true), []);
//   const closeBulkEdit = useCallback(() => setBulkOpen(false), []);

//   const saveBulk = useCallback(async (payload: BulkUpdatePayload) => {
//     // Update in local state only (no API)
//     setSeats((prev) =>
//       prev.map((s) => {
//         if (!payload.seat_svg_ids.includes(s.seat_svg_id)) return s;
//         return {
//           ...s,
//           ...(payload.seat_type   !== undefined && { seat_type:   payload.seat_type }),
//           ...(payload.is_bookable !== undefined && { is_bookable: payload.is_bookable }),
//           ...(payload.status      !== undefined && { status:      payload.status }),
//           ...(payload.amenity_ids !== undefined && { amenity_ids: payload.amenity_ids }),
//         };
//       })
//     );
//     clearSelection();
//     setBulkOpen(false);
//   }, [clearSelection]);

//   // ── View toggle ────────────────────────────────────────────────────────
//   const [view, setView] = useState<ViewMode>("list");

//   // ─────────────────────────────────────────────────────────────────────────
//   return {
//     // layout
//     layout,
//     layoutLoading,
//     layoutError,

//     // stats
//     stats,
//     statsLoading,

//     // seats + filters
//     filteredSeats,
//     filters,
//     updateFilter,
//     resetFilters,
//     seatTypes,

//     // preferences
//     preferences,

//     // selection
//     selected,
//     toggleSelect,
//     selectAll,
//     clearSelection,
//     isAllSelected,
//     isIndeterminate,

//     // edit panel
//     editingSeat,
//     openEditPanel,
//     closeEditPanel,
//     saveSeat,

//     // bulk
//     bulkOpen,
//     openBulkEdit,
//     closeBulkEdit,
//     saveBulk,

//     // view
//     view,
//     setView,
//   };
// }

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import type { Layout, LayoutSeatStats } from "@/features/managelayout/types/layout.types";
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

// ─────────────────────────────────────────────────────────────────────────────
// Mock data — seats, stats, preferences
// Replace with real API calls when endpoints are ready
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_PREFERENCES: Preference[] = [
  { preference_id: "p1", preference_name: "Standing Desk",     preference_type: "Furniture",     description: "", icon_name: "" },
  { preference_id: "p2", preference_name: "Dual Monitor",      preference_type: "Equipment",     description: "", icon_name: "" },
  { preference_id: "p3", preference_name: "Near Window",       preference_type: "Location",      description: "", icon_name: "" },
  { preference_id: "p4", preference_name: "Quiet Zone",        preference_type: "Environment",   description: "", icon_name: "" },
  { preference_id: "p5", preference_name: "Wheelchair Access", preference_type: "Accessibility", description: "", icon_name: "" },
];

const MOCK_STATS: LayoutSeatStats = {
  total_seats:        48,
  configured_seats:   42,
  unconfigured_seats: 6,
  non_bookable_seats: 4,
  bookable_seats:     38,
} as unknown as LayoutSeatStats;

const MOCK_SEATS: Seat[] = [
  { seat_id: "s1",  seat_svg_id: "svg-1",  seat_code: "A-01", seat_type: "Workstation",  is_bookable: true,  status: "Active",      amenity_ids: ["p1","p2"], layout_id: "47", notes: "" },
  { seat_id: "s2",  seat_svg_id: "svg-2",  seat_code: "A-02", seat_type: "Workstation",  is_bookable: true,  status: "Active",      amenity_ids: ["p3"],      layout_id: "47", notes: "" },
  { seat_id: "s3",  seat_svg_id: "svg-3",  seat_code: "A-03", seat_type: "Cabin",        is_bookable: false, status: "Inactive",    amenity_ids: [],           layout_id: "47", notes: "" },
  { seat_id: "s4",  seat_svg_id: "svg-4",  seat_code: "A-04", seat_type: "Meeting Room", is_bookable: true,  status: "Active",      amenity_ids: ["p4"],      layout_id: "47", notes: "" },
  { seat_id: "s5",  seat_svg_id: "svg-5",  seat_code: "A-05", seat_type: "Workstation",  is_bookable: true,  status: "Maintenance", amenity_ids: ["p1"],      layout_id: "47", notes: "Under repair" },
  { seat_id: "s6",  seat_svg_id: "svg-6",  seat_code: "A-06", seat_type: "Phone Booth",  is_bookable: true,  status: "Active",      amenity_ids: ["p5"],      layout_id: "47", notes: "" },
  { seat_id: "s7",  seat_svg_id: "svg-7",  seat_code: "B-01", seat_type: "Workstation",  is_bookable: true,  status: "Active",      amenity_ids: ["p2","p3"], layout_id: "47", notes: "" },
  { seat_id: "s8",  seat_svg_id: "svg-8",  seat_code: "B-02", seat_type: "Workstation",  is_bookable: false, status: "Inactive",    amenity_ids: [],           layout_id: "47", notes: "" },
  { seat_id: "s9",  seat_svg_id: "svg-9",  seat_code: "B-03", seat_type: "Cabin",        is_bookable: true,  status: "Active",      amenity_ids: ["p1","p4"], layout_id: "47", notes: "" },
  { seat_id: "s10", seat_svg_id: "svg-10", seat_code: "B-04", seat_type: "Meeting Room", is_bookable: true,  status: "Active",      amenity_ids: [],           layout_id: "47", notes: "" },
  { seat_id: "s11", seat_svg_id: "svg-11", seat_code: "B-05", seat_type: "Workstation",  is_bookable: true,  status: "Active",      amenity_ids: ["p3"],      layout_id: "47", notes: "" },
  { seat_id: "s12", seat_svg_id: "svg-12", seat_code: "B-06", seat_type: "Workstation",  is_bookable: true,  status: "Maintenance", amenity_ids: ["p2"],      layout_id: "47", notes: "" },
];

// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_FILTERS: SeatFilters = {
  search:    "",
  seat_type: "All",
  status:    "All",
  bookable:  "All",
  amenity:   "All",
};

// ─────────────────────────────────────────────────────────────────────────────

export function useManageSeats() {
  const searchParams = useSearchParams();

  const layoutId   = searchParams.get("layoutId")   ?? "";
  const floorId    = searchParams.get("floorId")    ?? "";
  const buildingId = searchParams.get("buildingId") ?? "";
  const siteId     = searchParams.get("siteId")     ?? "";

  // ── Layout — fetched from real API using floorId + layoutId ───────────
  const [layout,        setLayout]        = useState<Layout | null>(null);
  const [layoutLoading, setLayoutLoading] = useState(false);
  const [layoutError,   setLayoutError]   = useState(false);

  useEffect(() => {
    if (!floorId || !layoutId) {
      setLayout(null);
      return;
    }
    setLayoutLoading(true);
    setLayoutError(false);
    setLayout(null);

    getLayoutsByFloor(floorId)
      .then((layouts) => {
        // Find the specific layout matching the layoutId from the URL
        const match = layouts.find((l) => String(l.layout_id) === String(layoutId));
        if (match) {
          setLayout(match);
        } else {
          // layoutId not found in this floor — fall back to first layout
          setLayout(layouts[0] ?? null);
        }
      })
      .catch(() => setLayoutError(true))
      .finally(() => setLayoutLoading(false));
  }, [floorId, layoutId]);

  // ── Preferences — fetched from real API ───────────────────────────────
  const [preferences, setPreferences] = useState<Preference[]>(MOCK_PREFERENCES);

  useEffect(() => {
    fetchAllPreferences()
      .then(setPreferences)
      .catch(() => {
        // Fall back to mock preferences if API fails
        setPreferences(MOCK_PREFERENCES);
      });
  }, []);

  // ── Seats + Stats (mock, locally mutable — swap for real API) ─────────
  const [seats, setSeats] = useState<Seat[]>(MOCK_SEATS);
  const stats             = MOCK_STATS;
  const statsLoading      = false;

  // ── Filters ────────────────────────────────────────────────────────────
  const [filters, setFilters] = useState<SeatFilters>(DEFAULT_FILTERS);

  const updateFilter = useCallback(<K extends keyof SeatFilters>(key: K, value: SeatFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => setFilters(DEFAULT_FILTERS), []);

  const filteredSeats = useMemo(() => {
    return seats.filter((s) => {
      if (filters.search    && !s.seat_code.toLowerCase().includes(filters.search.toLowerCase())) return false;
      if (filters.seat_type !== "All" && s.seat_type !== filters.seat_type) return false;
      if (filters.status    !== "All" && s.status    !== filters.status)    return false;
      if (filters.bookable  !== "All" && s.is_bookable !== (filters.bookable === "Yes")) return false;
      if (filters.amenity   !== "All" && !s.amenity_ids.includes(filters.amenity)) return false;
      return true;
    });
  }, [seats, filters]);

  const seatTypes = useMemo(() => ["All", ...new Set(seats.map((s) => s.seat_type))], [seats]);

  // ── Selection ──────────────────────────────────────────────────────────
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleSelect = useCallback((svgId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(svgId) ? next.delete(svgId) : next.add(svgId);
      return next;
    });
  }, []);

  const selectAll = useCallback(
    () => setSelected(new Set(filteredSeats.map((s) => s.seat_svg_id))),
    [filteredSeats]
  );

  const clearSelection = useCallback(() => setSelected(new Set()), []);

  const isAllSelected   = filteredSeats.length > 0 && filteredSeats.every((s) => selected.has(s.seat_svg_id));
  const isIndeterminate = selected.size > 0 && !isAllSelected;

  // ── Edit panel ─────────────────────────────────────────────────────────
  const [editingSeat, setEditingSeat] = useState<Seat | null>(null);

  const openEditPanel  = useCallback((seat: Seat) => setEditingSeat(seat), []);
  const closeEditPanel = useCallback(() => setEditingSeat(null), []);

  const saveSeat = useCallback(async (payload: SeatUpdatePayload) => {
    const updated: Seat = {
      ...seats.find((s) => s.seat_svg_id === payload.seat_svg_id)!,
      ...payload,
    };
    setSeats((prev) => prev.map((s) => s.seat_svg_id === updated.seat_svg_id ? updated : s));
    return updated;
  }, [seats]);

  // ── Bulk edit ──────────────────────────────────────────────────────────
  const [bulkOpen, setBulkOpen] = useState(false);

  const openBulkEdit  = useCallback(() => setBulkOpen(true), []);
  const closeBulkEdit = useCallback(() => setBulkOpen(false), []);

  const saveBulk = useCallback(async (payload: BulkUpdatePayload) => {
    setSeats((prev) =>
      prev.map((s) => {
        if (!payload.seat_svg_ids.includes(s.seat_svg_id)) return s;
        return {
          ...s,
          ...(payload.seat_type   !== undefined && { seat_type:   payload.seat_type }),
          ...(payload.is_bookable !== undefined && { is_bookable: payload.is_bookable }),
          ...(payload.status      !== undefined && { status:      payload.status }),
          ...(payload.amenity_ids !== undefined && { amenity_ids: payload.amenity_ids }),
        };
      })
    );
    clearSelection();
    setBulkOpen(false);
  }, [clearSelection]);

  // ── View toggle ────────────────────────────────────────────────────────
  const [view, setView] = useState<ViewMode>("list");

  // ─────────────────────────────────────────────────────────────────────────
  return {
    // layout
    layout,
    layoutLoading,
    layoutError,

    // url params (useful for child components)
    layoutId,
    floorId,
    buildingId,
    siteId,

    // stats
    stats,
    statsLoading,

    // seats + filters
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
    setView,
  };
}