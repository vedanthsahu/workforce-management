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

function mapApiItemToSeat(item: any): Seat {
  return {
    seat_id:             String(item.layout_seat_mapping_id), // use mapping id as the row key
    seat_svg_id:         String(item.svg_element_id),
    layout_seat_mapping_id: String(item.layout_seat_mapping_id),
    seat_code:           item.seat_code,
    seat_name:           item.seat_name ?? "",
    seat_type:           item.seat_type ?? "WORKSTATION",
    status:              item.status ?? "ACTIVE",
    is_bookable:         item.is_bookable ?? true,
    is_reserved:         item.is_reserved ?? false,
    is_configured:       item.is_configured ?? false,
    configuration_status: item.configuration_status ?? "PENDING",
    amenity_ids:         (item.amenity_ids ?? []).map(String),
    layout_id:           String(item.layout_id),
    notes:               item.notes ?? "",
  };
}

// ─── Fetch seats + stats for a layout ────────────────────────────────────────

interface LayoutSeatsApiResponse {
  layout_id:        string;
  total_seats:      number;
  configured_seats: number;
  pending_seats:    number;
  items:            any[];
}

export async function fetchLayoutSeats(
  layoutId: string
): Promise<{ seats: Seat[]; stats: LayoutSeatStats }> {
  const { data } = await axiosInstance.get<LayoutSeatsApiResponse>(
    `/admin/floor-layouts/${layoutId}/seats`
  );

  const seats = data.items.map(mapApiItemToSeat);

  const stats: LayoutSeatStats = {
    layout_id:          String(data.layout_id),
    total_seats:        data.total_seats,
    configured_seats:   data.configured_seats,
    unconfigured_seats: data.pending_seats,
    non_bookable_seats: seats.filter((s) => !s.is_bookable).length,
    bookable_seats:     seats.filter((s) => s.is_bookable).length,
  };

  return { seats, stats };
}

// ─── Configure a single seat ──────────────────────────────────────────────────

export interface SeatConfigPayload {
  seat_name?:   string;
  seat_type:    string;
  status:       string;
  is_bookable:  boolean;
  is_reserved:  boolean;
  amenity_ids:  number[];
}

// export async function configureSeat(
//   layoutSeatMappingId: string,
//   payload: SeatConfigPayload
// ): Promise<Seat> {
//   const { data } = await axiosInstance.patch(
//     `/layout-seats/${layoutSeatMappingId}/configuration`,
//     payload
//   );
//   return mapApiItemToSeat(data);
// }

// export async function configureSeat(
//   layoutSeatMappingId: string,
//   payload: SeatConfigPayload
// ): Promise<Seat> {
//   console.log("[configureSeat] payload:", JSON.stringify(payload, null, 2));
//   const { data } = await axiosInstance.patch(
//     `/layout-seats/${layoutSeatMappingId}/configuration`,
//     payload
//   );
//   return mapApiItemToSeat(data);
// }

// export async function configureSeat(
//   layoutSeatMappingId: string,
//   payload: SeatConfigPayload
// ): Promise<Seat> {
//   console.log("[configureSeat] payload:", JSON.stringify(payload, null, 2));
//   try {
//     const { data } = await axiosInstance.patch(
//       `/layout-seats/${layoutSeatMappingId}/configuration`,
//       payload
//     );
//     return mapApiItemToSeat(data);
//   } catch (err: any) {
//     console.error(
//       "[configureSeat] error:",
//       err?.response?.status,
//       JSON.stringify(err?.response?.data, null, 2)  // ← this will show the exact reason
//     );
//     throw err;
//   }
// }

export async function configureSeat(
  layoutSeatMappingId: string,
  payload: SeatConfigPayload
): Promise<Seat> {
  console.log("[configureSeat] payload:", JSON.stringify(payload, null, 2));
  try {
    const { data } = await axiosInstance.patch(
      `/layout-seats/${layoutSeatMappingId}/configuration`,
      payload,
      {
        transformRequest: [(data) => JSON.stringify(data)],  // ← bypass interceptor
        headers: { "Content-Type": "application/json" },
      }
    );
    return mapApiItemToSeat(data);
  } catch (err: any) {
    console.error(
      "[configureSeat] error:",
      err?.response?.status,
      JSON.stringify(err?.response?.data, null, 2)
    );
    throw err;
  }
}

// ─── Bulk configure ───────────────────────────────────────────────────────────

export async function bulkConfigureSeats(
  mappingIds: string[],
  payload: Omit<SeatConfigPayload, "seat_name">
): Promise<void> {
  await Promise.all(
    mappingIds.map((id) =>
      axiosInstance.patch(`/layout-seats/${id}/configuration`, payload)
    )
  );
}