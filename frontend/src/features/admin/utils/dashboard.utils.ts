import type {
  AdminBookingItem,
  OccupancyHierarchyItem,
  OccupancyRangeItem,
  OccupancyTrendPoint,
  RecentBooking,
  TopOffice,
  WeekFilter,
} from "../types/admin.types";

export function getWeekRange(week: WeekFilter): { startDate: string; endDate: string } {
  const today = new Date();
  let start: Date;
  let end: Date;

  if (week === "this-week") {
    end = new Date(today);
    start = new Date(today);
    start.setDate(today.getDate() - 6);
  } else {
    end = new Date(today);
    end.setDate(today.getDate() - 7);

    start = new Date(end);
    start.setDate(end.getDate() - 6);
  }

  return {
    startDate: start.toISOString().split("T")[0],
    endDate: end.toISOString().split("T")[0],
  };
}

export function mapOccupancyRangeToTrend(items: OccupancyRangeItem[]): OccupancyTrendPoint[] {
  return items.map((item) => ({
    day: new Date(item.date).toLocaleDateString("en-US", { weekday: "short" }),
    date: new Date(item.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    occupancy: item.occupancyRate,
  }));
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
