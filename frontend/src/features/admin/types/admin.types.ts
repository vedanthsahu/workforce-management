export type DashboardSummary = {
  total_offices: number;
  total_floors: number;
  total_seats: number;
  booked_today: number;
  blocked_seats: number;
  occupancy_percentage: number;
};

export type TrendPeriod = "this-week" | "last-week" | "this-month" | "last-month";

export type DashboardFilters = {
  date?: string;
  site_id?: number;
  floor_id?: number;
};

// ── Occupancy trend (date range) ────────────────────────────────────────────

export interface OccupancyRangeItem {
  date: string;
  occupancyRate: number;
  bookedSeats: number;
}

export interface OccupancyTrendPoint {
  day: string;
  date: string;
  occupancy: number;
  bookedSeats: number;
}

// ── Top offices (occupancy hierarchy) ───────────────────────────────────────

export interface OccupancyHierarchyItem {
  siteName: string;
  occupancyRate: number;
  bookedSeats: number;
  totalSeats: number;
}

export interface TopOffice {
  name: string;
  value: number;
  bookedSeats: number;
  totalSeats: number;
}

// ── Admin activities (recent bookings / guest visits) ───────────────────────

export type ActivityEntityType = "EMPLOYEE" | "GUEST";

export interface ActivityPerson {
  entityType: ActivityEntityType;
  id: string;
  name: string;
  email: string;
  role: string | null;
  department: string | null;
  jobTitle: string | null;
  guestType: string | null;
}

export interface ActivitySeat {
  seatId: string;
  seatCode: string;
  seatType: string;
  seatNeighborhood: string | null;
}

export interface ActivitySite {
  siteId: string;
  siteCode: string;
  siteName: string;
}

export interface ActivityBuilding {
  buildingId: string;
  buildingCode: string;
  buildingName: string;
}

export interface ActivityFloor {
  floorId: string;
  floorCode: string;
  floorName: string;
}

export type AdminActivityType = "GUEST_BOOKING" | "GUEST_VISIT" | "EMPLOYEE_BOOKING";

export type AdminActivityStatus =
  | "CONFIRMED"
  | "SCHEDULED"
  | "CHECKED_IN"
  | "CHECKED_OUT"
  | "COMPLETED"
  | "CANCELLED"
  | "MODIFIED"
  | "NO_SHOW";

export interface AdminActivityItem {
  activityId: string;
  activityType: AdminActivityType;
  hasBooking: boolean;
  activityStatus: AdminActivityStatus;
  activityDate: string;
  bookingId: string | null;
  guestVisitId: string | null;
  bookedBy: ActivityPerson;
  bookedFor: ActivityPerson;
  seat: ActivitySeat | null;
  site: ActivitySite;
  building: ActivityBuilding;
  floor: ActivityFloor | null;
  checkInAt: string | null;
  checkedOutAt: string | null;
  createdAt: string;
}

export interface AdminActivitiesResponse {
  items: AdminActivityItem[];
}

export interface RecentBooking {
  name: string;
  email: string;
  office: string;
  seat: string;
  date: string;
  status: "Booked" | "Checked In" | "Completed" | "Cancelled" | "No Show" | "Modified";
  type: "Self" | "Employee" | "Guest";
  bookedByName?: string;
}