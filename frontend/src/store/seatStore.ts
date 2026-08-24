import { create } from "zustand";
import { Seat } from "@/features/managelayout1/types/seat.types";
import { LayoutSeatStats } from "@/features/managelayout/types/layout.types";
import { fetchLayoutSeats } from "@/features/managelayout1/services/seatService";

// Only the fields actually sent on publish (see useLayoutDetails.ts's flush
// payload) count toward "is this seat actually different from the server."
function configEquals(a: Seat, b: Seat): boolean {
  if (a.seat_type !== b.seat_type) return false;
  if (a.status !== b.status) return false;
  if (a.is_bookable !== b.is_bookable) return false;
  const aAmenities = [...a.amenity_ids].sort();
  const bAmenities = [...b.amenity_ids].sort();
  if (aAmenities.length !== bAmenities.length) return false;
  return aAmenities.every((id, i) => id === bAmenities[i]);
}

function computeStats(seats: Seat[], prev: LayoutSeatStats | null): LayoutSeatStats | null {
  if (!prev) return null;
  return {
    ...prev,
    bookable_seats:     seats.filter((s) => s.is_bookable).length,
    non_bookable_seats: seats.filter((s) => !s.is_bookable).length,
    configured_seats:   seats.filter((s) => s.is_configured).length,
    unconfigured_seats: seats.filter((s) => !s.is_configured).length,
    inactive_seats:     seats.filter((s) => s.status === "INACTIVE").length,
  };
}

interface SeatsState {
  seats:            Seat[];
  // Snapshot of each seat exactly as last fetched from the server, keyed by
  // layout_seat_mapping_id — the baseline `applyLocalEdit` compares against
  // to tell a real change from an edit that landed back where it started.
  originalSeatsById: Record<string, Seat>;
  stats:            LayoutSeatStats | null;
  loading:          boolean;
  layoutId:         string | null;
  isDirty:          boolean;
  // layout_seat_mapping_ids currently different from originalSeatsById
  // (already-published layout) — the exact set that publishLayout must
  // flush to the server before it re-syncs the live `seats` table.
  dirtyMappingIds:  Set<string>;
  fetchSeats:       (layoutId: string) => Promise<void>;
  updateSeat:       (updated: Seat) => void;
  // Local-only edit path (already-published layout): applies the edit AND
  // decides dirty state by comparing against the original snapshot, so a
  // seat edited back to its original value (e.g. Active -> Inactive ->
  // Active) is un-marked as pending and won't be sent on publish.
  applyLocalEdit:   (updated: Seat) => void;
  resetSeats:       () => void;
  markDirty:        () => void;
  clearDirty:       () => void;
}

export const useSeatsStore = create<SeatsState>((set) => ({
  seats:             [],
  originalSeatsById: {},
  stats:             null,
  loading:           false,
  layoutId:          null,
  isDirty:           false,
  dirtyMappingIds:   new Set(),

  fetchSeats: async (layoutId: string) => {
    set({ loading: true, layoutId });
    try {
      const { seats, stats } = await fetchLayoutSeats(layoutId);
      const originalSeatsById = Object.fromEntries(
        seats.map((s) => [s.layout_seat_mapping_id, s])
      );
      set({
        seats,
        stats,
        loading: false,
        originalSeatsById,
        dirtyMappingIds: new Set(),
        isDirty: false,
      });
    } catch (err) {
      console.error("[seatsStore] fetchSeats:", err);
      set({ loading: false });
    }
  },

  updateSeat: (updated: Seat) => {
    set((state) => {
      const newSeats = state.seats.map((s) =>
        s.seat_svg_id === updated.seat_svg_id ? updated : s
      );
      return { seats: newSeats, stats: computeStats(newSeats, state.stats) };
    });
  },

  applyLocalEdit: (updated: Seat) => {
    set((state) => {
      const mappingId = updated.layout_seat_mapping_id;
      const original = state.originalSeatsById[mappingId];
      const reverted = original ? configEquals(updated, original) : false;

      const finalSeat: Seat = { ...updated, has_unpublished_changes: !reverted };
      const newSeats = state.seats.map((s) =>
        s.seat_svg_id === finalSeat.seat_svg_id ? finalSeat : s
      );

      const nextDirtyIds = new Set(state.dirtyMappingIds);
      if (reverted) {
        nextDirtyIds.delete(mappingId);
      } else {
        nextDirtyIds.add(mappingId);
      }

      return {
        seats: newSeats,
        stats: computeStats(newSeats, state.stats),
        dirtyMappingIds: nextDirtyIds,
        isDirty: nextDirtyIds.size > 0,
      };
    });
  },

  resetSeats: () =>
    set({
      seats: [],
      originalSeatsById: {},
      stats: null,
      layoutId: null,
      isDirty: false,
      dirtyMappingIds: new Set(),
    }),

  markDirty: () => set({ isDirty: true }),

  clearDirty: () => set({ isDirty: false, dirtyMappingIds: new Set() }),
}));
