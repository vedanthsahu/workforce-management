// import { axiosInstance } from "@/lib/http/axios";
// import { Seat, SeatUpdatePayload, BulkUpdatePayload } from "../types/seat.types";
// import { LayoutSeatStats } from "../types/layout.types";

// // ─── Seat CRUD ────────────────────────────────────────────────────────────────

// export async function fetchSeatsByLayout(layoutId: string): Promise<Seat[]> {
//   const { data } = await axiosInstance.get<Seat[]>(
//     `/admin/seats`,
//     { params: { layout_id: layoutId } }
//   );
//   return data;
// }

// export async function fetchSeatById(seatId: string): Promise<Seat> {
//   const { data } = await axiosInstance.get<Seat>(`/admin/seats/${seatId}`);
//   return data;
// }

// export async function updateSeat(payload: SeatUpdatePayload): Promise<Seat> {
//   const { data } = await axiosInstance.put<Seat>(
//     `/admin/seats/${payload.seat_svg_id}`,
//     payload
//   );
//   return data;
// }

// export async function bulkUpdateSeats(payload: BulkUpdatePayload): Promise<void> {
//   await axiosInstance.put("/admin/seats/bulk", payload);
// }

// // ─── Stats ────────────────────────────────────────────────────────────────────

// export async function fetchLayoutSeatStats(layoutId: string): Promise<LayoutSeatStats> {
//   const { data } = await axiosInstance.get<LayoutSeatStats>(
//     `/admin/floor-layouts/${layoutId}/seat-stats`
//   );
//   return data;
// }

import { axiosInstance } from "@/lib/http/axios";
import { Seat, SeatUpdatePayload, BulkUpdatePayload } from "../types/seat.types";
import { LayoutSeatStats } from "../types/layout.types";

// ─── Seat CRUD ────────────────────────────────────────────────────────────────

export async function fetchSeatsByFloor(floorId: string): Promise<Seat[]> {
  const { data } = await axiosInstance.get<Seat[]>(
    `/floors/${floorId}/seats`
  );
  return data;
}

export async function fetchSeatById(seatId: string): Promise<Seat> {
  const { data } = await axiosInstance.get<Seat>(`/admin/seats/${seatId}`);
  return data;
}

export async function updateSeat(payload: SeatUpdatePayload): Promise<Seat> {
  const { data } = await axiosInstance.put<Seat>(
    `/admin/seats/${payload.seat_svg_id}`,
    payload
  );
  return data;
}

export async function bulkUpdateSeats(payload: BulkUpdatePayload): Promise<void> {
  await axiosInstance.put("/admin/seats/bulk", payload);
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export async function fetchLayoutSeatStats(layoutId: string): Promise<LayoutSeatStats> {
  const { data } = await axiosInstance.get<LayoutSeatStats>(
    `/admin/floor-layouts/${layoutId}/seat-stats`
  );
  return data;
}