export type DashboardSummary = {
  total_offices: number;
  total_floors: number;
  total_seats: number;
  booked_today: number;
  blocked_seats: number;
  occupancy_percentage: number;
};

export type WeekFilter = "this-week" | "last-week";

export type DashboardFilters = {
  date?: string;
  site_id?: number;
  floor_id?: number;
};

// ── Occupancy trend (date range) ────────────────────────────────────────────

export interface OccupancyRangeItem {
  date: string;
  occupancyRate: number;
}

export interface OccupancyTrendPoint {
  day: string;
  date: string;
  occupancy: number;
}

// ── Top offices (occupancy hierarchy) ───────────────────────────────────────

export interface OccupancyHierarchyItem {
  siteName: string;
  occupancyRate: number;
}

export interface TopOffice {
  name: string;
  value: number;
}

// ── Recent bookings ──────────────────────────────────────────────────────────

export type AdminBookingStatus = "CONFIRMED" | "CANCELLED" | "PENDING" | "ACTIVE";

export interface AdminBookingItem {
  bookingDate: string;
  bookingStatus: AdminBookingStatus;
  user?: { fullName: string; email: string };
  site?: { siteName: string };
  seat?: { seatCode: string };
}

export interface AdminBookingsResponse {
  items: AdminBookingItem[];
  total: number;
  page: number;
  limit: number;
}

export interface RecentBooking {
  name: string;
  email: string;
  office: string;
  seat: string;
  date: string;
  status: "Booked" | "Cancelled";
}
