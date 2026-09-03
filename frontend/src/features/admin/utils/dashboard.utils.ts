
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