import { axiosInstance } from "@/lib/http/axios";
import { Seat } from "../types/seat.types";
import { LayoutSeatStats } from "../types/layout.types";

// ─── Mapper ───────────────────────────────────────────────────────────────────
// No fake defaults — null stays null so the UI can show "—" for unconfigured seats

interface RawSeatItem {
  layout_seat_mapping_id: string | number;
  svg_element_id:  string | number;
  seat_code:       string;
  seat_name?:      string | null;
  seat_type?:      string | null;
  status?:         string | null;
  is_bookable?:    boolean | null;
  is_reserved?:    boolean | null;
  is_configured?:  boolean | null;
  configuration_status?: string | null;
  amenity_ids?:    (string | number)[] | null;
  layout_id:       string | number;
  notes?:          string | null;
}

function mapApiItemToSeat(item: RawSeatItem, forceConfigured = false): Seat {
  return {
    seat_id:                String(item.layout_seat_mapping_id),
    seat_svg_id:            String(item.svg_element_id),
    layout_seat_mapping_id: String(item.layout_seat_mapping_id),
    seat_code:              item.seat_code,
    seat_name:              item.seat_name ?? "",
    seat_type:              item.seat_type ?? null,
    status:                 item.status ?? null,
    is_bookable:            item.is_bookable ?? null,
    is_reserved:            item.is_reserved ?? false,
    is_configured:          forceConfigured ? true : (item.is_configured ?? false),
    configuration_status:   item.configuration_status ?? null,
    amenity_ids:            (item.amenity_ids ?? []).map(String),
    layout_id:              String(item.layout_id),
    notes:                  item.notes ?? "",
  };
}

// ─── Fetch seats + stats for a layout ────────────────────────────────────────

interface LayoutSeatsApiResponse {
  layout_id:        string;
  total_seats:      number;
  configured_seats: number;
  pending_seats:    number;
  items:            RawSeatItem[];
}

export async function fetchLayoutSeats(
  layoutId: string
): Promise<{ seats: Seat[]; stats: LayoutSeatStats }> {
  const { data } = await axiosInstance.get<LayoutSeatsApiResponse>(
    `/admin/floor-layouts/${layoutId}/seats`
  );

  const items = data.items ?? [];
  const seats = items.map((item) => mapApiItemToSeat(item));

  const stats: LayoutSeatStats = {
    layout_id:          String(data.layout_id),
    total_seats:        data.total_seats,
    configured_seats:   data.configured_seats,
    unconfigured_seats: data.pending_seats,
    non_bookable_seats: seats.filter((s) => s.is_bookable === false).length,
    bookable_seats:     seats.filter((s) => s.is_bookable === true).length,
    inactive_seats:     seats.filter((s) => s.status === "INACTIVE").length,
  };

  return { seats, stats };
}

// ─── Configure a single seat ──────────────────────────────────────────────────

export interface SeatConfigPayload {
  seat_name?:  string;
  seat_type:   string;
  status:      string;
  is_bookable: boolean;
  is_reserved: boolean;
  amenity_ids: number[];
}

export async function configureSeat(
  layoutSeatMappingId: string,
  payload: SeatConfigPayload
): Promise<Seat> {
  const { data } = await axiosInstance.patch<RawSeatItem>(
    `/layout-seats/${layoutSeatMappingId}/configuration`,
    payload,
    {
      transformRequest: [(data) => JSON.stringify(data)],
      headers: { "Content-Type": "application/json" },
    }
  );
  return mapApiItemToSeat(data, true);
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
