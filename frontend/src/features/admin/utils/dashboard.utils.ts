
import type {
  AdminActivityItem,
  OccupancyHierarchyItem,
  OccupancyRangeItem,
  OccupancyTrendPoint,
  RecentBooking,
  TopOffice,
  TrendPeriod,
} from "../types/admin.types";

function isMonthPeriod(period: TrendPeriod): boolean {
  return period === "this-month" || period === "last-month";
}

export function getTrendRange(
  period: TrendPeriod,
  centerDate?: string
): { startDate: string; endDate: string; targetDate: Date } {
  const base = centerDate ? new Date(centerDate) : new Date();

  if (isMonthPeriod(period)) {
    const target = new Date(base.getFullYear(), base.getMonth(), 1);
    if (period === "last-month") target.setMonth(target.getMonth() - 1);

    const start = new Date(target.getFullYear(), target.getMonth(), 1);
    const end = new Date(target.getFullYear(), target.getMonth() + 1, 0); // last day of month

    return {
      startDate: start.toISOString().split("T")[0],
      endDate: end.toISOString().split("T")[0],
      targetDate: target,
    };
  }

  const targetDate = new Date(base);
  if (period === "last-week") {
    targetDate.setDate(targetDate.getDate() - 7);
  }

  const start = new Date(targetDate);
  start.setDate(targetDate.getDate() - 3);

  const end = new Date(targetDate);
  end.setDate(targetDate.getDate() + 3);

  return {
    startDate: start.toISOString().split("T")[0],
    endDate: end.toISOString().split("T")[0],
    targetDate,
  };
}

// Occupancy percentages always round up to the next whole number
// (e.g. 0.2 -> 1, 1.1 -> 2) rather than rounding to nearest.
export function ceilPercentage(value: number): number {
  return Math.ceil(value);
}

export function mapOccupancyRangeToTrend(
  items: OccupancyRangeItem[],
  period: TrendPeriod,
  targetDate: Date
): OccupancyTrendPoint[] {
  const allDays: OccupancyTrendPoint[] = [];

  if (isMonthPeriod(period)) {
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      const isoDate = d.toISOString().split("T")[0];
      const found = items.find((x) => x.date.split("T")[0] === isoDate);

      allDays.push({
        day: String(day),
        date: d.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        occupancy: ceilPercentage(found?.occupancyRate ?? 0),
        bookedSeats: found?.bookedSeats ?? 0,
        employeeBookedSeats: found?.employeeBookedSeats ?? 0,
        guestBookedSeats: found?.guestBookedSeats ?? 0,
      });
    }

    return allDays;
  }

  for (let i = -3; i <= 3; i++) {
    const d = new Date(targetDate);
    d.setDate(targetDate.getDate() + i);
    const isoDate = d.toISOString().split("T")[0];

    const found = items.find((x) => x.date.split("T")[0] === isoDate);

    allDays.push({
      day: d.toLocaleDateString("en-US", { weekday: "short" }),
      date: d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      occupancy: ceilPercentage(found?.occupancyRate ?? 0),
      bookedSeats: found?.bookedSeats ?? 0,
      employeeBookedSeats: found?.employeeBookedSeats ?? 0,
      guestBookedSeats: found?.guestBookedSeats ?? 0,
    });
  }

  return allDays;
}

export function mapHierarchyToTopOffices(items: OccupancyHierarchyItem[]): TopOffice[] {
  return items
    .map((item) => ({
      name: item.siteName,
      value: ceilPercentage(item.occupancyRate),
      bookedSeats: item.bookedSeats,
      employeeBookedSeats: item.employeeBookedSeats,
      guestBookedSeats: item.guestBookedSeats,
      totalSeats: item.totalSeats,
    }))
    .sort((a, b) => b.value - a.value);
}

// ── Activities → Recent Bookings row ────────────────────────────────────────
// bookedFor.id is a guest ID for guest activities and an employee ID otherwise —
// those are different ID spaces, so only compare them for employee activities.
function isSelfBooking(item: AdminActivityItem): boolean {
  return (
    item.bookedFor.entityType === "EMPLOYEE" &&
    item.bookedBy.id === item.bookedFor.id
  );
}

