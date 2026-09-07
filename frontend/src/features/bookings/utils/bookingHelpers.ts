import type { Booking } from "../types/bookings.types";

export function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month:   "short",
    day:     "numeric",
  });
}

export function isUpcoming(isoDate: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(isoDate + "T00:00:00") >= today;
}

export function isToday(isoDate: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(isoDate + "T00:00:00");
  d.setHours(0, 0, 0, 0);
  return d.getTime() === today.getTime();
}

export function sortByDate(bookings: Booking[], ascending = true): Booking[] {
  return [...bookings].sort((a, b) => {
    const da = new Date(a.date + "T00:00:00").getTime();
    const db = new Date(b.date + "T00:00:00").getTime();
    return ascending ? da - db : db - da;
  });
}
