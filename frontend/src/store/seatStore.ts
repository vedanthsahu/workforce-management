import { create } from "zustand";
import { Seat } from "@/features/managelayout1/types/seat.types";
import { LayoutSeatStats } from "@/features/managelayout/types/layout.types";
import { fetchLayoutSeats } from "@/features/managelayout1/services/seatService";

interface SeatsState {
  seats:      Seat[];
  stats:      LayoutSeatStats | null;
  loading:    boolean;
  layoutId:   string | null;
  isDirty:    boolean;
  fetchSeats: (layoutId: string) => Promise<void>;
  updateSeat: (updated: Seat) => void;
  resetSeats: () => void;
  markDirty:  () => void;
  clearDirty: () => void;
}

export const useSeatsStore = create<SeatsState>((set) => ({
  seats:    [],
  stats:    null,
  loading:  false,
  layoutId: null,
  isDirty:  false,

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
            }
          : null,
      };
    });
  },

  resetSeats: () => set({ seats: [], stats: null, layoutId: null, isDirty: false }),

  markDirty:  () => set({ isDirty: true }),
  clearDirty: () => set({ isDirty: false }),
}));
