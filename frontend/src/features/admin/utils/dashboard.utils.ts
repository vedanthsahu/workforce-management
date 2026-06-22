
import type {
  AdminBookingItem,
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
      occupancy: found?.occupancyRate ?? 0,
    });
  }

  return allDays;
}

export function mapHierarchyToTopOffices(items: OccupancyHierarchyItem[]): TopOffice[] {
  return items
    .map((item) => ({ name: item.siteName, value: item.occupancyRate }))
    .sort((a, b) => b.value - a.value);
}

export function mapBookingsToRecent(items: AdminBookingItem[]): RecentBooking[] {
  return items.map((item) => ({
    name: item.user?.fullName ?? "",
    email: item.user?.email ?? "",
    office: item.site?.siteName ?? "",
    seat: item.seat?.seatCode ?? "",
    date: new Date(item.bookingDate).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    status: item.bookingStatus === "CANCELLED" ? "Cancelled" : "Booked",
  }));
}