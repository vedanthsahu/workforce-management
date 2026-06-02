// // import { create } from "zustand";
// // import { Seat } from "@/features/managelayout1/types/seat.types";
// // import { LayoutSeatStats } from "@/features/managelayout/types/layout.types";
// // import { fetchLayoutSeats } from "@/features/managelayout1/services/seatService";

// // interface SeatsState {
// //   seats: Seat[];
// //   stats: LayoutSeatStats | null;
// //   loading: boolean;
// //   layoutId: string | null;
// //   fetchSeats: (layoutId: string) => Promise<void>;
// //   updateSeat: (updated: Seat) => void;
// //   resetSeats: () => void;
// // }

// // export const useSeatsStore = create<SeatsState>((set) => ({
// //   seats:    [],
// //   stats:    null,
// //   loading:  false,
// //   layoutId: null,

// //   fetchSeats: async (layoutId: string) => {
// //     set({ loading: true, layoutId });
// //     try {
// //       const { seats, stats } = await fetchLayoutSeats(layoutId);
// //       set({ seats, stats, loading: false });
// //     } catch (err) {
// //       console.error("[seatsStore] fetchSeats:", err);
// //       set({ loading: false });
// //     }
// //   },

// //   updateSeat: (updated: Seat) => {
// //     console.log("[seatStore] updateSeat called with:", updated.seat_svg_id, "is_configured:", updated.is_configured);
// //     set((state) => ({
// //       seats: state.seats.map((s) =>
// //         s.seat_svg_id === updated.seat_svg_id ? updated : s
// //       ),
// //       // also update stats derived counts
      
// //       stats: state.stats
// //         ? {
// //             ...state.stats,
// //             bookable_seats:     state.seats.filter((s) =>
// //               s.seat_svg_id === updated.seat_svg_id ? updated.is_bookable : s.is_bookable
// //             ).length,
// //             non_bookable_seats: state.seats.filter((s) =>
// //               s.seat_svg_id === updated.seat_svg_id ? !updated.is_bookable : !s.is_bookable
// //             ).length,
// //             configured_seats: state.seats.filter((s) =>
// //               s.seat_svg_id === updated.seat_svg_id ? updated.is_configured : s.is_configured
// //             ).length,
// //             unconfigured_seats: state.seats.filter((s) =>
// //               s.seat_svg_id === updated.seat_svg_id ? !updated.is_configured : !s.is_configured
// //             ).length,
// //           }
// //         : null,
// //     }));
// //   },

// //   resetSeats: () => set({ seats: [], stats: null, layoutId: null }),
// // }));

// import { create } from "zustand";
// import { Seat } from "@/features/managelayout1/types/seat.types";
// import { LayoutSeatStats } from "@/features/managelayout/types/layout.types";
// import { fetchLayoutSeats } from "@/features/managelayout1/services/seatService";

// interface SeatsState {
//   seats: Seat[];
//   stats: LayoutSeatStats | null;
//   loading: boolean;
//   layoutId: string | null;
//   fetchSeats: (layoutId: string) => Promise<void>;
//   updateSeat: (updated: Seat) => void;
//   resetSeats: () => void;
// }

// export const useSeatsStore = create<SeatsState>((set) => ({
//   seats:    [],
//   stats:    null,
//   loading:  false,
//   layoutId: null,

//   fetchSeats: async (layoutId: string) => {
//     set({ loading: true, layoutId });
//     try {
//       const { seats, stats } = await fetchLayoutSeats(layoutId);
//       console.log("[seatStore] fetchSeats done, count:", seats.length);
//       set({ seats, stats, loading: false });
//     } catch (err) {
//       console.error("[seatsStore] fetchSeats:", err);
//       set({ loading: false });
//     }
//   },

//   updateSeat: (updated: Seat) => {
//     // LOG 1 — did updateSeat get called? is_configured correct?
//     console.log("[seatStore] updateSeat called:", {
//       seat_svg_id:   updated.seat_svg_id,
//       is_configured: updated.is_configured,
//       is_bookable:   updated.is_bookable,
//       status:        updated.status,
//     });

//     set((state) => {
//       const newSeats = state.seats.map((s) =>
//         s.seat_svg_id === updated.seat_svg_id ? updated : s
//       );

//       // LOG 2 — did the map actually replace the seat?
//       const replacedSeat = newSeats.find((s) => s.seat_svg_id === updated.seat_svg_id);
//       console.log("[seatStore] seat after map:", {
//         seat_svg_id:   replacedSeat?.seat_svg_id,
//         is_configured: replacedSeat?.is_configured,
//       });

//       // LOG 3 — is it a new array reference? (should always be true)
//       console.log("[seatStore] same array ref?", newSeats === state.seats);

//       return {
//         seats: newSeats,
//         stats: state.stats
//           ? {
//               ...state.stats,
//               bookable_seats: newSeats.filter((s) => s.is_bookable).length,
//               non_bookable_seats: newSeats.filter((s) => !s.is_bookable).length,
//               configured_seats: newSeats.filter((s) => s.is_configured).length,
//               unconfigured_seats: newSeats.filter((s) => !s.is_configured).length,
//             }
//           : null,
//       };
//     });
//   },

//   resetSeats: () => set({ seats: [], stats: null, layoutId: null }),
// }));

import { create } from "zustand";
import { Seat } from "@/features/managelayout1/types/seat.types";
import { LayoutSeatStats } from "@/features/managelayout/types/layout.types";
import { fetchLayoutSeats } from "@/features/managelayout1/services/seatService";

interface SeatsState {
  seats:      Seat[];
  stats:      LayoutSeatStats | null;
  loading:    boolean;
  layoutId:   string | null;
  isDirty:    boolean;           // ← NEW: true after any seat edit, reset on publish
  fetchSeats: (layoutId: string) => Promise<void>;
  updateSeat: (updated: Seat) => void;
  resetSeats: () => void;
  markDirty:  () => void;        // ← NEW
  clearDirty: () => void;        // ← NEW
}

export const useSeatsStore = create<SeatsState>((set) => ({
  seats:    [],
  stats:    null,
  loading:  false,
  layoutId: null,
  isDirty:  false,               // ← NEW

  fetchSeats: async (layoutId: string) => {
    set({ loading: true, layoutId });
    try {
      const { seats, stats } = await fetchLayoutSeats(layoutId);
      console.log("[seatStore] fetchSeats done, count:", seats.length);
      set({ seats, stats, loading: false });
    } catch (err) {
      console.error("[seatsStore] fetchSeats:", err);
      set({ loading: false });
    }
  },

  updateSeat: (updated: Seat) => {
    console.log("[seatStore] updateSeat called:", {
      seat_svg_id:   updated.seat_svg_id,
      is_configured: updated.is_configured,
      is_bookable:   updated.is_bookable,
      status:        updated.status,
    });

    set((state) => {
      const newSeats = state.seats.map((s) =>
        s.seat_svg_id === updated.seat_svg_id ? updated : s
      );

      const replacedSeat = newSeats.find((s) => s.seat_svg_id === updated.seat_svg_id);
      console.log("[seatStore] seat after map:", {
        seat_svg_id:   replacedSeat?.seat_svg_id,
        is_configured: replacedSeat?.is_configured,
      });

      console.log("[seatStore] same array ref?", newSeats === state.seats);

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

  markDirty:  () => set({ isDirty: true }),   // ← NEW
  clearDirty: () => set({ isDirty: false }),  // ← NEW
}));