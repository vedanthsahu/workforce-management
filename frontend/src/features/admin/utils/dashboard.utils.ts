
import type {
  AdminActivityItem,
  OccupancyHierarchyItem,
  OccupancyRangeItem,
  OccupancyTrendPoint,
  RecentBooking,
  TopOffice,
  WeekFilter,
} from "../types/admin.types";

export function getWeekRange(
  week: WeekFilter,
  centerDate?: string
): { startDate: string; endDate: string; targetDate: Date } {
  const base = centerDate ? new Date(centerDate) : new Date();
  const targetDate = new Date(base);

  if (week === "last-week") {
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

export function mapOccupancyRangeToTrend(
  items: OccupancyRangeItem[],
  targetDate: Date
): OccupancyTrendPoint[] {
  const allDays: OccupancyTrendPoint[] = [];

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
      occupancy: Math.round((found?.occupancyRate ?? 0) * 10) / 10,
    });
  }

  return allDays;
}

export function mapHierarchyToTopOffices(items: OccupancyHierarchyItem[]): TopOffice[] {
  return items
    .map((item) => ({ name: item.siteName, value: item.occupancyRate }))
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