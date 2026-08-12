import { create } from "zustand";
import { Seat } from "@/features/managelayout1/types/seat.types";
import { LayoutSeatStats } from "@/features/managelayout/types/layout.types";
import { fetchLayoutSeats } from "@/features/managelayout1/services/seatService";

interface SeatsState {
  seats:           Seat[];
  stats:           LayoutSeatStats | null;
  loading:         boolean;
  layoutId:        string | null;
  isDirty:         boolean;
  // layout_seat_mapping_ids edited locally (already-published layout) since
  // the last publish/discard — the exact set that publishLayout must flush
  // to the server before it re-syncs the live `seats` table.
  dirtyMappingIds: Set<string>;
  fetchSeats:      (layoutId: string) => Promise<void>;
  updateSeat:      (updated: Seat) => void;
  resetSeats:      () => void;
  markDirty:       () => void;
  markSeatDirty:   (mappingId: string) => void;
  clearDirty:      () => void;
}

export const useSeatsStore = create<SeatsState>((set) => ({
  seats:           [],
  stats:           null,
  loading:         false,
  layoutId:        null,
  isDirty:         false,
  dirtyMappingIds: new Set(),

  fetchSeats: async (layoutId: string) => {
    set({ loading: true, layoutId });
    try {
      const { seats, stats } = await fetchLayoutSeats(layoutId);
      set({ seats, stats, loading: false });
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

      return {
        seats: newSeats,
        stats: state.stats
          ? {
              ...state.stats,
              bookable_seats:     newSeats.filter((s) => s.is_bookable).length,
              non_bookable_seats: newSeats.filter((s) => !s.is_bookable).length,
              configured_seats:   newSeats.filter((s) => s.is_configured).length,
              unconfigured_seats: newSeats.filter((s) => !s.is_configured).length,
              inactive_seats:     newSeats.filter((s) => s.status === "INACTIVE").length,
            }
          : null,
      };
    });
  },

  resetSeats: () =>
    set({ seats: [], stats: null, layoutId: null, isDirty: false, dirtyMappingIds: new Set() }),

  markDirty: () => set({ isDirty: true }),

  markSeatDirty: (mappingId: string) =>
    set((state) => {
      const next = new Set(state.dirtyMappingIds);
      next.add(mappingId);
      return { dirtyMappingIds: next, isDirty: true };
    }),

  clearDirty: () => set({ isDirty: false, dirtyMappingIds: new Set() }),
}));