function getActivityKind(item: AdminActivityItem): RecentBooking["type"] {
  if (item.bookedFor.entityType === "GUEST") return "Guest";
  return isSelfBooking(item) ? "Self" : "Employee";
}

const STATUS_LABELS: Record<AdminActivityItem["activityStatus"], RecentBooking["status"]> = {
  CONFIRMED: "Booked",
  SCHEDULED: "Booked",
  CHECKED_IN: "Checked In",
  CHECKED_OUT: "Completed",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "No Show",
  MODIFIED: "Modified",
};

export function mapActivitiesToRecent(items: AdminActivityItem[]): RecentBooking[] {
  return items.map((item) => {
    const isSelf = isSelfBooking(item);

    return {
      name: item.bookedFor.name,
      email: item.bookedFor.email,
      office: item.site?.siteName ?? "",
      seat: item.hasBooking ? item.seat?.seatCode ?? "—" : "Only Visit",
      date: new Date(item.activityDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      status: STATUS_LABELS[item.activityStatus] ?? "Booked",
      type: getActivityKind(item),
      bookedByName: isSelf ? undefined : item.bookedBy.name,
    };
  });
}

// ─── AdminRecentBookings badge styles ──────────────────────────────────────
export const RECENT_BOOKING_TYPE_STYLES: Record<RecentBooking["type"], string> = {
  Self: "bg-blue-100 text-blue-600",
  Employee: "bg-purple-100 text-purple-600",
  Guest: "bg-amber-100 text-amber-600",
};

export const RECENT_BOOKING_STATUS_STYLES: Record<RecentBooking["status"], string> = {
  Booked: "bg-green-100 text-green-600",
  "Checked In": "bg-blue-100 text-blue-600",
  Completed: "bg-gray-100 text-gray-600",
  Cancelled: "bg-red-100 text-red-600",
  "No Show": "bg-orange-100 text-orange-600",
  Modified: "bg-amber-100 text-amber-600",
};

// ─── AdminStats accent color map ────────────────────────────────────────────
export type StatAccent = "blue" | "green" | "orange" | "rose" | "purple";

export const STAT_ACCENTS: Record<StatAccent, { icon: string; glow: string }> = {
  blue: {
    icon: "bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600 ring-1 ring-inset ring-blue-200/70",
    glow: "hover:shadow-blue-500/10",
  },
  green: {
    icon: "bg-gradient-to-br from-green-50 to-green-100 text-green-600 ring-1 ring-inset ring-green-200/70",
    glow: "hover:shadow-green-500/10",
  },
  orange: {
    icon: "bg-gradient-to-br from-orange-50 to-orange-100 text-orange-600 ring-1 ring-inset ring-orange-200/70",
    glow: "hover:shadow-orange-500/10",
  },
  rose: {
    icon: "bg-gradient-to-br from-rose-50 to-rose-100 text-rose-600 ring-1 ring-inset ring-rose-200/70",
    glow: "hover:shadow-rose-500/10",
  },
  purple: {
    icon: "bg-gradient-to-br from-purple-50 to-purple-100 text-purple-600 ring-1 ring-inset ring-purple-200/70",
    glow: "hover:shadow-purple-500/10",
  },
};

// ─── AdminCharts option lists / lookups ─────────────────────────────────────
export const TREND_PERIOD_OPTIONS: { value: TrendPeriod; label: string }[] = [
  { value: "this-week", label: "This Week" },
  { value: "last-week", label: "Last Week" },
  { value: "this-month", label: "This Month" },
  { value: "last-month", label: "Last Month" },
];

export const DONUT_META: Record<string, { label: string; color: string }> = {
  booked: { label: "Reserved seats", color: "#4F46E5" },
  blocked: { label: "Blocked seats", color: "#F59E0B" },
  available: { label: "Available seats", color: "#10B981" },
};

export const TOP_OFFICES_PER_PAGE = 5;