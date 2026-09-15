import { SeatStatus, SeatType } from "../types/seat.types";

export const SEAT_TYPES: SeatType[] = ["STANDARD", "WINDOW", "CABIN", "ACCESSIBLE", "HOT_DESK"];

export const SEAT_STATUSES: SeatStatus[] = ["ACTIVE", "INACTIVE"];

// ─── SeatTable pagination ────────────────────────────────────────────────────
export const SEAT_TABLE_PAGE_SIZES = [10, 25, 50];
